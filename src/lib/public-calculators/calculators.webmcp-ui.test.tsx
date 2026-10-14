// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PublicBodyReliabilityCalculator } from "@/components/reliability/PublicBodyReliabilityCalculator";
import { PublicSaddleHeightCalculator } from "@/app/(public)/calculators/saddle-height/PublicSaddleHeightCalculator";
import { PerformanceReliabilityResults } from "@/app/(public)/calculators/power-speed/PerformanceReliabilityResults";
import { performanceInputRanges } from "@/app/(public)/calculators/power-speed/usePerformanceInputs";
import { PressureCalculatorForm } from "@/components/features/pressure/PressureCalculatorForm";
import bodyPack from "@/components/reliability/body.webmcp";
import { saddleHeightTool } from "@/app/(public)/calculators/saddle-height/saddle.webmcp";
import performancePack from "@/app/(public)/calculators/power-speed/performance.webmcp";
import { tirePressureTool } from "@/components/features/pressure/pressure.webmcp";
import { writeHandoffEntry } from "@/lib/handoff/store";
import { runTestTool } from "@/lib/webmcp/testing";
import nl from "@/i18n/messages/nl";
import en from "@/i18n/messages/en";

afterEach(() => { cleanup(); sessionStorage.clear(); localStorage.clear(); });

function seed() {
  writeHandoffEntry({ field: "heightCm", value: 190, unit: "cm", calculator: "saddle-height",
    method: "declared", touchedAt: Date.now() });
  writeHandoffEntry({ field: "inseamCm", value: 89, unit: "cm", calculator: "saddle-height",
    method: "measured", touchedAt: Date.now() });
}

function expectRows(container: HTMLElement, results: Record<string, { value: number | string }>, locale: "nl" | "en") {
  for (const [metric, row] of Object.entries(results)) {
    const text = typeof row.value === "number" ? new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
      .format(row.value) : row.value;
    expect(container.querySelector(`[data-reliability-result="${metric}"] [data-usability="result-value"]`)
      ?.textContent).toContain(text);
  }
}

describe.each(["nl", "en"] as const)("WebMCP parity with rendered %s public UI", locale => {
  it.each(["bike-fit", "frame-size", "crank-length", "saddle-width"] as const)("%s rendered values", async calculator => {
    seed();
    const { container } = render(<PublicBodyReliabilityCalculator calculator={calculator} locale={locale} />);
    const name = `calc_${calculator.replaceAll("-", "_")}`;
    const input = calculator === "saddle-width" ? { heightCm: 190, weightKg: 94, hipCircumferenceCm: 100 }
      : { heightCm: 190, inseamCm: 89 };
    const result = await runTestTool(bodyPack.tools.find(tool => tool.name === name)!, input, { locale });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { results: Record<string, { value: number }>; saddleWidth: { value: number } };
    expectRows(container, calculator === "saddle-width" ? { saddleWidth: data.saddleWidth } : data.results, locale);
  });

  it("saddle height matches the actual public result", async () => {
    seed();
    const { container } = render(<PublicSaddleHeightCalculator isNl={locale === "nl"} />);
    const result = await runTestTool(saddleHeightTool, { heightCm: 190, inseamCm: 89 }, { locale });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { saddleHeight: { value: number; lower: number; upper: number } };
    expect(container.textContent).toContain(String(data.saddleHeight.value));
    expect(container.textContent).toContain(String(data.saddleHeight.lower));
    expect(container.textContent).toContain(String(data.saddleHeight.upper));
  });

  it.each([
    ["power-speed", "speed", { mode: "power", powerWatts: 220, weightKg: 75 }],
    ["climb-planner", "climbTime", { distanceKm: 12, gradientPercent: 7, ftpWatts: 225, weightKg: 75 }],
    ["gearing", "cadence", { innerChainringTeeth: 34, cassetteLargestCogTeeth: 32, gradientPercent: 7,
      weightKg: 75, ftpWatts: 225 }],
    ["fuel-hydration", "hydration", { durationMinutes: 180, intensity: "endurance", temperatureC: 20 }],
    ["ftp-wkg", "ftpPower", { method: "twentyMinute", watts: 290, weightKg: 75 }],
  ] as const)("%s current rendered result", async (tool, metric, input) => {
    const { container } = render(<PerformanceReliabilityResults tool={tool} locale={locale} mode="power"
      method="twentyMinute" bike="road" intensity="endurance" has={() => true}
      number={field => performanceInputRanges[field].defaultValue} />);
    const result = await runTestTool(performancePack.tools.find(item => item.name === `calc_${tool.replaceAll("-", "_")}`)!,
      input, { locale });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as Record<string, { value: number }>;
    const property = metric === "hydration" ? "fluidLoss" : metric === "ftpPower" ? "ftp" : metric;
    expectRows(container, { [metric]: data[property] }, locale);
    if (tool === "ftp-wkg") expectRows(container, { ftpWkg: data.wattsPerKg }, locale);
  });

  it("pressure display matches bar and psi without invented safety range", async () => {
    const copy = locale === "nl" ? nl : en;
    const input = { discipline: "road" as const, bodyWeightKg: 75, widthFrontMm: 28, widthRearMm: 28,
      tubeType: "tubeless" as const, surface: "average_asphalt" as const };
    const { container } = render(<PressureCalculatorForm locale={locale} initialValues={input}
      labels={copy.pressure.form} resultLabels={copy.pressure.result} />);
    const result = await runTestTool(tirePressureTool, input, { locale });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { frontBar: number; rearBar: number; frontPsi: number; rearPsi: number };
    const format = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    for (const side of ["front", "rear"] as const) {
      const wheel = container.querySelector(`.pressure-wheel-${side}`)!;
      expect(wheel.textContent).toContain(format.format(data[`${side}Bar`]));
      expect(wheel.textContent).toContain(`${data[`${side}Psi`]} psi`);
    }
  });
});
