export interface BrowserTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: true; untrustedContentHint: boolean };
  execute: (input: unknown, options?: { signal?: AbortSignal }) => Promise<string>;
}
interface ModelContext {
  registerTool: (tool: BrowserTool, options?: { signal: AbortSignal }) =>
    void | { unregister: () => void } | Promise<void | { unregister: () => void }>;
  unregisterTool?: (name: string) => void;
}

export function getModelContext(): ModelContext | undefined {
  if (typeof document === "undefined") return undefined;
  const context = (document as Document & { modelContext?: ModelContext }).modelContext ??
    (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
  return typeof context?.registerTool === "function" ? context : undefined;
}

export async function registerBrowserTool(tool: BrowserTool): Promise<() => void> {
  const context = getModelContext();
  if (!context) return () => {};
  const controller = new AbortController();
  const registration = await context.registerTool(tool, { signal: controller.signal });
  let removed = false;
  return () => {
    if (removed) return;
    removed = true;
    if (registration?.unregister) registration.unregister();
    else if (context.unregisterTool) context.unregisterTool(tool.name);
    else controller.abort();
  };
}
