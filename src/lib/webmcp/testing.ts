import type { Tool, ToolContext } from "./types";
import type { BrowserTool } from "./modelContext";
import { runTool } from "./pipeline";

export function createTestToolContext(overrides: Partial<ToolContext> = {}): ToolContext {
  return { locale: "nl", pathname: "/nl/calculators", signedIn: false, loading: false, enabled: true,
    scopeKey: "public", signal: new AbortController().signal, navigate: () => {}, tools: () => [],
    query: async () => { throw new Error("Mock the UI query for this test"); }, ...overrides };
}
export function runTestTool(tool: Tool, input: unknown, overrides: Partial<ToolContext> = {}) {
  const context = createTestToolContext(overrides);
  return runTool(tool, input, () => context, context.scopeKey);
}

export function installFakeModelContext(target: object = document, style: "return" | "method" | "signal" = "return") {
  const previous = Object.getOwnPropertyDescriptor(target, "modelContext");
  const tools = new Map<string, BrowserTool>();
  const context = {
    registerTool(tool: BrowserTool, options?: { signal: AbortSignal }) {
      if (tools.has(tool.name)) throw new Error("Duplicate registration");
      tools.set(tool.name, tool);
      options?.signal.addEventListener("abort", () => tools.delete(tool.name), { once: true });
      if (style === "return") return { unregister: () => { tools.delete(tool.name); } };
    },
    ...(style === "method" ? { unregisterTool: (name: string) => { tools.delete(name); } } : {}),
  };
  Object.defineProperty(target, "modelContext", { configurable: true, value: context });
  return { tools, call: async (name: string, input: unknown) => {
    const tool = tools.get(name);
    if (!tool) throw new Error("Tool is not registered");
    return JSON.parse(await tool.execute(input));
  }, restore: () => {
    tools.clear();
    if (previous) Object.defineProperty(target, "modelContext", previous);
    else Reflect.deleteProperty(target, "modelContext");
  } };
}
