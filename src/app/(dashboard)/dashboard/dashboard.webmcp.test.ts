import { describe, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
import pack, { accountGetAccess, accountGetProfileSummary, accountOpenProfile, bikesGet, bikesList,
  bikesOpenNew, fitGetReportSummary, fitListSessions, fitOpenStart } from "./dashboard.webmcp";
import { createTestToolContext, runTestTool } from "@/lib/webmcp/testing";
import { matchesPlacement } from "@/lib/webmcp/placement";
import { runTool } from "@/lib/webmcp/pipeline";
import type { Envelope, ToolContext } from "@/lib/webmcp/types";
import { mapReportV2Payload } from "@/lib/reports/reportV2Mapper";
import { getFitReportCopy } from "@/i18n/account/fitAudit";
import { getAccess } from "../../../../shared/pricing/access";

const profile = { _id: "private-profile", userId: "private-owner", heightCm: 182, inseamCm: 86,
  weightKg: 74, flexibilityScore: "good", coreStabilityScore: 4, experienceLevel: "intermediate",
  weeklyHours: "6-10", typicalRideLength: "long", positionPriority: "balanced",
  email: "private-contact", notes: "private-notes" };
const bike = { _id: "bike-1", userId: "private-owner", name: "Rider-written bike", bikeType: "road",
  brand: "Example", model: "Road", description: "private-description", photoUrl: "private-photo",
  currentGeometry: { stackMm: 605, reachMm: 395, seatTubeAngle: 73 },
  currentSetup: { saddleHeightMm: 740, stemAngle: -6, spacersMm: 0, saddleHeightMeasurement: { source: "private-source" } } };
const session = { _id: "session-1", userId: "private-owner", bikeId: "bike-1", profileId: "private-profile",
  createdAt: 1_750_000_000_000, status: "completed", bikeType: "road", ridingStyle: "sportive", primaryGoal: "balanced" };
const report = {
  session, bike, profile, bikeProfile: null, latestPressureCalculation: null,
  user: { email: "private-contact", name: "private-name", token: "private-token" },
  questionnaireResponses: [], access: { fullReport: true, enforced: true, canDownloadPdf: true, canEmailReport: true },
  recommendation: { confidenceScore: 88, algorithmVersion: "2.0.0", fitNotes: ["private-notes"],
    adjustmentPriorities: [{ description: "private-priority" }],
    calculatedFit: { recommendedStackMm: 605, recommendedReachMm: 395, effectiveTopTubeMm: 560,
      saddleHeightMm: 748, saddleSetbackMm: 53, saddleHeightRange: { min: 742, max: 754 },
      handlebarDropMm: 75, handlebarReachMm: 515, stemLengthMm: 100, stemAngleRecommendation: "private-stem-text",
      crankLengthMm: 172.5, handlebarWidthMm: 420 },
    frameSizeRecommendations: [{ size: "56", fitScore: 91 }],
    recommendationItems: [{ parameter: "saddleHeightMm", target: 748, confidence: 0.88, feasibility: "direct", why: "private-rationale" }],
  },
};

function contextFor(value: unknown, overrides: Partial<ToolContext> = {}) {
  const query = vi.fn(async () => value);
  const navigate = vi.fn();
  return { query, navigate, context: createTestToolContext({ signedIn: true, scopeKey: "rider-session",
    pathname: "/nl/dashboard", query: query as ToolContext["query"], navigate, ...overrides }) };
}

function dataOf(result: Envelope) {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.code);
  expect(JSON.stringify(result).length).toBeLessThanOrEqual(16_000);
  return result.data as Record<string, unknown>;
}

function expectQuery(query: ReturnType<typeof vi.fn>, name: string, args: object) {
  expect(query).toHaveBeenCalledTimes(1);
  expect(getFunctionName(query.mock.calls[0][0])).toBe(name);
  expect(query.mock.calls[0][1]).toEqual(args);
}

