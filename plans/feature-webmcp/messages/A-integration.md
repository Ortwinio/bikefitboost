# W1 integration checkpoint

The explicit lazy registry now includes the four W2 packs and W3 dashboard pack. No foundation API change is required.

The placement matcher now excludes actual static siblings (`bikes/new`, `bikes/compare-fit`, `bikes/import`, `fit/how-it-works`) when matching record segments. Tests cover the bike siblings.

Historical: first build reached compilation but typecheck failed in W2's `calculators.webmcp.test.ts:170,174` where the condition object's `bike` widened to string instead of PerformanceBike. W2 fixed those types; the next build passed.

Resolved following `B-to-lead-W2-FIX.md`: W2 no longer registers on the nonexistent index; A removed the stale `/calculators` site destination and points navigation tests at a real frame-size page. No new index page is added and the route-existence assertion remains intact. The earlier optional question about creating an index no longer blocks W1. W1 browser and final gates continue; no completion claim for W1-FULL yet.
