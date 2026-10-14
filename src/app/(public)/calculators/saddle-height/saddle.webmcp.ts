import { z } from "zod";
import { defineWebMcpPack, defineWebMcpTool } from "@/lib/webmcp/define";
import { onRoutes } from "@/lib/webmcp/placement";
import { calculatorUrl } from "@/lib/public-calculators/webmcpOutput";
import { calculatePublicSaddleHeight, calculateSaddleHeight, getPublicSaddleHeightNextStep }
  from "../../../../../shared/reliability/saddleHeight";

export const saddleHeightTool = defineWebMcpTool({
  name: "calc_saddle_height", risk: "read", scope: "public",
  description: "Returns the public saddle-height starting point and range in mm, plausibility warnings, measurement basis, next step and page URL. Does not save measurements.",
  inputSchema: z.object({
    heightCm: z.number().min(130).max(220).describe("Rider height in centimetres, 130–220."),
    inseamCm: z.number().min(55).max(105).optional().describe("Optional inseam in centimetres, 55–105."),
    inseamKind: z.enum(["measured", "estimated"]).default("measured")
      .describe("Whether the supplied inseam is measured or estimated; does not attest or save anything."),
    confirmed: z.boolean().default(false).describe("Whether the rider checked a moderately unusual height/inseam pair."),
    override: z.boolean().default(false).describe("Use a large-discrepancy inseam despite the warning, as in the public form."),
  }).strict(),
  execute(input, context) {
    const state = calculatePublicSaddleHeight(input);
    const result = state.result && state.basis === "measured" && input.inseamCm !== undefined
      ? calculateSaddleHeight({ ...input, provenance: { kind: input.inseamKind, unresolvedWarning: state.unresolvedWarning } })
      : state.result;
    const nextStep = getPublicSaddleHeightNextStep({
      hasInseam: input.inseamCm !== undefined && input.inseamKind === "measured",
      unresolvedLargeWarning: state.status === "large", result,
    });
    return {
      summary: context.locale === "nl" ? "Zadelhoogte als startpunt, met meetmarge en controleadvies."
        : "Saddle-height starting point with measurement range and next check.",
      data: {
        pageUrl: calculatorUrl("/calculators/saddle-height", context.locale),
        saddleHeight: result ? { value: result.adviceMm, unit: "mm", lower: result.lowerMm,
          upper: result.upperMm, halfWidth: result.halfWidthMm } : null,
        basis: state.basis === "measured" ? input.inseamKind : state.basis,
        plausibility: state.status, unresolvedWarning: state.unresolvedWarning, canRefine: state.canRefine, nextStep,
      },
    };
  },
});

export default defineWebMcpPack({ id: "public-saddle-height",
  placement: onRoutes("/calculators/saddle-height"), tools: [saddleHeightTool] });
