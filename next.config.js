const envKeys = [
  "GEMINI_API_KEY",
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN"
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
