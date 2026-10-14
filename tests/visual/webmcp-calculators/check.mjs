import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { relative } from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";

const root = "/Users/ortwinverreck/Developer/bikefitboost-webmcp";
const folder = `${root}/tests/visual/webmcp-calculators`;
const outdir = `${folder}/.memory`;
const bundle = await build({
  absWorkingDir: root, entryPoints: [`${folder}/entry.jsx`], outdir, bundle: true, write: false,
  format: "esm", splitting: true, platform: "browser", jsx: "automatic", metafile: true,
  define: { "process.env": "{}", "process.env.NODE_ENV": '"production"' },
  plugins: [{ name: "offline-runtime", setup(builder) {
    builder.onResolve({ filter: /^(convex\/react|next\/navigation)$/ }, () => ({ path: `${folder}/runtime.jsx` }));
    builder.onResolve({ filter: /^next\/link$/ }, () => ({ path: `${root}/tests/visual/account-batch1/link.jsx` }));
    builder.onResolve({ filter: /^next\/image$/ }, () => ({ path: `${root}/tests/visual/account-batch1/image.jsx` }));
  } }],
});
const files = new Map(bundle.outputFiles.map(file => [`/${relative(outdir, file.path)}`, file.contents]));
const server = createServer((request, response) => {
  const path = new URL(request.url, "http://localhost").pathname;
  if (request.method !== "GET") { response.writeHead(405); response.end(); return; }
  if (files.has(path)) {
    response.setHeader("Content-Type", path.endsWith(".css") ? "text/css" : "text/javascript");
    response.end(files.get(path));
  } else if (/^\/(en|nl)\/(calculators\/frame-size|dashboard)$/.test(path)) {
    response.setHeader("Content-Type", "text/html");
    response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; worker-src 'none'; form-action 'none'");
    response.end('<!doctype html><html><head><meta charset="utf-8"><title>Local WebMCP check</title></head><body><div id="root"></div><script type="module" src="/entry.js"></script></body></html>');
  } else { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const results = [];
try {
  for (const locale of ["nl", "en"]) {
    for (const surface of ["calculators/frame-size", "dashboard"]) {
      const context = await browser.newContext({ serviceWorkers: "block" });
      const errors = [];
      await context.route("**/*", route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin === origin && request.method() === "GET" && ["document", "script", "stylesheet"].includes(request.resourceType())) {
          return route.continue();
        }
        errors.push(`Blocked request: ${url.pathname}`);
        return route.abort();
      });
      await context.routeWebSocket(/.*/, socket => { errors.push("Unexpected WebSocket"); socket.close(); });
      const page = await context.newPage();
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${origin}/${locale}/${surface}`);
      const tool = surface === "dashboard" ? "account_get_profile_summary" : "calc_frame_size";
      await page.waitForFunction(name => window.__webmcp?.names().includes(name), tool);
      const state = await page.evaluate(async ({ tool, locale, surface }) => {
        const beforeStorage = JSON.stringify({ ...sessionStorage });
        const beforeText = document.body.textContent;
        const result = await window.__webmcp.call(tool, tool.startsWith("calc_") ? { heightCm: 190 } : {});
        const annotations = window.__webmcp.annotations(tool);
        const unchanged = beforeStorage === JSON.stringify({ ...sessionStorage }) && beforeText === document.body.textContent;
        const registered = window.__webmcp.names();
        if (surface !== "dashboard") {
          if (window.__queryCalls.length) throw new Error("Public tool accessed account data");
          const invalid = await window.__webmcp.call(tool, { heightCm: 190, userId: "injected" });
          if (invalid.error?.code !== "INVALID_INPUT") throw new Error("Unknown field accepted");
        }
        return { tool, locale, surface, result, annotations, unchanged, registered };
      }, { tool, locale, surface });
      assert.equal(state.result.ok, true);
      assert.equal(state.unchanged, true);
      assert.equal(state.annotations.readOnlyHint, true);
      if (surface === "dashboard") assert.equal(state.result.data.measurements.heightCm, 178);
      else assert.equal(state.result.data.results.frameSize.value,
        await page.locator('[data-reliability-result="frameSize"] [data-usability="result-value"]').innerText());
      assert.deepEqual(state.registered.filter(name => name.startsWith("calc_")),
        surface === "dashboard" ? [] : ["calc_frame_size"]);
      const navigation = await page.evaluate(async () => {
        await window.__webmcp.call("site_navigate", { destination: "saddle-height" });
        return location.pathname;
      });
      assert.equal(navigation, `/${locale}/calculators/saddle-height`);
      await page.waitForFunction(() => {
        const names = window.__webmcp.names().filter(name => name.startsWith("calc_"));
        return names.length === 1 && names[0] === "calc_saddle_height";
      });
      assert.deepEqual(errors, []);
      results.push({ locale, surface, passed: true, tool, readOnlyHint: true, noDataWrites: true,
        navigationUnregisteredStaleTools: true });
      await context.close();
    }
  }
  const page = await browser.newPage();
  const scripts = [];
  page.on("request", request => { if (request.resourceType() === "script") scripts.push(request.url()); });
  await page.goto(`${origin}/en/calculators/frame-size?unsupported=1`, { waitUntil: "networkidle" });
  assert.equal(await page.evaluate(() => window.__webmcp), undefined);
  assert.equal(scripts.some(url => /Bridge-|body\.webmcp-|performance\.webmcp-|saddle\.webmcp-|pressure\.webmcp-/.test(url)), false);
  results.push({ surface: "unsupported-browser", passed: true, noLazyBridgeOrPackRequests: true });
  await mkdir(`${root}/plans/feature-webmcp/audit`, { recursive: true });
  await writeFile(`${root}/plans/feature-webmcp/audit/W2-browser.json`, JSON.stringify({
    fixture: "Production detector, bridge, registry, packs and public frame form; local auth/query/router substitutes.",
    limitations: "Not a real Chrome origin-trial agent or live authenticated dashboard; no production services used.", results,
  }, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
