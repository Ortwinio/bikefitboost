import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { resolve, extname } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { build } from "esbuild";
import { chromium } from "playwright";
import { extendRiderRuntime } from "../final-sweep/rider-fixtures.mjs";
import { extendUsabilityAccountRuntime } from "../usability/extend-runtime.mjs";
import { serveQaAsset } from "../final-sweep/assets.mjs";

const root = "/Users/ortwinverreck/Developer/bikefitboost-webmcp";
const origin = "http://127.0.0.1:3261";
const output = `${root}/plans/feature-webmcp/audit`;
const environment = { ...process.env, NEXT_PUBLIC_CONVEX_URL: "http://127.0.0.1:9",
  NEXT_PUBLIC_CONVEX_SITE_URL: "http://127.0.0.1:9", CONVEX_SITE_URL: "http://127.0.0.1:9",
  NEXT_PUBLIC_SITE_URL: "https://bikefitboost.com", STRIPE_BILLING_ENABLED: "false", NEXT_PUBLIC_STRIPE_BILLING_ENABLED: "false",
  AUTH_RESEND_KEY: "", STRIPE_SECRET_KEY: "", SENTRY_AUTH_TOKEN: "", NEXT_TELEMETRY_DISABLED: "1" };
const production = spawn(process.execPath, [`${root}/node_modules/next/dist/bin/next`, "start", "-p", "3261"],
  { cwd: root, env: environment, stdio: "ignore" });
