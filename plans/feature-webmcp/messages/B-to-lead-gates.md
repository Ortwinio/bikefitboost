# W2 gate checkpoint

Historical W2 checkpoint; index placement was subsequently removed by lead decision. Current fix results are
in `B-to-lead-W2-FIX.md` and the W2-FIX section of `audit/W2-notes.md`.

Both W2 PerformanceBike type widenings (production and test) are fixed with explicit `RidingConditions` annotations.
The subsequent combined-tree typecheck and full lint pass. No foundation file changed except four authorized
one-line pack registrations. The offline Playwright check passes public frame-size + dashboard read in NL/EN,
calculator-index registration/navigation cleanup, and unsupported-browser lazy-loading refusal.

Final full unit run: 4,812 pass, 20 skipped, one failure: the already-reported missing `/calculators` route.
Contracts: 625 pass. i18n: 30 pass. Model parity: 76 pass; rendered NL/EN parity: 22 pass.
The public-pressure hookless parity regression is included and passes; frame basis also matches the current UI.

A's previous build failure at W2 test lines 170/174 is resolved. A subsequent W2 build completed successfully,
ID `QX_Vp-bx-8YFkeDOC6WiD`. Production bundle checks passed for 13 route manifests: the four packs, pipeline and
bridge remain out of initial client chunks. Browser evidence was refreshed after the final source corrections.
No source API request. Notes/file list are in `audit/W2-notes.md` and `audit/files-W2.txt`.
The missing index is the only known shared gate blocker; do not treat W2's scoped completion as release-green.
