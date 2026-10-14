import assert from "node:assert/strict";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const root = "/Users/ortwinverreck/Developer/bikefitboost-webmcp";
const buildId = (await readFile(`${root}/.next/BUILD_ID`, "utf8")).trim();
const markers = ["public-body-calculators", "public-saddle-height", "public-performance-calculators",
  "public-tire-pressure", "Four reads are already running", "webmcp_tool_called"];
const routes = ["(public)/calculators/frame-size", "(public)/calculators/saddle-height",
  "(public)/calculators/saddle-width", "(public)/calculators/crank-length", "(public)/calculators/bike-fit",
  "(public)/calculators/gearing", "(public)/calculators/power-speed", "(public)/calculators/climb-planner",
  "(public)/calculators/ftp-wkg", "(public)/calculators/fuel-hydration", "(public)/tire-pressure-calculator",
  "(public)/bandenspanning-calculator", "(dashboard)/dashboard"];
const results = [];
for (const route of routes) {
  const box = {};
  runInNewContext(await readFile(`${root}/.next/server/app/${route}/page_client-reference-manifest.js`, "utf8"), box);
  const manifest = Object.values(box.__RSC_MANIFEST)[0];
  const chunks = [...new Set(Object.values(manifest.clientModules).flatMap(module => module.chunks)
    .filter(path => path.endsWith(".js")))];
  assert(chunks.length > 0, `No initial client chunks: ${route}`);
  const source = (await Promise.all(chunks.map(path => readFile(`${root}/.next/${path}`, "utf8")))).join("\n");
  for (const marker of markers) assert(!source.includes(marker), `Eager WebMCP implementation in ${route}: ${marker}`);
  assert(Object.keys(manifest.clientModules).some(path => path.endsWith("/lib/webmcp/detect.tsx")),
    `Missing detector: ${route}`);
  results.push({ route, initialChunksChecked: chunks.length, noBridgePipelineOrPacks: true });
}
async function javascript(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? javascript(`${directory}/${entry.name}`)
    : entry.name.endsWith(".js") ? [`${directory}/${entry.name}`] : []))).flat();
}
const sources = (await Promise.all((await javascript(`${root}/.next/static/chunks`))
  .map(path => readFile(path, "utf8")))).join("\n");
for (const marker of markers) assert(sources.includes(marker), `Missing lazy implementation: ${marker}`);
const result = { buildId, method: "Conservative union of manifest client-module chunks; pack/pipeline/bridge markers must exist only outside those chunks.", results };
await writeFile(`${root}/plans/feature-webmcp/audit/W2-bundle.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
