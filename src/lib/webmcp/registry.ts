import type { Pack, Tool } from "./types";

export const packLoaders = {
  "src/components/reliability/body.webmcp.ts": () => import("@/components/reliability/body.webmcp"),
  "src/app/(public)/calculators/saddle-height/saddle.webmcp.ts": () => import("@/app/(public)/calculators/saddle-height/saddle.webmcp"),
  "src/app/(public)/calculators/power-speed/performance.webmcp.ts": () => import("@/app/(public)/calculators/power-speed/performance.webmcp"),
  "src/components/features/pressure/pressure.webmcp.ts": () => import("@/components/features/pressure/pressure.webmcp"),
  "src/app/(dashboard)/dashboard/dashboard.webmcp.ts": () => import("@/app/(dashboard)/dashboard/dashboard.webmcp"),
  "src/components/layout/webmcp/site.webmcp.ts": () => import("@/components/layout/webmcp/site.webmcp"),
} satisfies Record<string, () => Promise<{ default: Pack }>>;

export async function loadTools(): Promise<Tool[]> {
  const packs = await Promise.all(Object.values(packLoaders).map(async load => (await load()).default));
  const tools = packs.flatMap(pack => pack.tools.map(tool => ({ ...tool, placement: tool.placement ?? pack.placement })));
  if (new Set(tools.map(tool => tool.name)).size !== tools.length) throw new Error("Duplicate WebMCP tool name");
  return tools;
}
