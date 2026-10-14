# W2 — public calculator packs

14 October 2026. Implemented directly, without subagents or delegation, in the WebMCP worktree.
Implementation began only after the lead confirmed W1 stable. No commits, pushes, deployment, environment changes,
real mails or real account mutations. The external reference product documentation was read, not copied.

## Delivered

Eleven public tools in four lazy packs:

- `calc_bike_fit`, `calc_frame_size`, `calc_crank_length`, `calc_saddle_width` in the body pack.
- `calc_saddle_height` in the public saddle-height feature.
- `calc_power_speed`, `calc_climb_planner`, `calc_ftp_wkg`, `calc_gearing`, `calc_fuel_hydration` in performance.
- `calc_tire_pressure` in the pressure feature.

All use W1's `defineWebMcpTool`, strict described Zod inputs, `scope: public`, `risk: read`, real pipeline and
placement helpers. The only foundation edit is four one-line additions to `packLoaders` in `registry.ts`.
No API change, new dependencies, schema changes, calculator UI changes or calculation-engine changes were needed.
The foundation derives the browser `readOnlyHint` annotation; the browser check verifies it.

Tools register only on their own calculator page. Following the lead's W2-FIX correction, the nonexistent
`/calculators` index is explicitly excluded. Pressure matches both public
EN/NL calculator routes; the protected account pressure route and static tyre-pressure landing content do not
register it. Each output contains a localized clean page URL and summary, compact display values/units, ranges
where actually shown, and relevant assumptions/warnings. Inputs never appear in URLs.

Computations read only explicit inputs. No query, network request, storage, DOM form edit, profile/fit/handoff save,
account selection, checkout, email, PDF, download or other write is performed by a calculator tool.
No rider-written text or private identifiers appear in calculator outputs. Consent, analytics and registration
remain foundation-owned. Strict unknown-field tests include injected identity and credential-shaped fields.

## Parity details

- Public reliability components, not the legacy/account forms, determine the model and bounds.
- Body tools call existing fit adapters and shared saddle/reliability functions. Implausible inseam handling,
  measurement provenance and signed city-bike drop remain intact. Frame sizes return real labels, not ordinal
  indices, and explicitly name height/category as their basis. Cranks use the engine's actual options.
- Saddle-height warnings, confirmation/override and estimated-versus-measured uncertainty follow the public form.
  Tool flags affect only the computation; they do not attest or save a measurement.
- Public bike-fit is a pure calculation: A–D centres/ranges use the public balanced goal and 3/3 flexibility/core
  assumptions. No fit session is created.
- Performance uses `PerformanceReliabilityResults`' functions/defaults: 9 kg/flat-road power model, road climb
  pacing, public climbing-cadence model, FTP method-specific conversion and fluid-loss model. Missing weight
  never produces a W/kg result. The mode and FTP-method cross-field checks run in the real Zod pipeline.
- Fuel carbohydrate values are guidelines, not confidence bounds; fluid loss is not a drinking prescription.
- Pressure returns display-rounded bar/psi, existing warnings and the public unquantified-uncertainty statement.
  It does not invent a 95% or safe range. The public rim choice does not enter the advanced account model:
  explicit basic input projection preserves current UI results, even for hookless. Manufacturer limits remain unchecked.
- All eleven normal fixtures fit below 1,600 serialized characters, far below the 16,000 hard budget.

## Validation

| Gate | Evidence / outcome |
| --- | --- |
| Focused model/contract parity | 76 tests passed |
| Rendered public UI parity | 22 tests passed; all eleven calculators, NL and EN |
| `npm run typecheck` | Passed after fixing both W2 `RidingConditions` annotations |
| `npm run lint` | Passed, including all existing non-ESLint guards |
| `npm run test:contracts` | 56 files, 625 tests passed |
| `npm run test:i18n` | 6 files, 30 tests passed |
| Final full unit run, two workers | 4,812 passed, 20 skipped; one shared route-existence failure described below; 123.04s |
| `npm run build` | Passed; build ID `QX_Vp-bx-8YFkeDOC6WiD` |
| Bundle check | 13 route manifests passed; detector present, bridge/pipeline/pack markers absent from initial client chunks and present in lazy output |
| Offline Playwright | NL/EN public frame-size and dashboard read fixtures passed; unsupported-browser case passed |
| Convex tsc | Not required for W2: no Convex source touched |
| Settings usability guard | Not applicable to W2: no settings/UI changes; W1 owns the switch and its checks |

Commands: focused Vitest files `src/lib/public-calculators/calculators.webmcp.test.ts` and
`calculators.webmcp-ui.test.tsx`; full unit uses `--maxWorkers=2 --testTimeout=15000`.
Browser and bundle runners are in `tests/visual/webmcp-calculators/` with a README.

Browser evidence: `audit/W2-browser.json`. It uses the production detector/bridge/registry/packs and public frame
form, local auth/query/router substitutes, and the foundation fake model context. It verifies explicit-input
calculation, read annotations, unchanged storage/DOM, strict invalid input, locale routes, exactly one calculator
tool on its own page, and unregistering stale tools after navigation. External requests and WebSockets are blocked.
This is not a real Chrome origin-trial agent, live backend authorization test or full dashboard visual review.
The fixture no longer serves or navigates to an index page.

Bundle evidence: `audit/W2-bundle.json`, tied to the build ID above. It checks a conservative union of
client-reference-manifest chunks for ten calculator routes, both pressure aliases and the dashboard. The unsupported
browser check also confirms no bridge or pack JavaScript is requested. Existing calculator engine code already
needed by the normal UI is not counted as added WebMCP code.

## W2-FIX — lead-approved index removal

The lead confirmed the original plan was wrong: `/calculators` is a 404, not an index to implement.
Removed it from all tool and pack placements. Each tool's override remains restricted to its own calculator;
the two pressure route names are retained. The four pack defaults list only their actual calculator pages.
Regression coverage checks the index is excluded in NL/EN and every tool is absent from all other calculators.
The browser fixture now navigates directly from frame-size/dashboard to saddle-height, requires exactly one
calculator tool on each calculator page, and no longer serves the index. No calculation or UI behavior changed.

Focused rerun: all 98 W2 tests pass. Registry discovery and inventory tests pass. The architecture test gets past
every W2 placement but still fails on W1's site destination at `registry.test.ts:35`: `destinations.ts` still lists
`/calculators`. Reported to the lead in `messages/B-to-lead-W2-FIX.md`; foundation ownership was respected.
No route assertion was weakened and no foundation file was changed for this fix.

W2-FIX `npm run lint` passes. The refreshed offline browser run passes all five cases (NL/EN public calculator,
NL/EN dashboard read, unsupported browser), including exact per-page calculator registration and navigation cleanup.
`git diff --check` passes. Generated inventory and browser evidence reflect the new placements.

The build, bundle and full-suite rows above are the original W2 evidence, not a claim of a new build after
W2-FIX. No combined release-green claim is made while the W1 site destination remains unresolved.

The earlier W1 build/typecheck finding on W2 test lines 170/174 is resolved; this W2 production build passes.
File ownership is listed in `audit/files-W2.txt`. Generated browser/bundle JSON is local evidence; generated
`docs/WEBMCP-TOOLS.md` comes from W1's inventory test and is not a separately hand-edited W2 file.
