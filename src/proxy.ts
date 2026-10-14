import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse, type NextRequest } from "next/server";
import { api } from "../convex/_generated/api";
import { BRAND } from "@/config/brand";
import { originTrialHeader } from "@/config/webmcp";
import { isAdminRole } from "@/components/admin/auth/admin-auth-shared";
import { buildContentSecurityPolicy, createCspNonce, createCspRequestHeaders } from "@/lib/csp";
import {
  LOCALE_COOKIE_NAME,
  LOCALE_HEADER_NAME,
  type Locale,
} from "@/i18n/config";
import { decideProxyAction } from "@/i18n/proxyDecision";
import {
  extractLocaleFromPathname,
  stripLocalePrefix,
  withLocalePrefix,
} from "@/i18n/navigation";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;
const REDIRECT_CACHE_TTL_MS = 60_000;

type RedirectRecord = {
  from: string;
  to: string;
  statusCode: 301 | 302;
};

let redirectCache:
  | {
      expiresAt: number;
      records: Map<string, RedirectRecord>;
    }
  | null = null;

function buildConvexClient(token: string) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Missing NEXT_PUBLIC_CONVEX_URL");
  }

  const client = new ConvexHttpClient(convexUrl);
  client.setAuth(token);
  return client;
}

async function hasAdminSession(token: string) {
  const client = buildConvexClient(token);
  const user = await client.query(api.users.queries.getCurrentUser, {});
  return Boolean(user?.adminRole && isAdminRole(user.adminRole));
}

