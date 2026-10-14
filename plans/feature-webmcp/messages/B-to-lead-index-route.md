# W2 integration finding: calculators index is missing

Superseded: the lead confirmed the index was a planning error. W2 removed all index placements and tests that
expected registration there. See `B-to-lead-W2-FIX.md` for the remaining foundation site-destination finding.

W2's eleven tools are implemented in four lazy packs; only four lines were added to `packLoaders`, as authorized.
The first 75 model/contract tests and 22 rendered NL/EN parity tests pass. No foundation API changes needed.

`/calculators` is required by the brief and A's destinations, but no `src/app/**/calculators/page.tsx` exists.
There is no matching proxy rewrite either. A's route architecture check therefore cannot pass with this placement.
Please route the missing index decision to A (or authorize a W2-owned index). I have not changed foundation files
or invented a page outside the agreed calculator-pack scope. The actual calculator routes all exist.

Packs: `src/components/reliability/body.webmcp.ts`,
`src/app/(public)/calculators/saddle-height/saddle.webmcp.ts`,
`src/app/(public)/calculators/power-speed/performance.webmcp.ts`,
`src/components/features/pressure/pressure.webmcp.ts`.
Each tool matches its calculator page plus the requested index; pressure has the EN/NL calculator route names.
Pressure bike-type landing pages contain content/links, not an interactive calculator, so they are not registered.
