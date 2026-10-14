import type { z } from "zod";
import type { ConvexReactClient } from "convex/react";
import type { Locale } from "@/i18n/config";

export type Placement = "global" | { routes: readonly (string | { path: string; prefix?: boolean })[] };
export type ToolResult = { summary: string; data?: unknown; untrustedContent?: boolean };
export type ErrorCode = "SCOPE_LOADING" | "SCOPE_CHANGED" | "NOT_AUTHENTICATED" | "PAUSED" |
  "BUSY" | "INVALID_INPUT" | "CANCELLED" | "NOT_FOUND" | "FORBIDDEN" | "LIMIT_EXCEEDED" | "UNKNOWN";
export type Envelope = ({ ok: true } & ToolResult) | {
  ok: false; summary: string; error: { code: ErrorCode; paths?: string[] };
};
export interface ToolContext {
  locale: Locale;
  pathname: string;
  signedIn: boolean;
  loading: boolean;
  enabled: boolean;
  scopeKey: string;
  signal: AbortSignal;
  query: ConvexReactClient["query"];
  navigate: (path: string) => void;
  tools: () => readonly Tool[];
}
export interface Tool {
  name: string;
  description: string;
  risk: "read";
  scope: "public" | "user";
  inputSchema: z.ZodObject;
  placement?: Placement;
  untrustedContent?: boolean;
  execute: (input: unknown, context: ToolContext) => Promise<ToolResult> | ToolResult;
}
export interface Pack { id: string; placement: Placement; tools: readonly Tool[] }
