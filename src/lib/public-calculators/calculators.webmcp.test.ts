import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import bodyPack from "@/components/reliability/body.webmcp";
import saddlePack from "@/app/(public)/calculators/saddle-height/saddle.webmcp";
import performancePack from "@/app/(public)/calculators/power-speed/performance.webmcp";
import pressurePack from "@/components/features/pressure/pressure.webmcp";
import { runTestTool } from "@/lib/webmcp/testing";
import { matchesPlacement } from "@/lib/webmcp/placement";
import { assertSafeSchema } from "@/lib/webmcp/denylist";
import { runBikeFitCalculation, runCrankLengthCalculation, runFrameSizeCalculation } from "./fitAdapters";
import { calculateSaddleWidth } from "@/lib/saddle-width-engine";
import { calculateBasicPressure } from "@/lib/pressure-engine";
import { bikeDefaults, climbPlan, ftpEstimate, powerAtSpeed, speedAtPower, type RidingConditions } from "./performance";
import { displayNumber, resultRange } from "./webmcpOutput";
import { calculatePublicSaddleHeight, calculateSaddleHeight } from "../../../shared/reliability/saddleHeight";
import { calculateClimbingCadence, calculateFluidLoss } from "../../../shared/reliability/performance";
import { getReliabilityRange } from "../../../shared/reliability/calculators";

const packs = [bodyPack, saddlePack, performancePack, pressurePack];
const tools = packs.flatMap(pack => pack.tools.map(tool => ({ ...tool, placement: tool.placement ?? pack.placement })));
const fixture: Record<string, Record<string, unknown>> = {
  calc_bike_fit: { heightCm: 190, inseamCm: 89 },
  calc_frame_size: { heightCm: 190, inseamCm: 89 },
  calc_crank_length: { heightCm: 190, inseamCm: 89 },
  calc_saddle_width: { heightCm: 190, weightKg: 94, hipCircumferenceCm: 100, sitBoneWidthMm: 122 },
  calc_saddle_height: { heightCm: 190, inseamCm: 89 },
  calc_power_speed: { mode: "power", powerWatts: 220, weightKg: 75 },
  calc_climb_planner: { distanceKm: 12, gradientPercent: 7, ftpWatts: 225, weightKg: 75 },
  calc_ftp_wkg: { method: "twentyMinute", watts: 290, weightKg: 75 },
  calc_gearing: { innerChainringTeeth: 34, cassetteLargestCogTeeth: 32 },
  calc_fuel_hydration: { durationMinutes: 180, intensity: "endurance" },
  calc_tire_pressure: { discipline: "road", bodyWeightKg: 75, widthFrontMm: 28, widthRearMm: 28,
    tubeType: "tubeless", surface: "average_asphalt" },
};

async function calculate(name: string, input = fixture[name], locale: "en" | "nl" = "en") {
  const result = await runTestTool(tools.find(tool => tool.name === name)!, input, { locale });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.code);
  return result.data as Record<string, unknown>;
}

