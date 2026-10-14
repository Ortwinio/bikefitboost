import { switchLocalePathname, stripLocalePrefix } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";

export const destinations = [
  { id: "home", path: "/", label: "Home", account: false },
  ...["frame-size", "saddle-height", "saddle-width", "crank-length", "gearing", "climb-planner",
    "power-speed", "ftp-wkg", "fuel-hydration", "bike-fit"].map(id =>
    ({ id, path: `/calculators/${id}`, label: id.replaceAll("-", " "), account: false })),
  { id: "tire-pressure", path: "/tire-pressure-calculator", label: "Tire pressure", account: false },
  { id: "dashboard", path: "/dashboard", label: "Dashboard", account: true },
  { id: "bikes", path: "/bikes", label: "Your bikes", account: true },
  { id: "new-bike", path: "/bikes/new", label: "New bike form", account: true },
  { id: "fit", path: "/fit", label: "Start fit form", account: true },
  { id: "profile", path: "/profile", label: "Rider profile", account: true },
  { id: "settings", path: "/settings", label: "Settings", account: true },
] as const;

export function availableDestinations(signedIn: boolean, locale: Locale) {
  return destinations.filter(destination => signedIn || !destination.account)
    .map(destination => ({ id: destination.id, label: destination.label, path: switchLocalePathname(destination.path, locale) }));
}

export function isSafeNavigation(path: string, signedIn: boolean, locale: Locale): boolean {
  if (/[?#\\.%]/.test(path) || path.includes("//")) return false;
  if (availableDestinations(signedIn, locale).some(destination => destination.path === path)) return true;
  return signedIn && path.startsWith(`/${locale}/`) &&
    /^\/bikes\/[a-zA-Z0-9_-]+(?:\/edit)?$/.test(stripLocalePrefix(path));
}
