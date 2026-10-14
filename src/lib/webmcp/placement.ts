import { stripLocalePrefix } from "@/i18n/navigation";
import type { Placement } from "./types";

const staticSiblings: Record<string, readonly string[]> = {
  "/bikes": ["new", "compare-fit", "import"],
  "/fit": ["how-it-works"],
};

export function onRoutes(...routes: string[]): Placement { return { routes }; }

export function isAllowedPage(pathname: string): boolean {
  const path = stripLocalePrefix(pathname);
  return path.startsWith("/") && !/[?#\\.%]/.test(path) && !path.includes("//") &&
    !/^\/(admin|api|_next|login|checkout|gifts|email-preferences|unsubscribe|auth)(\/|$)/.test(path);
}

export function matchesPlacement(placement: Placement | undefined, pathname: string): boolean {
  if (!placement || !isAllowedPage(pathname)) return false;
  if (placement === "global") return true;
  const path = stripLocalePrefix(pathname).replace(/\/$/, "") || "/";
  return placement.routes.some(route => {
    const pattern = typeof route === "string" ? route : route.path;
    const segments = pattern.split("/");
    const actual = path.split("/");
    const prefix = typeof route !== "string" && route.prefix;
    if (prefix ? actual.length < segments.length : actual.length !== segments.length) return false;
    return segments.every((segment, index) => /^\[[a-zA-Z]+\]$/.test(segment)
      ? Boolean(actual[index]) && !staticSiblings[actual.slice(0, index).join("/")]?.includes(actual[index])
      : segment === actual[index]);
  });
}
