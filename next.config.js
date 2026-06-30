const envKeys = [
  "QDRANT_CLUSTER_URL",
  "QDRANT_API_KEY",
  "GEMINI_API_KEY"
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
