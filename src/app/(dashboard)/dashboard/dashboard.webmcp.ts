import { z } from "zod";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";
import { hasFitMeasurements } from "../../../../shared/profileFitReadiness";
import { withLocalePrefix } from "@/i18n/navigation";
import { getFitReportCopy } from "@/i18n/account/fitAudit";
import { mapReportV2Payload } from "@/lib/reports/reportV2Mapper";
import { defineWebMcpPack, defineWebMcpTool, listLimit } from "@/lib/webmcp/define";
import { onRoutes } from "@/lib/webmcp/placement";
import { ToolError } from "@/lib/webmcp/pipeline";
import type { ToolContext } from "@/lib/webmcp/types";

const emptyInput = z.object({}).strict();
const listInput = z.object({
  limit: listLimit,
  offset: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0)
    .describe("Zero-based offset in the current list; use nextOffset to continue."),
}).strict();
const recordId = z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/);
const text = (value: string | undefined) => value?.slice(0, 100) ?? null;

function bikeSummary(bike: Doc<"bikes">) {
  return { id: bike._id, name: text(bike.name), type: bike.bikeType,
    brand: text(bike.brand), model: text(bike.model) };
}

function pageOf<Row>(rows: readonly Row[], offset: number, limit: number) {
  const items = rows.slice(offset, offset + limit);
  return { items, total: rows.length, nextOffset: offset + items.length < rows.length ? offset + items.length : null };
}

export const bikesList = defineWebMcpTool({
  name: "bikes_list", risk: "read", scope: "user", untrustedContent: true,
  description: "Return your bike IDs, names, types, brands and models, with an offset for the next page. Names are rider-written text.",
  placement: onRoutes("/dashboard", "/bikes"), inputSchema: listInput,
  async execute({ limit, offset }, context) {
    const rows = await context.query(api.bikes.queries.listSummariesByUser, {});
    const page = pageOf(rows, offset, limit);
    return { summary: `${page.items.length} of ${page.total} bikes.`,
      data: { ...page, items: page.items.map(bikeSummary) } };
  },
});

export const bikesGet = defineWebMcpTool({
  name: "bikes_get", risk: "read", scope: "user", untrustedContent: true,
  description: "Return one of your bikes with its recorded frame geometry and current setup in millimetres and degrees. Missing measurements remain null.",
  placement: onRoutes("/bikes/[bikeId]"),
  inputSchema: z.object({ bikeId: recordId.describe("ID of the bike you own and want to read.") }).strict(),
  async execute({ bikeId }, context) {
    const detail = await context.query(api.bikes.queries.getDetail, { bikeId: bikeId as Id<"bikes"> });
    if (!detail) throw new ToolError("NOT_FOUND");
    const { bike } = detail;
    const geometry = bike.currentGeometry;
    const setup = bike.currentSetup;
    return { summary: "Your recorded bike geometry and setup.", data: {
      ...bikeSummary(bike),
      geometry: { stackMm: geometry?.stackMm ?? null, reachMm: geometry?.reachMm ?? null,
        seatTubeAngleDegrees: geometry?.seatTubeAngle ?? null, headTubeAngleDegrees: geometry?.headTubeAngle ?? null,
        frameSize: text(geometry?.frameSize) },
      setup: { saddleHeightMm: setup?.saddleHeightMm ?? null, saddleSetbackMm: setup?.saddleSetbackMm ?? null,
        stemLengthMm: setup?.stemLengthMm ?? null, stemAngleDegrees: setup?.stemAngle ?? null,
        handlebarWidthMm: setup?.handlebarWidthMm ?? null, crankLengthMm: setup?.crankLengthMm ?? null,
        handlebarReachMm: setup?.handlebarReachMm ?? null, handlebarDropMm: setup?.handlebarDropMm ?? null,
        spacersMm: setup?.spacersMm ?? null },
    } };
  },
});

export const fitListSessions = defineWebMcpTool({
  name: "fit_list_sessions", risk: "read", scope: "user", untrustedContent: true,
  description: "Return your fit session IDs, bike references, status and creation timestamps, newest first, with an offset for the next page.",
  placement: onRoutes("/dashboard", "/bikes"), inputSchema: listInput,
  async execute({ limit, offset }, context) {
    const rows = await context.query(api.sessions.queries.getAllSessionsWithBikes, {});
    const page = pageOf(rows, offset, limit);
    return { summary: `${page.items.length} of ${page.total} fit sessions.`, data: {
      ...page, items: page.items.map(({ session, bike }) => ({
        id: session._id, bikeId: session.bikeId ?? null, bikeName: text(bike?.name),
        status: session.status, createdAt: session.createdAt,
      })),
    } };
  },
});