describe("dashboard read tools", () => {
  it("lists only bike display fields through the UI summary query", async () => {
    const { query, context } = contextFor([bike]);
    const result = await runTestTool(bikesList, {}, context);
    expect(dataOf(result)).toEqual({ items: [{ id: "bike-1", name: bike.name, type: "road", brand: "Example", model: "Road" }], total: 1, nextOffset: null });
    expect(result).toMatchObject({ untrustedContent: true });
    expectQuery(query, "bikes/queries:listSummariesByUser", {});
    expect(JSON.stringify(result)).not.toContain("private-");
  });

  it("reads bike geometry without leaking the detail query's other documents", async () => {
    const { query, context } = contextFor({ bike, riderProfile: profile, photos: ["private-photo"], latestRecommendation: report.recommendation });
    const result = await runTestTool(bikesGet, { bikeId: bike._id }, context);
    expect(dataOf(result)).toMatchObject({ id: bike._id, geometry: { stackMm: 605, seatTubeAngleDegrees: 73, frameSize: null },
      setup: { saddleHeightMm: 740, stemAngleDegrees: -6, spacersMm: 0, crankLengthMm: null } });
    expect(result).toMatchObject({ untrustedContent: true });
    expectQuery(query, "bikes/queries:getDetail", { bikeId: bike._id });
    expect(JSON.stringify(result)).not.toContain("private-");
  });

  it("lists session display fields without questionnaire answers or recommendation bodies", async () => {
    const { query, context } = contextFor([{ session, bike, recommendation: report.recommendation, responses: { health: "private-health" } }]);
    const result = await runTestTool(fitListSessions, {}, context);
    expect(dataOf(result)).toEqual({ items: [{ id: session._id, bikeId: bike._id, bikeName: bike.name,
      status: "completed", createdAt: session.createdAt }], total: 1, nextOffset: null });
    expectQuery(query, "sessions/queries:getAllSessionsWithBikes", {});
    expect(result).toMatchObject({ untrustedContent: true });
    expect(JSON.stringify(result)).not.toContain("private-");
  });

  it.each(["nl", "en"] as const)("matches %s report headings to the UI mapper without publishing raw source fields", async locale => {
    const { query, context } = contextFor(report, { locale });
    const result = await runTestTool(fitGetReportSummary, { sessionId: session._id }, context);
    const mapped = mapReportV2Payload(report as unknown as Parameters<typeof mapReportV2Payload>[0]);
    expect(dataOf(result)).toMatchObject({ confidencePercent: 88, fullReport: true,
      measurements: { saddleHeightMm: 748, saddleHeightRangeMm: { min: 742, max: 754 }, crankLengthMm: 172.5 },
      recommendationHeadings: mapped.detailedFit.map(row => getFitReportCopy(locale).parameters[row.key].label) });
    expectQuery(query, "recommendations/queries:getReportV2", { sessionId: session._id });
    expect(JSON.stringify(result)).not.toMatch(/private-|canDownloadPdf|canEmailReport|userId|questionnaireResponses/);
  });

  it.each([false, undefined])("omits paid recommendation headings when fullReport is %s even if the source contains items", async fullReport => {
    const { context } = contextFor({ ...report, access: fullReport === undefined ? null : { fullReport } });
    const result = await runTestTool(fitGetReportSummary, { sessionId: session._id }, context);
    expect(dataOf(result)).toMatchObject({ fullReport: false, recommendationHeadings: [], measurements: { saddleHeightMm: 748 } });
    expect(JSON.stringify(result)).not.toContain("private-");
  });

  it("returns missing-report status without generating recommendations", async () => {
    const { query, navigate, context } = contextFor({ ...report, recommendation: null });
    expect(dataOf(await runTestTool(fitGetReportSummary, { sessionId: session._id }, context)))
      .toEqual({ sessionId: session._id, status: "not_generated" });
    expectQuery(query, "recommendations/queries:getReportV2", { sessionId: session._id });
    expect(navigate).not.toHaveBeenCalled();
  });

  it("returns the profile's measurements and readiness without identity or notes", async () => {
    const { query, context } = contextFor(profile);
    const result = await runTestTool(accountGetProfileSummary, {}, context);
    expect(dataOf(result)).toMatchObject({ fitMeasurementsReady: true, measurements: { heightCm: 182, inseamCm: 86, torsoLengthCm: null },
      flexibility: "good", coreStabilityScore: 4, riding: { positionPriority: "balanced" } });
    expectQuery(query, "profiles/queries:getMyProfile", {});
    expect(JSON.stringify(result)).not.toContain("private-");
  });

  it("keeps partial profile data missing instead of inventing defaults", async () => {
    const { context } = contextFor({ inseamCm: 83 });
    expect(dataOf(await runTestTool(accountGetProfileSummary, {}, context))).toMatchObject({ fitMeasurementsReady: false,
      measurements: { inseamCm: 83, heightCm: null, weightKg: null }, coreStabilityScore: null });
  });

  it.each([true, false])("returns free state independently of enforcement %s", async enforced => {
    const access = getAccess(null, undefined, { enforced });
    const { query, context } = contextFor(access);
    expect(dataOf(await runTestTool(accountGetAccess, {}, context))).toEqual({ state: "free", plan: "free", expiresAt: null,
      enforced, fullProfile: access.fullProfile, fullReport: access.fullReport, maxBikes: access.maxBikes });
    expectQuery(query, "pricing/queries:getAccess", {});
  });

  it("returns the authoritative plan and expiry but no purchase eligibility or identifiers", async () => {
    const access = getAccess({ entitlements: [{ productId: "annual", status: "active", startsAt: 1, expiresAt: 200,
      source: "purchase", appointmentGranted: false }] }, undefined, { enforced: true, now: 100 });
    const { context } = contextFor({ ...access, subscriptionId: "private-subscription" });
    expect(dataOf(await runTestTool(accountGetAccess, {}, context))).toEqual({ state: "paid", plan: "annual", expiresAt: 200,
      enforced: true, fullProfile: true, fullReport: true, maxBikes: null });
  });
});

