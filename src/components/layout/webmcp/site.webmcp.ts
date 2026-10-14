import { z } from "zod";
import { defineWebMcpPack, defineWebMcpTool, listLimit } from "@/lib/webmcp/define";
import { availableDestinations } from "@/lib/webmcp/destinations";
import { matchesPlacement } from "@/lib/webmcp/placement";
import { ToolError } from "@/lib/webmcp/pipeline";

const context = defineWebMcpTool({ name: "site_get_context", risk: "read", scope: "public",
  description: "Returns the current locale, sign-in state, page pathname and names of tools available here.",
  inputSchema: z.object({}).strict(), execute: (_input, ctx) => ({ summary: "Current page context.",
    data: { locale: ctx.locale, signedIn: ctx.signedIn, page: ctx.pathname,
      tools: ctx.tools().filter(tool => matchesPlacement(tool.placement, ctx.pathname)).map(tool => tool.name) } }) });
const list = defineWebMcpTool({ name: "site_list_destinations", risk: "read", scope: "public",
  description: "Returns safe destination ids and localized page URLs. Use an id with site_navigate.",
  inputSchema: z.object({ limit: listLimit }).strict(), execute: (input, ctx) => ({ summary: "Available destinations.",
    data: availableDestinations(ctx.signedIn, ctx.locale).slice(0, input.limit) }) });
const navigate = defineWebMcpTool({ name: "site_navigate", risk: "read", scope: "public",
  description: "Opens a safe destination by id and returns its page URL. Does not submit forms or change stored data.",
  inputSchema: z.object({ destination: z.string().min(1).max(60).describe("Destination id from site_list_destinations.") }).strict(),
  execute: (input, ctx) => {
    const destination = availableDestinations(ctx.signedIn, ctx.locale).find(item => item.id === input.destination);
    if (!destination) throw new ToolError("NOT_FOUND");
    ctx.navigate(destination.path);
    return { summary: "Opened the selected page.", data: { page: destination.path } };
  } });
const find = defineWebMcpTool({ name: "site_find_tools", risk: "read", scope: "public",
  description: "Finds accessible tools by name or description and returns their destination ids and availability on this page.",
  inputSchema: z.object({ query: z.string().max(100).default("").describe("Words to match in a tool name or description."), limit: listLimit }).strict(),
  execute: (input, ctx) => ({ summary: "Matching tools on reachable pages.", data: ctx.tools().flatMap(tool => {
    if (!`${tool.name} ${tool.description}`.toLowerCase().includes(input.query.toLowerCase())) return [];
    const here = matchesPlacement(tool.placement, ctx.pathname);
    const where = availableDestinations(ctx.signedIn, ctx.locale)
      .filter(destination => matchesPlacement(tool.placement, destination.path)).map(destination => destination.id);
    return here || where.length ? [{ name: tool.name, oneLine: tool.description, risk: tool.risk, here, where }] : [];
  }).slice(0, input.limit) }) });

export default defineWebMcpPack({ id: "site", placement: "global", tools: [context, list, navigate, find] });
