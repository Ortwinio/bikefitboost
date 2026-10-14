import { z } from "zod";
import { assertSafeSchema, forbiddenIdentifier, toolNamePattern } from "./denylist";
import type { Pack, Tool, ToolContext, ToolResult } from "./types";

export function defineWebMcpTool<Shape extends z.ZodRawShape>(definition: Omit<Tool, "inputSchema" | "execute"> & {
  inputSchema: z.ZodObject<Shape>;
  execute: (input: z.output<z.ZodObject<Shape>>, context: ToolContext) => Promise<ToolResult> | ToolResult;
}): Tool {
  if (!toolNamePattern.test(definition.name) || definition.name.length > 40 || forbiddenIdentifier.test(definition.name)) {
    throw new Error("Invalid WebMCP tool name");
  }
  if (definition.risk !== "read" || !definition.description.length || definition.description.length > 500) {
    throw new Error("Invalid WebMCP read tool");
  }
  const schema = z.toJSONSchema(definition.inputSchema, { io: "input" });
  assertSafeSchema(schema);
  return { ...definition, execute: (input, context) => definition.execute(input as z.output<z.ZodObject<Shape>>, context) };
}

export function defineWebMcpPack(pack: Pack): Pack {
  if (!/^[a-z][a-z0-9-]*$/.test(pack.id) || !pack.placement || !pack.tools.length) {
    throw new Error("Invalid WebMCP pack");
  }
  return pack;
}

export const listLimit = z.number().int().min(1).max(100).default(20).describe("Maximum results; defaults to 20, at most 100.");