describe("public calculator WebMCP contracts", () => {
  it("covers all eleven public calculators with strict, described, read-only inputs", () => {
    expect(tools.map(tool => tool.name).sort()).toEqual(Object.keys(fixture).sort());
    for (const tool of tools) {
      expect(tool.scope).toBe("public");
      expect(tool.risk).toBe("read");
      assertSafeSchema(z.toJSONSchema(tool.inputSchema, { io: "input" }));
    }
  });

  it.each(tools)("$name stays small, private, localized and side-effect free", async tool => {
    const query = vi.fn(() => { throw new Error("No query allowed"); });
    const navigate = vi.fn();
    const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("No network allowed"));
    try {
      for (const locale of ["nl", "en"] as const) {
        const result = await runTestTool(tool, fixture[tool.name], { locale, query, navigate });
        expect(result.ok).toBe(true);
        expect(JSON.stringify(result).length).toBeLessThan(1600);
        const data = result.ok ? result.data as { pageUrl: string } : null;
        const url = new URL(data!.pageUrl);
        expect(url.pathname.startsWith(`/${locale}/`)).toBe(true);
        expect(url.search).toBe("");
        expect(matchesPlacement(tool.placement, url.pathname)).toBe(true);
        expect(matchesPlacement(tool.placement, `/${locale}/calculators`)).toBe(false);
        for (const other of tools.filter(candidate => candidate.name !== tool.name)) {
          const placement = other.placement;
          if (placement === "global" || !placement) throw new Error("Calculator placement must be explicit");
          for (const route of placement.routes) {
            const path = typeof route === "string" ? route : route.path;
            expect(matchesPlacement(tool.placement, `/${locale}${path}`)).toBe(false);
          }
        }
        expect(matchesPlacement(tool.placement, `/${locale}/dashboard`)).toBe(false);
        expect(matchesPlacement(tool.placement, `/${locale}/checkout`)).toBe(false);
        const signedIn = await runTestTool(tool, fixture[tool.name], { locale, query, navigate,
          signedIn: true, scopeKey: "synthetic-session" });
        expect(signedIn).toEqual(result);
      }
      expect(query).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    } finally { fetch.mockRestore(); }
  });

  it.each(tools)("$name rejects unknown fields and aborts", async tool => {
    for (const forbidden of ["userId", "email", "token", "surprise"]) {
      const result = await runTestTool(tool, { ...fixture[tool.name], [forbidden]: "not-allowed" });
      expect(result).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
    }
    const controller = new AbortController();
    controller.abort();
    expect(await runTestTool(tool, fixture[tool.name], { signal: controller.signal }))
      .toMatchObject({ ok: false, error: { code: "CANCELLED" } });
  });

  it.each([
    ["calc_saddle_height", { heightCm: 129 }],
    ["calc_frame_size", { heightCm: Infinity }],
    ["calc_crank_length", { heightCm: "190" }],
    ["calc_bike_fit", { heightCm: 190, inseamCm: NaN }],
    ["calc_power_speed", { mode: "power" }],
    ["calc_power_speed", { mode: "power", powerWatts: 220, speedKph: 30 }],
    ["calc_ftp_wkg", { method: "known", watts: 700 }],
    ["calc_ftp_wkg", { method: "ramp", watts: 100 }],
    ["calc_gearing", { innerChainringTeeth: 34.5, cassetteLargestCogTeeth: 32 }],
    ["calc_fuel_hydration", { durationMinutes: 0, intensity: "endurance" }],
    ["calc_tire_pressure", { ...fixture.calc_tire_pressure, widthFrontMm: 81 }],
  ] as const)("validates %s with error paths", async (name, input) => {
    expect(await runTestTool(tools.find(tool => tool.name === name)!, input))
      .toMatchObject({ ok: false, error: { code: "INVALID_INPUT", paths: expect.any(Array) } });
  });
});

