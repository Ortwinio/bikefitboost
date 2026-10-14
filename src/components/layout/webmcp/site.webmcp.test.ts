import { expect, it, vi } from "vitest";
import pack from "./site.webmcp";
import { runTestTool } from "@/lib/webmcp/testing";
const find = (name: string) => pack.tools.find(tool => tool.name === name)!;
it("returns only compact current context and no account identity", async () => {
  const result = await runTestTool(find("site_get_context"), {}, { scopeKey: "private-id", pathname: "/nl/calculators" });
  expect(result).toMatchObject({ ok: true, data: { signedIn: false, locale: "nl" } });
  expect(JSON.stringify(result)).not.toContain("private-id");
});
it.each(["nl", "en"] as const)("navigates only safe reachable ids in %s", async locale => {
  const navigate = vi.fn();
  expect(await runTestTool(find("site_navigate"), { destination: "frame-size" }, { locale, navigate })).toMatchObject({ ok: true });
  expect(navigate).toHaveBeenCalledWith(`/${locale}/calculators/frame-size`);
  for (const destination of ["checkout", "admin", "https://other.invalid", "dashboard"]) {
    expect(await runTestTool(find("site_navigate"), { destination }, { locale, navigate }))
      .toMatchObject({ error: { code: "NOT_FOUND" } });
  }
});
it("lists only public destinations while signed out and discovers reachable tools", async () => {
  const list = await runTestTool(find("site_list_destinations"), {});
  expect(JSON.stringify(list)).not.toContain("/settings");
  const tools = pack.tools.map(tool => ({ ...tool, placement: pack.placement }));
  expect(await runTestTool(find("site_find_tools"), { query: "context" }, { tools: () => tools }))
    .toMatchObject({ ok: true, data: [{ name: "site_get_context", here: true }] });
});
