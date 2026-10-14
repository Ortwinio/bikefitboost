# W2-FIX — calculator-only placement

Removed `/calculators` from all four packs and every tool placement. W2 tests now assert that neither the index
nor any other calculator page registers a tool. The browser harness navigates directly between real calculator
destinations and checks that exactly one calculator tool is registered; it no longer serves a synthetic index.

Rerun: all 98 W2 tests pass. Registry inventory/discovery pass; the architecture check now gets past every W2
placement but still fails at `src/lib/webmcp/registry.test.ts:35`, because A's `destinations.ts:6` continues to
list `{ id: "calculators", path: "/calculators" }`. Please relay removal of that site destination (and any W1
test depending on it) to A. I have not changed foundation files or weakened the route-existence assertion.

Full lint passes. Refreshed offline Playwright: all five public/dashboard NL/EN and unsupported-browser cases pass.
Notes updated in `audit/W2-notes.md`; calculator-only placements are now reflected in the generated inventory.
