// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { WebMcpBridge } from "./Bridge";
import { installFakeModelContext } from "./testing";
const state = vi.hoisted(() => ({ path: "/nl/calculators/frame-size", authenticated: false, loading: false,
  user: undefined as undefined | null | { _id: string; agentToolsEnabled?: boolean }, push: vi.fn(), query: vi.fn(),
  consent: false, track: vi.fn() }));
const client = { query: state.query };
vi.mock("next/navigation", () => ({ usePathname: () => state.path, useRouter: () => ({ push: state.push }) }));
vi.mock("convex/react", () => ({ useConvexAuth: () => ({ isAuthenticated: state.authenticated, isLoading: state.loading }),
  useQuery: () => state.user, useConvex: () => client }));
vi.mock("@/lib/cookieConsent", () => ({ canTrackMarketing: () => state.consent }));
vi.mock("@/lib/analytics/marketing", () => ({ pushDataLayerEvent: state.track }));
let fake: ReturnType<typeof installFakeModelContext>;
beforeEach(() => {
  state.path = "/nl/calculators/frame-size"; state.authenticated = false; state.loading = false;
  state.user = undefined; state.consent = false;
  fake = installFakeModelContext();
});
afterEach(() => { cleanup(); fake.restore(); vi.clearAllMocks(); vi.unstubAllGlobals(); });
it("renews its abort lifetime during StrictMode effect replay", async () => {
  render(<StrictMode><WebMcpBridge /></StrictMode>);
  await waitFor(() => expect(fake.tools.has("site_get_context")).toBe(true));
  expect(await fake.call("site_get_context", {})).toMatchObject({ ok: true });
});
it("registers public tools, navigates and re-registers after locale changes", async () => {
  const view = render(<WebMcpBridge />);
  await waitFor(() => expect(fake.tools.has("site_get_context")).toBe(true));
  expect(await fake.call("site_get_context", {})).toMatchObject({ data: { locale: "nl", signedIn: false } });
  await fake.call("site_navigate", { destination: "frame-size" });
  expect(state.push).toHaveBeenCalledWith("/nl/calculators/frame-size");
  expect(state.track).not.toHaveBeenCalled();
  state.path = "/en/calculators/frame-size";
  view.rerender(<WebMcpBridge />);
  await waitFor(async () => expect(await fake.call("site_get_context", {})).toMatchObject({ data: { locale: "en" } }));
  state.consent = true;
  await fake.call("site_get_context", {});
  expect(state.track).toHaveBeenCalledWith({ event: "webmcp_tool_called", tool: "site_get_context", outcome: "success" });
});
it("registers nothing during loading or saved opt-out and refuses stale callbacks", async () => {
  state.authenticated = true; state.loading = true;
  const view = render(<WebMcpBridge />);
  expect(fake.tools.size).toBe(0);
  state.loading = false; state.user = { _id: "fixture", agentToolsEnabled: false };
  view.rerender(<WebMcpBridge />);
  expect(fake.tools.size).toBe(0);
  state.user.agentToolsEnabled = true;
  view.rerender(<WebMcpBridge />);
  await waitFor(() => expect(fake.tools.has("site_get_context")).toBe(true));
  const stale = fake.tools.get("site_get_context")!;
  act(() => window.dispatchEvent(new Event("webmcp-pause")));
  await waitFor(() => expect(fake.tools.size).toBe(0));
  expect(JSON.parse(await stale.execute({}))).toMatchObject({ ok: false });
});
it("unregisters on forbidden routes and never carries account scope into sign-out", async () => {
  state.authenticated = true; state.user = { _id: "fixture" }; state.path = "/nl/dashboard";
  const view = render(<WebMcpBridge />);
  await waitFor(() => expect(fake.tools.has("site_get_context")).toBe(true));
  const stale = fake.tools.get("site_get_context")!;
  state.authenticated = false; state.user = undefined; state.path = "/nl/login";
  view.rerender(<WebMcpBridge />);
  await waitFor(() => expect(fake.tools.size).toBe(0));
  expect(JSON.parse(await stale.execute({}))).toMatchObject({ ok: false });
});
it("rechecks persisted opt-out on a cross-tab notice and does not leak pause into a different account", async () => {
  let notify: (() => void) | undefined;
  vi.stubGlobal("BroadcastChannel", class {
    set onmessage(callback: () => void) { notify = callback; }
    close() {}
  });
  state.authenticated = true; state.user = { _id: "first-account" }; state.path = "/nl/dashboard";
  const view = render(<WebMcpBridge />);
  await waitFor(() => expect(fake.tools.has("site_get_context")).toBe(true));
  state.query.mockResolvedValue({ _id: "first-account", agentToolsEnabled: false });
  await act(async () => { notify?.(); });
  await waitFor(() => expect(fake.tools.size).toBe(0));
  expect(state.query).toHaveBeenCalled();
  state.user = { _id: "second-account" };
  view.rerender(<WebMcpBridge />);
  await waitFor(() => expect(fake.tools.has("site_get_context")).toBe(true));
});
