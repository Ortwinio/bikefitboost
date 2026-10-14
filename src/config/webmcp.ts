export const WEBMCP_ORIGIN_TRIAL_TOKENS: readonly string[] = [];
export const WEBMCP_ORIGINS = ["https://bikefitboost.com", "https://www.bikefitboost.com"] as const;

export function decodeOriginTrialToken(token: string): { origin: string; feature: string; expiry: number } {
  const bytes = Uint8Array.from(atob(token), character => character.charCodeAt(0));
  if (bytes.length < 70 || ![2, 3].includes(bytes[0])) throw new Error("Invalid origin trial token");
  const length = new DataView(bytes.buffer).getUint32(65, false);
  if (bytes.length !== 69 + length) throw new Error("Invalid origin trial token length");
  const payload = JSON.parse(new TextDecoder().decode(bytes.slice(69)));
  if (!WEBMCP_ORIGINS.includes(payload.origin) || payload.feature !== "WebMCP" ||
    typeof payload.expiry !== "number" || !Number.isFinite(payload.expiry)) throw new Error("Unexpected origin trial scope");
  return payload;
}

export function originTrialHeader(request: { url: string; method: string; headers: Headers },
  tokens: readonly string[] = WEBMCP_ORIGIN_TRIAL_TOKENS): string | null {
  const url = new URL(request.url);
  if (!["GET", "HEAD"].includes(request.method) || !request.headers.get("accept")?.includes("text/html") ||
    request.headers.has("rsc") || /\.[^/]+$/.test(url.pathname) ||
    /^\/(?:nl\/|en\/)?(?:api|_next|trpc|static)(?:\/|$)/.test(url.pathname)) return null;
  const matching = tokens.filter(token => {
    const payload = decodeOriginTrialToken(token);
    return payload.origin === url.origin && payload.expiry > Date.now() / 1000;
  });
  return matching.length ? matching.join(", ") : null;
}
