# W2 — public calculator tools: implementation spec

Original status: inventory/spec only, 14 October 2026, before the foundation API was declared stable.
The lead subsequently authorized implementation against the stable W1 API; implementation and gates are recorded
in `W2-notes.md`. No subagents used. This document preserves the pre-implementation investigation below.
Read the feature README and both external reference documents; no external product documentation is copied here.

## Scope and safety contract

Eleven public tools, all `risk: read` and `readOnlyHint`, operating exclusively on explicit numeric/enum inputs.
No Convex calls, DOM form reads/writes, local/session storage, saved profile lookup, calculator-state writes,
handoff creation, navigation side effects, analytics payload data or network requests in calculator executors.
The URL in the result is a clean locale-aware calculator URL, never a URL carrying measurements.
The user's signed-in state must not change calculation results. Foundation owns consent and registration.

Strict Zod object inputs, finite bounded numbers, integer tooth counts and enumerated choices. Every property has
an English description with its unit (maximum 150 characters). Tool descriptions stay below 500 characters and
names below 40. Unknown fields, including identity/credential fields, fail validation. Inputs are not coerced.
No unrestricted string outputs from inputs: all labels are application copy, so no rider-written text is returned.
Foundation supplies scope/concurrency/abort/error mapping and envelope budgets, not feature-specific copies.

## Inventory: current public UI, not legacy/account forms

Paths below are repo-relative. Each tool registers only on its own public page, in both locales.
W2-FIX supersedes the original index requirement: the lead confirmed `/calculators` does not exist.
The public wrappers currently use reliability calculators; legacy form engines alone are insufficient for parity.

| Proposed tool | Page | Current public computation and return contract |
| --- | --- | --- |
| `calc_frame_size` | `/calculators/frame-size` | `PublicBodyReliabilityCalculator` → `runFrameSizeCalculation` in `src/lib/public-calculators/fitAdapters.ts`; return actual size label and neighbouring labels selected by the UI's `getReliabilityRange`, not numeric ordinal as a frame size. |
| `calc_saddle_height` | `/calculators/saddle-height` | `PublicSaddleHeightCalculator` → `calculatePublicSaddleHeight`, `calculateSaddleHeight` in `shared/reliability/saddleHeight.ts`; height/range in mm, measurement basis, plausibility status, unresolved warning and next step. Preserve estimate/refinement distinctions. |
| `calc_saddle_width` | `/calculators/saddle-width` | `PublicBodyReliabilityCalculator` → `calculateSaddleWidth` in `src/lib/saddle-width-engine`; width/range in mm, estimated versus supplied/measured sit-bone basis. |
| `calc_crank_length` | `/calculators/crank-length` | `PublicBodyReliabilityCalculator` → `runCrankLengthCalculation`; actual crank options from `CRANK_LENGTH_TABLE`, recommended mm and eligible options. |
| `calc_bike_fit` | `/calculators/bike-fit` | Pure `runBikeFitCalculation` exists: include this tool. Return public A–D saddle height, setback, bar drop and saddle-to-bar reach in mm, with ranges. Public form fixes balanced goal, flexibility/core 3; disclose these assumptions, never create a fit session. |
| `calc_gearing` | `/calculators/gearing` | Public performance UI uses `calculateClimbingCadence` in `shared/reliability/performance.ts`, not the legacy gearing form's full gear-table engine. Return cadence/range, explicit assumptions and solver limit. |
| `calc_climb_planner` | `/calculators/climb-planner` | `climbPlan` in `src/lib/public-calculators/performance.ts`; minutes/range, FTP percentage and solver limit; null time stays null at a solver limit. |
| `calc_power_speed` | `/calculators/power-speed` | `speedAtPower` or `powerAtSpeed`, matching the UI's mode. Return km/h range and/or watts as displayed, with bounded-solver status and fixed model assumptions. |
| `calc_ftp_wkg` | `/calculators/ftp-wkg` | `ftpEstimate`; known / twenty-minute / ramp methods. Return FTP W and its range; W/kg and range only if weight is supplied, as in the UI. |
| `calc_fuel_hydration` | `/calculators/fuel-hydration` | `calculateFluidLoss` in `shared/reliability/performance.ts`; fluid-loss ml/h range plus carbohydrate g/h guideline. Do not use the legacy `fuelHydration` model or describe fluid loss as a prescription to replace every ml. |
| `calc_tire_pressure` | `/tire-pressure-calculator` (EN), `/bandenspanning-calculator` (NL) | `PressureCalculatorForm` → `validatePressureInput`, `calculateBasicPressure` in `src/lib/pressure-engine.ts`; front/rear bar and psi, displayed range/basis and all applicable safety warnings. Do not substitute the account advanced engine. |

## Inputs and UI parity details

- Body tools: `heightCm` 130–210; optional `inseamCm` 55–105 where the UI supports it;
  `bikeCategory` road/gravel/mtb/city. Supplied inseam method must be explicit if it affects uncertainty.
  Width: `weightKg` 40–150, `hipCircumferenceCm` 70–140, optional `sitBoneWidthMm` 90–170.
  Use the public UI's fixed endurance-road/balanced width settings. Do not expose unused legacy form fields.
