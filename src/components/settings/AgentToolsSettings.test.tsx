// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AgentToolsSettings } from "./AgentToolsSettings";
const mocks = vi.hoisted(() => ({ save: vi.fn(), post: vi.fn(), close: vi.fn() }));
vi.mock("convex/react", () => ({ useMutation: () => mocks.save }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
it.each(["nl", "en"] as const)("defaults on, respects saved false and saves with broadcast in %s", async locale => {
  vi.stubGlobal("BroadcastChannel", class { postMessage = mocks.post; close = mocks.close; });
  mocks.save.mockResolvedValue(null);
  const view = render(<AgentToolsSettings locale={locale} />);
  const control = screen.getByRole("switch") as HTMLInputElement;
  expect(control.checked).toBe(true);
  fireEvent.click(control);
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ enabled: false }));
  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith({ type: "changed" }));
  view.rerender(<AgentToolsSettings locale={locale} enabled={false} />);
  expect(control.checked).toBe(false);
  expect(screen.getByText(locale === "nl" ? "Opgeslagen" : "Saved")).toBeTruthy();
});
it("shows a localized save error without leaking backend details", async () => {
  mocks.save.mockRejectedValue(new Error("private details"));
  render(<AgentToolsSettings locale="nl" enabled={false} />);
  fireEvent.click(screen.getByRole("switch"));
  await screen.findByText("Opslaan is niet gelukt. Probeer het opnieuw.");
  expect(document.body.textContent).not.toContain("private details");
  expect((screen.getByRole("switch") as HTMLInputElement).checked).toBe(false);
});
