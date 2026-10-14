import { reliabilityTables } from "./reliability/schema";
import { bikeFieldMeasurement } from "./bikes/profileValidators";
import { calculatorInput } from "./calculatorData/validators";
import { sessionProfileSnapshot, sessionObservationSnapshot } from "./sessions/profileSnapshot";
import { bikeFitValues, calculatorId, calculatorState } from "./calculatorStates/validators";
import { inputProvenanceValidator, adviceProgressValidator } from "./advice/validators";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { giftTables } from "./gifts/schema";
import { billingTransitionRuns } from "./emails/transitionBatchSchema";
import {
  MARKETING_EVENT_TYPES,
  type MarketingEventType,
} from "../src/lib/analytics/marketing";

const questionnaireResponseValue = v.union(
  v.string(),
  v.number(),
  v.array(v.string())
);

const gearingBikeTypeValidator = v.union(
  v.literal("road"),
  v.literal("gravel"),
  v.literal("mountain"),
  v.literal("hybrid"),
  v.literal("tt_triathlon"),
  v.literal("cyclocross"),
  v.literal("touring"),
  v.literal("city")
);

const gearingLengthBandValidator = v.union(
  v.literal("short"),
  v.literal("medium"),
  v.literal("long"),
  v.literal("alpine")
);

const gearingSurfaceValidator = v.union(
  v.literal("road"),
  v.literal("gravel"),
  v.literal("mtb"),
  v.literal("commuter"),
  v.literal("indoor"),
  v.literal("mixed")
);

const gearingReadinessLabelValidator = v.union(
  v.literal("suitable"),
  v.literal("challenging"),
  v.literal("likely_overgeared")
);

const gearingSetupLabelValidator = v.union(
  v.literal("comfort-oriented climbing setup"),
  v.literal("balanced sportive setup"),
  v.literal("performance climbing setup"),
  v.literal("race gearing"),
  v.literal("undergeared on the flat but mountain-ready"),
  v.literal("overgeared for Alpine use"),
  v.literal("needs bailout gear")
);

const gearingConfidenceLevelValidator = v.union(
  v.literal("high"),
  v.literal("medium"),
  v.literal("low")
);

const gearingGearPairValidator = v.object({
  frontChainringTeeth: v.number(),
  rearCogTeeth: v.number(),
  ratio: v.number(),
  developmentM: v.number(),
  gearInches: v.number(),
  gainRatio: v.optional(v.number()),
  speedKmhAtCadence: v.optional(v.number()),
  cadenceRpmAtSpeed: v.optional(v.number()),
});

const guideSeoHintsValidator = v.object({
  funnel: v.optional(v.string()),
});

const gearingConfidenceValidator = v.object({
  score: v.number(),
  level: gearingConfidenceLevelValidator,
  mathScore: v.number(),
  suitabilityScore: v.number(),
  reasons: v.array(v.string()),
});

const gearingMathValidator = v.object({
  drivetrainType: v.union(v.literal("1x"), v.literal("2x")),
  normalizedChainrings: v.array(v.number()),
  normalizedCassetteTeeth: v.array(v.number()),
  wheelCircumferenceMm: v.number(),
  wheelDiameterInches: v.number(),
  wheelRadiusMm: v.number(),
  gearPairs: v.array(gearingGearPairValidator),
  easiestGear: gearingGearPairValidator,
  hardestGear: gearingGearPairValidator,
  rangeRatio: v.number(),
  rangePercent: v.number(),
});

const gearingInputValidator = v.object({
  groupsetName: v.optional(v.string()),
  comparisonCassetteTeeth: v.optional(v.array(v.number())),
  climbDurationMinutes: v.optional(v.number()),
  drivetrainType: v.union(v.literal("1x"), v.literal("2x")),
  chainrings: v.array(v.number()),
  cassetteTeeth: v.array(v.number()),
  wheelCircumferenceMm: v.number(),
  crankLengthMm: v.optional(v.number()),
  cadenceRpm: v.optional(v.number()),
  targetSpeedKmh: v.optional(v.number()),
  bikeType: v.optional(gearingBikeTypeValidator),
  surfaceType: v.optional(gearingSurfaceValidator),
  riderWeightKg: v.optional(v.number()),
  bikeWeightKg: v.optional(v.number()),
  ftpWatts: v.optional(v.number()),
  preferredCadenceRpm: v.optional(v.number()),
  comfortableCadenceMinRpm: v.optional(v.number()),
  comfortableCadenceMaxRpm: v.optional(v.number()),
  climbGradientPct: v.optional(v.number()),
  climbMaxGradientPct: v.optional(v.number()),
  climbLengthKm: v.optional(v.number()),
  climbLengthBand: v.optional(gearingLengthBandValidator),
  elevationGainM: v.optional(v.number()),
  eventType: v.optional(v.string()),
  rideIntent: v.optional(v.string()),
  preference: v.optional(v.string()),
  alpineFlag: v.optional(v.boolean()),
  rearDerailleurMaxCog: v.optional(v.number()),
});

const gearingSuitabilityValidator = v.object({
  publicVerdict: gearingReadinessLabelValidator,
  setupLabel: gearingSetupLabelValidator,
  gearRangeScore: v.number(),
  climbSuitabilityScore: v.number(),
  eventReadinessScore: v.number(),
  requiredPowerWatts: v.optional(v.number()),
  sustainablePowerWatts: v.optional(v.number()),
  powerGapWatts: v.optional(v.number()),
  estimatedClimbDurationMinutes: v.optional(v.number()),
  preferredCadenceFeasible: v.optional(v.boolean()),
  cadenceNeededAtSustainablePowerRpm: v.optional(v.number()),
  assumptions: v.array(v.string()),
  warnings: v.array(v.string()),
  recommendationText: v.string(),
  confidence: gearingConfidenceValidator,
});

const gearingDrivetrainType = v.union(v.literal("1x"), v.literal("2x"));
const gearingCompleteness = v.union(
  v.literal("missing"),
  v.literal("partial"),
  v.literal("complete"),
  v.literal("validated")
);
const gearingSource = v.union(
  v.literal("user_entered"),
  v.literal("preset"),
  v.literal("derived"),
  v.literal("imported")
);
const bikeGearingValidator = v.object({
  drivetrainType: v.optional(gearingDrivetrainType),
  chainrings: v.optional(v.array(v.number())),
  cassetteTeeth: v.optional(v.array(v.number())),
  wheelCircumferenceMm: v.optional(v.number()),
  crankLengthMm: v.optional(v.number()),
  groupsetName: v.optional(v.string()),
  derailleurMaxCog: v.optional(v.number()),
  completeness: v.optional(gearingCompleteness),
  source: v.optional(gearingSource),
  updatedAt: v.optional(v.number()),
});

const bilingualStringValidator = v.object({
  en: v.string(),
  nl: v.string(),
});

const guideStatusValidator = v.union(
  v.literal("draft"),
  v.literal("in_review"),
  v.literal("published"),
  v.literal("unpublished")
);

const guideSectionTypeValidator = v.union(
  v.literal("prose"),
  v.literal("steps"),
  v.literal("cards"),
  v.literal("table")
);

const guideSectionValidator = v.object({
  title: v.string(),
  type: guideSectionTypeValidator,
  items: v.array(v.string()),
  tableHeaders: v.optional(v.array(v.string())),
  tableRows: v.optional(v.array(v.array(v.string()))),
});

const guideFaqValidator = v.object({
  q: v.string(),
  a: v.string(),
});

const guideQuickAnswerValidator = v.object({
  keyTakeaway: bilingualStringValidator,
  commonMistake: bilingualStringValidator,
  payAttention: bilingualStringValidator,
});

