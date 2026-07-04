import { ServiceTier } from "@google/genai";

/**
 * Optional Gemini inference tier, applied to every model call.
 *
 * Set GEMINI_SERVICE_TIER in .env to one of: "standard" | "flex" | "priority".
 * - flex: paid-only tier at reduced cost (available from Tier 1) — also a
 *   pragmatic workaround when a paid project keeps being billed against the
 *   free-tier quota bucket.
 * - priority: premium latency/reliability, requires Tier 2/3.
 * Unset or invalid values fall back to the default (standard) tier.
 */
const VALID_TIERS: Record<string, ServiceTier> = {
  standard: ServiceTier.STANDARD,
  flex: ServiceTier.FLEX,
  priority: ServiceTier.PRIORITY,
};

export function serviceTierConfig(): { serviceTier?: ServiceTier } {
  const raw = process.env["GEMINI_SERVICE_TIER"]?.trim().toLowerCase();
  if (!raw) {
    return {};
  }
  const tier = VALID_TIERS[raw];
  if (tier === undefined) {
    console.warn(
      `Ignoring invalid GEMINI_SERVICE_TIER="${raw}" (expected standard | flex | priority).`,
    );
    return {};
  }
  return { serviceTier: tier };
}
