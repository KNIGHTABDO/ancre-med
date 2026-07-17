/**
 * Absolute site origin for metadata, sitemap, and OG absolute URLs.
 * Prefer NEXT_PUBLIC_SITE_URL in production (e.g. https://ancre-med.example).
 */
export function resolveSiteOrigin(): string {
  const explicit = process.env["NEXT_PUBLIC_SITE_URL"]?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  const vercel = process.env["VERCEL_URL"]?.trim();
  if (vercel) {
    return `https://${vercel.replace(/^https?:\/\//, "")}`;
  }
  return "http://localhost:3000";
}

export function resolveSiteUrl(): URL {
  return new URL(resolveSiteOrigin());
}