export default defineSchema({
  billingTransitionRuns,
  // Auth tables from @convex-dev/auth
  ...authTables,
  ...giftTables,
  ...reliabilityTables,

  // Users table - extended with app-specific fields
  // Note: The auth library creates a base users table, we extend it
  users: defineTable({
    // Auth fields (managed by @convex-dev/auth)
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    name: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    // App-specific fields
    locale: v.optional(v.union(v.literal("nl"), v.literal("en"))),
    emailPreferences: v.optional(v.object({
      service: v.boolean(),
      marketing: v.boolean(),
      newsletter: v.optional(v.boolean()),
    })),
    newsletterConsentAt: v.optional(v.number()),
    newsletterConsentSource: v.optional(v.union(v.literal("signup"), v.literal("profile"), v.literal("preferences"))),
    newsletterConsentLocale: v.optional(v.union(v.literal("nl"), v.literal("en"))),
    newsletterConsentWordingVersion: v.optional(v.string()),
    newsletterUnsubscribedAt: v.optional(v.number()),
    tokenIdentifier: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    lastLoginAt: v.optional(v.number()),
    tier: v.optional(v.union(v.literal("free"), v.literal("pro"), v.literal("premium"))),
    googleEmail: v.optional(v.string()),
    googleName: v.optional(v.string()),
    googleProfileImageUrl: v.optional(v.string()),
    displayName: v.optional(v.string()),
    displayNameSource: v.optional(
      v.union(v.literal("google"), v.literal("manual"), v.literal("email"))
    ),
    profile_image_url: v.optional(v.string()),
    profileImageSource: v.optional(
      v.union(v.literal("google"), v.literal("manual"), v.literal("strava"))
    ),
    lastGoogleSyncAt: v.optional(v.number()),
    theme_preference: v.optional(
      v.union(v.literal("light"), v.literal("dark"), v.literal("system"))
    ),
    unit_preference: v.optional(
      v.union(v.literal("metric"), v.literal("imperial"))
    ),
    agentToolsEnabled: v.optional(v.boolean()),
    adminRole: v.optional(
      v.union(
        v.literal("super_admin"),
        v.literal("ops_admin"),
        v.literal("support_admin"),
        v.literal("fit_specialist"),
        v.literal("geometry_manager"),
        v.literal("billing_admin"),
        v.literal("qa_manager"),
        v.literal("analyst")
      )
    ),
    suspendedAt: v.optional(v.number()),
    suspendedReason: v.optional(v.string()),
    trialEndsAt: v.optional(v.number()),
    proSince: v.optional(v.number()),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_admin_role", ["adminRole"])
    .index("by_tier", ["tier"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_profile_image", ["profile_image_url"])
    .index("by_stripe_subscription", ["stripeSubscriptionId"])
    .index("by_suspended_at", ["suspendedAt"]),

  newsletterConsentEvents: defineTable({
    userId: v.id("users"),
    requestId: v.string(),
    subscribed: v.boolean(),
    source: v.union(v.literal("signup"), v.literal("profile"), v.literal("preferences")),
    locale: v.union(v.literal("nl"), v.literal("en")),
    wordingVersion: v.string(),
    createdAt: v.number(),
  }).index("by_user_request", ["userId", "requestId"]),

  calculatorStates: defineTable({
    adviceProgress: v.optional(adviceProgressValidator),
    adviceRevision: v.optional(v.number()),
    inputProvenance: v.optional(inputProvenanceValidator),
    adviceOutput: v.optional(v.array(v.object({ key: v.string(), value: v.union(v.number(), v.string()), unit: v.string() }))),
    userId: v.id("users"),
    calculator: calculatorId,
    bikeId: v.optional(v.id("bikes")),
    state: calculatorState,
    updatedAt: v.number(),
  }).index("by_user_calculator_bike", ["userId", "calculator", "bikeId"])
    .index("by_user_updated", ["userId", "updatedAt"]),

  // User profiles - body measurements for bike fitting
  profiles: defineTable({
    userId: v.id("users"),
    calculatorInputs: v.optional(v.array(calculatorInput)),

    // Required body measurements (in cm)
    heightCm: v.optional(v.number()),
    inseamCm: v.optional(v.number()),
    armLengthCm: v.optional(v.number()),
    torsoLengthCm: v.optional(v.number()),
    shoulderWidthCm: v.optional(v.number()),

    // Optional measurements
    femurLengthCm: v.optional(v.number()),
    footLengthCm: v.optional(v.number()),
    handSpanCm: v.optional(v.number()),
    flexibilityTestCm: v.optional(v.number()),
    coreTestSeconds: v.optional(v.number()),
    sitBoneWidthMm: v.optional(v.number()),
    hipCircumferenceCm: v.optional(v.number()),

    // Flexibility assessment
    flexibilityScore: v.optional(v.union(
      v.literal("very_limited"),
      v.literal("limited"),
      v.literal("average"),
      v.literal("good"),
      v.literal("excellent")
    )),

    // Core stability (1-5 scale)
    coreStabilityScore: v.optional(v.number()),
    ftpWatts: v.optional(v.number()),
    ftpMethod: v.optional(v.string()),
    ftpMeasuredAt: v.optional(v.number()),
    shoeSizeEu: v.optional(v.number()),
    cleatSystem: v.optional(v.string()),
    sweatProfile: v.optional(v.string()),

    // Injury history
    injuryHistory: v.optional(
      v.array(
        v.object({
          bodyArea: v.string(),
          description: v.string(),
          severity: v.union(
            v.literal("mild"),
            v.literal("moderate"),
            v.literal("severe")
          ),
          isOngoing: v.boolean(),
        })
      )
    ),

    // Additional profile data
    age: v.optional(v.number()),
    sex: v.optional(v.union(v.literal("female"), v.literal("male"), v.literal("prefer_not_to_say"))),
    birthDate: v.optional(v.string()),
    weightKg: v.optional(v.number()),
    weightUpdatedAt: v.optional(v.number()),

    // Rider profile questions (bike-agnostic, asked once)
    experienceLevel: v.optional(
      v.union(
        v.literal("beginner"),
        v.literal("intermediate"),
        v.literal("advanced")
      )
    ),
    weeklyHours: v.optional(
      v.union(
        v.literal("0-3"),
        v.literal("3-6"),
        v.literal("6-10"),
        v.literal("10-15"),
        v.literal("15+")
      )
    ),
    typicalRideLength: v.optional(
      v.union(
        v.literal("short"),
        v.literal("medium"),
        v.literal("long"),
        v.literal("ultra")
      )
    ),
    hasPain: v.optional(v.union(v.literal("yes"), v.literal("no"))),
    painAreas: v.optional(v.array(v.string())),
    kneePainTiming: v.optional(v.string()),
    painSeverity: v.optional(v.number()),
    painAreaSeverities: v.optional(v.record(v.string(), v.number())),
    positionPriority: v.optional(
      v.union(
        v.literal("comfort"),
        v.literal("balanced"),
        v.literal("performance")
      )
    ),

    // Staleness tracking — set to Date.now() whenever any rider profile
    // question field above changes. Used to invalidate fit recommendations.
    riderProfileUpdatedAt: v.optional(v.number()),

    updatedAt: v.number(),
    adminNotes: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  profileObservations: defineTable({
    userId: v.id("users"),
    bikeId: v.optional(v.id("bikes")),
    field: v.string(),
    value: v.union(v.number(), v.string(), v.array(v.string()), v.array(v.number())),
    unit: v.string(),
    kind: v.union(v.literal("measured"), v.literal("estimated"), v.literal("derived"), v.literal("declared")),
    method: v.string(),
    source: v.union(v.literal("public_handoff"), v.literal("legacy_migration"), v.literal("profile_edit")),
    recordedAt: v.number(),
    repeatCount: v.optional(v.number()),
    withinTolerance: v.optional(v.boolean()),
    unresolvedWarning: v.optional(v.boolean()),
    status: v.union(v.literal("current"), v.literal("superseded")),
  }).index("by_user_field", ["userId", "field"])
    .index("by_user_field_bike_status", ["userId", "field", "bikeId", "status"])
    .index("by_bike", ["bikeId"]),

  profilePrompts: defineTable({
    userId: v.id("users"),
    key: v.string(),
    skipCount: v.number(),
    skippedUntil: v.optional(v.number()),
    profileOnly: v.boolean(),
  }).index("by_user_key", ["userId", "key"]),

  profilePromptCards: defineTable({
    userId: v.id("users"),
    sessionKey: v.string(),
    shownAt: v.number(),
    hiddenUntil: v.optional(v.number()),
    questions: v.array(v.object({
      key: v.string(),
      field: v.string(),
      bikeId: v.optional(v.id("bikes")),
      status: v.union(v.literal("pending"), v.literal("answered"), v.literal("skipped")),
    })),
  }).index("by_user_session", ["userId", "sessionKey"])
    .index("by_user_shown", ["userId", "shownAt"]),

  profilePromptActivity: defineTable({
    userId: v.id("users"),
    calculator: v.string(),
    viewedAt: v.number(),
  }).index("by_user_calculator", ["userId", "calculator"]),

  // Bike catalogue - brands and models
  bikeBrands: defineTable({
    brandId: v.string(),
    name: v.string(),
    isActive: v.boolean(),
  })
    .index("by_brand_id", ["brandId"])
    .index("by_name", ["name"]),

  bikeModels: defineTable({
    brandId: v.string(),
    brandName: v.string(),
    modelSlug: v.string(),
    name: v.string(),
    category: v.string(),
    appBikeType: v.optional(
      v.union(
        v.literal("road"),
        v.literal("gravel"),
        v.literal("mountain"),
        v.literal("hybrid"),
        v.literal("tt_triathlon"),
        v.literal("cyclocross"),
        v.literal("touring"),
        v.literal("city")
      )
    ),
    fitEngineProfile: v.optional(v.string()),
    fitEngineVariant: v.optional(v.string()),
    introYearEstimate: v.optional(v.number()),
    isActive: v.boolean(),
  })
    .index("by_brand_id", ["brandId"])
    .index("by_model_slug", ["modelSlug"]),

  // Bikes - user's bicycles
  bikes: defineTable({
    userId: v.id("users"),

    name: v.string(),
    bikeType: v.union(
      v.literal("road"),
      v.literal("gravel"),
      v.literal("mountain"),
      v.literal("hybrid"),
      v.literal("tt_triathlon"),
      v.literal("cyclocross"),
      v.literal("touring"),
      v.literal("city")
    ),

    saddleWidthMm: v.optional(v.number()),
    saddleModel: v.optional(v.string()),
    pedalModel: v.optional(v.string()),
    cleatSystem: v.optional(v.string()),
    maxSeatpostMm: v.optional(v.number()),
    maxSpacerStackMm: v.optional(v.number()),
    fieldMeasurements: v.optional(v.record(v.string(), bikeFieldMeasurement)),

    // Current geometry (optional - for existing bikes)
    currentGeometry: v.optional(
      v.object({
        stackMm: v.optional(v.number()),
        reachMm: v.optional(v.number()),
        seatTubeAngle: v.optional(v.number()),
        headTubeAngle: v.optional(v.number()),
        frameSize: v.optional(v.string()),
      })
    ),

    // Current component setup (optional)
    currentSetup: v.optional(
      v.object({
        saddleHeightMm: v.optional(v.number()),
        saddleHeightMeasurement: v.optional(v.object({
          measurePoint: v.literal("bb_center_to_saddle_top"),
          measuredAt: v.number(),
          source: v.union(v.literal("public_handoff"), v.literal("profile_edit")),
        })),
        saddleSetbackMm: v.optional(v.number()),
        stemLengthMm: v.optional(v.number()),
        stemAngle: v.optional(v.number()),
        handlebarWidthMm: v.optional(v.number()),
        crankLengthMm: v.optional(v.number()),
        handlebarReachMm: v.optional(v.number()),
        handlebarDropMm: v.optional(v.number()),
        spacersMm: v.optional(v.number()),
      })
    ),
    gearing: v.optional(bikeGearingValidator),
    discipline: v.optional(
      v.union(
        v.literal("road"),
        v.literal("gravel"),
        v.literal("mtb"),
        v.literal("tt")
      )
    ),
    ridingStyle: v.optional(
      v.union(
        v.literal("recreational"),
        v.literal("fitness"),
        v.literal("sportive"),
        v.literal("racing"),
        v.literal("commuting"),
        v.literal("touring")
      )
    ),
    primaryGoal: v.optional(
      v.union(
        v.literal("comfort"),
        v.literal("balanced"),
        v.literal("performance"),
        v.literal("aerodynamics")
      )
    ),
    bikeWeightKg: v.optional(v.number()),
    photoUrl: v.optional(v.string()),
    source: v.optional(
      v.union(
        v.literal("manual"),
        v.literal("strava"),
        v.literal("admin_import"),
        // legacy: Marktplaats import removed 2026-09-30
        v.literal("marketplace_import"),
        v.literal("passport_import")
      )
    ),
    stravaGearId: v.optional(v.string()),
    stravaPrimary: v.optional(v.boolean()),
    bikeTypeSource: v.optional(
      v.union(
        v.literal("user"),
        v.literal("strava_frame_type"),
        v.literal("fallback_pending_confirmation"),
        v.literal("inferred_from_usage"),
        v.literal("admin_matched")
      )
    ),
    needsTypeConfirmation: v.optional(v.boolean()),
    lifetimeDistanceMeters: v.optional(v.number()),
    recentDistance90dMeters: v.optional(v.number()),
    rideCount90d: v.optional(v.number()),
    avgRideDistance90dMeters: v.optional(v.number()),
    avgSpeed90dKph: v.optional(v.number()),
    avgElevationPer100Km90d: v.optional(v.number()),
    trainerRideRatio90d: v.optional(v.number()),
    dominantSportType: v.optional(v.string()),
    lastRideAt: v.optional(v.number()),
    inferredBikeRole: v.optional(
      v.union(
        v.literal("endurance_road"),
        v.literal("race_road"),
        v.literal("gravel"),
        v.literal("mountain"),
        v.literal("tt_triathlon"),
        v.literal("training"),
        v.literal("commute")
      )
    ),
    lastStravaSync: v.optional(v.number()),
    activitySummary: v.optional(
      v.object({
        source: v.literal("strava_v1_1"),
        syncedAt: v.number(),
        activityCount: v.number(),
        rideCount: v.number(),
        recentDistance90dMeters: v.optional(v.number()),
        totalDistanceKm: v.number(),
        totalMovingTimeSec: v.number(),
        averageDurationSec: v.optional(v.number()),
        trainerRatio: v.optional(v.number()),
        commuteRatio: v.optional(v.number()),
        climbingMetersPerKm: v.optional(v.number()),
        dominantSportType: v.optional(v.string()),
        averageSpeedMps: v.optional(v.number()),
        maxSpeedMps: v.optional(v.number()),
        totalElevationGainM: v.optional(v.number()),
        lastActivityAt: v.optional(v.number()),
        lastActivityName: v.optional(v.string()),
        lastActivityType: v.optional(v.string()),
        matchedGearCount: v.number(),
        unmatchedGearCount: v.number(),
        noGearCount: v.number(),
        inferredBikeRole: v.optional(
          v.union(
            v.literal("endurance_road"),
            v.literal("race_road"),
            v.literal("gravel"),
            v.literal("mountain"),
            v.literal("tt_triathlon"),
            v.literal("training"),
            v.literal("commute")
          )
        ),
        inferredRidingStyle: v.optional(
          v.union(
            v.literal("recreational"),
            v.literal("fitness"),
            v.literal("sportive"),
            v.literal("racing"),
            v.literal("commuting"),
            v.literal("touring")
          )
        ),
        inferredPrimaryGoal: v.optional(
          v.union(
            v.literal("comfort"),
            v.literal("balanced"),
            v.literal("performance"),
            v.literal("aerodynamics")
          )
        ),
        inferredDiscipline: v.optional(
          v.union(
            v.literal("road"),
            v.literal("gravel"),
            v.literal("mtb"),
            v.literal("tt")
          )
        ),
        inferenceConfidence: v.number(),
      })
    ),
    fitProfileId: v.optional(v.id("profiles")),
    brand: v.optional(v.string()),
    model: v.optional(v.string()),
    bikeModelId: v.optional(v.id("bikeModels")),
    description: v.optional(v.string()),
    descriptionSource: v.optional(
      v.union(
        v.literal("manual"),
        v.literal("generated"),
        v.literal("template"),
        // legacy: Marktplaats import removed 2026-09-30
        v.literal("marketplace_import")
      )
    ),
    descriptionUpdatedAt: v.optional(v.number()),
    // legacy: Marktplaats import removed 2026-09-30
    importSourceName: v.optional(v.literal("marktplaats")),
    importSourceUrl: v.optional(v.string()),
    importCanonicalUrl: v.optional(v.string()),
    importedAdvertTitle: v.optional(v.string()),
    bikeImportId: v.optional(v.id("bikeImports")),
    bikePassportId: v.optional(v.string()),
    importedFromBikePassportId: v.optional(v.string()),
    publicFitCode: v.optional(v.string()),
    publicFitEnabled: v.optional(v.boolean()),
    publicFitCodeCreatedAt: v.optional(v.number()),
    publicFitSnapshot: v.optional(
      v.object({
        bikeType: v.union(
          v.literal("road"),
          v.literal("gravel"),
          v.literal("mountain"),
          v.literal("hybrid"),
          v.literal("tt_triathlon"),
          v.literal("cyclocross"),
          v.literal("touring"),
          v.literal("city")
        ),
        sizeLabel: v.optional(v.string()),
        stackMm: v.optional(v.number()),
        reachMm: v.optional(v.number()),
        geometryQuality: v.union(
          v.literal("full"),
          v.literal("partial"),
          v.literal("none")
        ),
        source: v.union(
          v.literal("geometry_record"),
          v.literal("manual_geometry"),
          v.literal("none")
        ),
        snapshotUpdatedAt: v.number(),
      })
    ),
    notes: v.optional(v.string()),
    geometryRecordId: v.optional(v.id("geometry_records")),

    marketingEligible: v.optional(v.boolean()),
    marketingEligibleAt: v.optional(v.number()),
    marketingEligibleBy: v.optional(v.id("users")),
    imageModerated: v.optional(v.boolean()),
    imageModerationAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_bike_passport_id", ["bikePassportId"])
    .index("by_public_fit_code", ["publicFitCode"])
    .index("by_user_imported_from_passport", ["userId", "importedFromBikePassportId"])
    .index("by_photo_url", ["photoUrl"])
    .index("by_geometry_record", ["geometryRecordId"])
    .index("by_bike_import", ["bikeImportId"])
    .index("by_strava_gear", ["stravaGearId"])
    .index("by_marketing_eligible", ["marketingEligible"]),

  bikeActivities: defineTable({
    userId: v.id("users"),
    integrationId: v.id("integrations"),
    stravaActivityId: v.string(),
    bikeId: v.optional(v.id("bikes")),
    gearId: v.optional(v.string()),
    gearName: v.optional(v.string()),
    gearBrand: v.optional(v.string()),
    gearModel: v.optional(v.string()),
    activityName: v.string(),
    activityType: v.string(),
    sportType: v.optional(v.string()),
    startAt: v.number(),
    distanceKm: v.number(),
    movingTimeSec: v.number(),
    elapsedTimeSec: v.optional(v.number()),
    elevationGainM: v.optional(v.number()),
    commute: v.optional(v.boolean()),
    trainer: v.optional(v.boolean()),
    manual: v.optional(v.boolean()),
    matchStatus: v.union(
      v.literal("matched_gear"),
      v.literal("unmatched_gear"),
      v.literal("no_gear")
    ),
    matchConfidence: v.number(),
    matchReason: v.optional(v.string()),
    importedAt: v.number(),
    updatedAt: v.number(),
    syncRunId: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_activity", ["userId", "stravaActivityId"])
    .index("by_user_bike", ["userId", "bikeId"])
    .index("by_user_start_at", ["userId", "startAt"]),

  bikePhotos: defineTable({
    userId: v.id("users"),
    bikeId: v.id("bikes"),
    storageId: v.string(),
    caption: v.optional(v.string()),
    isPrimary: v.boolean(),
    sortOrder: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_bike", ["bikeId"])
    .index("by_bike_primary", ["bikeId", "isPrimary"])
    .index("by_storage", ["storageId"]),

  // legacy: Marktplaats import removed 2026-09-30
  bikeImports: defineTable({
    userId: v.id("users"),
    sourceName: v.literal("marktplaats"),
    sourceUrl: v.string(),
    sourceUrlNormalized: v.string(),
    canonicalUrl: v.optional(v.string()),
    canonicalUrlNormalized: v.optional(v.string()),
    advertTitle: v.optional(v.string()),
    status: v.union(
      v.literal("pending_fetch"),
      v.literal("parsed"),
      v.literal("needs_review"),
      v.literal("importing"),
      v.literal("imported"),
      v.literal("failed")
    ),
    parsedAdvert: v.optional(
      v.object({
        parserVersion: v.string(),
        fetchedAt: v.number(),
        sourceUrl: v.string(),
        canonicalUrl: v.optional(v.string()),
        advertTitle: v.optional(v.string()),
        description: v.optional(v.string()),
        imageCandidates: v.array(
          v.object({
            url: v.string(),
            normalizedUrl: v.string(),
            sortOrder: v.number(),
            selectedByDefault: v.boolean(),
            caption: v.optional(v.string()),
            width: v.optional(v.number()),
            height: v.optional(v.number()),
          })
        ),
        candidateBrand: v.object({
          value: v.optional(v.string()),
          confidence: v.union(
            v.literal("high"),
            v.literal("medium"),
            v.literal("low"),
            v.literal("none")
          ),
        }),
        candidateModel: v.object({
          value: v.optional(v.string()),
          confidence: v.union(
            v.literal("high"),
            v.literal("medium"),
            v.literal("low"),
            v.literal("none")
          ),
        }),
        candidateBikeType: v.object({
          value: v.optional(
            v.union(
              v.literal("road"),
              v.literal("gravel"),
              v.literal("mountain"),
              v.literal("hybrid"),
              v.literal("tt_triathlon"),
              v.literal("cyclocross"),
              v.literal("touring"),
              v.literal("city")
            )
          ),
          confidence: v.union(
            v.literal("high"),
            v.literal("medium"),
            v.literal("low"),
            v.literal("none")
          ),
        }),
      })
    ),
    draftBike: v.optional(
      v.object({
        name: v.string(),
        brand: v.optional(v.string()),
        model: v.optional(v.string()),
        bikeType: v.optional(
          v.union(
            v.literal("road"),
            v.literal("gravel"),
            v.literal("mountain"),
            v.literal("hybrid"),
            v.literal("tt_triathlon"),
            v.literal("cyclocross"),
            v.literal("touring"),
            v.literal("city")
          )
        ),
        description: v.optional(v.string()),
        selectedImageUrls: v.array(v.string()),
        primaryImageUrl: v.optional(v.string()),
      })
    ),
    saveAttemptCount: v.optional(v.number()),
    lastSaveStartedAt: v.optional(v.number()),
    imageAttemptCount: v.optional(v.number()),
    imageImportedCount: v.optional(v.number()),
    imageFailedCount: v.optional(v.number()),
    duplicateBikeId: v.optional(v.id("bikes")),
    failureCode: v.optional(v.string()),
    telemetryJson: v.optional(v.string()),
    failureReason: v.optional(v.string()),
    createdBikeId: v.optional(v.id("bikes")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_source_url", ["userId", "sourceName", "sourceUrlNormalized"])
    .index("by_user_canonical_url", ["userId", "sourceName", "canonicalUrlNormalized"])
    .index("by_created_bike", ["createdBikeId"]),

  bikeProfiles: defineTable({
    userId: v.id("users"),
    bikeId: v.id("bikes"),
    name: v.string(),
    profileType: v.union(
      v.literal("base"),
      v.literal("mountain"),
      v.literal("climbing"),
      v.literal("endurance"),
      v.literal("performance"),
      v.literal("aero"),
      v.literal("indoor"),
      v.literal("technical"),
      v.literal("comfort"),
      v.literal("custom")
    ),
    isDefault: v.boolean(),
    status: v.union(v.literal("active"), v.literal("archived")),
    source: v.union(
      v.literal("manual"),
      v.literal("system_default"),
      v.literal("legacy_migration")
    ),
    legacySessionId: v.optional(v.id("fitSessions")),
    createdAt: v.number(),
    updatedAt: v.number(),
    archivedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_bike", ["bikeId"])
    .index("by_user_bike", ["userId", "bikeId"])
    .index("by_bike_default", ["bikeId", "isDefault"]),

  wheelsets: defineTable({
    bikeId: v.id("bikes"),
    userId: v.id("users"),
    name: v.string(),
    rimType: v.union(v.literal("hooked"), v.literal("hookless")),
    internalRimWidthFrontMm: v.optional(v.number()),
    internalRimWidthRearMm: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_bike", ["bikeId"])
    .index("by_user", ["userId"]),

  saddleWidthSessions: defineTable({
    adviceProgress: v.optional(adviceProgressValidator),
    adviceRevision: v.optional(v.number()),
    inputProvenance: v.optional(inputProvenanceValidator),
    userId: v.optional(v.id("users")),
    bikeId: v.optional(v.id("bikes")),
    sessionType: v.union(v.literal("public"), v.literal("dashboard")),
    measurementMethod: v.union(v.literal("measured"), v.literal("estimated")),
    sitBoneWidthMm: v.optional(v.number()),
    heightCm: v.optional(v.number()),
    weightKg: v.optional(v.number()),
    hipCircumferenceCm: v.optional(v.number()),
    flexibilityScore: v.optional(v.number()),
    coreStabilityScore: v.optional(v.number()),
    ridingType: v.string(),
    postureCategory: v.string(),
    indoorOutdoor: v.optional(v.string()),
    typicalRideLength: v.optional(v.string()),
    currentSaddleWidthMm: v.optional(v.number()),
    currentSaddleShape: v.optional(v.string()),
    currentSaddleTilt: v.optional(v.string()),
    currentSaddleSatisfaction: v.optional(v.string()),
    symptoms: v.optional(v.array(v.string())),
    recommendedWidthMm: v.number(),
    widthRangeMinMm: v.number(),
    widthRangeMaxMm: v.number(),
    primaryWidthClass: v.string(),
    saddleFamily: v.string(),
    noseType: v.string(),
    profileShape: v.string(),
    cutoutRecommended: v.boolean(),
    paddingPreference: v.string(),
    confidenceScore: v.number(),
    confidenceLevel: v.string(),
    widthMatchScore: v.optional(v.number()),
    fitInteractionWarnings: v.optional(v.array(v.string())),
    explanationKey: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_session_type", ["userId", "sessionType"])
    .index("by_bike", ["bikeId"])
    .index("by_created_at", ["createdAt"]),

  gearingSessions: defineTable({
    adviceProgress: v.optional(adviceProgressValidator),
    adviceRevision: v.optional(v.number()),
    inputProvenance: v.optional(inputProvenanceValidator),
    userId: v.optional(v.id("users")),
    bikeId: v.optional(v.id("bikes")),
    sessionType: v.union(v.literal("public"), v.literal("dashboard")),
    algorithmVersion: v.string(),
    scenarioName: v.optional(v.string()),
    input: gearingInputValidator,
    math: gearingMathValidator,
    suitability: gearingSuitabilityValidator,
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_session_type", ["userId", "sessionType"])
    .index("by_user_bike_session_type", ["userId", "bikeId", "sessionType"])
    .index("by_bike", ["bikeId"])
    .index("by_created_at", ["createdAt"]),

  tireSetups: defineTable({
    wheelsetId: v.id("wheelsets"),
    userId: v.id("users"),
    name: v.string(),
    brand: v.optional(v.string()),
    model: v.optional(v.string()),
    widthFrontMm: v.number(),
    widthRearMm: v.number(),
    tubeType: v.union(
      v.literal("inner_tube"),
      v.literal("latex_tube"),
      v.literal("tubeless")
    ),
    casingType: v.optional(
      v.union(
        v.literal("race_light"),
        v.literal("allround"),
        v.literal("reinforced")
      )
    ),
    maxPressureBar: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_wheelset", ["wheelsetId"])
    .index("by_user", ["userId"]),

  pressureProfiles: defineTable({
    bikeId: v.id("bikes"),
    tireSetupId: v.id("tireSetups"),
    userId: v.id("users"),
    name: v.string(),
    useCase: v.union(
      v.literal("race"),
      v.literal("endurance"),
      v.literal("wet_weather"),
      v.literal("gravel_mixed"),
      v.literal("comfort"),
      v.literal("custom")
    ),
    targetSurface: v.optional(v.string()),
    targetGoal: v.optional(v.string()),
    recommendedFrontBar: v.number(),
    recommendedRearBar: v.number(),
    lastCalculatedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_bike", ["bikeId"])
    .index("by_user", ["userId"]),

  pressureCalculations: defineTable({
    adviceProgress: v.optional(adviceProgressValidator),
    adviceRevision: v.optional(v.number()),
    inputProvenance: v.optional(inputProvenanceValidator),
    userId: v.id("users"),
    bikeId: v.optional(v.id("bikes")),
    tireSetupId: v.optional(v.id("tireSetups")),
    sourceType: v.union(
      v.literal("public_basic"),
      v.literal("dashboard_basic"),
      v.literal("dashboard_advanced")
    ),
    inputSnapshot: v.object({
      bodyWeightKg: v.number(),
      bikeWeightKg: v.optional(v.number()),
      extraLuggageKg: v.optional(v.number()),
      discipline: v.union(
        v.literal("road"),
        v.literal("gravel"),
        v.literal("mtb"),
        v.literal("tt")
      ),
      widthFrontMm: v.number(),
      widthRearMm: v.number(),
      tubeType: v.union(
        v.literal("inner_tube"),
        v.literal("latex_tube"),
        v.literal("tubeless")
      ),
      casingType: v.optional(v.string()),
      rimType: v.optional(v.union(v.literal("hooked"), v.literal("hookless"))),
      internalRimWidthFrontMm: v.optional(v.number()),
      internalRimWidthRearMm: v.optional(v.number()),
      surface: v.union(
        v.literal("smooth_asphalt"),
        v.literal("average_asphalt"),
        v.literal("rough_asphalt"),
        v.literal("hardpack_gravel"),
        v.literal("loose_gravel"),
        v.literal("trail")
      ),
      ridingGoal: v.optional(
        v.union(
          v.literal("speed"),
          v.literal("balance"),
          v.literal("comfort")
        )
      ),
      isWet: v.optional(v.boolean()),
      routeDistanceKm: v.optional(v.number()),
      routeElevationM: v.optional(v.number()),
      offRoadPercent: v.optional(v.number()),
    }),
    recommendedFrontBar: v.number(),
    recommendedRearBar: v.number(),
    recommendedFrontPsi: v.number(),
    recommendedRearPsi: v.number(),
    currentFrontBar: v.optional(v.number()),
    currentRearBar: v.optional(v.number()),
    comfortScore: v.optional(v.number()),
    gripScore: v.optional(v.number()),
    efficiencyScore: v.optional(v.number()),
    warningsJson: v.optional(v.string()),
    routeContextJson: v.optional(v.string()),
    userNotes: v.optional(v.string()),
    autoNoteSource: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_bike", ["bikeId"])
    .index("by_user_created", ["userId", "createdAt"]),

  // Fit sessions - each time user goes through fitting process
  fitSessions: defineTable({
    profileSnapshot: v.optional(sessionProfileSnapshot),
    profileObservationSnapshot: v.optional(sessionObservationSnapshot),
    inputProvenance: v.optional(inputProvenanceValidator),
    userId: v.id("users"),
    calculatorInputs: v.optional(bikeFitValues),
    bikeId: v.optional(v.id("bikes")),
    bikeProfileId: v.optional(v.id("bikeProfiles")),
    bikeType: v.optional(
      v.union(
        v.literal("road"),
        v.literal("gravel"),
        v.literal("mountain"),
        v.literal("hybrid"),
        v.literal("tt_triathlon"),
        v.literal("cyclocross"),
        v.literal("touring"),
        v.literal("city")
      )
    ),
    profileId: v.id("profiles"),
    engineVersion: v.optional(
      v.union(v.literal("v1"), v.literal("v2_shadow"), v.literal("v2"))
    ),
    engineVersionId: v.optional(v.id("engine_versions")),
    sourceType: v.optional(
      v.union(
        v.literal("legacy_flow"),
        v.literal("bike_profile_flow"),
        v.literal("migration_backfill")
      )
    ),
    migrationMetadata: v.optional(
      v.object({
        source: v.union(
          v.literal("legacy_v1"),
          v.literal("v2_native"),
          v.literal("backfill")
        ),
        migratedAt: v.optional(v.number()),
        notes: v.optional(v.string()),
      })
    ),

    status: v.union(
      v.literal("in_progress"),
      v.literal("questionnaire_complete"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("archived")
    ),

    // Riding context
    ridingStyle: v.union(
      v.literal("recreational"),
      v.literal("fitness"),
      v.literal("sportive"),
      v.literal("racing"),
      v.literal("commuting"),
      v.literal("touring")
    ),
    primaryGoal: v.union(
      v.literal("comfort"),
      v.literal("performance"),
      v.literal("balanced"),
      v.literal("aerodynamics")
    ),
    weeklyHours: v.optional(v.number()),
    longestRideKm: v.optional(v.number()),

    // Current pain points
    painPoints: v.optional(
      v.array(
        v.object({
          area: v.string(),
          frequency: v.union(
            v.literal("rarely"),
            v.literal("sometimes"),
            v.literal("often"),
            v.literal("always")
          ),
          severity: v.union(
            v.literal("mild"),
            v.literal("moderate"),
            v.literal("severe")
          ),
        })
      )
    ),

    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    confidenceScore: v.optional(v.number()),
    reviewStatus: v.optional(
      v.union(
        v.literal("not_required"),
        v.literal("required"),
        v.literal("reviewed"),
        v.literal("overridden")
      )
    ),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    reviewNotes: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_bike", ["userId", "bikeId"])
    .index("by_bike_profile", ["bikeProfileId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_status", ["status"])
    .index("by_engine_version", ["engineVersionId"])
    .index("by_review_status", ["reviewStatus"]),

  // Questionnaire responses - dynamic follow-up questions
  questionnaireResponses: defineTable({
    sessionId: v.id("fitSessions"),

    questionId: v.string(),
    questionText: v.string(),
    questionCategory: v.string(),

    responseType: v.union(
      v.literal("single_choice"),
      v.literal("multiple_choice"),
      v.literal("numeric"),
      v.literal("text"),
      v.literal("scale")
    ),
    response: questionnaireResponseValue,

    questionOrder: v.number(),
    answeredAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_session_order", ["sessionId", "questionOrder"]),

  // Fit recommendations - generated results
  recommendations: defineTable({
    legacyFullAccess: v.optional(v.boolean()),
    adviceProgress: v.optional(adviceProgressValidator),
    adviceRevision: v.optional(v.number()),
    inputProvenance: v.optional(inputProvenanceValidator),
    sessionId: v.id("fitSessions"),
    userId: v.id("users"),
    bikeId: v.optional(v.id("bikes")),
    bikeProfileId: v.optional(v.id("bikeProfiles")),
    engineVersion: v.optional(
      v.union(v.literal("v1"), v.literal("v2_shadow"), v.literal("v2"))
    ),
    sourceType: v.optional(
      v.union(
        v.literal("legacy_v1"),
        v.literal("engine_v1"),
        v.literal("engine_v2_shadow"),
        v.literal("engine_v2")
      )
    ),
    migrationMetadata: v.optional(
      v.object({
        source: v.union(
          v.literal("legacy_v1"),
          v.literal("v2_native"),
          v.literal("backfill")
        ),
        migratedAt: v.optional(v.number()),
        notes: v.optional(v.string()),
      })
    ),

    // Core fit calculations
    calculatedFit: v.object({
      // Frame sizing
      recommendedStackMm: v.number(),
      recommendedReachMm: v.number(),
      effectiveTopTubeMm: v.number(),

      // Saddle position
      saddleHeightMm: v.number(),
      saddleSetbackMm: v.number(),
      saddleHeightRange: v.object({
        min: v.number(),
        max: v.number(),
      }),

      // Handlebar position
      handlebarDropMm: v.number(),
      handlebarReachMm: v.number(),
      stemLengthMm: v.number(),
      stemAngleRecommendation: v.string(),

      // Components
      crankLengthMm: v.number(),
      handlebarWidthMm: v.number(),
    }),

    // Optional climbing-optimised secondary fit profile
    climbingCalculatedFit: v.optional(
      v.object({
        // Frame sizing
        recommendedStackMm: v.number(),
        recommendedReachMm: v.number(),
        effectiveTopTubeMm: v.number(),

        // Saddle position
        saddleHeightMm: v.number(),
        saddleSetbackMm: v.number(),
        saddleHeightRange: v.object({
          min: v.number(),
          max: v.number(),
        }),

        // Handlebar position
        handlebarDropMm: v.number(),
        handlebarReachMm: v.number(),
        stemLengthMm: v.number(),
        stemAngleRecommendation: v.string(),

        // Components
        crankLengthMm: v.number(),
        handlebarWidthMm: v.number(),
      })
    ),

    confidenceScore: v.number(),
    algorithmVersion: v.string(),
    comparisonSnapshot: v.optional(
      v.object({
        saddleHeightMm: v.number(),
        saddleSetbackMm: v.number(),
        barDropMm: v.number(),
        saddleToBarReachMm: v.number(),
        stemLengthMm: v.number(),
        crankLengthMm: v.number(),
        handlebarWidthMm: v.number(),
        confidenceScore: v.number(),
      })
    ),
    recommendationItems: v.optional(
      v.array(
        v.object({
          parameter: v.string(),
          target: v.number(),
          rangeLow: v.optional(v.number()),
          rangeHigh: v.optional(v.number()),
          confidence: v.optional(v.number()),
          method: v.optional(v.string()),
          why: v.optional(v.string()),
          feasibility: v.optional(
            v.union(
              v.literal("direct"),
              v.literal("component_change_required"),
              v.literal("not_yet_evaluated")
            )
          ),
          riskFlags: v.optional(v.array(v.string())),
          changeOrder: v.optional(v.number()),
        })
      )
    ),

    // Frame size recommendations
    frameSizeRecommendations: v.array(
      v.object({
        brand: v.optional(v.string()),
        size: v.string(),
        fitScore: v.number(),
        notes: v.optional(v.string()),
      })
    ),

    // Personalized advice
    fitNotes: v.array(v.string()),
    adjustmentPriorities: v.array(
      v.object({
        priority: v.number(),
        component: v.string(),
        currentValue: v.optional(v.string()),
        recommendedValue: v.string(),
        rationale: v.string(),
      })
    ),

    // Pain point solutions
    painPointSolutions: v.optional(
      v.array(
        v.object({
          painArea: v.string(),
          cause: v.string(),
          solution: v.string(),
        })
      )
    ),
    pressureInsights: v.optional(
      v.object({
        comfortBias: v.union(
          v.literal("comfort"),
          v.literal("balanced"),
          v.literal("performance")
        ),
        stabilityScore: v.number(),
        surfaceComplianceNote: v.optional(v.string()),
        warnings: v.array(v.string()),
        version: v.number(),
      })
    ),

    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_user", ["userId"])
    .index("by_bike", ["bikeId"])
    .index("by_bike_profile", ["bikeProfileId"])
    .index("by_engine_version", ["engineVersion"]),

  recommendationShadowComparisons: defineTable({
    sessionId: v.id("fitSessions"),
    userId: v.id("users"),
    baselineEngineVersion: v.union(
      v.literal("v1"),
      v.literal("v2_shadow"),
      v.literal("v2")
    ),
    shadowEngineVersion: v.union(
      v.literal("v1"),
      v.literal("v2_shadow"),
      v.literal("v2")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed")
    ),
    baselineSnapshot: v.object({
      saddleHeightMm: v.number(),
      saddleSetbackMm: v.number(),
      barDropMm: v.number(),
      saddleToBarReachMm: v.number(),
      stemLengthMm: v.number(),
      crankLengthMm: v.number(),
      handlebarWidthMm: v.number(),
      confidenceScore: v.number(),
    }),
    shadowSnapshot: v.optional(
      v.object({
        saddleHeightMm: v.number(),
        saddleSetbackMm: v.number(),
        barDropMm: v.number(),
        saddleToBarReachMm: v.number(),
        stemLengthMm: v.number(),
        crankLengthMm: v.number(),
        handlebarWidthMm: v.number(),
        confidenceScore: v.number(),
      })
    ),
    deltas: v.optional(
      v.object({
        saddleHeightMm: v.number(),
        saddleSetbackMm: v.number(),
        barDropMm: v.number(),
        saddleToBarReachMm: v.number(),
        stemLengthMm: v.number(),
        crankLengthMm: v.number(),
        handlebarWidthMm: v.number(),
        confidenceScore: v.number(),
      })
    ),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_session", ["sessionId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  validationCaptures: defineTable({
    sessionId: v.id("fitSessions"),
    userId: v.id("users"),
    bikeId: v.optional(v.id("bikes")),
    bikeProfileId: v.optional(v.id("bikeProfiles")),
    captureType: v.union(
      v.literal("side_video"),
      v.literal("front_video"),
      v.literal("manual_angles")
    ),
    sourceType: v.union(
      v.literal("video_beta"),
      v.literal("manual_beta"),
      v.literal("staff_review")
    ),
    status: v.union(v.literal("active"), v.literal("archived")),
    qualityScore: v.number(),
    kneeAngleBdcDeg: v.optional(v.number()),
    hipAngleTdcDeg: v.optional(v.number()),
    trunkAngleDeg: v.optional(v.number()),
    pelvicRockScore: v.optional(v.number()),
    elbowAngleDeg: v.optional(v.number()),
    kneeTrackingScore: v.optional(v.number()),
    cadenceRpm: v.optional(v.number()),
    powerWatts: v.optional(v.number()),
    handPositionMode: v.optional(
      v.union(
        v.literal("tops"),
        v.literal("hoods"),
        v.literal("drops"),
        v.literal("flat_bar"),
        v.literal("aero_extensions")
      )
    ),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_user", ["userId"]),

  rideFeedbackEntries: defineTable({
    sessionId: v.id("fitSessions"),
    userId: v.id("users"),
    bikeId: v.optional(v.id("bikes")),
    bikeProfileId: v.optional(v.id("bikeProfiles")),
    implementationStatus: v.union(
      v.literal("confirmed"),
      v.literal("partial"),
      v.literal("not_implemented")
    ),
    comfortScore: v.number(),
    handlingScore: v.optional(v.number()),
    performanceFeelScore: v.optional(v.number()),
    kneePainArea: v.optional(
      v.union(
        v.literal("front"),
        v.literal("back"),
        v.literal("medial"),
        v.literal("lateral")
      )
    ),
    kneePainSeverity: v.optional(v.number()),
    lowerBackDiscomfortScore: v.optional(v.number()),
    handPressureScore: v.optional(v.number()),
    saddlePressureScore: v.optional(v.number()),
    climbingConfidenceScore: v.optional(v.number()),
    descendingControlScore: v.optional(v.number()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    refinementSuggestion: v.optional(
      v.object({
        parameter: v.string(),
        direction: v.union(v.literal("increase"), v.literal("decrease"), v.literal("hold")),
        delta: v.number(),
        rationale: v.string(),
      })
    ),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_user", ["userId"]),

  // Email reports tracking
  emailReports: defineTable({
    userId: v.id("users"),
    sessionId: v.id("fitSessions"),
    recommendationId: v.id("recommendations"),

    recipientEmail: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("failed")
    ),

    resendEmailId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),

    sentAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_status", ["status"]),

  // Question definitions - for dynamic questionnaire
  questionDefinitions: defineTable({
    questionId: v.string(),
    category: v.string(),
    questionText: v.string(),
    helpText: v.optional(v.string()),

    responseType: v.union(
      v.literal("single_choice"),
      v.literal("multiple_choice"),
      v.literal("numeric"),
      v.literal("text"),
      v.literal("scale")
    ),

    // For choice-based questions
    options: v.optional(
      v.array(
        v.object({
          value: v.string(),
          label: v.string(),
          followUpQuestionIds: v.optional(v.array(v.string())),
        })
      )
    ),

    // For numeric questions
    numericConfig: v.optional(
      v.object({
        min: v.optional(v.number()),
        max: v.optional(v.number()),
        unit: v.optional(v.string()),
      })
    ),

    // For scale questions
    scaleConfig: v.optional(
      v.object({
        min: v.number(),
        max: v.number(),
        minLabel: v.string(),
        maxLabel: v.string(),
      })
    ),

    // Conditional display
    showCondition: v.optional(
      v.object({
        dependsOnQuestionId: v.string(),
        requiredValues: v.array(v.string()),
      })
    ),

    baseOrder: v.number(),
    isRequired: v.boolean(),
    isActive: v.boolean(),
  })
    .index("by_category", ["category"])
    .index("by_question_id", ["questionId"]),

  // Rate limiting for PDF report downloads
  reportRateLimits: defineTable({
    identifier: v.string(),
    tokens: v.number(),
    lastRefillAt: v.number(),
  }).index("by_identifier", ["identifier"]),

  // Public-site marketing and conversion events (SEO/content iteration)
  marketingEvents: defineTable({
    eventType: v.union(
      ...(MARKETING_EVENT_TYPES.map((eventType) => v.literal(eventType)) as [
        ReturnType<typeof v.literal<MarketingEventType>>,
        ...Array<ReturnType<typeof v.literal<MarketingEventType>>>
      ])
    ),
    locale: v.union(v.literal("en"), v.literal("nl")),
    pagePath: v.string(),
    section: v.optional(v.string()),
    ctaLabel: v.optional(v.string()),
    ctaTargetPath: v.optional(v.string()),
    sourceTag: v.optional(v.string()),
    valueCents: v.optional(v.number()),
    currency: v.optional(v.literal("EUR")),
    occurredAt: v.number(),
  })
    .index("by_occurred_at", ["occurredAt"])
    .index("by_event_type_occurred_at", ["eventType", "occurredAt"])
    .index("by_locale_occurred_at", ["locale", "occurredAt"])
    .index("by_page_occurred_at", ["pagePath", "occurredAt"]),

  fitPassPurchases: defineTable({
    userId: v.id("users"),
    sessionId: v.id("fitSessions"),
    stripeCheckoutSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    amountCents: v.number(),
    currency: v.literal("EUR"),
    locale: v.union(v.literal("en"), v.literal("nl")),
    status: v.literal("completed"),
    purchasedAt: v.number(),
    onboardingEmailSentAt: v.optional(v.number()),
  })
    .index("by_user_session", ["userId", "sessionId"])
    .index("by_session", ["sessionId"])
    .index("by_checkout_session", ["stripeCheckoutSessionId"]),

  caseStudyLeads: defineTable({
    userId: v.optional(v.id("users")),
    locale: v.union(v.literal("en"), v.literal("nl")),
    sourcePath: v.string(),
    painSlug: v.optional(v.string()),
    name: v.string(),
    email: v.string(),
    ridingGoal: v.optional(v.string()),
    painSummary: v.string(),
    consentAccepted: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_email", ["email"])
    .index("by_pain_slug_created_at", ["painSlug", "createdAt"]),

  integrations: defineTable({
    userId: v.id("users"),
    provider: v.literal("strava"),
    providerUserId: v.optional(v.string()),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.number()),
    accessStatus: v.union(
      v.literal("not_connected"),
      v.literal("pending"),
      v.literal("active"),
      v.literal("revoked"),
      v.literal("error")
    ),
    lastSyncAt: v.optional(v.number()),
    ridingProfileJson: v.optional(v.string()),
    athleteName: v.optional(v.string()),
    athleteAvatarUrl: v.optional(v.string()),
    athleteStravaWeight: v.optional(v.number()),
    rideCount: v.optional(v.number()),
    totalDistanceKm: v.optional(v.number()),
    stravaGearSummaryJson: v.optional(v.string()),
    lastActivitySyncAt: v.optional(v.number()),
    syncErrorMessage: v.optional(v.string()),
    oauthState: v.optional(v.string()),
    oauthStateExpiresAt: v.optional(v.number()),
  })
    .index("by_user_and_provider", ["userId", "provider"])
    .index("by_status", ["accessStatus"]),

  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    type: v.union(
      v.literal("bike_shop"),
      v.literal("enterprise"),
      v.literal("fitter_studio"),
      v.literal("brand")
    ),
    ownerUserId: v.id("users"),
    planId: v.optional(v.id("plans")),
    maxSeats: v.optional(v.number()),
    usedSeats: v.optional(v.number()),
    suspendedAt: v.optional(v.number()),
    suspendedReason: v.optional(v.string()),
    billingEmail: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
    .index("by_owner", ["ownerUserId"]),

  organization_members: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    role: v.union(
      v.literal("owner"),
      v.literal("staff"),
      v.literal("fitter"),
      v.literal("viewer")
    ),
    joinedAt: v.number(),
    removedAt: v.optional(v.number()),
  })
    .index("by_org", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_org_user", ["organizationId", "userId"]),

  admin_audit_logs: defineTable({
    adminUserId: v.id("users"),
    action: v.string(),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    payload: v.optional(v.string()),
    reason: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    occurredAt: v.number(),
  })
    .index("by_admin", ["adminUserId"])
    .index("by_target", ["targetType", "targetId"])
    .index("by_occurred_at", ["occurredAt"]),

  guidePages: defineTable({
    slug: v.string(),
    path: v.string(),
    cluster: v.string(),
    backlogOrder: v.optional(v.number()),
    importStatus: v.optional(v.string()),
    importNotes: v.optional(v.string()),
    status: guideStatusValidator,
    pageTitle: bilingualStringValidator,
    h1: bilingualStringValidator,
    metaTitle: bilingualStringValidator,
    metaDescription: bilingualStringValidator,
    pageBrief: bilingualStringValidator,
    body: v.object({
      en: v.array(guideSectionValidator),
      nl: v.array(guideSectionValidator),
    }),
    faqs: v.optional(
      v.object({
        en: v.array(guideFaqValidator),
        nl: v.array(guideFaqValidator),
      })
    ),
    quickAnswer: v.optional(guideQuickAnswerValidator),
    libraryBody: v.optional(
      v.object({
        en: v.string(),
        nl: v.string(),
      })
    ),
    heroImageFileName: v.optional(v.string()),
    heroImagePublicPath: v.optional(v.string()),
    relatedGuidePaths: v.optional(v.array(v.string())),
    relatedKeywords: v.optional(v.array(v.string())),
    seoHints: v.optional(guideSeoHintsValidator),
    featuredImageUrl: v.optional(v.string()),
    featuredImageAlt: v.optional(bilingualStringValidator),
    canonicalUrl: v.optional(v.string()),
    ogTitle: v.optional(bilingualStringValidator),
    ogDescription: v.optional(bilingualStringValidator),
    ogImageUrl: v.optional(v.string()),
    ogImageAlt: v.optional(bilingualStringValidator),
    robotsIndex: v.boolean(),
    author: v.optional(v.id("users")),
    tags: v.optional(v.array(v.string())),
    relatedGuides: v.optional(v.array(v.string())),
    primaryCtaTarget: v.optional(v.string()),
    primaryCtaLabel: v.optional(bilingualStringValidator),
    tableOfContents: v.boolean(),
    publishedAt: v.optional(v.number()),
    lastUpdatedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
    deletedBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.union(v.id("users"), v.literal("import-json")),
    updatedBy: v.union(v.id("users"), v.literal("import-json")),
    version: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_cluster", ["cluster"])
    .index("by_status_and_cluster", ["status", "cluster"]),

  guideRevisions: defineTable({
    guideId: v.id("guidePages"),
    version: v.number(),
    snapshot: v.any(),
    savedBy: v.id("users"),
    savedAt: v.number(),
  }).index("by_guideId", ["guideId"]),

  blogPosts: defineTable({
    slug: v.string(),
    status: v.union(v.literal("draft"), v.literal("published")),
    title: bilingualStringValidator,
    h1: v.optional(bilingualStringValidator),
    body: bilingualStringValidator,
    excerpt: v.optional(bilingualStringValidator),
    category: v.string(),
    tags: v.optional(v.array(v.string())),
    featuredImageUrl: v.optional(v.string()),
    featuredImageAlt: v.optional(bilingualStringValidator),
    authorName: v.optional(v.string()),
    author: v.optional(v.id("users")),
    publishedAt: v.optional(v.number()),
    updatedAt: v.number(),
    createdAt: v.number(),
    version: v.number(),
    metaTitle: bilingualStringValidator,
    metaDescription: bilingualStringValidator,
    canonicalUrl: v.optional(v.string()),
    ogTitle: v.optional(bilingualStringValidator),
    ogDescription: v.optional(bilingualStringValidator),
    ogImageUrl: v.optional(v.string()),
    ogImageAlt: v.optional(bilingualStringValidator),
    robotsIndex: v.boolean(),
    relatedPostSlugs: v.optional(v.array(v.string())),
    relatedGuidePaths: v.optional(v.array(v.string())),
    tableOfContents: v.boolean(),
  })
    .index("by_slug", ["slug"])
    .index("by_status_publishedAt", ["status", "publishedAt"]),

  blogRevisions: defineTable({
    postId: v.id("blogPosts"),
    version: v.number(),
    snapshot: v.any(),
    savedBy: v.id("users"),
    savedAt: v.number(),
  }).index("by_postId", ["postId"]),

  guideAuditLog: defineTable({
    guideId: v.optional(v.id("guidePages")),
    action: v.string(),
    resourceType: v.string(),
    resourceId: v.string(),
    fieldChanges: v.array(
      v.object({
        field: v.string(),
        oldValue: v.optional(v.any()),
        newValue: v.optional(v.any()),
      })
    ),
    userId: v.id("users"),
    userEmail: v.string(),
    timestamp: v.number(),
    metadata: v.optional(v.any()),
  })
    .index("by_guideId", ["guideId"])
    .index("by_resource", ["resourceType", "resourceId"])
    .index("by_timestamp", ["timestamp"]),

  redirects: defineTable({
    from: v.string(),
    to: v.string(),
    statusCode: v.union(v.literal(301), v.literal(302)),
    reason: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_from", ["from"]),

  geometry_brands: defineTable({
    name: v.string(),
    slug: v.string(),
    logoUrl: v.optional(v.string()),
    website: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    createdBy: v.id("users"),
  }).index("by_slug", ["slug"]),

  geometry_models: defineTable({
    brandId: v.id("geometry_brands"),
    name: v.string(),
    category: v.union(
      v.literal("road"),
      v.literal("gravel"),
      v.literal("mtb"),
      v.literal("tt"),
      v.literal("endurance"),
      v.literal("city"),
      v.literal("other")
    ),
    yearStart: v.optional(v.number()),
    yearEnd: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    createdBy: v.id("users"),
  }).index("by_brand", ["brandId"]),

  geometry_records: defineTable({
    modelId: v.id("geometry_models"),
    brandId: v.id("geometry_brands"),
    sizeLabel: v.string(),
    stack: v.optional(v.number()),
    reach: v.optional(v.number()),
    seatTubeAngle: v.optional(v.number()),
    headTubeAngle: v.optional(v.number()),
    wheelbase: v.optional(v.number()),
    chainstay: v.optional(v.number()),
    bbDrop: v.optional(v.number()),
    effectiveTopTube: v.optional(v.number()),
    standover: v.optional(v.number()),
    forkRake: v.optional(v.number()),
    headTubeLength: v.optional(v.number()),
    source: v.union(
      v.literal("manufacturer"),
      v.literal("admin_import"),
      v.literal("admin_manual"),
      v.literal("user_entered")
    ),
    sourceUrl: v.optional(v.string()),
    importJobId: v.optional(v.string()),
    changeReason: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("superseded"),
      v.literal("rejected")
    ),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    version: v.number(),
    supersededBy: v.optional(v.id("geometry_records")),
    createdAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_model", ["modelId"])
    .index("by_brand", ["brandId"])
    .index("by_status", ["status"])
    .index("by_model_size", ["modelId", "sizeLabel"]),

  engine_versions: defineTable({
    versionLabel: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("qa"),
      v.literal("active"),
      v.literal("deprecated")
    ),
    qaStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("passed"),
        v.literal("failed")
      )
    ),
    ruleSetJson: v.optional(v.string()),
    benchmarkResultsJson: v.optional(v.string()),
    rollbackPlan: v.optional(v.string()),
    ownerId: v.optional(v.id("users")),
    activatedAt: v.optional(v.number()),
    activatedBy: v.optional(v.id("users")),
    createdAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_status", ["status"])
    .index("by_version_label", ["versionLabel"]),

  feedback_items: defineTable({
    userId: v.optional(v.id("users")),
    type: v.union(
      v.literal("bug"),
      v.literal("feature_request"),
      v.literal("support_case"),
      v.literal("review")
    ),
    title: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("new"),
      v.literal("triaged"),
      v.literal("needs_info"),
      v.literal("planned"),
      v.literal("in_progress"),
      v.literal("in_qa"),
      v.literal("released"),
      v.literal("closed"),
      v.literal("declined")
    ),
    priority: v.optional(
      v.union(
        v.literal("low"),
        v.literal("normal"),
        v.literal("high"),
        v.literal("urgent")
      )
    ),
    category: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    duplicateOf: v.optional(v.id("feedback_items")),
    linkedReleaseId: v.optional(v.id("releases")),
    linkedSessionId: v.optional(v.id("fitSessions")),
    linkedBikeId: v.optional(v.id("bikes")),
    pageUrl: v.optional(v.string()),
    pathname: v.optional(v.string()),
    queryString: v.optional(v.string()),
    locale: v.optional(v.union(v.literal("en"), v.literal("nl"))),
    routeFamily: v.optional(
      v.union(
        v.literal("marketing"),
        v.literal("auth"),
        v.literal("dashboard"),
        v.literal("fit_results"),
        v.literal("calculators"),
        v.literal("profile"),
        v.literal("bikes"),
        v.literal("settings"),
        v.literal("pricing"),
        v.literal("other")
      )
    ),
    activitySummary: v.optional(v.string()),
    contextCompleteness: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    activityTrailJson: v.optional(v.string()),
    pagePath: v.optional(v.string()),
    browserInfoJson: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactName: v.optional(v.string()),
    expectedResult: v.optional(v.string()),
    actualResult: v.optional(v.string()),
    upvoteCount: v.optional(v.number()),
    requesterCount: v.optional(v.number()),
    productArea: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_type", ["type"])
    .index("by_status", ["status"])
    .index("by_assigned_to", ["assignedTo"])
    .index("by_user", ["userId"])
    .index("by_release", ["linkedReleaseId"])
    .index("by_route_family", ["routeFamily"]),

  feedback_comments: defineTable({
    feedbackItemId: v.id("feedback_items"),
    authorUserId: v.id("users"),
    body: v.string(),
    isInternal: v.boolean(),
    createdAt: v.number(),
  }).index("by_feedback_item", ["feedbackItemId"]),

  feedback_upvotes: defineTable({
    feedbackItemId: v.id("feedback_items"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_feedback_item", ["feedbackItemId"])
    .index("by_user", ["userId"])
    .index("by_user_and_feedback", ["userId", "feedbackItemId"]),

  releases: defineTable({
    name: v.string(),
    type: v.union(
      v.literal("app"),
      v.literal("fit_engine"),
      v.literal("geometry_data"),
      v.literal("content"),
      v.literal("integration"),
      v.literal("internal")
    ),
    versionLabel: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("in_qa"),
      v.literal("approved"),
      v.literal("scheduled"),
      v.literal("rolling_out"),
      v.literal("live"),
      v.literal("rolled_back"),
      v.literal("archived")
    ),
    ownerId: v.optional(v.id("users")),
    description: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    rollbackPlan: v.optional(v.string()),
    releaseNotes: v.optional(v.string()),
    qaStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("passed"),
        v.literal("failed")
      )
    ),
    rolloutDate: v.optional(v.number()),
    liveAt: v.optional(v.number()),
    createdAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_status", ["status"])
    .index("by_type", ["type"])
    .index("by_rollout_date", ["rolloutDate"]),

  release_items: defineTable({
    releaseId: v.id("releases"),
    itemType: v.union(v.literal("feedback_item"), v.literal("geometry_record")),
    itemId: v.string(),
    createdAt: v.number(),
  })
    .index("by_release", ["releaseId"])
    .index("by_item", ["itemType", "itemId"]),

  dashboard_messages: defineTable({
    title: v.string(),
    body: v.string(),
    type: v.union(
      v.literal("banner"),
      v.literal("inbox_card"),
      v.literal("modal"),
      v.literal("sticky_warning"),
      v.literal("release_announcement"),
      v.literal("upgrade_prompt"),
      v.literal("safety_alert"),
      v.literal("re_fit_reminder"),
      v.literal("support_reply")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("normal"),
      v.literal("high"),
      v.literal("urgent")
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("published"),
      v.literal("expired"),
      v.literal("paused")
    ),
    ctaText: v.optional(v.string()),
    ctaUrl: v.optional(v.string()),
    locale: v.optional(v.union(v.literal("all"), v.literal("en"), v.literal("nl"))),
    dismissible: v.boolean(),
    requiresAcknowledgement: v.boolean(),
    linkedReleaseId: v.optional(v.id("releases")),
    linkedFeedbackItemId: v.optional(v.id("feedback_items")),
    startsAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
    pausedAt: v.optional(v.number()),
    createdAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_status", ["status"])
    .index("by_published_at", ["publishedAt"]),

  message_targets: defineTable({
    messageId: v.id("dashboard_messages"),
    targetType: v.string(),
    targetValue: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_target", ["targetType", "targetValue"]),

  message_receipts: defineTable({
    messageId: v.id("dashboard_messages"),
    userId: v.id("users"),
    deliveredAt: v.number(),
    viewedAt: v.optional(v.number()),
    clickedAt: v.optional(v.number()),
    acknowledgedAt: v.optional(v.number()),
    dismissedAt: v.optional(v.number()),
  })
    .index("by_message", ["messageId"])
    .index("by_user", ["userId"])
    .index("by_message_user", ["messageId", "userId"]),

  plans: defineTable({
    key: v.string(),
    name: v.string(),
    tier: v.union(
      v.literal("free"),
      v.literal("pro"),
      v.literal("premium"),
      v.literal("bike_shop"),
      v.literal("enterprise")
    ),
    priceCents: v.optional(v.number()),
    stripeProductId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    stripeLookupKey: v.optional(v.string()),
    currency: v.optional(v.literal("EUR")),
    billingInterval: v.optional(
      v.union(v.literal("month"), v.literal("year"), v.literal("custom"))
    ),
    seatLimit: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_key", ["key"])
    .index("by_stripe_price", ["stripePriceId"])
    .index("by_stripe_lookup_key", ["stripeLookupKey"]),

  billingEmailJobs: defineTable({
    sendKey: v.string(),
    kind: v.union(v.literal("purchase"), v.literal("welcome"), v.literal("cancellation"), v.literal("renewal"), v.literal("expired"), v.literal("transition_announcement"), v.literal("transition_reminder")),
    userId: v.id("users"),
    entitlementId: v.optional(v.id("pricingEntitlements")),
    launchAt: v.optional(v.number()),
    transitionOfferId: v.optional(v.id("pricingTransitionOffers")),
    transitionRunId: v.optional(v.id("billingTransitionRuns")),
    status: v.union(v.literal("pending"), v.literal("sending"), v.literal("sent"), v.literal("cancelled"), v.literal("failed")),
    attempts: v.number(),
    createdAt: v.number(),
    firstAttemptAt: v.optional(v.number()),
    leaseUntil: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    failureCode: v.optional(v.string()),
    deliveryPayload: v.optional(v.object({ recipient: v.string(), subject: v.string(), preheader: v.string(), html: v.string(), text: v.string() })),
  }).index("by_send_key", ["sendKey"]).index("by_user", ["userId"]).index("by_status", ["status"]),

  pricingEntitlements: defineTable({
    userId: v.id("users"),
    bikeId: v.optional(v.id("bikes")),
    productId: v.union(v.literal("single"), v.literal("annual"), v.literal("annual_entry"), v.literal("annual_upgrade"), v.literal("annual_personal"),
      v.literal("personal_fit_standalone")),
    status: v.union(v.literal("active"), v.literal("expired"), v.literal("revoked")),
    revokedReason: v.optional(v.union(v.literal("bike_deleted"), v.literal("refunded"), v.literal("admin"))),
    startsAt: v.number(),
    expiresAt: v.number(),
    source: v.union(v.literal("purchase"), v.literal("gift"), v.literal("transition"), v.literal("legacy_pro")),
    grantKey: v.string(),
    subscriptionId: v.optional(v.string()),
    customerId: v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),
    appointmentGranted: v.boolean(),
    appointmentUsedAt: v.optional(v.number()),
    periodPriceCents: v.optional(v.number()),
    renewed: v.optional(v.boolean()),
    cancelled: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_bike", ["bikeId"])
    .index("by_subscription", ["subscriptionId"])
    .index("by_payment_intent", ["paymentIntentId"])
    .index("by_grant_key", ["grantKey"])
    .index("by_status_expiry", ["status", "expiresAt"]),

  pricingAppointmentNotifications: defineTable({
    entitlementId: v.id("pricingEntitlements"),
    userId: v.id("users"),
    recipient: v.string(),
    riderName: v.string(),
    riderEmail: v.string(),
    locale: v.union(v.literal("nl"), v.literal("en")),
    status: v.union(v.literal("pending_integration"), v.literal("pending"), v.literal("sending"),
      v.literal("sent"), v.literal("cancelled"), v.literal("failed")),
    attemptedAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    idempotencyKey: v.string(),
    createdAt: v.number(),
  }).index("by_entitlement", ["entitlementId"]).index("by_user", ["userId"]),

  pricingTransitionOffers: defineTable({
    userId: v.id("users"),
    goLiveAt: v.number(),
    redeemBy: v.number(),
    createdAt: v.number(),
    redeemedAt: v.optional(v.number()),
    bikeId: v.optional(v.id("bikes")),
    entitlementId: v.optional(v.id("pricingEntitlements")),
  }).index("by_user", ["userId"]),

  pricingTransitionRuns: defineTable({
    adminUserId: v.id("users"),
    goLiveAt: v.number(),
    dryRun: v.boolean(),
    phase: v.union(v.literal("reports"), v.literal("users"), v.literal("complete")),
    cursor: v.optional(v.string()),
    reportCount: v.number(),
    offerCount: v.number(),
    legacyProCount: v.number(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    dryRunId: v.optional(v.id("pricingTransitionRuns")),
  }).index("by_admin", ["adminUserId"]),

  subscriptions: defineTable({
    userId: v.optional(v.id("users")),
    organizationId: v.optional(v.id("organizations")),
    planId: v.id("plans"),
    status: v.union(
      v.literal("trialing"),
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("expired")
    ),
    provider: v.optional(v.union(v.literal("stripe"), v.literal("manual"))),
    externalId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    canceledAt: v.optional(v.number()),
    latestInvoiceId: v.optional(v.string()),
    lastPaymentStatus: v.optional(v.string()),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_org", ["organizationId"])
    .index("by_plan", ["planId"])
    .index("by_external_id", ["externalId"])
    .index("by_stripe_customer", ["stripeCustomerId"]),

  billing_events: defineTable({
    subscriptionId: v.optional(v.id("subscriptions")),
    userId: v.optional(v.id("users")),
    organizationId: v.optional(v.id("organizations")),
    eventType: v.string(),
    payloadJson: v.optional(v.string()),
    occurredAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_subscription", ["subscriptionId"])
    .index("by_user", ["userId"])
    .index("by_occurred_at", ["occurredAt"]),

  stripeCheckouts: defineTable({
    userId: v.id("users"),
    bikeId: v.optional(v.id("bikes")),
    productId: v.string(),
    locale: v.union(v.literal("nl"), v.literal("en")),
    status: v.union(v.literal("pending"), v.literal("paid"), v.literal("failed"), v.literal("expired"), v.literal("refunded")),
    sessionId: v.optional(v.string()),
    amountTotalCents: v.optional(v.number()),
    annualPriceId: v.optional(v.string()),
    customerId: v.optional(v.string()),
    subscriptionId: v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),
    entitlementId: v.optional(v.id("pricingEntitlements")),
    createdAt: v.number(),
    lastEventAt: v.optional(v.number()),
    subscriptionEventAt: v.optional(v.number()),
    subscriptionCancelled: v.optional(v.boolean()),
    subscriptionEndedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_created_at", ["userId", "createdAt"])
    .index("by_user_status", ["userId", "status"])
    .index("by_session", ["sessionId"])
    .index("by_subscription", ["subscriptionId"])
    .index("by_payment_intent", ["paymentIntentId"]),

  stripeBillingPeriods: defineTable({
    userId: v.id("users"),
    entitlementId: v.id("pricingEntitlements"),
    grantKey: v.string(),
    invoiceId: v.string(),
    subscriptionId: v.string(),
    customerId: v.string(),
    paymentIntentId: v.optional(v.string()),
    periodStart: v.number(),
    periodEnd: v.number(),
    periodPriceCents: v.number(),
    renewed: v.boolean(),
  })
    .index("by_user_period", ["userId", "periodStart"])
    .index("by_grant_key", ["grantKey"])
    .index("by_invoice", ["invoiceId"]),

  stripeInvoicePaymentLinks: defineTable({
    invoiceId: v.string(),
    paymentIntentId: v.string(),
    amountPaid: v.number(),
    currency: v.string(),
  }).index("by_invoice", ["invoiceId"]),

  stripePaymentRefunds: defineTable({
    paymentIntentId: v.string(),
    fullyRefunded: v.boolean(),
    amountRefunded: v.number(),
    cancellationKey: v.optional(v.string()),
    cancellationAmountRefunded: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_payment_intent", ["paymentIntentId"]),

  stripe_events: defineTable({
    stripeEventId: v.string(),
    eventType: v.string(),
    livemode: v.boolean(),
    apiVersion: v.optional(v.string()),
    objectId: v.optional(v.string()),
    processedAt: v.number(),
    payloadJson: v.string(),
  })
    .index("by_event_id", ["stripeEventId"])
    .index("by_type", ["eventType"])
    .index("by_processed_at", ["processedAt"]),

  feature_flags: defineTable({
    key: v.string(),
    value: v.boolean(),
    description: v.optional(v.string()),
    updatedBy: v.id("users"),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  gdpr_requests: defineTable({
    requestType: v.union(v.literal("export"), v.literal("erasure")),
    requesterEmail: v.string(),
    subjectUserId: v.optional(v.id("users")),
    status: v.union(v.literal("requested"), v.literal("fulfilled"), v.literal("failed")),
    receivedAt: v.number(),
    fulfilledAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
  })
    .index("by_received_at", ["receivedAt"])
    .index("by_subject", ["subjectUserId"])
    .index("by_status", ["status"]),

  lifecycleEmailLog: defineTable({
    userId: v.id("users"),
    locale: v.optional(v.union(v.literal("nl"), v.literal("en"))),
    emailType: v.string(), // e.g. "fit_reminder", "results_recap", "upgrade_nudge", "winback"
    sentAt: v.number(),    // Date.now()
    sessionId: v.optional(v.id("fitSessions")),
  })
    .index("by_user_type", ["userId", "emailType"])
    .index("by_user_type_session", ["userId", "emailType", "sessionId"]),
});
