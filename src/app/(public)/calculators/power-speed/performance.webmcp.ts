import { z } from "zod";
import { defineWebMcpPack, defineWebMcpTool } from "@/lib/webmcp/define";
import { onRoutes } from "@/lib/webmcp/placement";
import { calculatorUrl, displayNumber, resultRange } from "@/lib/public-calculators/webmcpOutput";
import { bikeDefaults, climbPlan, ftpEstimate, powerAtSpeed, speedAtPower, type RidingConditions }
  from "@/lib/public-calculators/performance";
import { getReliabilityRange } from "../../../../../shared/reliability/calculators";
import { calculateClimbingCadence, calculateFluidLoss } from "../../../../../shared/reliability/performance";

const weight = z.number().min(40).max(150).optional().describe("Optional rider weight in kg, 40–150; omitted weight is an assumption.");
const ftp = z.number().min(80).max(500).optional().describe("Optional known FTP in watts, 80–500.");
const gradient = z.number().min(2).max(15).optional().describe("Optional climbing gradient in percent, 2–15.");
const placement = (page: string) => onRoutes(`/calculators/${page}`);
const summary = (locale: string) => locale === "nl" ? "Berekende schatting met marge en aannames."
  : "Calculated estimate with range and assumptions.";

export const powerSpeedTool = defineWebMcpTool({
  name: "calc_power_speed", risk: "read", scope: "public", placement: placement("power-speed"),
  description: "Returns public cycling speed in km/h from watts, or watts needed for a supplied speed, with range, solver limit, assumptions and page URL.",
  inputSchema: z.object({
    mode: z.enum(["power", "speed"]).describe("Power mode predicts speed; speed mode predicts required power."),
    powerWatts: z.number().min(50).max(600).optional().describe("Power in watts, 50–600; required only in power mode."),
    speedKph: z.number().min(10).max(50).optional().describe("Speed in km/h, 10–50; required only in speed mode."),
    weightKg: weight,
    bikeCategory: z.enum(["road", "gravel", "mtb", "city"]).default("road").describe("Bike category; defaults to road."),
  }).strict().superRefine((input, context) => {
    const required = input.mode === "power" ? "powerWatts" : "speedKph";
    const excluded = input.mode === "power" ? "speedKph" : "powerWatts";
    if (input[required] === undefined) context.addIssue({ code: "custom", path: [required], message: "Required for this mode." });
    if (input[excluded] !== undefined) context.addIssue({ code: "custom", path: [excluded], message: "Use the other mode." });
  }),
  execute(input, context) {
    const bike = input.bikeCategory === "mtb" ? "mountain" : input.bikeCategory;
    const conditions: RidingConditions = { riderMassKg: input.weightKg ?? 75, bikeMassKg: 9, bike,
      surface: bikeDefaults(bike).surface, gradientPct: 0 };
    const result = input.mode === "power" ? speedAtPower(conditions, input.powerWatts!) : null;
    const speed = result?.speedKmh ?? input.speedKph!;
    return { summary: summary(context.locale), data: {
      pageUrl: calculatorUrl("/calculators/power-speed", context.locale),
      speed: result?.limit ? null : resultRange(getReliabilityRange({ metric: "speed", value: speed }), "km/h"),
      ...(input.mode === "speed" ? { powerWatts: displayNumber(powerAtSpeed(conditions, speed)) } : {}),
      limit: result?.limit ?? null,
      assumptions: { bikeMassKg: 9, gradientPercent: 0, bikeCategory: input.bikeCategory,
        ...(input.weightKg === undefined ? { weightKg: 75 } : {}) },
    } };
  },
});

export const climbTool = defineWebMcpTool({
  name: "calc_climb_planner", risk: "read", scope: "public", placement: placement("climb-planner"),
  description: "Returns the public estimated climb time in minutes and its range, FTP pacing percentage, solver limit, assumptions and page URL.",
  inputSchema: z.object({
    distanceKm: z.number().min(1).max(30).describe("Climb distance in km, 1–30."),
    gradientPercent: z.number().min(2).max(15).describe("Average uphill gradient in percent, 2–15."),
    ftpWatts: ftp, weightKg: weight,
  }).strict(),
  execute(input, context) {
    const result = climbPlan({ distanceKm: input.distanceKm, gradientPct: input.gradientPercent,
      ftpWatts: input.ftpWatts ?? 225, riderMassKg: input.weightKg ?? 75, bike: "road" });
    return { summary: summary(context.locale), data: {
      pageUrl: calculatorUrl("/calculators/climb-planner", context.locale),
      climbTime: result.minutes === null ? null : resultRange(getReliabilityRange({ metric: "climbTime", value: result.minutes }), "min"),
      ftpPercent: displayNumber(result.multiplier * 100), limit: result.limit,
      assumptions: { bikeCategory: "road", bikeMassKg: bikeDefaults("road").bikeMassKg,
        ...(input.weightKg === undefined ? { weightKg: 75 } : {}),
        ...(input.ftpWatts === undefined ? { ftpWatts: 225 } : {}) },
    } };
  },
});

