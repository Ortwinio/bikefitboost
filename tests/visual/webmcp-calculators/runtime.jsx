import { useSyncExternalStore } from "react";
import { getFunctionName } from "convex/server";

const user = { _id: "browser-fixture", agentToolsEnabled: true };
const subscribe = callback => {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
};
export const usePathname = () => useSyncExternalStore(subscribe, () => window.location.pathname);
export const useSearchParams = () => new URLSearchParams(window.location.search);
const router = { push(path) { history.pushState({}, "", path); window.dispatchEvent(new PopStateEvent("popstate")); } };
export const useRouter = () => router;
export const useConvexAuth = () => ({ isAuthenticated: window.__signedIn, isLoading: false });
export const useQuery = (_reference, args) => args === "skip" ? undefined : user;
const convex = { query: async (reference) => {
  const name = getFunctionName(reference);
  window.__queryCalls.push(name);
  if (name === "users/queries:getCurrentUser") return user;
  if (name === "profiles/queries:getMyProfile") return { heightCm: 178, inseamCm: 83, weightKg: 75 };
  throw new Error(`Unexpected local fixture query: ${name}`);
} };
export const useConvex = () => convex;
export const useMutation = () => () => { throw new Error("Mutations are forbidden in this fixture"); };
