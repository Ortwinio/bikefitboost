"use client";

import { clearHandoff } from "@/lib/handoff/store";
import { clearNewsletterSignupIntent } from "@/lib/newsletter/signupIntent";

import { SettingsNameField, SettingsUnitsField } from "./SettingsAutosaveFields";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Card,
  CardContent,
  Button,
  AccessibleDialog,
  ErrorState,
  Input,
  SectionHeader,
  LoadingState,
} from "@/components/ui";
import { toolsSettings } from "@/i18n/account/toolsSettings";
import { emailPreferencesCopy } from "@/i18n/account/emailPreferences";
import { IPhoneAppInstallCard } from "@/components/settings/IPhoneAppInstallCard";
import { AgentToolsSettings } from "@/components/settings/AgentToolsSettings";
import { LanguageSwitch } from "@/components/layout/LanguageSwitch";
import { ProfilePhotoUpload } from "@/components/profile/ProfilePhotoUpload";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { reportClientError } from "@/lib/telemetry";
import { localizeAccountError } from "@/i18n/account/clientErrors";
import { getSettingsLanguage } from "@/i18n/account/settingsLanguage";
import { getEffectiveDisplayName, getEffectiveProfileImageSource } from "@/lib/userIdentity";
import { withLocalePrefix } from "@/i18n/navigation";
import { useDashboardMessages } from "@/i18n/useDashboardMessages";
import { SubscriptionOverviewConnected } from "@/components/account/SubscriptionOverviewConnected";
import {
  Trash2,
  User,
  Palette,
  Shield,
} from "lucide-react";

function linkButtonProps(href: string) {
  return {
    render: <Link href={href} />,
    nativeButton: false as const,
  };
}