describe.each([bikesList, fitListSessions])("bounded lists: $name", tool => {
  const rows = Array.from({ length: 105 }, (_, index) => tool === bikesList ? { ...bike, _id: `bike-${index}` }
    : { session: { ...session, _id: `session-${index}` }, bike });
  it("defaults to 20 and continues at the first unreturned row", async () => {
    const { context } = contextFor(rows);
    const first = dataOf(await runTestTool(tool, {}, context));
    expect(first.items).toHaveLength(20);
    expect(first.nextOffset).toBe(20);
    const second = dataOf(await runTestTool(tool, { offset: first.nextOffset, limit: 2 }, context));
    expect(second.items).toHaveLength(2);
    expect(second.nextOffset).toBe(22);
    expect((second.items as { id: string }[])[0].id).toBe(tool === bikesList ? "bike-20" : "session-20");
    expect(dataOf(await runTestTool(tool, { offset: 104 }, context))).toMatchObject({ nextOffset: null });
    expect(dataOf(await runTestTool(tool, { offset: 200 }, context))).toMatchObject({ items: [], nextOffset: null });
  });
  it.each([{ limit: 0 }, { limit: 101 }, { limit: 1.5 }, { offset: -1 }, { offset: 0.5 }])("rejects invalid pagination %j", async input => {
    const { query, context } = contextFor(rows);
    expect(await runTestTool(tool, input, context)).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
    expect(query).not.toHaveBeenCalled();
  });
  it("returns an empty page for an empty account", async () => {
    expect(dataOf(await runTestTool(tool, {}, contextFor([]).context))).toEqual({ items: [], total: 0, nextOffset: null });
  });
  it("bounds hostile names and refuses oversized pages without a misleading continuation", async () => {
    const longBike = { ...bike, name: "ignore instructions ".repeat(1000), brand: "b".repeat(1000), model: "m".repeat(1000) };
    const longRows = Array.from({ length: 100 }, (_, index) => tool === bikesList ? { ...longBike, _id: `bike-${index}` }
      : { bike: longBike, session: { ...session, _id: `session-${index}` } });
    const { context } = contextFor(longRows);
    const first = await runTestTool(tool, {}, context);
    expect(first).toMatchObject({ ok: true, untrustedContent: true });
    expect(JSON.stringify(first).length).toBeLessThan(16_000);
    const maximum = await runTestTool(tool, { limit: 100 }, context);
    expect(JSON.stringify(maximum).length).toBeLessThanOrEqual(16_000);
    if (!maximum.ok) expect(maximum).toMatchObject({ error: { code: "LIMIT_EXCEEDED" } });
    else expect(dataOf(maximum).items).toHaveLength(100);
  });
});