export const ftpTool = defineWebMcpTool({
  name: "calc_ftp_wkg", risk: "read", scope: "public", placement: placement("ftp-wkg"),
  description: "Returns public FTP watts and its range from known FTP, a twenty-minute test or ramp test; W/kg is returned only with supplied weight. Includes page URL.",
  inputSchema: z.object({
    method: z.enum(["known", "twentyMinute", "ramp"]).describe("Known FTP, twenty-minute average power, or ramp final-minute power."),
    watts: z.number().min(80).max(700).describe("Watts: known 80–500; twenty-minute 100–550; ramp 150–700."),
    weightKg: weight,
  }).strict().superRefine((input, context) => {
    const [minimum, maximum] = input.method === "known" ? [80, 500] : input.method === "ramp" ? [150, 700] : [100, 550];
    if (input.watts < minimum || input.watts > maximum) {
      context.addIssue({ code: "custom", path: ["watts"], message: "Outside this test method's range." });
    }
  }),
  execute(input, context) {
    const result = ftpEstimate(input.method, input.watts, input.weightKg ?? 75);
    const evidence = { ftpMethod: input.method === "twentyMinute" ? "twenty-minute" as const
      : input.method === "ramp" ? "ramp" as const : undefined };
    return { summary: summary(context.locale), data: {
      pageUrl: calculatorUrl("/calculators/ftp-wkg", context.locale), method: input.method,
      ftp: resultRange(getReliabilityRange({ metric: "ftpPower", value: result.ftpWatts, evidence }), "W"),
      wattsPerKg: input.weightKg === undefined ? null
        : resultRange(getReliabilityRange({ metric: "ftpWkg", value: result.wattsPerKg, evidence }), "W/kg"),
      weightNeeded: input.weightKg === undefined,
    } };
  },
});

export const gearingTool = defineWebMcpTool({
  name: "calc_gearing", risk: "read", scope: "public", placement: placement("gearing"),
  description: "Returns public climbing cadence in rpm and its range for the lowest gear, solver limit, assumed FTP/weight/gradient and page URL.",
  inputSchema: z.object({
    innerChainringTeeth: z.number().int().min(22).max(60).describe("Smallest front chainring, 22–60 whole teeth."),
    cassetteLargestCogTeeth: z.number().int().min(21).max(52).describe("Largest rear sprocket, 21–52 whole teeth."),
    gradientPercent: gradient, weightKg: weight, ftpWatts: ftp,
  }).strict(),
  execute(input, context) {
    const result = calculateClimbingCadence({ chainringTeeth: input.innerChainringTeeth,
      rearCogTeeth: input.cassetteLargestCogTeeth, gradientPct: input.gradientPercent,
      riderWeightKg: input.weightKg, ftpWatts: input.ftpWatts });
    return { summary: summary(context.locale), data: {
      pageUrl: calculatorUrl("/calculators/gearing", context.locale),
      cadence: result.limit ? null : resultRange(getReliabilityRange({ metric: "cadence", value: result.cadenceRpm }), "rpm"),
      ftpWatts: result.ftpWatts, weightKg: result.riderWeightKg, gradientPercent: result.gradientPct,
      ftpEstimated: result.ftpEstimated, weightAssumed: result.weightAssumed, gradientAssumed: result.gradientAssumed,
      limit: result.limit, assumptions: { wheelCircumferenceM: 2.1, bikeMassKg: 9, ftpFraction: 0.85 },
    } };
  },
});

export const fuelTool = defineWebMcpTool({
  name: "calc_fuel_hydration", risk: "read", scope: "public", placement: placement("fuel-hydration"),
  description: "Returns public estimated fluid loss in ml/h with uncertainty range and carbohydrate guideline in g/h. Fluid loss is not a replacement prescription. Includes page URL.",
  inputSchema: z.object({
    durationMinutes: z.number().min(60).max(360).describe("Ride duration in minutes, 60–360."),
    intensity: z.enum(["easy", "endurance", "tempo", "race"]).describe("Ride effort category."),
    temperatureC: z.number().min(5).max(35).optional().describe("Optional temperature in degrees Celsius, 5–35; defaults to 20."),
  }).strict(),
  execute(input, context) {
    const result = calculateFluidLoss({ durationHours: input.durationMinutes / 60, effort: input.intensity,
      temperatureC: input.temperatureC });
    return {
      summary: context.locale === "nl" ? "Geschat vochtverlies, geen drinkvoorschrift; koolhydraten zijn een richtlijn."
        : "Estimated fluid loss, not a drinking prescription; carbohydrates are a guideline.",
      data: { pageUrl: calculatorUrl("/calculators/fuel-hydration", context.locale),
        fluidLoss: resultRange(getReliabilityRange({ metric: "hydration", value: result.fluidLossMlPerHour }), "ml/h"),
        carbohydrateGuideline: { ...result.carbohydrateGuideline, unit: "g/h" },
        temperatureC: result.temperatureC, temperatureAssumed: result.temperatureAssumed },
    };
  },
});

export default defineWebMcpPack({ id: "public-performance-calculators",
  placement: onRoutes("/calculators/power-speed", "/calculators/climb-planner", "/calculators/ftp-wkg",
    "/calculators/gearing", "/calculators/fuel-hydration"),
  tools: [powerSpeedTool, climbTool, ftpTool, gearingTool, fuelTool] });