function setLocaleCookie(response: NextResponse, locale: Locale) {
  response.cookies.set({
    name: LOCALE_COOKIE_NAME,
    value: locale,
    path: "/",
    maxAge: ONE_YEAR_IN_SECONDS,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

function redirectToPath(
  request: NextRequest, pathname: string, permanent = false, statusCode?: 301
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url, statusCode ?? (permanent ? 308 : 307));
}

function normalizeRedirectPath(pathname: string): string {
  const normalized = stripLocalePrefix(pathname).replace(/\/{2,}/g, "/");
  if (!normalized || normalized === "") {
    return "/";
  }

  if (normalized.length > 1 && normalized.endsWith("/")) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

function shouldCheckRedirects(pathname: string, method: string): boolean {
  if (method !== "GET" && method !== "HEAD") {
    return false;
  }

  return !(
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static")
  );
}

async function getRedirectMap(request: NextRequest): Promise<Map<string, RedirectRecord>> {
  const now = Date.now();
  if (redirectCache && redirectCache.expiresAt > now) {
    return redirectCache.records;
  }

  try {
    const redirectSecret = process.env.INTERNAL_REDIRECT_FETCH_SECRET ?? "";
    const response = await fetch(
      new URL("/api/guide-redirects", request.nextUrl.origin),
      {
        headers: {
          "x-bbf-redirect-secret": redirectSecret,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Redirect fetch failed: ${response.status}`);
    }

    const records = (await response.json()) as RedirectRecord[];
    redirectCache = {
      expiresAt: now + REDIRECT_CACHE_TTL_MS,
      records: new Map(
        records.map((record) => [normalizeRedirectPath(record.from), record])
      ),
    };
  } catch {
    redirectCache = {
      expiresAt: now + REDIRECT_CACHE_TTL_MS,
      records: new Map(),
    };
  }

  return redirectCache.records;
}

async function maybeHandleGuideRedirect(
  request: NextRequest
): Promise<NextResponse | null> {
  const rawPathname = request.nextUrl.pathname;
  if (!shouldCheckRedirects(rawPathname, request.method)) {
    return null;
  }

  const lookupPath = normalizeRedirectPath(rawPathname);
  if (!lookupPath.startsWith("/guides/")) {
    return null;
  }

  const redirectMap = await getRedirectMap(request);
  const match = redirectMap.get(lookupPath);
  if (!match) {
    return null;
  }

  const requestLocale = extractLocaleFromPathname(rawPathname);
  const targetPath = requestLocale
    ? withLocalePrefix(normalizeRedirectPath(match.to), requestLocale)
    : normalizeRedirectPath(match.to);

  const url = request.nextUrl.clone();
  url.pathname = targetPath;
  return NextResponse.redirect(url, match.statusCode);
}

function rewriteToLocalizedInternalPath(
  request: NextRequest,
  pathname: string,
  locale: Locale,
  nonce: string
): NextResponse {
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = stripLocalePrefix(pathname);

  const requestHeaders = createCspRequestHeaders(request.headers, nonce);
  requestHeaders.set(LOCALE_HEADER_NAME, locale);

  const response = NextResponse.rewrite(rewriteUrl, {
    request: {
      headers: requestHeaders,
    },
  });

  setLocaleCookie(response, locale);
  return response;
}

function shouldApplyNoIndexHeader(hostname: string): boolean {
  return hostname !== BRAND.host;
}

function applyDeploymentHeaders(
  request: NextRequest,
  response: NextResponse,
  nonce: string
): NextResponse {
  if (shouldApplyNoIndexHeader(request.nextUrl.hostname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  response.headers.set("Content-Security-Policy", buildContentSecurityPolicy(nonce));
  const trialHeader = originTrialHeader(request);
  if (trialHeader && response.status < 300) response.headers.set("Origin-Trial", trialHeader);
  return response;
}

function createNextResponseWithNonce(request: NextRequest, nonce: string) {
  const requestHeaders = createCspRequestHeaders(request.headers, nonce);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

const convexAuthProxy = convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    const nonce = createCspNonce();
    const rawPathname = new URL(request.url).pathname;
    const redirectResponse = await maybeHandleGuideRedirect(request);
    if (redirectResponse) {
      return applyDeploymentHeaders(request, redirectResponse, nonce);
    }

    // Admin paths: protected, non-locale-prefixed — let the (dashboard) layout handle auth
    if (rawPathname.startsWith("/admin")) {
      const token = await convexAuth.getToken();
      if (!token) {
        return applyDeploymentHeaders(request, redirectToPath(request, "/login"), nonce);
      }

      const adminSession = await hasAdminSession(token);
      if (!adminSession) {
        return applyDeploymentHeaders(request, redirectToPath(request, "/dashboard"), nonce);
      }

      return applyDeploymentHeaders(request, createNextResponseWithNonce(request, nonce), nonce);
    }

    const isAuthenticated = await convexAuth.isAuthenticated();
    const decision = decideProxyAction({
      pathname: rawPathname,
      cookieLocale: request.cookies.get(LOCALE_COOKIE_NAME)?.value,
      acceptLanguageHeader: request.headers.get("accept-language"),
      isAuthenticated,
    });

    if (decision.type === "bypass") {
      return applyDeploymentHeaders(request, createNextResponseWithNonce(request, nonce), nonce);
    }

    if (decision.type === "redirect" || decision.type === "auth_redirect") {
      if (decision.pathname === rawPathname) {
        const locale = extractLocaleFromPathname(rawPathname) ?? decision.locale;
        const response = rewriteToLocalizedInternalPath(request, rawPathname, locale, nonce);
        return applyDeploymentHeaders(request, response, nonce);
      }

      const response = redirectToPath(
        request, decision.pathname, decision.type === "redirect" && decision.permanent,
        decision.type === "redirect" ? decision.statusCode : undefined,
      );
      setLocaleCookie(response, decision.locale);
      return applyDeploymentHeaders(request, response, nonce);
    }

    const response = rewriteToLocalizedInternalPath(
      request,
      decision.pathname,
      decision.locale,
      nonce
    );
    return applyDeploymentHeaders(request, response, nonce);
  }
);

export function proxy(...args: Parameters<typeof convexAuthProxy>) {
  const [request] = args;
  if (/^\/api\/auth\/(signin|callback)(?:\/|$)/.test(request.nextUrl.pathname)) {
    const nonce = createCspNonce();
    return applyDeploymentHeaders(request, createNextResponseWithNonce(request, nonce), nonce);
  }

  return convexAuthProxy(...args);
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
