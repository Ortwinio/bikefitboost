# W3 dashboard read packs

Status: pre-implementation inventory completed before W1 stability. The lead subsequently relayed DONE W1 and explicitly authorized implementation; W1-notes.md now confirms API stability. Final implementation and validation differences are recorded in W3-notes.md.

## Scope and proposed placement

All tools require a live signed-in session and enabled agent-tools preference, use risk `read`, and inherit the foundation's parsing, abort, scope-change, concurrency, envelope and analytics controls. Route names below are locale-independent; placement must match NL/EN through W1's helpers. Tools expose only explicit output projections, never whole Convex documents.

| Tool | UI query or destination | Placement | Result/input |
| --- | --- | --- | --- |
| bikes_list | bikes.queries.listSummariesByUser, used by dashboard and bikes index | /dashboard, /bikes | Strict limit (default 20, max 100), offset for bounded local paging of the existing complete query. Bike id/name/type/brand/model and detail URL; untrusted content. |
| bikes_get | bikes.queries.getDetail, used by bike detail | /bikes/[bikeId] | Strict bikeId; server owner authorization remains authoritative. Basic bike identity, geometry and current setup fields shown by the UI, no photos, storage ids, rider profile, external sources or nested raw documents. Untrusted content. |
| fit_list_sessions | sessions.queries.getAllSessionsWithBikes, used by dashboard and bikes index | /dashboard, /bikes | Strict limit/offset. Session id, bike id/name, status, created date and results URL. No questionnaire answers, raw recommendations or profile snapshots. Untrusted content. |
| fit_get_report_summary | recommendations.queries.getReportV2, used by results page | /fit/[sessionId]/results | Strict sessionId. Project only visible recommendation scores, calculated fit measurements and recommendation headings. No user/profile/contact data, questionnaires, notes, download/email flags or PDF. Honor returned access/redaction; never recompute withheld recommendations. Untrusted content if headings contain rider/provider text. |
| account_get_profile_summary | profiles.queries.getMyProfile, used by profile and dashboard | /profile, /dashboard | Strict empty input. Measurements with units, existing profile completeness/score helpers where appropriate, riding preferences; no account identity, email, photo or free-text notes. Null profile is an explicit missing state. |
| account_get_access | pricing.queries.getAccess, used by dashboard, profile, bikes; getSubscription only where settings UI uses it if required for expiry | /dashboard, /profile, /bikes, /settings | Strict empty input. Project free/paid state, effective access and expiry only. Never expose subscription/payment identifiers, prices or purchase/renewal actions. Inspect access shape before finalizing expiry projection. |
| bikes_open_new | /bikes/new | /dashboard, /bikes | Strict empty input. Locale-aware navigation only; no create/import mutation. |
| fit_open_start | /fit | /dashboard, /bikes, /profile, /fit | Strict empty input; navigate without auto-submit query parameters. Session creation is a button handler on the destination, never invoked by the tool. |
| account_open_profile | /profile?edit=measurements | /dashboard, /profile, /fit | Strict empty input. Open the existing direct editor via the supported edit parameter; no values supplied or edits submitted. Confirm supported edit target and same-page navigation behavior before implementation. |

## Query and safety findings

- Bike summary and detail queries use requireUserId; detail rejects a bike owned by someone else. Session list uses requireUserId and user-indexed lookups. Report query checks the session's current owner and returns null otherwise. Profile/access resolve their user from the live auth session.
- Report V2 includes a raw user document and questionnaire answers alongside the recommendation. Never spread its result. `visibleRecommendation` strips paid recommendation items/notes/priorities for core access, leaving calculatedFit and confidenceScore; the pack must preserve this boundary.
- Existing list queries collect all current-user rows. Pagination in this phase is bounded presentation over those same queries, not a claim of bounded database work. Return nextOffset from the last emitted row and do not skip rows after output-budget handling. Keep names bounded; use the foundation's oversized-envelope behavior if necessary.
- `/fit` reads and selects a requested bike, but session creation happens only in its explicit start handler. Use the plain route for navigation. Do not navigate to existing results on behalf of a read tool: that page can generate a missing recommendation in a mutation, so report reads only call the query.
- Bike pages have existing passport/default-profile maintenance effects. W3 does not mount pages, invoke those mutations or add a general arbitrary-URL navigation tool.
- All schemas strict; no userId/email/token/secret/key/payment/admin or arbitrary URL input. Record ids are owner-checked references only, never identity selectors. Output fields are allowlisted to avoid accidentally publishing new backend fields.

## W1 interface needs

Use defineWebMcpTool, defineWebMcpPack, placement helpers and runTestTool exactly as documented in W1-notes.md once stable. Need authenticated typed Convex query access from context, locale-aware safe navigation, live auth/abort checks, read-only annotations, untrustedContent, a public missing-result/error representation, and per-tool placement if multiple tools share a pack. W1 owns registry and global files; W3 will report its default-export pack paths for registration.

## Validation plan

- Per-tool runTestTool tests with synthetic Convex responses and no network: correct query/args and output projection, null/missing state, signed-out/disabled rejection, invalid and extra input rejection, abort/session-change protection.
- NL/EN route placement, navigation destinations and empty navigation schemas; no mutation/action callbacks available to tools.
- Report fixtures for full/core access and missing recommendation. Never leak raw user/email/profile, questionnaire fields, notes or withheld recommendation headings.
- Bike/session lists: default/max limit, offset boundaries, hostile long names, deterministic continuation, untrusted-content marking and envelope cap.
- Profile/access fixtures: explicit numeric measurement fields, no private identifiers, expiry and free/paid behavior as returned by the UI's authoritative query.
- Run focused tests, foundation architecture/inventory tests after registry integration, lint/typecheck without committing or starting competing builds. Lead owns combined build and browser gates.

Reference documents were read as design guidance only; no other product's implementation or inventory is copied here.

## Inventory refinements before W1 handoff

- `pricing.queries.getAccess({})` already returns `productId`, `expiresAt`, `enforced`, `fullProfile`, `fullReport` and `maxBikes`. No subscription query is needed; omit upsell/appointment eligibility fields. State is derived from `productId`, not `fullReport` (open enforcement can grant access to a free account).
- `/profile?edit=measurements` is a real editor deep link: the page opens the direct editor from the query at initial mount and the editor focuses its body group. Same-page router navigation can retain the initial collapsed state; avoid promising the editor opens from `/profile` unless this is handled. Prefer placement only on the dashboard/fit source routes for this navigation tool, preserving the existing UI untouched.
- Report output will use the results page's mapper/copy for display labels if necessary, but only include detailed recommendation headings when returned access grants fullReport. The mapper synthesizes rows even from core data, so it cannot itself authorize paid headings.
- Proposed implementation home: `src/app/(dashboard)/dashboard/dashboard.webmcp.ts` with per-tool placements and a colocated `dashboard.webmcp.test.ts`. Keep registry integration owned by W1 and report the path in W3 notes.