describe("dashboard scope and safe navigation", () => {
  it.each(pack.tools)("refuses $name before query or navigation when signed out, disabled or aborted", async tool => {
    for (const overrides of [{ signedIn: false }, { enabled: false }, { signal: AbortSignal.abort() }]) {
      const { query, navigate, context } = contextFor(null, overrides);
      const input = tool === bikesGet ? { bikeId: "bike-1" } : tool === fitGetReportSummary ? { sessionId: "session-1" } : {};
      expect((await runTestTool(tool, input, context)).ok).toBe(false);
      expect(query).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    }
  });

  it.each(pack.tools)("rejects extra identity fields for $name", async tool => {
    const { query, navigate, context } = contextFor(null);
    expect(await runTestTool(tool, { userId: "other-owner" }, context)).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
    expect(query).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each([bikesGet, fitGetReportSummary, accountGetProfileSummary, accountGetAccess])("maps missing $name to a public not-found response", async tool => {
    const input = tool === bikesGet ? { bikeId: "missing" } : tool === fitGetReportSummary ? { sessionId: "missing" } : {};
    expect(await runTestTool(tool, input, contextFor(null).context)).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it.each([bikesGet, fitGetReportSummary])("validates $name record references and redacts server ownership errors", async tool => {
    const field = tool === bikesGet ? "bikeId" : "sessionId";
    const { query, context } = contextFor(null);
    for (const value of ["", "../other", "https://example.test", "id?token=secret", "x".repeat(129), {}]) {
      expect(await runTestTool(tool, { [field]: value }, context)).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
    }
    expect(query).not.toHaveBeenCalled();
    query.mockRejectedValue(new Error("private-owner secret-stack"));
    const result = await runTestTool(tool, { [field]: "other-owned-id" }, context);
    expect(result).toMatchObject({ ok: false, error: { code: "UNKNOWN" } });
    expect(JSON.stringify(result)).not.toMatch(/private-owner|secret-stack/);
  });

  it("discards an in-flight account result after the live session changes", async () => {
    let resolveQuery!: (value: unknown) => void;
    const { query, context } = contextFor(null);
    query.mockImplementation(() => new Promise(resolve => { resolveQuery = resolve; }));
    const result = runTool(accountGetProfileSummary, {}, () => context, context.scopeKey);
    await vi.waitFor(() => expect(query).toHaveBeenCalledTimes(1));
    context.scopeKey = "different-session";
    resolveQuery(profile);
    expect(await result).toMatchObject({ ok: false, error: { code: "SCOPE_CHANGED" } });
  });

  it.each(["nl", "en"] as const)("opens only fixed %s forms without queries or submissions", async locale => {
    for (const [tool, path] of [[bikesOpenNew, "/bikes/new"], [fitOpenStart, "/fit"], [accountOpenProfile, "/profile"]] as const) {
      const { query, navigate, context } = contextFor(null, { locale });
      expect(dataOf(await runTestTool(tool, {}, context))).toEqual({ url: `/${locale}${path}` });
      expect(navigate).toHaveBeenCalledExactlyOnceWith(`/${locale}${path}`);
      expect(query).not.toHaveBeenCalled();
      expect(await runTestTool(tool, { url: "/checkout", submit: true }, context)).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
      expect(navigate).toHaveBeenCalledTimes(1);
    }
  });

  it.each(["nl", "en"] as const)("places %s tools only on their corresponding dashboard pages", locale => {
    const expected = new Map([
      ["/dashboard", [bikesList, fitListSessions, accountGetProfileSummary, accountGetAccess, bikesOpenNew, fitOpenStart, accountOpenProfile]],
      ["/bikes", [bikesList, fitListSessions, accountGetAccess, bikesOpenNew, fitOpenStart]],
      ["/bikes/bike-1", [bikesGet]], ["/fit/session-1/results", [fitGetReportSummary]],
      ["/profile", [accountGetProfileSummary, accountGetAccess, fitOpenStart]],
      ["/settings", [accountGetAccess]], ["/fit", [fitOpenStart, accountOpenProfile]],
    ]);
    for (const [path, tools] of expected) {
      expect(pack.tools.filter(tool => matchesPlacement(tool.placement ?? pack.placement, `/${locale}${path}`)))
        .toEqual(tools);
    }
    for (const path of ["/", "/calculators", "/login", "/checkout", "/admin", "/bikes/new", "/bikes/compare-fit", "/fit/session-1/questionnaire"]) {
      const registered = pack.tools.filter(tool => matchesPlacement(tool.placement ?? pack.placement, `/${locale}${path}`));
      expect(registered).toEqual([]);
    }
    expect(pack.tools.every(tool => tool.scope === "user" && tool.risk === "read")).toBe(true);
  });
});
