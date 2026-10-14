/* @vitest-environment jsdom */

import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
import { WebMcpBridge } from "@/lib/webmcp/Bridge";
import { installFakeModelContext } from "@/lib/webmcp/testing";

const state = vi.hoisted(() => ({
  path: "/nl/dashboard", signedIn: true,
  user: { _id: "fixture-account", agentToolsEnabled: true } as { _id: string; agentToolsEnabled: boolean } | undefined,
  router: { push: vi.fn() }, client: { query: vi.fn() },
}));
vi.mock("next/navigation", () => ({ usePathname: () => state.path, useRouter: () => state.router }));
vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: state.signedIn, isLoading: false }),
  useQuery: () => state.user, useConvex: () => state.client,
}));
vi.mock("@/lib/cookieConsent", () => ({ canTrackMarketing: () => false }));

let fake: ReturnType<typeof installFakeModelContext>;
beforeEach(() => {
  state.path = "/nl/dashboard";
  state.signedIn = true;
  state.user = { _id: "fixture-account", agentToolsEnabled: true };
  state.router.push.mockReset();
  state.client.query.mockReset().mockImplementation(async reference => {
    const name = getFunctionName(reference);
    if (name === "users/queries:getCurrentUser") return state.user;
    if (name === "bikes/queries:listSummariesByUser") return [{ _id: "bike-fixture", name: "My bike", bikeType: "road" }];
    throw new Error("Unexpected query");
  });
  fake = installFakeModelContext();
});
afterEach(() => { cleanup(); fake.restore(); });

it.each(["nl", "en"] as const)("registers and executes the real dashboard pack through the %s bridge", async locale => {
  state.path = `/${locale}/dashboard`;
  const view = render(<WebMcpBridge />);
  await waitFor(() => expect(fake.tools.has("bikes_list")).toBe(true));
  expect(fake.tools.get("bikes_list")?.annotations).toMatchObject({ readOnlyHint: true, untrustedContentHint: true });
  expect(await fake.call("bikes_list", {})).toMatchObject({ ok: true, untrustedContent: true,
    data: { items: [{ id: "bike-fixture", name: "My bike" }] } });
  for (const [name, path] of [["bikes_open_new", "/bikes/new"], ["fit_open_start", "/fit"], ["account_open_profile", "/profile"]]) {
    expect(await fake.call(name, {})).toMatchObject({ ok: true, data: { url: `/${locale}${path}` } });
    expect(state.router.push).toHaveBeenLastCalledWith(`/${locale}${path}`);
  }
  const stale = fake.tools.get("bikes_list")!;
  state.path = `/${locale}/profile`;
  view.rerender(<WebMcpBridge />);
  await waitFor(() => {
    expect(fake.tools.has("bikes_list")).toBe(false);
    expect(fake.tools.has("account_get_profile_summary")).toBe(true);
  });
  expect(JSON.parse(await stale.execute({}))).toMatchObject({ ok: false, error: { code: "SCOPE_CHANGED" } });
  state.user = { _id: "fixture-account", agentToolsEnabled: false };
  view.rerender(<WebMcpBridge />);
  await waitFor(() => expect(fake.tools.size).toBe(0));
});

it("never exposes dashboard reads on a signed-out dashboard", async () => {
  state.signedIn = false;
  state.user = undefined;
  render(<WebMcpBridge />);
  expect(fake.tools.size).toBe(0);
  expect(state.client.query).not.toHaveBeenCalled();
});
