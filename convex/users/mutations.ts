import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireUserId } from "../lib/authz";

export const setAgentToolsEnabled = mutation({
  args: { enabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { enabled }) => {
    const userId = await requireUserId(ctx);
    await ctx.db.patch(userId, { agentToolsEnabled: enabled });
    return null;
  },
});

export const setLocale = mutation({
  args: { locale: v.union(v.literal("nl"), v.literal("en")) },
  returns: v.null(),
  handler: async (ctx, { locale }) => {
    const userId = await requireUserId(ctx);
    await ctx.db.patch(userId, { locale });
    return null;
  },
});

export const setLocaleIfMissing = mutation({
  args: { locale: v.union(v.literal("nl"), v.literal("en")) },
  returns: v.null(),
  handler: async (ctx, { locale }) => {
    const userId = await requireUserId(ctx);
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    if (user.locale === undefined) {
      await ctx.db.patch(userId, { locale });
    }
    return null;
  },
});

export const updateProfile = mutation({
  args: {
    profile_image_url: v.optional(v.string()),
    displayName: v.optional(v.string()),
    theme_preference: v.optional(
      v.union(v.literal("light"), v.literal("dark"), v.literal("system"))
    ),
    unit_preference: v.optional(
      v.union(v.literal("metric"), v.literal("imperial"))
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const updates: Record<string, unknown> = { ...args };

    if (args.profile_image_url !== undefined) {
      updates.profileImageSource = args.profile_image_url ? "manual" : undefined;
    }

    if (args.displayName !== undefined) {
      const trimmedDisplayName = args.displayName.trim();
      updates.displayName = trimmedDisplayName || undefined;
      updates.displayNameSource = trimmedDisplayName ? "manual" : undefined;
    }

    await ctx.db.patch(userId, updates);
  },
});

/**
 * Permanently delete the authenticated user's account and all associated data.
 * Cascade-deletes: profiles, bikes, fitSessions, questionnaireResponses,
 * recommendations, emailReports, and the user record itself.
 */
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);

    for (const table of ["pricingEntitlements", "pricingTransitionOffers", "pricingAppointmentNotifications",
      "reliabilityInseamMeasurements", "reliabilityKneeMeasurements", "reliabilitySaddlePreferences"] as const) {
      const rows = await ctx.db.query(table)
        .withIndex("by_user", range => range.eq("userId", userId)).collect();
      for (const row of rows) await ctx.db.delete(row._id);
    }
    const pricingRuns = await ctx.db.query("pricingTransitionRuns")
      .withIndex("by_admin", range => range.eq("adminUserId", userId)).collect();
    for (const run of pricingRuns) await ctx.db.delete(run._id);

    const observations = await ctx.db.query("profileObservations")
      .withIndex("by_user_field", range => range.eq("userId", userId)).collect();
    for (const observation of observations) await ctx.db.delete(observation._id);

    const prompts = await ctx.db.query("profilePrompts")
      .withIndex("by_user_key", range => range.eq("userId", userId)).collect();
    const promptCards = await ctx.db.query("profilePromptCards")
      .withIndex("by_user_shown", range => range.eq("userId", userId)).collect();
    const promptActivity = await ctx.db.query("profilePromptActivity")
      .withIndex("by_user_calculator", range => range.eq("userId", userId)).collect();
    for (const record of [...prompts, ...promptCards, ...promptActivity]) await ctx.db.delete(record._id);
    const newsletterEvents = await ctx.db.query("newsletterConsentEvents")
      .withIndex("by_user_request", range => range.eq("userId", userId)).collect();
    for (const event of newsletterEvents) await ctx.db.delete(event._id);

    // Calculator drafts include personal measurements and belong to account deletion too.
    const calculatorStates = await ctx.db.query("calculatorStates")
      .withIndex("by_user_calculator_bike", (q) => q.eq("userId", userId)).collect();
    for (const state of calculatorStates) await ctx.db.delete(state._id);

    // Delete questionnaire responses (via fitSessions)
    const sessions = await ctx.db
      .query("fitSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const session of sessions) {
      const responses = await ctx.db
        .query("questionnaireResponses")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const response of responses) {
        await ctx.db.delete(response._id);
      }
    }

    // Delete recommendations
    const recommendations = await ctx.db
      .query("recommendations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const rec of recommendations) {
      await ctx.db.delete(rec._id);
    }

    // Delete email reports
    const emailReports = await ctx.db
      .query("emailReports")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const report of emailReports) {
      await ctx.db.delete(report._id);
    }

    // Delete fit sessions
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    // Delete profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (profile) {
      await ctx.db.delete(profile._id);
    }

    // Delete bikes
    const bikes = await ctx.db
      .query("bikes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const bike of bikes) {
      await ctx.db.delete(bike._id);
    }

    // Delete integrations
    const integrations = await ctx.db
      .query("integrations")
      .withIndex("by_user_and_provider", (q) =>
        q.eq("userId", userId).eq("provider", "strava")
      )
      .collect();
    for (const integration of integrations) {
      await ctx.db.delete(integration._id);
    }

    // Delete the user record
    await ctx.db.delete(userId);
  },
});
