export const FEATURE_FLAG_ENV = {
  deepSearch: "ANCREMED_V2_DEEP_SEARCH",
  gateSpans: "ANCREMED_V2_GATE_SPANS",
  formulaBank: "ANCREMED_V2_FORMULA_BANK",
  verifierFreshness: "ANCREMED_V2_VERIFIER_FRESHNESS",
  qualityPolish: "ANCREMED_V2_QUALITY_POLISH",
} as const;

export type FeatureFlagName = keyof typeof FEATURE_FLAG_ENV;

const ENABLED_VALUES = new Set(["1", "true", "yes", "on", "enabled"]);

export function isFeatureEnabled(flag: FeatureFlagName): boolean {
  const value = process.env[FEATURE_FLAG_ENV[flag]];
  return typeof value === "string" && ENABLED_VALUES.has(value.trim().toLowerCase());
}

export function featureFlagSnapshot(): Record<FeatureFlagName, boolean> {
  return {
    deepSearch: isFeatureEnabled("deepSearch"),
    gateSpans: isFeatureEnabled("gateSpans"),
    formulaBank: isFeatureEnabled("formulaBank"),
    verifierFreshness: isFeatureEnabled("verifierFreshness"),
    qualityPolish: isFeatureEnabled("qualityPolish"),
  };
}
