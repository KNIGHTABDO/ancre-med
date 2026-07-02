const envKeys = [
  "GEMINI_API_KEY",
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "ANCREMED_V2_DEEP_SEARCH",
  "ANCREMED_V2_GATE_SPANS",
  "ANCREMED_V2_FORMULA_BANK",
  "ANCREMED_V2_VERIFIER_FRESHNESS",
  "ANCREMED_V2_QUALITY_POLISH"
];

const env = Object.fromEntries(
  envKeys.map((key) => [key, process.env[key]])
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env
};

module.exports = nextConfig;
