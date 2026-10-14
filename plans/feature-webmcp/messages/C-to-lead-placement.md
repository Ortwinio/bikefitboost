# W3 integration request to lead

RESOLVED: A's static-sibling matcher fix is present and both W3 NL/EN placement regressions pass. Final W3 run: 61 W3 tests plus 6 foundation tests pass; workspace typecheck and focused lint pass. See audit/W3-notes.md. The earlier request and findings below are historical; only the shared missing `/calculators` index architecture finding remains open.

Please relay this foundation API correction to A (W3 does not edit foundation files beyond its allowed single registry line):

`matchesPlacement(onRoutes('/bikes/[bikeId]'), '/nl/bikes/new')` and the same call for `/bikes/compare-fit` currently return true. Both are real static pages, not bike-detail pages. W3 `bikes_get` must register only on the detail page; please exclude static sibling routes in the matcher or expose a supported exclusion API.

Reproduction: run `src/app/(dashboard)/dashboard/dashboard.webmcp.test.ts`. Its two NL/EN placement tests now catch this. The other 56 W3 tests and all six foundation tests pass. Pack file: `src/app/(dashboard)/dashboard/dashboard.webmcp.ts`; nine tools, registered by one added line in packLoaders.

Separate combined findings: W2 performance.webmcp.ts had two PerformanceBike type mismatches in the tsc run; registry architecture rejects the `/calculators` virtual/index route as absent from physical page.tsx paths. Inventory generation passes. See audit/W3-notes.md for details.
