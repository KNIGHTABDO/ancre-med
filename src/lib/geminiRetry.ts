/**
 * Retry wrapper for Gemini API calls.
 *
 * Retries transient failures — 503 UNAVAILABLE (model overloaded), 429
 * RESOURCE_EXHAUSTED (per-minute rate limit), 500 INTERNAL — with exponential
 * backoff and jitter. Honors an explicit "Please retry in Xs" / retryDelay
 * hint from the API when present. Non-transient errors are rethrown
 * immediately.
 */

const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 800;
const MAX_DELAY_MS = 10_000;

const TRANSIENT_MARKERS = [
  '"code":503',
  '"code": 503',
  "UNAVAILABLE",
  "high demand",
  "overloaded",
  '"code":429',
  '"code": 429',
  "RESOURCE_EXHAUSTED",
  '"code":500',
  '"code": 500',
  "INTERNAL",
  "fetch failed",
  "ECONNRESET",
  "ETIMEDOUT",
] as const;

function isTransientError(error: unknown): boolean {
  const text = error instanceof Error ? `${error.message} ${String(error)}` : String(error);
  return TRANSIENT_MARKERS.some((marker) => text.includes(marker));
}

function hintedDelayMs(error: unknown): number | null {
  const text = error instanceof Error ? error.message : String(error);
  const retryIn = text.match(/retry in ([\d.]+)s/i);
  if (retryIn?.[1]) {
    return Math.min(Math.ceil(parseFloat(retryIn[1]) * 1000), MAX_DELAY_MS);
  }
  const retryDelay = text.match(/"retryDelay"\s*:\s*"(\d+)s"/);
  if (retryDelay?.[1]) {
    return Math.min(parseInt(retryDelay[1], 10) * 1000, MAX_DELAY_MS);
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withGeminiRetry<T>(
  operation: () => Promise<T>,
  label = "gemini",
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS || !isTransientError(error)) {
        throw error;
      }
      const backoff = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS);
      const jitter = Math.random() * 300;
      const delay = hintedDelayMs(error) ?? backoff + jitter;
      console.warn(
        `[${label}] transient Gemini error (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${Math.round(delay)}ms`,
      );
      await sleep(delay);
    }
  }
  throw lastError;
}
