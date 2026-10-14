# Offline calculator WebMCP check

Run `node /Users/ortwinverreck/Developer/bikefitboost-webmcp/tests/visual/webmcp-calculators/check.mjs`.

Uses the production detector, bridge, registry, calculator packs and public frame-size component. The foundation's
fake model context is installed before rendering. Router/auth/Convex are local substitutes; any unexpected query,
mutation, external request or WebSocket is rejected. No deployment, real account, browser agent or provider is used.

Checks NL/EN public frame-size and signed-in dashboard profile-read fixtures; read-only annotations; unchanged DOM
and session storage after computation; unknown-field rejection; only the current page's calculator tool; stale-tool
cleanup on navigation; and no bridge/pack requests in a browser without the API. Dashboard is a read fixture, not
the full dashboard UI. The nonexistent `/calculators` index is not served by this fixture or used for navigation.

Writes local evidence to `plans/feature-webmcp/audit/W2-browser.json`. No screenshots or service data are generated.

After a production build, run `node /Users/ortwinverreck/Developer/bikefitboost-webmcp/tests/visual/webmcp-calculators/check-bundle.mjs`.
This checks the client-reference manifest chunks for twelve public calculator routes (including both pressure
aliases) and the dashboard: detector present, bridge/pipeline/pack markers absent from initial chunks and present
in the lazy build output. Evidence includes the build ID in `audit/W2-bundle.json`.
