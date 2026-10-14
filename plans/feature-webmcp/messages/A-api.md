# W1 API contract

DONE W1. Foundation modules are under `src/lib/webmcp/`. Six foundation tests and the initial API typecheck pass. API is stable; no work is delegated by this note. Browser integration and full gates continue under W1-FULL.

- `defineWebMcpTool` from `define.ts`: `{ name, description, risk: 'read', scope: 'public' | 'user', inputSchema: z.object({...}).strict(), execute(input, ctx), placement?, untrustedContent? }`. Input inference comes from the Zod schema. Every property needs `.describe()` (max150); names domain-prefixed, max40; descriptions English max500.
- `execute` returns `{ summary: string, data?: unknown }`. Runtime envelope `{ ok: true, summary, data?, untrustedContent? }` or `{ ok: false, summary, error: { code, paths? } }`. Oversize results fail LIMIT_EXCEEDED; do not truncate paginated rows silently.
- `ctx`: `locale`, `pathname`, `signedIn`, `loading`, `enabled`, internal `scopeKey`, `signal`, typed `query` (same signature as ConvexReactClient.query), `navigate(path)`, `tools()`. No mutation/action capability. Session identity never input/output. `ctx.query(api.existing.queries.name, args)` must use UI owner-checked reads; public tools must not call it.
- `defineWebMcpPack({ id, placement, tools })` default export from a feature-owned `*.webmcp.ts`. Placement `'global'` is for site only; `onRoutes('/calculators', '/calculators/frame-size')` from `placement.ts`, or `{routes: [{path:'/bikes',prefix:true}]}`. Locale prefixes stripped; `[bikeId]` matches one nonempty segment. Tool placement overrides pack placement.
- `listLimit` from `define.ts`: described integer default20/max100. `ToolError` from `pipeline.ts` accepts public codes NOT_FOUND/FORBIDDEN/etc; unrecognized errors become UNKNOWN without raw details.
- `runTestTool(tool,input,partialContext?)`, `createTestToolContext(partialContext?)`, `installFakeModelContext(target?,style?)` from `testing.ts`. Set signedIn:true and mock query for user tools. Real pipeline always runs. Registration styles: return/method/signal.
- A owns explicit lazy registry `registry.ts`. Tell the lead your pack import paths and placement once ready; do not edit the shared registry concurrently. Registry will load packs lazily only after browser API detection; no pack code in initial chunks.
- Navigation must use allowlisted safe paths, no writes on arrival, query parameters, admin/auth/payment/download/consent endpoints. Prefix order remains `bikes_open_*`, `fit_open_*`, `account_open_*`.

No shared reference docs are copied into this repository.
