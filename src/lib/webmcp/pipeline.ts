import { MAX_OUTPUT_CHARS, MAX_READS } from "./denylist";
import type { Envelope, ErrorCode, Tool, ToolContext } from "./types";

const messages: Record<ErrorCode, string> = {
  SCOPE_LOADING: "Account is loading.", SCOPE_CHANGED: "Account changed. Try again.",
  NOT_AUTHENTICATED: "Sign in to read your account.", PAUSED: "Agent tools are switched off.",
  BUSY: "Four reads are already running. Try again shortly.", INVALID_INPUT: "Check the listed input fields.",
  CANCELLED: "The read was cancelled.", NOT_FOUND: "The requested record is unavailable.",
  FORBIDDEN: "This read is not allowed.", LIMIT_EXCEEDED: "Request fewer results.", UNKNOWN: "The read could not be completed.",
};
export class ToolError extends Error {
  constructor(public readonly code: ErrorCode) { super(code); }
}
export function toolFailure(code: ErrorCode, paths?: string[]): Envelope {
  return { ok: false, summary: messages[code], error: { code, ...(paths ? { paths } : {}) } };
}
let activeReads = 0;

export async function runTool(tool: Tool, input: unknown, getContext: () => ToolContext,
  registeredScope: string, signal?: AbortSignal): Promise<Envelope> {
  const context = getContext();
  const guard = () => {
    const current = getContext();
    if (current.loading) return "SCOPE_LOADING";
    if (current.scopeKey !== registeredScope) return "SCOPE_CHANGED";
    if (!current.enabled) return "PAUSED";
    if (tool.scope === "user" && !current.signedIn) return "NOT_AUTHENTICATED";
    return null;
  };
  const failure = guard();
  if (failure) return toolFailure(failure);
  if (activeReads >= MAX_READS) return toolFailure("BUSY");
  let parsed;
  try { parsed = tool.inputSchema.safeParse(input); }
  catch { return toolFailure("INVALID_INPUT"); }
  if (!parsed.success) return toolFailure("INVALID_INPUT", parsed.error.issues.slice(0, 20)
    .map(issue => issue.path.map(part => typeof part === "number" ? "[]" : String(part)).join(".").slice(0, 150)));
  const combined = AbortSignal.any([context.signal, ...(signal ? [signal] : [])]);
  if (combined.aborted) return toolFailure("CANCELLED");
  activeReads++;
  let onAbort: () => void = () => {};
  const execution = Promise.resolve().then(() => {
    combined.throwIfAborted();
    return tool.execute(parsed.data, { ...context, signal: combined,
      query: async (reference, args) => {
        combined.throwIfAborted();
        const changed = guard();
        if (changed) throw new ToolError(changed);
        if (tool.scope !== "user") throw new ToolError("FORBIDDEN");
        return context.query(reference, args);
      },
      navigate: path => {
        combined.throwIfAborted();
        const changed = guard();
        if (changed) throw new ToolError(changed);
        context.navigate(path);
      },
    });
  }).finally(() => { activeReads--; });
  try {
    const result = await Promise.race([execution, new Promise<never>((_, reject) => {
      onAbort = () => reject(new ToolError("CANCELLED"));
      combined.addEventListener("abort", onAbort, { once: true });
    })]);
    const changed = guard();
    if (changed) return toolFailure(changed);
    const envelope: Envelope = { ok: true, ...result, ...(tool.untrustedContent ? { untrustedContent: true } : {}) };
    if (typeof result.summary !== "string" || JSON.stringify(envelope).length > MAX_OUTPUT_CHARS) {
      return toolFailure("LIMIT_EXCEEDED");
    }
    return envelope;
  } catch (error) {
    return toolFailure(combined.aborted ? "CANCELLED" : error instanceof ToolError ? error.code : "UNKNOWN");
  } finally {
    combined.removeEventListener("abort", onAbort);
  }
}
