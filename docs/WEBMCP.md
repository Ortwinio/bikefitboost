# BikeFitBoost browser tools

WebMCP makes a small, typed read-and-navigation surface available to an agent in the rider's own browser tab. It is not a remote MCP server. Nothing registers during SSR or when the browser API is unavailable. No tool submits a form, saves a calculator scenario, sends mail, downloads a report, redeems an offer or starts a payment.

## Trying it locally

1. Use a compatible Chrome on HTTPS or localhost. Enable `chrome://flags/#enable-webmcp-testing` and restart if needed; install Chrome's Model Context Tool Inspector.
2. Open a public calculator. The inspector should show the `site_*` tools and that page's calculator tools. Calculations use the same pure functions as the visible UI, without reading a profile or saving inputs.
3. Sign in to use account reads on their corresponding pages. Settings → **Agent-tools** / **Agent tools** controls this surface. The preference defaults on; a saved false wins. The switch is a human control and is never itself a tool. Turning it off unregisters tools and cancels pending tool results. Changes persist to the account and notify other tabs through BroadcastChannel; Convex subscriptions also update the saved preference.
4. Use `site_list_destinations` before `site_navigate`. Tools accept destination ids, not arbitrary URLs. Account record reads still use the UI's authenticated owner-checked Convex queries.

Primary browser reference: [Chrome imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api), checked 14 October 2026. The adapter accepts the document API and navigator alias, legacy returned unregister handles/name-based removal, and AbortSignal-based removal. Browser behavior is evolving; the offline fake-context tests are not proof of a specific Chrome origin trial or real browser agent.

## Origin trial

`src/config/webmcp.ts` contains an intentionally empty token list. Ortwin must register the owned origins at [Chrome origin trials](https://developer.chrome.com/origintrials) and supply the public signed tokens. No API secret is needed. Tokens are scoped to `https://bikefitboost.com` or `https://www.bikefitboost.com`; config tests decode the binary payload and reject another origin/feature or an expired configured token. This verifies structure and claims, not the cryptographic signature: Chrome verifies that signature.

The proxy sends applicable, unexpired tokens only for GET/HEAD HTML document requests on the matching origin. API/static files, RSC requests, redirects and other origins do not get the header. With the current empty list, no Origin-Trial header is sent. Do not put a token in environment files or enable a deployment as part of local validation.

## Foundation API

| File | Responsibility |
| --- | --- |
| `src/lib/webmcp/modelContext.ts` | Only adapter that knows the browser API names and cleanup variants |
| `detect.tsx` | Small always-loaded client probe; dynamically imports the bridge only when supported |
| `Bridge.tsx` | Live session/preference/locale, route registration, cleanup and consent-gated analytics |
| `define.ts`, `types.ts` | `defineWebMcpTool`, `defineWebMcpPack`, typed execution context, `listLimit` |
| `pipeline.ts` | Scope guard, four-read tab budget, strict parsing, abort, safe errors, envelope budget |
| `placement.ts` | Locale-aware exact/prefix/record route matching; static sibling exclusion |
| `registry.ts` | Explicit map of literal lazy imports, checked against every feature `*.webmcp.ts` |
| `denylist.ts` | Forbidden input/name identifiers and output/concurrency limits |
| `testing.ts` | `runTestTool`, `createTestToolContext`, `installFakeModelContext` |

Next requires statically analyzable imports, so discovery is an explicit lazy map rather than filesystem globbing in the browser. A test fails when a pack is missing from the map or duplicated. Pack implementations are not imported by the root layout: only the detection component is. The root mount covers both public and dashboard layouts inside the existing Convex provider. Unsupported browsers do not subscribe to a WebMCP account query or load its bridge/packs.

Create a feature-owned `*.webmcp.ts` default-exporting `defineWebMcpPack({ id, placement, tools })`. Tool definitions use `defineWebMcpTool({ name, description, risk: 'read', scope, inputSchema, execute, placement?, untrustedContent? })`. Inputs are strict Zod objects; every property has a short `.describe()`. `execute(input, ctx)` returns `{ summary, data? }`. Names use `site_`, `calc_`, `bikes_`, `fit_` or `account_`, snake case and at most 40 characters. Descriptions are English, explain returned data and fit within 500 characters. Input descriptions fit within 150 characters.

`onRoutes('/bikes', '/bikes/[bikeId]')` strips NL/EN prefixes; `{ routes: [{ path: '/bikes', prefix: true }] }` opts into descendants. Static sibling routes take precedence over record patterns. Only site tools are global. Tools follow pathname navigation; locale, identity and opt-out changes invalidate old callbacks. Query strings are not echoed in context or used for placement. Forbidden admin, authentication, payment and other sensitive surfaces register no tools.

The context exposes locale, page, an abort signal, guarded `query`, safe `navigate`, and accessible tool descriptions. It has no mutation/action transport. Scope comes from the live session, never tool input; public tools cannot call `ctx.query`. Queries remain subject to their server owner checks. Use `ToolError` only for public codes; arbitrary provider exceptions are replaced with a fixed UNKNOWN message. Zod failures return INVALID_INPUT and bounded field paths, never raw rejected values or error stacks.

Lists use `listLimit` (20 by default, 100 maximum), explicit projections and correct continuation offsets. The full serialized envelope may not exceed 16,000 characters; design near 1,500. Oversize output returns LIMIT_EXCEEDED, not a silently truncated page with a skipped continuation. Tool definitions returning rider-written names/headings/notes must set `untrustedContent`; the envelope and browser annotation then mark them as data, not agent instructions.

All tools have `readOnlyHint`; none is exposed cross-origin. `webmcp_tool_called` is sent only after current marketing consent, containing tool name and public outcome code, never scope keys, ids, arguments, returned data or free text. The existing analytics host policy still applies. No new backend analytics event or rider activity row is written by tools.

## Never exposed

Checkout, portal, payment/cancellation/refund actions, gift/transition redemption, identity/authentication codes, account deletion, admin capabilities, mail sending, arbitrary network calls, downloads/PDF export, secrets and cross-owner scope inputs are outside this release. Preferences are changed by the human UI only. Tool names and nested schema properties are checked against the denylist; architecture tests reject write transports in packs. Hints and preferences are not an authorization boundary: Convex remains authoritative.

## Validation and limits

The generated inventory is [WEBMCP-TOOLS.md](WEBMCP-TOOLS.md). Run the colocated pack tests through `runTestTool`, then `src/lib/webmcp/registry.test.ts` to check architecture and regenerate it. The helper uses the real pipeline; replace only the query/navigation boundary with fixtures.

`tests/visual/webmcp/check.mjs` checks an actual locally built public calculator and the real dashboard component with isolated auth/query fixtures, in NL/EN. It also inspects loaded scripts without the API to reject eagerly loaded bridge/site-pack code. Settings has unit tests for NL/EN, default-on, saved false, failure feedback and BroadcastChannel. Run the full repository gates and the settings usability sweep before release.

Abort prevents stale results and future guarded calls; the Convex client's existing query transport has no AbortSignal input, so an already issued read may finish server-side. Such results are not returned after identity changes or cancellation. The four-read counter remains occupied until underlying execution settles, even if the caller aborts, so cancellation cannot bypass the concurrency budget. Navigation unregisters old page tools without deliberately cancelling reads unless scope/consent changes. Legacy browser cleanup behavior can differ; the adapter supports all specified variants.

No deployment, real session data, signed origin-trial token, real Chrome agent, provider operation or production traffic is part of local fixture evidence. See `plans/feature-webmcp/audit/W1-notes.md` for the exact completed gates and open findings.
