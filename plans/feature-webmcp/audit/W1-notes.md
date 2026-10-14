# W1 foundation

DONE W1 — API stable. See `../messages/A-api.md` for the exact interface.

DONE W1-FULL — foundation, settings, global tools and integrated gates complete. Work performed alone without subagents or delegation.

Own implementation only; reference product documentation is not copied into the repository. Current Chrome imperative API was checked against its primary documentation; the adapter supports both legacy unregister forms and current AbortSignal registration cleanup.

## Delivery

- Tiny SSR-safe detector; lazy bridge and explicit lazy pack registry checked against filesystem discovery. Four site tools support context, safe destinations, navigation and tool discovery.
- Strict described schemas, architecture denylist, live scope checks, four-read concurrency limit, cancellation, safe errors (including throwing refinements), bounded output, read-only annotations and consent-gated analytics without inputs, outputs or identities.
- Route/account/locale cleanup, asynchronous registration serialization, StrictMode replay, cross-tab preference invalidation and late account-switch responses are covered. Dynamic bike routes exclude reserved static siblings.
- Authenticated own-user preference mutation, default-on/saved-false behavior, immediate disabling and NL/EN settings switch. No write operation is exposed as an agent tool.
- Empty origin-trial token list is intentional. Validated origin/feature/expiry and HTML-only header plumbing are ready for the owner's signed token.
- Own conventions and generated inventory document 24 integrated tools. W2/W3 packs remain their authors' work. The nonexistent calculator index was removed from destinations following the lead decision recorded in B-to-lead-W2-FIX.md; no new index route was created.

## Final gates

| Gate | Result |
|---|---|
| Typecheck | PASS |
| Focused W1 tests | PASS: 8 files, 32 tests |
| Lint, including architecture-adjacent existing guards | PASS |
| Unit | PASS: 505 files, 4,817 tests; 1 file/20 tests skipped |
| Contracts | PASS: 56 files, 625 tests |
| i18n | PASS: 6 files, 30 tests |
| Standalone Convex tsc | PASS |
| Production build | PASS: 9O6KBlF3eDI7MQEGJ8vIg |
| Fake-context browser integration | PASS: public calculator and dashboard, NL/EN; four cases |
| Bundle check | PASS: 13 production route manifests; no bridge/pipeline/pack in initial chunks |
| Settings usability | Automated PASS: 12 NL/EN 390/1440 cases; 18 manually reviewed images, see W1-settings-review.md |

The isolated detector measured 439 minified bytes / 299 gzip bytes with React and bridge externalized; this is a module measurement, not a claimed exact deployed chunk delta. The no-API browser check also confirms no bridge/site pack requested.

Final build/browser/bundle/settings chain exited 0. A unit run started before the final refinement patch had one stale-module failure; a fresh complete rerun passed all 4,817 tests. Temporary logs are under /private/tmp/webmcp-*.log and are not repository artifacts.

## Limits and handoff

- Settings is a filtered scope: the runner deliberately cannot grant whole-U3 release approval. Scoped manual evidence is documented separately. One pre-existing moderate sidebar landmark issue remains; no serious/critical axe violation.
- Tests use fake model contexts and deterministic dashboard/auth fixtures. They do not claim real Chrome-agent interoperability, production authentication, backend persistence or a live origin trial. Chrome verifies token signatures; our token checks validate decoded configuration, not signatures.
- No commits, pushes, deploys, environment-file changes, production access, real mail or provider calls. Renders are ignored and excluded from file lists.
