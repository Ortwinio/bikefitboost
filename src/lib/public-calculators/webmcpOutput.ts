import type { Locale } from "@/i18n/config";
import { withLocalePrefix } from "@/i18n/navigation";
import { SITE_ORIGIN } from "../../../shared/brand";
import type { ReliabilityRange } from "../../../shared/reliability/calculators";

export function calculatorUrl(path: string, locale: Locale) {
  return `${SITE_ORIGIN}${withLocalePrefix(path, locale)}`;
}

export function displayNumber(value: number) {
  return Number(new Intl.NumberFormat("en", { maximumFractionDigits: 1, useGrouping: false }).format(value));
}

export function resultRange(range: ReliabilityRange | null, unit: string, labels?: string[]) {
  if (!range) return null;
  if (range.kind === "size") {
    const options = labels ?? range.options;
    return {
      value: options[range.options.indexOf(range.value)] ?? range.value,
      unit,
      options: range.eligibleIndices.map(index => options[index]),
    };
  }
  return {
    value: displayNumber(range.value), unit, lower: displayNumber(range.lower),
    upper: displayNumber(range.upper), halfWidth: displayNumber(range.halfWidth),
  };
}
