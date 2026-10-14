"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Locale } from "@/i18n/config";
import { agentToolsCopy } from "@/i18n/account/agentTools";

export function AgentToolsSettings({ locale, enabled }: { locale: Locale; enabled?: boolean }) {
  const save = useMutation(api.users.mutations.setAgentToolsEnabled);
  const [status, setStatus] = useState<"saving" | "saved" | "failed" | null>(null);
  const copy = agentToolsCopy[locale];
  return <section className="rounded-2xl border border-border bg-muted/40 p-4" aria-labelledby="agent-tools-title">
    <h3 id="agent-tools-title" className="font-semibold text-foreground">{copy.title}</h3>
    <p id="agent-tools-description" className="mt-2 text-sm text-muted-foreground">{copy.description}</p>
    <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 text-foreground">
      <input type="checkbox" role="switch" checked={enabled !== false} disabled={status === "saving"}
        aria-describedby="agent-tools-description" className="size-5 accent-primary"
        onChange={async event => {
          const next = event.target.checked;
          setStatus("saving");
          window.dispatchEvent(new Event("webmcp-pause"));
          try {
            await save({ enabled: next });
            setStatus("saved");
            try {
              const channel = new BroadcastChannel("bikefitboost-agent-tools");
              channel.postMessage({ type: "changed" });
              channel.close();
            } catch {}
          } catch { setStatus("failed"); }
          finally { window.dispatchEvent(new Event("webmcp-refresh")); }
        }} />
      <span>{copy.label}</span>
    </label>
    <p role="status" className="min-h-5 text-sm text-muted-foreground">{status ? copy[status] : ""}</p>
  </section>;
}
