import { createRoot } from "react-dom/client";
import { WebMcpDetect } from "@/lib/webmcp/detect";
import { installFakeModelContext } from "@/lib/webmcp/testing";
import { PublicBodyReliabilityCalculator } from "@/components/reliability/PublicBodyReliabilityCalculator";

window.__queryCalls = [];
window.__signedIn = window.location.pathname.endsWith("/dashboard");
if (!new URLSearchParams(location.search).has("unsupported")) {
  const fake = installFakeModelContext();
  window.__webmcp = {
    names: () => [...fake.tools.keys()],
    call: fake.call,
    annotations: name => fake.tools.get(name)?.annotations,
  };
}
createRoot(document.getElementById("root")).render(<>
  <WebMcpDetect />
  {window.__signedIn ? <h1>Local dashboard read fixture</h1> :
    <PublicBodyReliabilityCalculator calculator="frame-size" locale={location.pathname.startsWith("/nl/") ? "nl" : "en"} />}
</>);
