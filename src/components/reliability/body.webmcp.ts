import { z } from "zod";
import { defineWebMcpPack, defineWebMcpTool } from "@/lib/webmcp/define";
import { onRoutes } from "@/lib/webmcp/placement";
import { calculatorUrl, resultRange } from "@/lib/public-calculators/webmcpOutput";
import { runBikeFitCalculation, runCrankLengthCalculation, runFrameSizeCalculation }
  from "@/lib/public-calculators/fitAdapters";
import { calculateSaddleWidth } from "@/lib/saddle-width-engine";
import { CRANK_LENGTH_TABLE } from "../../../convex/lib/fitAlgorithm/constants";
import { calculateSaddleHeight, checkInseamPlausibility } from "../../../shared/reliability/saddleHeight";
import { getReliabilityRange, type ReliabilityMetric } from "../../../shared/reliability/calculators";

const bodyShape = {
  heightCm: z.number().min(130).max(210).describe("Rider height in centimetres, 130–210."),
  inseamCm: z.number().min(55).max(105).optional().describe("Optional inseam in centimetres, 55–105."),
  inseamKind: z.enum(["measured", "estimated"]).default("measured")
    .describe("Whether the supplied inseam was measured or estimated; does not save a measurement."),
  confirmed: z.boolean().default(false).describe("Whether the rider checked a moderately unusual height/inseam pair."),
  bikeCategory: z.enum(["road", "gravel", "mtb", "city"]).default("road").describe("Bike category; defaults to road."),
};
const bodySchema = z.object(bodyShape).strict();

function bodyEvidence(input: z.output<typeof bodySchema>) {
  const plausibility = input.inseamCm === undefined ? null : checkInseamPlausibility(input.heightCm, input.inseamCm);
  const unresolvedWarning = plausibility?.status === "large" || (plausibility?.status === "check" && !input.confirmed);
  const useInseam = input.inseamCm !== undefined && plausibility?.status !== "large" && plausibility?.status !== "error";
  const provenance = { kind: useInseam ? input.inseamKind : "derived" as const, unresolvedWarning };
  const saddle = calculateSaddleHeight({ heightCm: input.heightCm,
    inseamCm: useInseam ? input.inseamCm : undefined, provenance });
  return {
    inseamCm: saddle.inseamMm / 10, inseamProvenance: provenance,
    status: plausibility?.status ?? "none", unresolvedWarning,
  };
}

export const bodyTools = (["bike-fit", "frame-size", "crank-length"] as const).map(calculator =>
  defineWebMcpTool({
    name: `calc_${calculator.replaceAll("-", "_")}`,
    description: {
      "bike-fit": "Returns the public A–D bike-fit starting measurements and uncertainty ranges in mm, assumptions and page URL. Does not save a fit.",
      "frame-size": "Returns the public frame-size label, neighbouring size options, measurement basis and page URL. Compare actual bike geometry before buying.",
      "crank-length": "Returns the public crank-length recommendation and eligible crank sizes in mm, measurement basis and page URL.",
    }[calculator],
    risk: "read", scope: "public", placement: onRoutes(`/calculators/${calculator}`),
    inputSchema: bodySchema,
    execute(input, context) {
      const evidence = bodyEvidence(input);
      const category = input.bikeCategory;
      const values = { heightCm: input.heightCm, inseamCm: evidence.inseamCm, category };
      const row = (metric: ReliabilityMetric, value: number, options?: number[], labels?: string[]) =>
        resultRange(getReliabilityRange({ metric, value, options, evidence }), metric === "frameSize" ? "" : "mm", labels);
      let results;
      if (calculator === "bike-fit") {
        const { fitResult } = runBikeFitCalculation({ ...values, ridingGoal: "balanced", flexibility: 3, coreStability: 3 });
        results = {
          saddleHeight: row("saddleHeight", fitResult.saddleHeightMm),
          saddleSetback: row("saddleSetback", fitResult.saddleSetbackMm),
          handlebarDrop: row("handlebarDrop", fitResult.barDropMm),
          reach: row("reach", fitResult.saddleToBarReachMm),
        };
      } else if (calculator === "frame-size") {
        const result = runFrameSizeCalculation(values);
        const labels = [...new Set(Array.from({ length: 81 }, (_, index) =>
          runFrameSizeCalculation({ ...values, heightCm: 130 + index }).estimatedFrameSize))];
        results = { frameSize: row("frameSize", labels.indexOf(result.estimatedFrameSize) + 1,
          labels.map((_, index) => index + 1), labels) };
      } else {
        results = { crankLength: row("crankLength", runCrankLengthCalculation(values),
          CRANK_LENGTH_TABLE.map(option => option.crankLength)) };
      }
      return {
        summary: context.locale === "nl" ? "Berekend startpunt; controleer de meetbasis en marge."
          : "Calculated starting point; check the measurement basis and range.",
        data: {
          pageUrl: calculatorUrl(`/calculators/${calculator}`, context.locale), results,
          basis: calculator === "frame-size" ? "height-and-bike-category" : evidence.inseamProvenance.kind,
          plausibility: evidence.status,
          unresolvedWarning: evidence.unresolvedWarning,
          ...(calculator === "bike-fit" ? { assumptions: { ridingGoal: "balanced", flexibility: 3, coreStability: 3 } } : {}),
        },
      };
    },
  }));

export const saddleWidthTool = defineWebMcpTool({
  name: "calc_saddle_width", risk: "read", scope: "public",
  description: "Returns the public saddle-width recommendation and range in mm, measured or estimated basis and page URL.",
  placement: onRoutes("/calculators/saddle-width"),
  inputSchema: z.object({
    heightCm: z.number().min(130).max(210).describe("Height in centimetres, 130–210."),
    weightKg: z.number().min(40).max(150).describe("Rider weight in kilograms, 40–150."),
    hipCircumferenceCm: z.number().min(70).max(140).describe("Hip circumference in centimetres, 70–140."),
    sitBoneWidthMm: z.number().min(90).max(170).optional().describe("Optional sit-bone width in millimetres, 90–170."),
    sitBoneKind: z.enum(["measured", "estimated"]).default("measured")
      .describe("Whether supplied sit-bone width is measured or estimated."),
  }).strict(),
  execute(input, context) {
    const result = calculateSaddleWidth({ ...input, inputMethod: input.sitBoneWidthMm === undefined ? "estimated" : "measured",
      ridingType: "endurance_road", postureCategory: "balanced" });
    const range = getReliabilityRange({ metric: "saddleWidth", value: result.finalRecommendedWidthMm,
      evidence: { sitBonesMeasured: input.sitBoneWidthMm !== undefined && input.sitBoneKind === "measured" } });
    return {
      summary: context.locale === "nl" ? "Zadelbreedte als startpunt voor een praktijktest." : "Saddle-width starting point for a riding test.",
      data: { pageUrl: calculatorUrl("/calculators/saddle-width", context.locale), saddleWidth: resultRange(range, "mm"),
        basis: input.sitBoneWidthMm === undefined ? "estimated" : input.sitBoneKind,
        assumptions: { ridingType: "endurance_road", postureCategory: "balanced" } },
    };
  },
});

export default defineWebMcpPack({ id: "public-body-calculators",
  placement: onRoutes("/calculators/bike-fit", "/calculators/frame-size", "/calculators/crank-length", "/calculators/saddle-width"),
  tools: [...bodyTools, saddleWidthTool] });