- Do not silently certify measurements. Keep the public saddle plausibility warning/confirmation behavior;
  any supplied confirmation flags describe the hypothetical calculation only and never record a real attestation.
  Body calculations derive effective inseam through the existing saddle model when absent/unusable. The large
  discrepancy path must not accidentally pass a rejected inseam straight to a legacy fit adapter.
- Performance bounds come from `usePerformanceInputs.ts`: power 50–600 W, speed 10–50 km/h, weight 40–150 kg,
  distance 1–30 km, gradient 2–15%, FTP 80–500 W, twenty-minute power 100–550 W, ramp power 150–700 W,
  chainring 22–60 teeth, rear cog 21–52 teeth, duration 60–360 minutes, temperature 5–35°C.
  Mode-specific watts are validated for the selected mode; unrelated fields must not be silently accepted.
- Match `PerformanceReliabilityResults.tsx` model defaults exactly: public power/speed bike mass 9 kg and gradient
  0%; road-only climb model; omitted gearing gradient/weight/FTP remain omitted for the engine's own assumptions.
  Do not turn missing weight into an asserted W/kg result. Duration conversion is minutes / 60, once.
- Fuel effort: easy/endurance/tempo/race. Missing temperature uses the existing 20°C assumption and reports it.
- Pressure input mirrors the basic public form: discipline, bodyWeightKg, widthFrontMm, widthRearMm, tubeType,
  surface, ridingGoal and optional bikeWeightKg. Use the same allowed ranges/enums and validation combinations.
  Front/rear width linking is a UI convenience: explicit widths represent the resulting form values.
- Return the same rounded/display numbers and range endpoints as the current result components, with explicit units.
  Preserve warning/null/capped states and distinguish assumptions from supplied measurements. Do not invent certainty.
  Use `getReliabilityRange` from `shared/reliability/calculators.ts` rather than parallel uncertainty formulas.
- Prefer required primary inputs over silently returning the UI's demonstration rider. Any optional defaults must
  match the real UI and be listed as assumptions. No account/session prefill is read by a tool.

## Placement and files after W1 stabilization

Use W1's actual placement helpers, not guessed signatures. Route mapping must use the existing
`src/lib/public-calculators/routes.ts` and locale navigation helpers where applicable. That registry currently
lists seven calculators; independently verify the four performance routes so inventory does not omit them.
Verify whether pressure landing pages mount the interactive form before including them; exclude redirects and
the protected `/pressure-calculator` account route. No index or blanket `/calculators/*` placement for any tool.

Planned packs beside their features: a body pack under `src/components/reliability/`, a saddle pack beside its
public calculator, a performance pack beside `power-speed/`, and a pressure pack beside `PressureCalculatorForm`.
Use per-tool route overrides if supported, otherwise split packs by calculator. All packs default-export
`defineWebMcpPack`. Only W1 owns the shared registry/bridge; coordinate the exact lazy import entries after its
contract lands. Feature packs must not become eager imports in calculator pages or root layouts.

If needed, extract the existing pure row/assumption assembly from public React components into small shared pure
helpers consumed by both UI and tools, with regression tests. Do not duplicate formulas or change rendered copy.
Avoid importing `usePerformanceInputs` just for constants into a pack because it brings hooks/handoff dependencies;
extract shared constants without changing values if necessary. All implementation waits for W1's stable API.

Output proposal: foundation envelope with one-line summary, localized clean page URL, compact numeric result rows,
units, relevant range/basis, warnings and assumptions. Aim near 1,500 serialized characters, strictly below 16,000.
No full reports, engine debug structures, HTML, user identifiers or whole chart datasets.

## Validation plan once implementation is allowed

1. `runTestTool` parity for all eleven tools against the exact functions used by current public components;
   normal/boundary cases, optional inputs, categories/methods, warning paths, missing weight and solver limits.
2. Rendered-value parity where UI composes multiple models, especially frame labels, saddle plausibility,
   A–D results, reverse power/speed, FTP ranges and pressure units/safety warnings.
3. Strict-input tests: unknown fields, non-finite/out-of-range numbers, fractional teeth and invalid enum values.
   Input descriptions/names/budgets/placements pass W1 architecture checks; no mutation/network/storage hooks.
4. NL/EN registration on own pages only, absent on the nonexistent index; stale tools unregister during navigation. No unrelated calculator
   or private tool appears on a calculator page. URLs contain no input values. Pure results match across sessions.
5. Fake-context Playwright public calculator check in NL/EN using W1's helper; no external API/provider calls.
   Coordinate the shared dashboard check with W1/W3 without assigning their work.
6. Typecheck, lint, full unit/contracts/i18n, build and bundle inspection. Convex tsc only if Convex is touched
   (none planned); settings usability checks belong to W1 unless W2 finds a relevant regression.
7. Final `W2-notes.md`: file list, parity coverage, exact gate outcomes, bundle/browser evidence and any limitations.

## Dependency status

Resolved by the lead's stable-W1 confirmation and subsequent W1 notes. Implemented against the actual
`defineWebMcpTool`, `defineWebMcpPack`, `runTestTool`, context/envelope and placement signatures.
The lead authorized one loader line per pack in `registry.ts`; no other foundation files were edited.
