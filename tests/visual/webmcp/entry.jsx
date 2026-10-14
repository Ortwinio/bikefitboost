import { createRoot } from "react-dom/client";
import Dashboard from "@/app/(dashboard)/dashboard/page";
import { WebMcpDetect } from "@/lib/webmcp/detect";
import { installFakeModelContext } from "@/lib/webmcp/testing";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";

window.__webmcp = installFakeModelContext();
document.documentElement.lang = location.pathname.startsWith("/en/") ? "en" : "nl";
createRoot(document.getElementById("root")).render(<ThemeProvider><ToastProvider>
  <WebMcpDetect /><main id="main-content"><Dashboard /></main>
</ToastProvider></ThemeProvider>);
