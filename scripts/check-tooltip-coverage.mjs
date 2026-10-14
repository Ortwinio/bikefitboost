#!/usr/bin/env node

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const SRC_ROOT = path.resolve("src");
const FORM_CONTROL_REGEX = /<(Input|Select)\b|<input\b|<select\b|<textarea\b/;
const TEST_FILE_REGEX = /\.test\.(ts|tsx)$/;
const SUPPORTED_EXTENSIONS = new Set([".ts", ".tsx"]);

const PRIMITIVE_FILES = new Set([
  "src/components/ui/Input.tsx",
  "src/components/ui/Select.tsx",
  "src/components/ui/Slider.tsx",
  "src/components/ui/Textarea.tsx",
  "src/components/prototyper-ui/ui/textarea.tsx",
  "src/components/questionnaire/questions/MultipleChoice.tsx",
  "src/components/questionnaire/questions/SingleChoice.tsx",
]);

const EXEMPT_FILES = new Set([
  "src/components/settings/AgentToolsSettings.tsx",
  "src/components/gifts/GiftGive.tsx",
  "src/components/gifts/GiftRedeem.tsx",
  "src/components/billing/TransitionOffer.tsx",
  "src/components/checkout/CheckoutFlow.tsx",
  // Handoff review uses permanent labels and inline measurement-point guidance.
  "src/app/welcome/WelcomeClient.tsx",
  // Administrative search/content controls use visible labels and helper copy,
  // matching the existing admin exemptions rather than measurement tooltips.
  "src/app/(dashboard)/admin/geometry/page.tsx",
  "src/components/admin/bikes/AdminBikeGeometryLinkDialog.tsx",
  "src/components/admin/blog/BlogCreateView.tsx",
  "src/components/admin/blog/BlogEditView.tsx",
  "src/components/admin/guides/GuideCreateView.tsx",
  "src/components/admin/guides/GuideEditView.tsx",
  "src/components/admin/guides/GuideImportView.tsx",
  "src/components/admin/guides/GuideRedirectsView.tsx",
  "src/components/admin/guides/GuidesAdminListClient.tsx",
  // Search suggestions explain this single homepage control inline.
  "src/components/home/BikeSearchBar.tsx",
  "src/app/(dashboard)/settings/page.tsx",
  // Same labeled name/units fields extracted from the exempt settings page.
  "src/app/(dashboard)/settings/SettingsAutosaveFields.tsx",
  "src/app/(dashboard)/admin/bikes/[bikeId]/page.tsx",
  "src/app/(dashboard)/admin/bikes/page.tsx",
  "src/app/(dashboard)/admin/fit-runs/page.tsx",
  "src/app/(dashboard)/admin/geometry/[recordId]/page.tsx",
  "src/app/(dashboard)/admin/geometry/brands/[brandId]/models/[modelId]/page.tsx",
  "src/app/(dashboard)/admin/geometry/brands/[brandId]/page.tsx",
  "src/app/(dashboard)/admin/geometry/brands/page.tsx",
  "src/app/(dashboard)/admin/geometry/import/page.tsx",
  "src/app/(dashboard)/admin/rider-data/page.tsx",
  "src/components/admin/audit/AuditLogPage.tsx",
  "src/components/admin/billing/BillingViews.tsx",
  "src/components/admin/feedback/FeedbackViews.tsx",
  "src/components/admin/messages/MessageViews.tsx",
  "src/components/admin/organizations/OrganizationDetailClient.tsx",
  "src/components/admin/organizations/OrganizationsAdminClient.tsx",
  "src/components/admin/releases/ReleaseActionPanel.tsx",
  "src/components/admin/releases/ReleaseCreateCard.tsx",
  "src/components/admin/settings/SettingsViews.tsx",
  "src/components/admin/users/UserDetailClient.tsx",
  "src/components/admin/users/UsersAdminClient.tsx",
  "src/components/bikes/BikePhotoUpload.tsx",
  "src/components/bikes/BikeGeometryLibraryFields.tsx",
  "src/components/bikes/BikePhotoGallery.tsx",
  "src/components/bikes/DeleteBikeAction.tsx",
  "src/components/bikes/BikeWheelsetManager.tsx",
  // Extracted labeled wheel/tire controls retain visible units and range helpers.
  "src/components/bikes/BikeWheelsetEditor.tsx",
  "src/components/features/bikes/CreateBikeForm.tsx",
  "src/components/features/bikes/BikePassportImportFlow.tsx",
  "src/components/features/casestudy/CaseStudyOptIn.tsx",
  "src/components/features/pressure/PressureCalculatorForm.tsx",
  "src/components/features/pressure/wizard/StepResult.tsx",
  "src/components/features/pressure/wizard/StepRoute.tsx",
  "src/components/features/pressure/wizard/StepWeightGoal.tsx",
  "src/components/features/pressure/wizard/StepWheelsetTires.tsx",
  "src/app/(dashboard)/gearing/GearingCalculatorForm.tsx",
  "src/app/(dashboard)/saddle-selector/SaddleSelectorForm.tsx",
  "src/components/feedback/FeedbackDialog.tsx",
  "src/components/measurements/NumberSlider.tsx",
  "src/components/profile/ProfilePhotoUpload.tsx",
  "src/components/public/CaseStudyRecruitmentForm.tsx",
  "src/components/public/PublicFormFields.tsx",
]);

