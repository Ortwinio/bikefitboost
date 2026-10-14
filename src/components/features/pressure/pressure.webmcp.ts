import { z } from "zod";
import { defineWebMcpPack, defineWebMcpTool } from "@/lib/webmcp/define";
import { onRoutes } from "@/lib/webmcp/placement";
import { calculatorUrl, displayNumber } from "@/lib/public-calculators/webmcpOutput";
import { calculateBasicPressure, validatePressureInput } from "@/lib/pressure-engine";
import { reliabilityPressureMessages } from "@/i18n/calculators/reliabilityPressure";

export const tirePressureTool = defineWebMcpTool({
  name: "calc_tire_pressure", risk: "read", scope: "public",
  description: "Returns the public front/rear tyre-pressure starting points in bar and psi, safety warnings and page URL. No quantified uncertainty or manufacturer safety limits are inferred.",
  inputSchema: z.object({
    discipline: z.enum(["road", "gravel", "mtb"]).describe("Cycling discipline: road, gravel or mountain bike."),
    bodyWeightKg: z.number().min(35).max(160).describe("Rider weight in kg, 35–160."),
    widthFrontMm: z.number().min(18).max(80).describe("Front tyre width in mm, 18–80."),
    widthRearMm: z.number().min(18).max(80).describe("Rear tyre width in mm, 18–80; use the front width for linked tyres."),
    tubeType: z.enum(["inner_tube", "latex_tube", "tubeless"]).describe("Inner tube, latex tube or tubeless setup."),
    surface: z.enum(["smooth_asphalt", "average_asphalt", "rough_asphalt", "hardpack_gravel", "loose_gravel", "trail"])
      .describe("Surface used by the public pressure model."),
    bikeWeightKg: z.number().min(3).max(20).optional().describe("Optional bike weight in kg, 3–20; otherwise the model assumes a weight."),
    ridingGoal: z.enum(["speed", "balance", "comfort"]).default("balance").describe("Riding goal; defaults to balance."),
    rimType: z.enum(["hooked", "hookless"]).default("hooked")
      .describe("Rim construction; the public model does not certify rim limits or adjust its result for this choice."),
  }).strict().superRefine((input, context) => {
    for (const error of validatePressureInput(input)) {
      context.addIssue({ code: "custom", path: [error.field], message: "Outside the public calculator's input range." });
    }
  }),
  execute(input, context) {
    const result = calculateBasicPressure({ discipline: input.discipline, bodyWeightKg: input.bodyWeightKg,
      widthFrontMm: input.widthFrontMm, widthRearMm: input.widthRearMm, tubeType: input.tubeType,
      surface: input.surface, bikeWeightKg: input.bikeWeightKg, ridingGoal: input.ridingGoal });
    const copy = reliabilityPressureMessages[context.locale];
    return {
      summary: context.locale === "nl" ? "Berekende startdruk; controleer altijd de limieten van band en velg."
        : "Calculated starting pressure; always check tyre and rim limits.",
      data: {
        pageUrl: calculatorUrl(context.locale === "nl" ? "/bandenspanning-calculator" : "/tire-pressure-calculator", context.locale),
        frontBar: displayNumber(result.frontBar), rearBar: displayNumber(result.rearBar),
        frontPsi: Math.round(result.frontPsi), rearPsi: Math.round(result.rearPsi), warnings: result.warnings,
        uncertainty: copy.uncertainty, safety: copy.meaning,
        bikeWeightAssumed: input.bikeWeightKg === undefined, rimLimitsVerified: false,
      },
    };
  },
});

export default defineWebMcpPack({ id: "public-tire-pressure",
  placement: onRoutes("/tire-pressure-calculator", "/bandenspanning-calculator"), tools: [tirePressureTool] });
