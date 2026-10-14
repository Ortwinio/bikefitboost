"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useConvex, useConvexAuth, useQuery } from "convex/react";
import { z } from "zod";
import { api } from "../../../convex/_generated/api";
import { extractLocaleFromPathname, isProtectedAppPath } from "@/i18n/navigation";
import { canTrackMarketing } from "@/lib/cookieConsent";
import { pushDataLayerEvent } from "@/lib/analytics/marketing";
import { isAllowedPage, matchesPlacement } from "./placement";
import { isSafeNavigation } from "./destinations";
import { registerBrowserTool } from "./modelContext";
import { loadTools } from "./registry";
import { runTool, ToolError, toolFailure } from "./pipeline";
import type { Tool, ToolContext } from "./types";

export function WebMcpBridge() {
  const pathname = usePathname();
  const router = useRouter();
  const convex = useConvex();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.queries.getCurrentUser, isAuthenticated ? {} : "skip");
  const [pausedFor, setPausedFor] = useState<string | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const locale = extractLocaleFromPathname(pathname) ?? "nl";
  const scopeKey = `${isAuthenticated ? user?._id ?? "loading" : "public"}:${locale}`;
  const loading = isLoading || (isAuthenticated && user === undefined);
  const enabled = isAllowedPage(pathname) && !loading && (isAuthenticated
    ? Boolean(user) && user?.agentToolsEnabled !== false && pausedFor !== scopeKey : !isProtectedAppPath(pathname));
  const lifetime = useRef(new AbortController());
  const registrationQueue = useRef(Promise.resolve());
  const live = useRef<ToolContext | null>(null);

  useLayoutEffect(() => {
    if (live.current?.scopeKey !== scopeKey || !enabled || lifetime.current.signal.aborted) {
      lifetime.current.abort();
      lifetime.current = new AbortController();
    }
    live.current = {
      locale, pathname, signedIn: isAuthenticated, loading, enabled, scopeKey, signal: lifetime.current.signal,
      query: (reference, args) => convex.query(reference, args),
      navigate: path => {
        if (!isSafeNavigation(path, isAuthenticated, locale)) throw new ToolError("FORBIDDEN");
        router.push(path);
      },
      tools: () => tools.filter(tool => tool.scope !== "user" || isAuthenticated),
    };
  }, [convex, enabled, isAuthenticated, loading, locale, pathname, router, scopeKey, tools]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void loadTools().then(loaded => { if (active) setTools(loaded); }).catch(() => {});
    return () => { active = false; };
  }, [enabled, scopeKey]);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      if (!isAuthenticated) return;
      setPausedFor(scopeKey);
      try {
        const currentUser = await convex.query(api.users.queries.getCurrentUser, {});
        if (alive) setPausedFor(!currentUser || currentUser.agentToolsEnabled === false ? scopeKey : null);
      } catch {}
    };
    const pause = () => {
      lifetime.current.abort();
      if (live.current) live.current.enabled = false;
      setPausedFor(scopeKey);
    };
    window.addEventListener("webmcp-pause", pause);
    window.addEventListener("webmcp-refresh", refresh);
    let channel: BroadcastChannel | undefined;
    try {
      channel = new BroadcastChannel("bikefitboost-agent-tools");
      channel.onmessage = () => { pause(); void refresh(); };
    } catch {}
    return () => {
      alive = false;
      channel?.close();
      window.removeEventListener("webmcp-pause", pause);
      window.removeEventListener("webmcp-refresh", refresh);
    };
  }, [convex, isAuthenticated, scopeKey]);

  useEffect(() => {
    let active = true;
    const unregister: (() => void)[] = [];
    if (enabled) registrationQueue.current = registrationQueue.current.then(async () => {
      for (const tool of tools) {
        if (!active) break;
        if ((tool.scope === "user" && !isAuthenticated) || !matchesPlacement(tool.placement, pathname)) continue;
        const remove = await registerBrowserTool({
          name: tool.name, description: tool.description,
          inputSchema: z.toJSONSchema(tool.inputSchema, { io: "input" }),
          annotations: { readOnlyHint: true, untrustedContentHint: Boolean(tool.untrustedContent) },
          execute: async (input, options) => {
            if (!active || !live.current) return JSON.stringify(toolFailure("SCOPE_CHANGED"));
            if (!matchesPlacement(tool.placement, live.current.pathname)) return JSON.stringify(toolFailure("FORBIDDEN"));
            const result = await runTool(tool, input, () => live.current!, scopeKey, options?.signal);
            if (canTrackMarketing()) pushDataLayerEvent({ event: "webmcp_tool_called", tool: tool.name,
              outcome: result.ok ? "success" : result.error.code });
            return JSON.stringify(result);
          },
        });
        if (active) unregister.push(remove);
        else remove();
      }
    }).catch(() => { unregister.forEach(remove => remove()); });
    return () => { active = false; unregister.forEach(remove => remove()); };
  }, [enabled, isAuthenticated, pathname, scopeKey, tools]);

  useEffect(() => () => { lifetime.current.abort(); }, []);
  return null;
}