export const fitGetReportSummary = defineWebMcpTool({
  name: "fit_get_report_summary", risk: "read", scope: "user",
  description: "Return your existing fit report's confidence percentage and key measurements in millimetres. Recommendation headings appear only with full report access. A missing recommendation is reported without generating one.",
  placement: onRoutes("/fit/[sessionId]/results"),
  inputSchema: z.object({ sessionId: recordId.describe("ID of your fit session whose existing report should be read.") }).strict(),
  async execute({ sessionId }, context) {
    const source = await context.query(api.recommendations.queries.getReportV2, { sessionId: sessionId as Id<"fitSessions"> });
    if (!source) throw new ToolError("NOT_FOUND");
    if (!source.recommendation) return { summary: "This session has no generated report.",
      data: { sessionId: source.session._id, status: "not_generated" } };
    const recommendation = source.recommendation;
    const fit = recommendation.calculatedFit;
    const fullReport = source.access?.fullReport === true;
    const copy = getFitReportCopy(context.locale);
    const headings = fullReport ? mapReportV2Payload(source).detailedFit.map(row => copy.parameters[row.key].label) : [];
    return { summary: fullReport ? "Your fit measurements and recommendation headings." : "Your core fit measurements; detailed recommendations require full report access.", data: {
      sessionId: source.session._id, status: "ready", fullReport, confidencePercent: recommendation.confidenceScore,
      measurements: {
        stackMm: fit.recommendedStackMm, reachMm: fit.recommendedReachMm, effectiveTopTubeMm: fit.effectiveTopTubeMm,
        saddleHeightMm: fit.saddleHeightMm, saddleSetbackMm: fit.saddleSetbackMm,
        saddleHeightRangeMm: { min: fit.saddleHeightRange.min, max: fit.saddleHeightRange.max },
        handlebarDropMm: fit.handlebarDropMm, handlebarReachMm: fit.handlebarReachMm,
        stemLengthMm: fit.stemLengthMm, crankLengthMm: fit.crankLengthMm, handlebarWidthMm: fit.handlebarWidthMm,
      }, recommendationHeadings: headings,
    } };
  },
});

export const accountGetProfileSummary = defineWebMcpTool({
  name: "account_get_profile_summary", risk: "read", scope: "user",
  description: "Return your recorded body measurements with units, flexibility and core stability assessments, riding preferences and fit-measurement readiness. Missing values remain null.",
  placement: onRoutes("/dashboard", "/profile"), inputSchema: emptyInput,
  async execute(_input, context) {
    const profile = await context.query(api.profiles.queries.getMyProfile, {});
    if (!profile) throw new ToolError("NOT_FOUND");
    return { summary: "Your recorded profile measurements and riding preferences.", data: {
      fitMeasurementsReady: hasFitMeasurements(profile),
      measurements: { heightCm: profile.heightCm ?? null, inseamCm: profile.inseamCm ?? null,
        weightKg: profile.weightKg ?? null, torsoLengthCm: profile.torsoLengthCm ?? null,
        armLengthCm: profile.armLengthCm ?? null, femurLengthCm: profile.femurLengthCm ?? null,
        shoulderWidthCm: profile.shoulderWidthCm ?? null },
      flexibility: profile.flexibilityScore ?? null, coreStabilityScore: profile.coreStabilityScore ?? null,
      riding: { experienceLevel: profile.experienceLevel ?? null, weeklyHours: profile.weeklyHours ?? null,
        typicalRideLength: profile.typicalRideLength ?? null, positionPriority: profile.positionPriority ?? null },
    } };
  },
});

export const accountGetAccess = defineWebMcpTool({
  name: "account_get_access", risk: "read", scope: "user",
  description: "Return your free or paid access state, current plan, expiry timestamp and effective feature access. This reads access without changing it.",
  placement: onRoutes("/dashboard", "/bikes", "/profile", "/settings"), inputSchema: emptyInput,
  async execute(_input, context) {
    const access = await context.query(api.pricing.queries.getAccess, {});
    if (!access) throw new ToolError("NOT_FOUND");
    return { summary: "Your current account access and expiry.", data: {
      state: access.productId === "free" ? "free" : "paid", plan: access.productId,
      expiresAt: access.expiresAt, enforced: access.enforced, fullProfile: access.fullProfile,
      fullReport: access.fullReport, maxBikes: access.maxBikes,
    } };
  },
});

function openForm(path: string, summary: string, context: ToolContext) {
  context.signal.throwIfAborted();
  const url = withLocalePrefix(path, context.locale);
  context.navigate(url);
  return { summary, data: { url } };
}

export const bikesOpenNew = defineWebMcpTool({
  name: "bikes_open_new", risk: "read", scope: "user",
  description: "Open the new-bike choice page and return its local URL. The rider chooses a method and creates the bike.",
  placement: onRoutes("/dashboard", "/bikes"), inputSchema: emptyInput,
  execute: (_input, context) => openForm("/bikes/new", "Opened the new-bike page; no bike was created.", context),
});

export const fitOpenStart = defineWebMcpTool({
  name: "fit_open_start", risk: "read", scope: "user",
  description: "Open the fit-start form and return its local URL. The rider selects a bike and starts the fit.",
  placement: onRoutes("/dashboard", "/bikes", "/profile", "/fit"), inputSchema: emptyInput,
  execute: (_input, context) => openForm("/fit", "Opened the fit-start form; no session was created.", context),
});

export const accountOpenProfile = defineWebMcpTool({
  name: "account_open_profile", risk: "read", scope: "user",
  description: "Open the profile page with its measurement-editing controls and return its local URL. The rider opens the editor and makes changes.",
  placement: onRoutes("/dashboard", "/fit"), inputSchema: emptyInput,
  execute: (_input, context) => openForm("/profile", "Opened the profile page with editing controls; no values were changed.", context),
});

export default defineWebMcpPack({
  id: "dashboard-reads",
  placement: onRoutes("/dashboard", "/bikes", "/bikes/[bikeId]", "/profile", "/settings", "/fit", "/fit/[sessionId]/results"),
  tools: [bikesList, bikesGet, fitListSessions, fitGetReportSummary, accountGetProfileSummary,
    accountGetAccess, bikesOpenNew, fitOpenStart, accountOpenProfile],
});
