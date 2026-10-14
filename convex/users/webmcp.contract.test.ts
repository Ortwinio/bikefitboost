import { expect, it, vi } from "vitest";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "../_generated/dataModel";
import { setAgentToolsEnabled } from "./mutations";
vi.mock("@convex-dev/auth/server", () => ({ getAuthUserId: vi.fn() }));
type Handler = (context: { db: { patch: ReturnType<typeof vi.fn> } }, args: { enabled: boolean }) => Promise<null>;
const handler = (setAgentToolsEnabled as unknown as { _handler: Handler })._handler;
it("requires authentication for the human preference change", async () => {
  vi.mocked(getAuthUserId).mockResolvedValue(null);
  const patch = vi.fn();
  await expect(handler({ db: { patch } }, { enabled: false })).rejects.toThrow("Not authenticated");
  expect(patch).not.toHaveBeenCalled();
});
it.each([false, true])("persists %s only for the authenticated account", async enabled => {
  vi.mocked(getAuthUserId).mockResolvedValue("fixture-owner" as Id<"users">);
  const patch = vi.fn();
  expect(await handler({ db: { patch } }, { enabled })).toBeNull();
  expect(patch).toHaveBeenCalledExactlyOnceWith("fixture-owner", { agentToolsEnabled: enabled });
});
