import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { defineWebMcpTool, listLimit } from "./define";
import { createTestToolContext, runTestTool } from "./testing";
import { runTool } from "./pipeline";
import { matchesPlacement, onRoutes } from "./placement";

const tool = defineWebMcpTool({ name: "site_test", description: "Returns a test summary.", risk: "read",
  scope: "public", inputSchema: z.object({ limit: listLimit }).strict(),
  execute: input => ({ summary: "Read complete.", data: input }) });

describe("WebMCP foundation", () => {
  it("validates defaults, strict input, bounds and described fields", async () => {
    expect(await runTestTool(tool, {})).toMatchObject({ ok: true, data: { limit: 20 } });
    for (const input of [{ limit: 101 }, { userId: "not-accepted" }, { limit: "20" }]) {
      expect(await runTestTool(tool, input)).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
    }
    expect(() => defineWebMcpTool({ ...tool, inputSchema: z.object({ email: z.string().describe("Email") }).strict() }))
      .toThrow("Forbidden");
    expect(() => defineWebMcpTool({ ...tool, inputSchema: z.object({}) })).toThrow("strict");
  });
  it("guards authentication, loading, opt-out and stale scopes", async () => {
    expect(await runTestTool({ ...tool, scope: "user" }, {})).toMatchObject({ error: { code: "NOT_AUTHENTICATED" } });
    expect(await runTestTool(tool, {}, { loading: true })).toMatchObject({ error: { code: "SCOPE_LOADING" } });
    expect(await runTestTool(tool, {}, { enabled: false })).toMatchObject({ error: { code: "PAUSED" } });
    expect(await runTool(tool, {}, () => createTestToolContext(), "other"))
      .toMatchObject({ error: { code: "SCOPE_CHANGED" } });
  });
  it("bounds output and hides raw failures", async () => {
    expect(await runTestTool({ ...tool, execute: () => ({ summary: "x".repeat(16_000) }) }, {}))
      .toMatchObject({ error: { code: "LIMIT_EXCEEDED" } });
    const result = await runTestTool({ ...tool, execute: () => { throw new Error("private error"); } }, {});
    expect(result).toMatchObject({ error: { code: "UNKNOWN" } });
    expect(JSON.stringify(result)).not.toContain("private");
  });
  it("sanitizes unexpected schema refinement exceptions", async () => {
    const inputSchema = z.object({ value: z.string().describe("A value.").refine(() => { throw new Error("private validation detail"); }) }).strict();
    const result = await runTestTool({ ...tool, inputSchema }, { value: "test" });
    expect(result).toMatchObject({ error: { code: "INVALID_INPUT" } });
    expect(JSON.stringify(result)).not.toContain("private validation detail");
  });
  it("blocks a public tool from reading the account", async () => {
    const query = vi.fn();
    const publicRead = { ...tool, execute: async (_input: unknown, context: ReturnType<typeof createTestToolContext>) => {
      await context.query({} as Parameters<typeof context.query>[0], {});
      return { summary: "read" };
    } };
    expect(await runTestTool(publicRead, {}, { query, signedIn: true })).toMatchObject({ error: { code: "FORBIDDEN" } });
    expect(query).not.toHaveBeenCalled();
  });
  it("enforces four reads across calls and masks changed-account results", async () => {
    let resolve!: () => void;
    const wait = new Promise<void>(done => { resolve = done; });
    const context = createTestToolContext();
    const pending = { ...tool, execute: async () => { await wait; return { summary: "done" }; } };
    const calls = Array.from({ length: 4 }, () => runTool(pending, {}, () => context, "public"));
    expect(await runTestTool(tool, {})).toMatchObject({ error: { code: "BUSY" } });
    context.scopeKey = "changed";
    resolve();
    for (const result of await Promise.all(calls)) expect(result).toMatchObject({ error: { code: "SCOPE_CHANGED" } });
  });
  it("cancels pending calls and marks rider-written output untrusted", async () => {
    const controller = new AbortController();
    const execute = vi.fn(async (_input, context) => {
      await new Promise<void>(resolve => context.signal.addEventListener("abort", () => resolve(), { once: true }));
      return { summary: "done" };
    });
    const pending = runTestTool({ ...tool, execute }, {}, { signal: controller.signal });
    await Promise.resolve();
    controller.abort();
    expect(await pending).toMatchObject({ error: { code: "CANCELLED" } });
    expect(await runTestTool({ ...tool, untrustedContent: true }, {})).toMatchObject({ untrustedContent: true });
  });
  it("matches locale paths and record segments, never forbidden surfaces", () => {
    expect(matchesPlacement(onRoutes("/bikes/[bikeId]"), "/nl/bikes/fixture")).toBe(true);
    for (const sibling of ["new", "compare-fit", "import"]) {
      expect(matchesPlacement(onRoutes("/bikes/[bikeId]"), `/nl/bikes/${sibling}`)).toBe(false);
    }
    expect(matchesPlacement(onRoutes("/bikes"), "/en/bikes/new")).toBe(false);
    for (const path of ["/nl/admin", "/en/checkout", "/api/data", "/nl/login", "/nl/gifts", "/nl/bikes?x=1"]) {
      expect(matchesPlacement("global", path)).toBe(false);
    }
  });
});
