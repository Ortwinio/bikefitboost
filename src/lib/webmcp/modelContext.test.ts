// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { getModelContext, registerBrowserTool, type BrowserTool } from "./modelContext";
import { installFakeModelContext } from "./testing";

afterEach(() => { Reflect.deleteProperty(document, "modelContext"); Reflect.deleteProperty(navigator, "modelContext"); });
const tool: BrowserTool = { name: "site_test", description: "Returns a summary.", inputSchema: {},
  annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: async () => "{}" };
it.each(["return", "method", "signal"] as const)("unregisters once with %s cleanup", async style => {
  const fake = installFakeModelContext(document, style);
  const remove = await registerBrowserTool(tool);
  expect(fake.tools.size).toBe(1);
  remove(); remove();
  expect(fake.tools.size).toBe(0);
  fake.restore();
});
it("uses the navigator alias and supports asynchronous registration", async () => {
  expect(getModelContext()).toBeUndefined();
  const unregister = vi.fn();
  Object.defineProperty(navigator, "modelContext", { configurable: true,
    value: { registerTool: async () => ({ unregister }) } });
  const remove = await registerBrowserTool(tool);
  remove();
  expect(unregister).toHaveBeenCalledOnce();
});