const INPUT_SELECT_ENFORCED_FILES = new Set([
  "src/components/measurements/MeasurementKind.tsx",
  "src/components/reliability/account/AccountSaddleHeight.tsx",
  "src/components/reliability/account/AccountKneeAngle.tsx",
  "src/components/reliability/account/InseamMeasurements.tsx",
  "src/components/reliability/account/KneeMeasurementForm.tsx",
  "src/components/reliability/account/SaddleSettings.tsx",
  "src/components/profile/ProfileRefinements.tsx",
  "src/components/calculators/AccountCalculatorBike.tsx",
  "src/components/calculators/CalculatorChainPanel.tsx",
  "src/app/(public)/calculators/crank-length/CrankLengthCalculatorForm.tsx",
  "src/app/(public)/calculators/saddle-width/SaddleWidthCalculatorForm.tsx",
  "src/app/(public)/calculators/crank-length/LegacyCrankLengthCalculatorForm.tsx",
  "src/app/(public)/calculators/saddle-width/LegacySaddleWidthCalculatorForm.tsx",
  "src/components/profile/ProfileProvenance.tsx",
  "src/components/profile/AdviceProgressActions.tsx",
  "src/components/dashboard/DashboardProfilePrompts.tsx",
  "src/app/(public)/design-system/Playground.tsx",
  "src/app/(auth)/login/page.tsx",
  "src/app/(dashboard)/fit/[sessionId]/results/page.tsx",
  "src/components/bikes/BikeForm.tsx",
  "src/components/bikes/BikeProfilePanel.tsx",
  "src/components/measurements/StepAdvancedMeasurements.tsx",
  "src/components/measurements/StepBodyMeasurements.tsx",
]);

const NATIVE_CONTROL_ENFORCED_FILES = new Set([
  "src/app/(public)/contact/page.tsx",
  "src/app/(public)/calculators/saddle-height/page.tsx",
  "src/app/(public)/calculators/frame-size/page.tsx",
  "src/app/(public)/calculators/crank-length/page.tsx",
  "src/app/(public)/calculators/bike-fit/page.tsx",
  "src/components/questionnaire/questions/NumericQuestion.tsx",
  "src/components/questionnaire/questions/TextQuestion.tsx",
]);

async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
      continue;
    }

    const ext = path.extname(entry.name);
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      continue;
    }
    if (TEST_FILE_REGEX.test(entry.name)) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function validateInputSelectCoverage(filePath, content, errors) {
  const inputTags = content.match(/<Input\b[\s\S]*?\/>/g) || [];
  const selectTags = content.match(/<Select\b[\s\S]*?\/>/g) || [];

  inputTags.forEach((tag, index) => {
    if (!/\btooltip=/.test(tag)) {
      errors.push(`${filePath}: <Input> #${index + 1} is missing tooltip prop.`);
    }
  });

  selectTags.forEach((tag, index) => {
    if (!/\btooltip=/.test(tag)) {
      errors.push(`${filePath}: <Select> #${index + 1} is missing tooltip prop.`);
    }
  });
}

function validateNativeControlCoverage(filePath, content, errors) {
  const controls = content.match(/<(input|select|textarea)\b[^>]*>/g) || [];
  const controlsMissingId = controls.filter((tag) => !/\bid=/.test(tag));
  if (controlsMissingId.length > 0) {
    errors.push(`${filePath}: ${controlsMissingId.length} native control(s) missing id attribute.`);
  }

  const fieldLabelsWithTooltip = content.match(/<FieldLabel[^>]*\btooltip=/g) || [];
  if (fieldLabelsWithTooltip.length !== controls.length) {
    errors.push(
      `${filePath}: native controls (${controls.length}) do not match ` +
        `FieldLabel+tooltip count (${fieldLabelsWithTooltip.length}).`,
    );
  }
}

async function main() {
  await stat(SRC_ROOT);
  const files = await walkFiles(SRC_ROOT);
  const filesWithControls = [];

  for (const absoluteFilePath of files) {
    const content = await readFile(absoluteFilePath, "utf8");
    if (!FORM_CONTROL_REGEX.test(content)) {
      continue;
    }

    const relativePath = normalizePath(path.relative(process.cwd(), absoluteFilePath));
    filesWithControls.push({ path: relativePath, content });
  }

  const errors = [];

  for (const file of filesWithControls) {
    if (PRIMITIVE_FILES.has(file.path)) {
      continue;
    }

    if (EXEMPT_FILES.has(file.path)) {
      continue;
    }

    const isInputSelectFile = INPUT_SELECT_ENFORCED_FILES.has(file.path);
    const isNativeFile = NATIVE_CONTROL_ENFORCED_FILES.has(file.path);

    if (!isInputSelectFile && !isNativeFile) {
      errors.push(`${file.path}: contains form controls but is not tracked in tooltip coverage guardrail lists.`);
      continue;
    }

    if (isInputSelectFile) {
      validateInputSelectCoverage(file.path, file.content, errors);
    }

    if (isNativeFile) {
      validateNativeControlCoverage(file.path, file.content, errors);
    }
  }

  if (errors.length > 0) {
    console.error("[tooltip-coverage] FAILED");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  const trackedFileCount = filesWithControls.filter((file) => !PRIMITIVE_FILES.has(file.path)).length;
  console.log(`[tooltip-coverage] OK: ${trackedFileCount} form-control files verified with tooltip guardrails.`);
}

main().catch((error) => {
  console.error("[tooltip-coverage] FAILED with unexpected error.");
  console.error(error);
  process.exit(1);
});
