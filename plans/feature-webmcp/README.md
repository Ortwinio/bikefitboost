# WebMCP for BikeFitBoost

WebMCP lets an agent in the visitor's own browser tab call typed tools on the page
(`document.modelContext.registerTool`, Chrome origin trial 149–156, ending 2026-11-16). We follow Ortwin's reference
design, adapted to this stack (Next.js 16 app router, Convex, next-intl style locales nl/en):

- Reference (read first, do **not** copy into the repo; the repo is public and the docs describe another product):
  `/Users/ortwinverreck/Downloads/Ortwin Agents best practices package/WEBMCP.md` and `WEBMCP-TOOLS.md`.
- Worktree `/Users/ortwinverreck/Developer/bikefitboost-webmcp`, branch `feature/webmcp` (from main @ 39c1cf38).
  Absolute paths only; git only as `git -C /Users/ortwinverreck/Developer/bikefitboost-webmcp`. No commits, pushes,
  deploys, env changes, real mails or production data. The lead commits and opens the PR.
- Follow `AGENTS.md`/`CLAUDE.md` in this repo.

## Owner decisions (14 Oct 2026)

| # | Decision |
|---|---|
| 1 | Tools on **both** public calculator pages (read-only computations, no user data) and the signed-in dashboard. |
| 2 | Phase 1 is **read + navigate only**: no tool creates, updates or deletes anything. Writes stay with the rider. |
| 3 | Never exposed: checkout, billing portal, prices as purchase, cancellation, account deletion, e-mail sending, auth/login codes, gifts redemption, transition-offer redemption, admin routes, secrets/keys, file downloads/PDF export, other users' data, `userId`/ids of other owners as input. |

## Adapted rules (from the reference)

- Single adapter `src/lib/webmcp/modelContext.ts` knows both `document.modelContext` and `navigator.modelContext`, and
  both unregister styles (`{ unregister }` return value or `unregisterTool(name)`).
- Origin-trial tokens live in source (`src/config/webmcp.ts`, public, signed for `bikefitboost.com` / `www.bikefitboost.com`);
  a test rejects a token that does not decode or is for another origin. Empty list for now: Ortwin registers the origin
  at https://developer.chrome.com/origintrials and pastes the token later. Send it as `Origin-Trial` header on HTML
  documents only (`next.config.ts` headers or `src/proxy.ts`, whichever fits; never on API/static assets).
- Detection is tiny and always loaded; the bridge and every pack are lazy chunks loaded only when the API exists.
  Nothing during SSR. Zero cost for browsers without the API (check bundle impact).
- Packs: `*.webmcp.ts` beside the feature, default export `defineWebMcpPack({ id, placement, tools })`; a registry
  discovers them (static import map generated or a single explicit index checked by a test, whichever works with
  Next bundling; document the choice). Placement by pathname incl. locale prefix; tools follow navigation
  (unregister stale, register new) and re-register on locale/sign-in change; unregister on sign-out.
- Names snake_case with domain prefix (`site_`, `calc_`, `bikes_`, `fit_`, `account_`), ≤ 40 chars. Descriptions
  English, ≤ 500 chars, say what is returned; every input prop `.describe()` ≤ 150 chars; strict `z.object` input
  validated in the pipeline (`INVALID_INPUT` with paths). Scope (user) only from the live session, never input.
- `runTool` pipeline: scope guard, concurrency (4 reads per tab), parse, execute with abort, error mapping (public codes
  only, no raw errors/stacks), compact envelope (`summary`, ids + display fields, limit default 20 max 100, ≤ 16,000
  chars serialized, design for ~1,500), consent-gated analytics event without inputs/outputs/ids.
- All tools in phase 1 are `risk: 'read'` with `readOnlyHint`. Signed-in reads use the **same Convex queries the UI
  uses** (server stays authoritative via `requireUserId`/owner checks). Calculators call the **same pure functions the
  calculator pages use**, so results match the UI exactly (parity tests).
- Signed-in opt-in: Settings → "Agent-tools" switch (NL/EN), default on, saved `false` wins; applies without reload and
  across tabs (`BroadcastChannel`). Public pages: tools are on (no account); they never read personal data.
- Denylist file `src/lib/webmcp/denylist.ts` + architecture test: forbidden names/prop names (`userId`, `email`,
  `token`, `secret`, `key`, `password`, `checkout`, `payment`, `stripe`, `admin`, …), budgets, strict inputs, prefixes,
  placement present and routes exist.
- `untrustedContent` on any output carrying rider-written text (bike names, notes).
- Test helpers: fake model context (`installFakeModelContext`), `runTestTool`. Inventory test writes
  `docs/WEBMCP-TOOLS.md`; conventions in `docs/WEBMCP.md` (our own text, adapted, with "how to try it in Chrome").

## Tasks

| Id | Who | Scope |
|---|---|---|
| W1 | Codex A | Foundation: adapter, detect, lazy bridge mounted in root layout (public + dashboard), registry, placement, pipeline, envelope, denylist, origin-trial config + header, settings switch, test helpers, architecture + inventory tests, `docs/WEBMCP.md`. Global `site_` pack: `site_get_context` (locale, signed in yes/no, page, tools here), `site_list_destinations`, `site_navigate` (destination ids only, locale-aware, no admin/checkout), `site_find_tools`. Print `DONE W1` when the API (`defineWebMcpTool`, `defineWebMcpPack`, `runTestTool`, placement helpers) is stable, then finish and print `DONE W1-FULL`. |
| W2 | Codex B | Public calculator pack(s): one `calc_*` tool per public calculator in `src/app/(public)/calculators/*` and the tire-pressure calculators (frame size, saddle height, saddle width, crank length, gearing, climb planner, power/speed, FTP W/kg, fuel/hydration, tire pressure, bike fit if it is a pure computation). Inputs mirror the UI form (units explicit), outputs the numbers the UI shows plus a one-line summary and the page URL. Placement: the calculator's own page (both locales) and `/calculators` index. Parity tests against the UI's functions. Until `DONE W1`: read-only inventory and spec in `plans/feature-webmcp/audit/W2-spec.md`. Print `DONE W2`. |
| W3 | Codex C | Dashboard read pack(s): `bikes_list`, `bikes_get`, `fit_list_sessions`, `fit_get_report_summary` (scores, key measurements, recommendations headings; no PDF), `account_get_profile_summary` (no e-mail), `account_get_access` (free/paid state, expiry; read only), plus `open_*` navigation to the existing forms (new bike, start fit, edit profile) without submitting anything. Same Convex queries as the UI; placement on the dashboard routes that show the same data. Until `DONE W1`: read-only inventory and spec in `plans/feature-webmcp/audit/W3-spec.md`. Print `DONE W3`. |

## Gates

typecheck, lint, test:unit, test:contracts, test:i18n, Convex tsc (if Convex touched), build, bundle check (no WebMCP
code in the initial chunk beyond detect), a Playwright check with the fake model context on one public calculator page
and one dashboard page (NL/EN), and `scripts/usability-check.mjs` for the settings page if touched.

## Output

`plans/feature-webmcp/audit/W1-notes.md`, `W2-notes.md`, `W3-notes.md` (changes, tests, open points).
