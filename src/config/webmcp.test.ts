import { describe, expect, it } from "vitest";
import { decodeOriginTrialToken, originTrialHeader, WEBMCP_ORIGIN_TRIAL_TOKENS } from "./webmcp";

function fixture(origin = "https://bikefitboost.com", feature = "WebMCP", expiry = 2_000_000_000) {
  const payload = Buffer.from(JSON.stringify({ origin, feature, expiry }));
  const bytes = Buffer.alloc(69 + payload.length);
  bytes[0] = 3;
  bytes.writeUInt32BE(payload.length, 65);
  payload.copy(bytes, 69);
  return bytes.toString("base64");
}
describe("origin trial configuration", () => {
  it("accepts only decodable configured WebMCP tokens for the two owned origins", () => {
    for (const token of WEBMCP_ORIGIN_TRIAL_TOKENS) {
      expect(decodeOriginTrialToken(token).expiry).toBeGreaterThan(Date.now() / 1000);
    }
    expect(decodeOriginTrialToken(fixture()).origin).toBe("https://bikefitboost.com");
    expect(() => decodeOriginTrialToken("invalid")).toThrow();
    expect(() => decodeOriginTrialToken(fixture("https://other.invalid"))).toThrow();
    expect(() => decodeOriginTrialToken(fixture(undefined, "OtherFeature"))).toThrow();
  });
  it("sends applicable tokens only on HTML document requests", () => {
    const token = fixture();
    const request = { url: "https://bikefitboost.com/nl/calculators", method: "GET", headers: new Headers({ accept: "text/html" }) };
    expect(originTrialHeader(request, [token])).toBe(token);
    for (const path of ["/api/data", "/nl/api/data", "/_next/static/a", "/logo.svg", "/site.webmanifest"]) {
      expect(originTrialHeader({ ...request, url: `https://bikefitboost.com${path}` }, [token])).toBeNull();
    }
    expect(originTrialHeader({ ...request, method: "POST" }, [token])).toBeNull();
    expect(originTrialHeader({ ...request, headers: new Headers({ accept: "text/x-component" }) }, [token])).toBeNull();
    expect(originTrialHeader({ ...request, headers: new Headers({ accept: "text/html", rsc: "1" }) }, [token])).toBeNull();
    expect(originTrialHeader({ ...request, url: "https://preview.invalid/nl" }, [token])).toBeNull();
    expect(originTrialHeader(request, [fixture(undefined, undefined, 1)])).toBeNull();
    expect(originTrialHeader(request)).toBeNull();
  });
});