let fixtureServer, browser;
const records = [];
try {
  let html;
  for (let attempt = 0; attempt < 90; attempt++) {
    try {
      const response = await fetch(`${origin}/nl/login`);
      if (response.ok) { html = await response.text(); break; }
    } catch {}
    await new Promise(done => setTimeout(done, 500));
  }
  assert.ok(html, "Production server did not start");
  const styles = (await Promise.all([...html.matchAll(/href="([^" ]+\.css(?:\?[^" ]*)?)"/g)]
    .map(async match => (await fetch(new URL(match[1], origin))).text()))).join("\n");
  const runtime = `${root}/tests/visual/account-batch1/runtime.jsx`;
  const bundle = await build({ absWorkingDir: root, entryPoints: [`${root}/tests/visual/webmcp/entry.jsx`],
    bundle: true, write: false, format: "esm", platform: "browser", jsx: "automatic", outdir: "/private/tmp/webmcp-fixture",
    define: { "process.env": "{}", "process.env.NODE_ENV": '"production"',
      "process.env.PAID_ACCESS_ENFORCED": '"false"', "process.env.NEXT_PUBLIC_PAID_ACCESS_ENFORCED": '"false"' },
    plugins: [{ name: "offline-dashboard", setup(builder) {
      builder.onLoad({ filter: /account-batch1\/runtime\.jsx$/ }, async () => ({ loader: "jsx", resolveDir: `${root}/tests/visual/account-batch1`,
        contents: extendUsabilityAccountRuntime(extendRiderRuntime(await readFile(runtime, "utf8"),
          `${root}/tests/visual/final-sweep/rider-fixtures.mjs`), { root, batch: "profile" }) }));
      builder.onResolve({ filter: /^(convex\/react|@convex-dev\/auth\/react|next\/navigation|@\/i18n\/request|@sentry\/nextjs)$/ },
        () => ({ path: runtime }));
      builder.onResolve({ filter: /^next\/link$/ }, () => ({ path: `${root}/tests/visual/account-batch1/link.jsx` }));
      builder.onResolve({ filter: /^next\/image$/ }, () => ({ path: `${root}/tests/visual/account-batch1/image.jsx` }));
      builder.onResolve({ filter: /^server-only$/ }, () => ({ path: `${root}/tests/visual/marketing-batch3/empty.js` }));
    } }] });
  fixtureServer = createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    if (await serveQaAsset(request, response, { staticDir: `${root}/.next/static` })) return;
    if (/^\/(brand|illustrations|images|fonts)\//.test(url.pathname)) {
      const asset = resolve(`${root}/public`, `.${url.pathname}`);
      if (!asset.startsWith(`${root}/public/`)) { response.writeHead(404); response.end(); return; }
      try {
        const types = { ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };
        response.setHeader("Content-Type", types[extname(asset)] ?? "application/octet-stream");
        response.end(await readFile(asset));
      } catch { response.writeHead(404); response.end(); }
      return;
    }
    if (url.pathname === "/fixture.js") {
      response.setHeader("Content-Type", "text/javascript"); response.end(bundle.outputFiles.find(file => file.path.endsWith(".js")).text); return;
    }
    if (url.pathname === "/fixture.css") {
      response.setHeader("Content-Type", "text/css"); response.end(styles + bundle.outputFiles.filter(file => file.path.endsWith(".css")).map(file => file.text).join("\n")); return;
    }
    response.setHeader("Content-Type", "text/html");
    response.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>');
  });
  await new Promise(done => fixtureServer.listen(3262, "127.0.0.1", done));
  browser = await chromium.launch({ headless: true });
  for (const locale of ["nl", "en"]) {
    for (const surface of ["public", "dashboard"]) {
      const page = await browser.newPage();
      const pageErrors = [];
      page.on("pageerror", error => pageErrors.push(error.message));
      await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
      if (surface === "public") await page.addInitScript(() => {
        const tools = new Map();
        Object.defineProperty(document, "modelContext", { value: { registerTool(tool) {
          tools.set(tool.name, tool); return { unregister: () => tools.delete(tool.name) };
        } } });
        window.__webmcp = { tools, call: async (name, input) => JSON.parse(await tools.get(name).execute(input)) };
      });
      const url = surface === "public" ? `${origin}/${locale}/calculators/frame-size` : `http://127.0.0.1:3262/${locale}/dashboard`;
      await page.goto(url);
      await page.waitForFunction(() => window.__webmcp?.tools.has("site_get_context"));
      const context = await page.evaluate(() => window.__webmcp.call("site_get_context", {}));
      assert.equal(context.ok, true); assert.equal(context.data.locale, locale);
      assert.equal(context.data.signedIn, surface === "dashboard");
      const denied = await page.evaluate(() => window.__webmcp.call("site_navigate", { destination: "checkout" }));
      assert.equal(denied.error.code, "NOT_FOUND");
      const toolNames = await page.evaluate(() => [...window.__webmcp.tools.keys()]);
      if (surface === "public") assert.ok(toolNames.every(name => name.startsWith("site_") || name.startsWith("calc_")));
      else {
        await page.evaluate(() => window.dispatchEvent(new Event("webmcp-pause")));
        await page.waitForFunction(() => window.__webmcp.tools.size === 0);
      }
      records.push({ locale, surface, tools: toolNames, context: "pass", forbiddenNavigation: "pass", pause: surface === "dashboard" ? "pass" : "not applicable" });
      assert.deepEqual(pageErrors, [], `${locale} ${surface} page errors`);
      await page.close();
    }
  }
  const unsupported = await browser.newPage();
  const requests = [];
  unsupported.on("request", request => requests.push(request.url()));
  await unsupported.goto(`${origin}/nl/calculators/frame-size`);
  await unsupported.waitForTimeout(1500);
  const initialScripts = await unsupported.locator("script[src]").evaluateAll(nodes => nodes.map(node => node.src));
  for (const url of new Set([...initialScripts, ...requests.filter(url => url.includes(".js"))])) {
    const source = await (await fetch(url)).text();
    assert.ok(!source.includes("webmcp_tool_called"), "Bridge is in an initial chunk");
    assert.ok(!source.includes("site_get_context"), "Site pack is in an initial chunk");
  }
  await unsupported.close();
  await mkdir(output, { recursive: true });
  await writeFile(`${output}/W1-browser.json`, JSON.stringify({ scope: "Real Next public page; real dashboard component with offline auth/query fixtures. No real session/backend/agent proof.",
    records, bundle: { initialScriptCount: initialScripts.length, noBridgeOrPackInInitialScripts: true, requestedScripts: requests.filter(url => url.includes(".js")).length } }, null, 2) + "\n");
  console.log("PASS: four NL/EN page checks; initial script scan excludes bridge and site pack");
} finally {
  await browser?.close();
  if (fixtureServer) await new Promise(done => fixtureServer.close(done));
  production.kill("SIGTERM");
}