describe("parity with public UI computation functions", () => {
  it.each(["road", "gravel", "mtb", "city"] as const)("body calculations match UI engines for %s", async category => {
    const input = { heightCm: 190, inseamCm: 89, bikeCategory: category };
    const { fitResult } = runBikeFitCalculation({ ...input, category, ridingGoal: "balanced", flexibility: 3, coreStability: 3 });
    const evidence = { inseamCm: 89, inseamProvenance: { kind: "measured" as const, unresolvedWarning: false } };
    expect((await calculate("calc_bike_fit", input)).results).toEqual({
      saddleHeight: resultRange(getReliabilityRange({ metric: "saddleHeight", value: fitResult.saddleHeightMm, evidence }), "mm"),
      saddleSetback: resultRange(getReliabilityRange({ metric: "saddleSetback", value: fitResult.saddleSetbackMm, evidence }), "mm"),
      handlebarDrop: resultRange(getReliabilityRange({ metric: "handlebarDrop", value: fitResult.barDropMm, evidence }), "mm"),
      reach: resultRange(getReliabilityRange({ metric: "reach", value: fitResult.saddleToBarReachMm, evidence }), "mm"),
    });
    expect((await calculate("calc_frame_size", input)).results).toMatchObject({
      frameSize: { value: runFrameSizeCalculation({ ...input, category }).estimatedFrameSize },
    });
    expect((await calculate("calc_frame_size", input)).basis).toBe("height-and-bike-category");
    expect((await calculate("calc_crank_length", input)).results).toMatchObject({
      crankLength: { value: runCrankLengthCalculation({ inseamCm: 89, category }) },
    });
  });

  it.each([{ heightCm: 190 }, { heightCm: 130 }, { heightCm: 210, inseamCm: 55 }])
    ("body estimates preserve missing/implausible inseam behavior: %j", async input => {
      const data = await calculate("calc_bike_fit", input);
      expect(data.basis).toBe("derived");
      expect(data.unresolvedWarning).toBe("inseamCm" in input);
      const expected = runBikeFitCalculation({ heightCm: input.heightCm, inseamCm: input.heightCm * 0.47,
        category: "road", ridingGoal: "balanced", flexibility: 3, coreStability: 3 });
      expect(data.results).toMatchObject({ saddleHeight: { value: expected.fitResult.saddleHeightMm } });
    });

  it.each([
    { heightCm: 190 }, { heightCm: 220 }, { heightCm: 190, inseamCm: 89 },
    { heightCm: 190, inseamCm: 80 }, { heightCm: 190, inseamCm: 80, confirmed: true },
    { heightCm: 190, inseamCm: 60 }, { heightCm: 190, inseamCm: 60, override: true },
  ])("saddle result and warning parity: %j", async input => {
    const expected = calculatePublicSaddleHeight(input);
    const actual = await calculate("calc_saddle_height", input);
    expect(actual).toMatchObject({ plausibility: expected.status, unresolvedWarning: expected.unresolvedWarning,
      canRefine: expected.canRefine, saddleHeight: { value: expected.result!.adviceMm,
        lower: expected.result!.lowerMm, upper: expected.result!.upperMm, halfWidth: expected.result!.halfWidthMm } });
  });

  it("does not narrow an estimated inseam as if measured", async () => {
    const data = await calculate("calc_saddle_height", { heightCm: 190, inseamCm: 89, inseamKind: "estimated" });
    const result = calculateSaddleHeight({ heightCm: 190, inseamCm: 89, provenance: { kind: "estimated" } });
    expect(data.saddleHeight).toMatchObject({ halfWidth: result.halfWidthMm });
    expect(data.basis).toBe("estimated");
    expect(data.nextStep).toMatchObject({ kind: "add-inseam" });
  });

  it.each([undefined, 90, 122, 170])("width parity for sit bones %s", async sitBoneWidthMm => {
    const input = { heightCm: 190, weightKg: 94, hipCircumferenceCm: 100, sitBoneWidthMm };
    const result = calculateSaddleWidth({ ...input, inputMethod: sitBoneWidthMm === undefined ? "estimated" : "measured",
      ridingType: "endurance_road", postureCategory: "balanced" });
    expect((await calculate("calc_saddle_width", input)).saddleWidth).toEqual(resultRange(getReliabilityRange({
      metric: "saddleWidth", value: result.finalRecommendedWidthMm, evidence: { sitBonesMeasured: sitBoneWidthMm !== undefined },
    }), "mm"));
  });

  it.each(["road", "gravel", "mtb", "city"] as const)("power and reverse speed parity: %s", async bikeCategory => {
    const bike = bikeCategory === "mtb" ? "mountain" : bikeCategory;
    const conditions: RidingConditions = { bike, riderMassKg: 75, bikeMassKg: 9, gradientPct: 0, surface: bikeDefaults(bike).surface };
    const result = speedAtPower(conditions, 220);
    expect((await calculate("calc_power_speed", { mode: "power", powerWatts: 220, bikeCategory })).speed)
      .toEqual(resultRange(getReliabilityRange({ metric: "speed", value: result.speedKmh }), "km/h"));
    expect((await calculate("calc_power_speed", { mode: "speed", speedKph: 30, bikeCategory })).powerWatts)
      .toBe(displayNumber(powerAtSpeed(conditions, 30)));
  });

  it.each([1, 3, 8, 20, 30])("climb duration-band parity at %s km", async distanceKm => {
    const result = climbPlan({ distanceKm, gradientPct: 7, ftpWatts: 225, riderMassKg: 75, bike: "road" });
    const data = await calculate("calc_climb_planner", { distanceKm, gradientPercent: 7 });
    expect(data.climbTime).toEqual(resultRange(getReliabilityRange({ metric: "climbTime", value: result.minutes! }), "min"));
    expect(data.ftpPercent).toBe(displayNumber(result.multiplier * 100));
  });

  it.each(["known", "twentyMinute", "ramp"] as const)("FTP method %s and missing-weight parity", async method => {
    const result = ftpEstimate(method, 300, 75);
    expect((await calculate("calc_ftp_wkg", { method, watts: 300, weightKg: 75 })).ftp)
      .toMatchObject({ value: result.ftpWatts });
    expect((await calculate("calc_ftp_wkg", { method, watts: 300, weightKg: 75 })).wattsPerKg)
      .toMatchObject({ value: displayNumber(result.wattsPerKg) });
    expect((await calculate("calc_ftp_wkg", { method, watts: 300 })).wattsPerKg).toBeNull();
  });

  it.each([{}, { gradientPercent: 15, weightKg: 90, ftpWatts: 250 }])("gearing defaults parity: %j", async extra => {
    const result = calculateClimbingCadence({ chainringTeeth: 34, rearCogTeeth: 32,
      gradientPct: extra.gradientPercent, riderWeightKg: extra.weightKg, ftpWatts: extra.ftpWatts });
    const data = await calculate("calc_gearing", { ...fixture.calc_gearing, ...extra });
    expect(data.cadence).toEqual(resultRange(getReliabilityRange({ metric: "cadence", value: result.cadenceRpm }), "rpm"));
    expect(data.ftpEstimated).toBe(result.ftpEstimated);
  });

  it.each([60, 75, 149, 150, 360])("fluid loss and carbohydrate guideline parity: %s minutes", async durationMinutes => {
    const result = calculateFluidLoss({ durationHours: durationMinutes / 60, effort: "endurance" });
    const data = await calculate("calc_fuel_hydration", { durationMinutes, intensity: "endurance" });
    expect(data.fluidLoss).toEqual(resultRange(getReliabilityRange({ metric: "hydration", value: result.fluidLossMlPerHour }), "ml/h"));
    expect(data.carbohydrateGuideline).toEqual({ ...result.carbohydrateGuideline, unit: "g/h" });
  });

  it.each(["road", "gravel", "mtb"] as const)("pressure output and warnings parity: %s", async discipline => {
    const input = { discipline, bodyWeightKg: 75, widthFrontMm: 28, widthRearMm: 32,
      tubeType: "tubeless" as const, surface: "average_asphalt" as const };
    const result = calculateBasicPressure(input);
    const data = await calculate("calc_tire_pressure", input);
    expect(data).toMatchObject({ frontBar: displayNumber(result.frontBar), rearBar: displayNumber(result.rearBar),
      frontPsi: Math.round(result.frontPsi), rearPsi: Math.round(result.rearPsi), warnings: result.warnings,
      rimLimitsVerified: false });
    expect(data.uncertainty).toContain("No 95%");
  });

  it("does not silently use the account hookless model for the public rim choice", async () => {
    const hooked = await calculate("calc_tire_pressure", { ...fixture.calc_tire_pressure, rimType: "hooked" });
    const hookless = await calculate("calc_tire_pressure", { ...fixture.calc_tire_pressure, rimType: "hookless" });
    expect(hookless).toEqual(hooked);
    expect(hookless.rimLimitsVerified).toBe(false);
  });
});