export default function SettingsPage() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const { locale, messages: baseMessages, languageSwitchLabels } = useDashboardMessages();
  const messages = useMemo(() => getSettingsLanguage(baseMessages, locale), [baseMessages, locale]);
  const copy = toolsSettings[locale];
  const user = useQuery(api.users.queries.getCurrentUser);
  const deleteAccount = useMutation(api.users.mutations.deleteAccount);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const effectiveDisplayName = getEffectiveDisplayName(user, messages.userMenu.fallbackUserName);
  const profileImageSource = getEffectiveProfileImageSource(user);
  const storedDisplayName =
    user && "displayName" in user && typeof user.displayName === "string" ? user.displayName : "";
  const editableDisplayName =
    storedDisplayName ||
    (effectiveDisplayName === messages.userMenu.fallbackUserName ? "" : effectiveDisplayName);


  const handleDeleteAccount = async () => {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteAccount({});
      router.push(withLocalePrefix("/", locale));
    } catch (error) {
      setDeleteError(
        localizeAccountError(reportClientError(error, {
          area: "settings",
          action: "deleteAccount",
          operationType: "mutation",
          userMessage: messages.profile.dangerZone.deleteFailed,
        }), locale),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (user === undefined) return <LoadingState label={copy.loading} />;
  if (user === null)
    return (
      <div className="space-y-4 rounded-3xl border border-border bg-card p-6">
        <p>{copy.missing}</p>
        <Button {...linkButtonProps(withLocalePrefix("/login", locale))}>{copy.login}</Button>
      </div>
    );

  return (
    <div
      className={
        "mx-auto max-w-6xl space-y-7 text-foreground [&_h2]:font-display [&_h2]:text-2xl " +
        "[&_div.border]:border-border [&_.border-b]:border-border " +
        "[&_[data-slot=card]]:border-border"
      }
    >
      <header className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">{copy.eyebrow}</p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">{copy.title}</h1>
        <p className="text-muted-foreground">{copy.subtitle}</p>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="min-w-0 space-y-6">
          <Card variant="bordered" className="rounded-3xl border-border bg-card shadow-none">
            <SectionHeader
              icon={<User className="h-5 w-5 text-primary" />}
              title={messages.settings.account.title}
            />
            <CardContent className="space-y-4">
              <div className="bg-muted/40 flex items-center gap-4 rounded-2xl border border-border p-4">
                <ProfilePhotoUpload source={profileImageSource} size="settings" />
                <div>
                  <p className="font-semibold text-foreground">
                    {effectiveDisplayName}
                  </p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <SettingsNameField key={user?._id} initialValue={editableDisplayName} />
              <Button variant="link" {...linkButtonProps(withLocalePrefix("/email-preferences", locale))}>
                {emailPreferencesCopy[locale].title}
              </Button>
              <Button
                variant="link"
                onClick={async () => {
                  clearHandoff();
                  clearNewsletterSignupIntent();
                  await signOut();
                  router.push(withLocalePrefix("/", locale));
                }}
                className="w-full justify-start bg-transparent hover:bg-muted"
              >
                {messages.common.signOut}
              </Button>
            </CardContent>
          </Card>
          <SubscriptionOverviewConnected locale={locale} />
          <IPhoneAppInstallCard />
        </div>
        <div className="min-w-0 space-y-6">
          <Card variant="bordered" className="rounded-3xl border-border bg-card shadow-none">
            <SectionHeader
              icon={<Palette className="h-5 w-5 text-primary" />}
              title={messages.settings.preferences.title}
            />
            <CardContent className="space-y-5">
              <AgentToolsSettings key={user._id} locale={locale} enabled={user.agentToolsEnabled} />
              <div className="bg-muted/40 rounded-2xl border border-border p-4">
                <p className="mb-2 text-sm font-medium text-foreground">
                  {messages.settings.preferences.language}
                </p>
                <LanguageSwitch locale={locale} labels={languageSwitchLabels} />
              </div>
              <div className="bg-muted/40 rounded-2xl border border-border p-4">
                <p className="mb-2 text-sm font-medium text-foreground">
                  {messages.settings.preferences.appearance}
                </p>
                <div className="[&_[data-slot=segmented-control]]:flex [&_[data-slot=segmented-control]]:flex-wrap">
                  <ThemeToggle
                    showSaveStatus
                    locale={locale}
                    ariaLabel={messages.settings.preferences.appearance}
                    labels={{
                      light: messages.settings.preferences.light,
                      dark: messages.settings.preferences.dark,
                      system: messages.settings.preferences.system,
                    }}
                  />
                </div>
              </div>
              <div className="bg-muted/40 rounded-2xl border border-border p-4">
                <p className="mb-2 text-sm font-medium text-foreground">
                  {messages.settings.preferences.units}
                </p>
                <SettingsUnitsField key={user?._id} initialValue={user?.unit_preference ?? "metric"} />
              </div>
            </CardContent>
          </Card>
          <Card variant="bordered" className="rounded-3xl border-border bg-card shadow-none">
            <SectionHeader
              icon={<Shield className="h-5 w-5 text-primary" />}
              title={messages.settings.privacy.title}
            />
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>{messages.settings.privacy.description}</p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="link"
                  {...linkButtonProps(withLocalePrefix("/privacy", locale))}
                  className="whitespace-normal px-3 text-primary"
                >
                  {messages.settings.privacy.privacyPolicy}
                </Button>
                <Button
                  variant="link"
                  {...linkButtonProps(withLocalePrefix("/terms", locale))}
                  className="whitespace-normal px-3 text-primary"
                >
                  {messages.settings.privacy.terms}
                </Button>
                <Button
                  variant="link"
                  {...linkButtonProps(withLocalePrefix("/profile", locale))}
                  className="whitespace-normal px-3 text-primary"
                >
                  {messages.settings.privacy.manageProfile}
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card
            variant="bordered"
            className="dashboard-card-surface border-[color:color-mix(in_oklch,var(--destructive)_28%,var(--border))]"
          >
            <SectionHeader
              icon={<Trash2 className="h-5 w-5 text-[color:var(--destructive)]" />}
              title={messages.profile.dangerZone.title}
            />
            <CardContent className="space-y-4">
              {deleteError ? <ErrorState title={locale === "nl" ? copy.errorTitle : undefined}
                description={deleteError} /> : null}
              <p className="text-sm text-muted-foreground">
                {messages.profile.dangerZone.deleteConfirmDescription}
              </p>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                className={
                  "border-[color:var(--destructive)] text-[color:var(--destructive)] " +
                  "hover:bg-[color:color-mix(in_oklch,var(--destructive)_10%,var(--card)_90%)]"
                }
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {messages.profile.dangerZone.deleteAccount}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <AccessibleDialog
        open={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setDeleteConfirmInput("");
        }}
        title={messages.profile.dangerZone.deleteConfirmTitle}
        description={messages.profile.dangerZone.deleteConfirmDescription}
      >
        <div className="mt-4 space-y-4">
          <Input
            label={messages.profile.dangerZone.deleteConfirmInputLabel}
            placeholder={messages.profile.dangerZone.deleteConfirmInputPlaceholder}
            value={deleteConfirmInput}
            onChange={(e) => setDeleteConfirmInput(e.target.value)}
            autoComplete="off"
          />
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteConfirmInput("");
              }}
            >
              {messages.profile.dangerZone.cancel}
            </Button>
            <Button
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteConfirmInput("");
                void handleDeleteAccount();
              }}
              isLoading={isDeleting}
              variant="destructive"
              disabled={deleteConfirmInput !== messages.profile.dangerZone.deleteConfirmWord}
            >
              {messages.profile.dangerZone.deleteConfirmCta}
            </Button>
          </div>
        </div>
      </AccessibleDialog>
    </div>
  );
}
