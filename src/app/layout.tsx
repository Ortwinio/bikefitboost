import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree, DM_Mono } from "next/font/google";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { headers } from "next/headers";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { BRAND } from "@/config/brand";
import { ANALYTICS_CONFIG } from "@/config/analytics";
import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/request";
import { getSiteMetadataCopy } from "@/i18n/marketing/siteMetadata";
import { CookieConsentBanner } from "@/components/layout/CookieConsentBanner";
import { GTMConsentLoader } from "@/components/analytics/GTMConsentLoader";
import { FeedbackPanelProvider } from "@/components/feedback/FeedbackPanelProvider";
import { ToastProvider } from "@/components/prototyper-ui/ui/toast";
import { Analytics } from "@vercel/analytics/next";
import { TemplateSpeedInsights } from "@/components/analytics/TemplateSpeedInsights";
import { NONCE_HEADER_NAME } from "@/lib/csp";
import { buildOrganizationSchema, buildWebSiteSchema } from "@/lib/seo/jsonLd";
import { pressureDisplayStyles } from "../../shared/pressure/display";
import { WebMcpDetect } from "@/lib/webmcp/detect";

const displayFont = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});
const bodyFont = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});
const monoFont = DM_Mono({
  subsets: ["latin"],
  weight: "500",
  variable: "--font-mono",
  display: "swap",
});

const baseMetadata: Metadata = {
  metadataBase: new URL(BRAND.siteUrl),
  applicationName: BRAND.name,
  title: BRAND.name,
  openGraph: {
    siteName: BRAND.name,
    images: [{ url: BRAND.assets.socialImage, width: 1200, height: 630, alt: BRAND.name }],
  },
  twitter: {
    card: "summary_large_image",
    images: [BRAND.assets.socialImage],
  },
  appleWebApp: {
    capable: true,
    title: BRAND.name,
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      {
        url: BRAND.assets.favicon,
        sizes: "48x48",
        type: "image/x-icon",
      },
      {
        url: BRAND.assets.appIconSvg,
        type: "image/svg+xml",
      },
      {
        url: BRAND.assets.appIconPng,
        sizes: "512x512",
        type: "image/png",
      },
    ],
    shortcut: [
      {
        url: BRAND.assets.favicon,
        sizes: "16x16 32x32 48x48",
        type: "image/x-icon",
      },
    ],
    apple: [
      {
        url: BRAND.assets.appleTouchIcon,
        sizes: "180x180",
        type: "image/png",
      },
    ],
    other: [
      {
        rel: "mask-icon",
        url: BRAND.assets.appIconSvg,
        color: "#0F2420",
      },
    ],
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const { description } = getSiteMetadataCopy(locale);
  return {
    ...baseMetadata,
    description,
    manifest: "/site.webmanifest",
    openGraph: { ...baseMetadata.openGraph, description, locale: locale === "nl" ? "nl_NL" : "en_US" },
    twitter: { ...baseMetadata.twitter, description },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0F2420" },
    { media: "(prefers-color-scheme: dark)", color: "#0F2420" },
  ],
};

const oauthBeforeUnloadGuard = `
window.__bbfSuppressBeforeUnload = false;
window.addEventListener("beforeunload", function(event) {
  if (window.__bbfSuppressBeforeUnload === true) {
    event.stopImmediatePropagation();
    delete event.returnValue;
    return undefined;
  }
}, true);
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();
  const dictionary = await getDictionary(locale);
  const nonce = (await headers()).get(NONCE_HEADER_NAME) ?? undefined;
  const siteSchemas = [
    buildOrganizationSchema(),
    buildWebSiteSchema({
      description: getSiteMetadataCopy(locale).description,
      inLanguage: locale,
    }),
  ];

  return (
    <ConvexAuthNextjsServerProvider>
      <html
        lang={locale}
        className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}
        suppressHydrationWarning
      >
        <head>
          <style id="pressure-display-styles" nonce={nonce}>{pressureDisplayStyles}</style>
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `try{var t=localStorage.getItem('theme')||'system';if(t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}`,
            }}
          />
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{ __html: oauthBeforeUnloadGuard }}
          />
          <script
            nonce={nonce}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchemas) }}
          />
        </head>
        <body className="relative bg-background font-sans text-foreground antialiased">
          <a
            href="#main-content"
            className="skip-link absolute left-4 top-3 z-[100] inline-flex min-h-11 min-w-11 items-center rounded-md border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-sm font-medium text-[color:var(--foreground)] shadow"
          >
            {dictionary.common.skipToContent}
          </a>
          <GTMConsentLoader gtmId={ANALYTICS_CONFIG.gtmId} nonce={nonce} />
          <ToastProvider>
            <ConvexClientProvider>
              <WebMcpDetect />
              <FeedbackPanelProvider>{children}</FeedbackPanelProvider>
            </ConvexClientProvider>
            <CookieConsentBanner locale={locale} />
          </ToastProvider>
          <Analytics />
          <TemplateSpeedInsights />
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
