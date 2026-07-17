/**
 * Generates favicon, PWA icons, and Open Graph share images from the
 * AncreMed logo mark (same geometry as src/components/Logo.tsx).
 *
 * Usage: node scripts/generate-brand-assets.mjs
 * Requires: sharp, to-ico (dev/one-shot).
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import toIco from "to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");
const iconsDir = path.join(publicDir, "icons");

/* Liquid-glass tokens (match src/app/globals.css) */
const ACCENT = "#0e8074";
const ACCENT_INK = "#ffffff";
const BG = "#f7f5f0";
const INK = "#1c1b17";
const INK_SECONDARY = "#57534a";
const BORDER = "rgba(31, 30, 26, 0.12)";
const ACCENT_SOFT = "rgba(14, 128, 116, 0.12)";

/** Logo mark paths — mirrors LogoMark in src/components/Logo.tsx */
function logoMarkSvg({ size, stroke, strokeWidth = 1.75 }) {
  const scale = size / 24;
  return `
    <g
      transform="scale(${scale})"
      fill="none"
      stroke="${stroke}"
      stroke-width="${strokeWidth}"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="5" r="2.5" />
      <path d="M12 7.5v13" />
      <path d="M8.5 10h7" />
      <path d="M4.5 14.5a7.5 7.5 0 0 0 15 0" />
    </g>
  `;
}

/** App icon: rounded square teal plate + cream logo */
function appIconSvg(size, radiusRatio = 0.22) {
  const r = Math.round(size * radiusRatio);
  const markSize = Math.round(size * 0.58);
  const offset = Math.round((size - markSize) / 2);
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none">
      <rect width="${size}" height="${size}" rx="${r}" fill="${ACCENT}" />
      <g transform="translate(${offset} ${offset})">
        ${logoMarkSvg({ size: markSize, stroke: ACCENT_INK, strokeWidth: 1.85 })}
      </g>
    </svg>
  `);
}

/** Maskable icon with safe-zone padding (Google recommends ~40% content) */
function maskableIconSvg(size) {
  const plate = Math.round(size * 0.72);
  const plateOffset = Math.round((size - plate) / 2);
  const r = Math.round(plate * 0.22);
  const markSize = Math.round(plate * 0.56);
  const markOffset = plateOffset + Math.round((plate - markSize) / 2);
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none">
      <rect width="${size}" height="${size}" fill="${ACCENT}" />
      <rect x="${plateOffset}" y="${plateOffset}" width="${plate}" height="${plate}" rx="${r}" fill="${ACCENT}" />
      <g transform="translate(${markOffset} ${markOffset})">
        ${logoMarkSvg({ size: markSize, stroke: ACCENT_INK, strokeWidth: 1.85 })}
      </g>
    </svg>
  `);
}

/** Open Graph / Twitter share card 1200×630 */
function ogImageSvg() {
  const w = 1200;
  const h = 630;
  const markSize = 88;
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none">
      <rect width="${w}" height="${h}" fill="${BG}" />
      <!-- subtle top accent bar -->
      <rect width="${w}" height="6" fill="${ACCENT}" />
      <!-- soft corner plate for logo -->
      <rect x="80" y="140" width="120" height="120" rx="28" fill="${ACCENT}" />
      <g transform="translate(${80 + (120 - markSize) / 2} ${140 + (120 - markSize) / 2})">
        ${logoMarkSvg({ size: markSize, stroke: ACCENT_INK, strokeWidth: 1.75 })}
      </g>
      <!-- wordmark -->
      <text x="230" y="198" font-family="Georgia, 'Times New Roman', serif" font-size="56" font-weight="500" fill="${INK}" letter-spacing="-0.5">AncreMed</text>
      <text x="230" y="238" font-family="ui-sans-serif, system-ui, sans-serif" font-size="22" fill="${INK_SECONDARY}">Intelligence Clinique Vérifiée</text>
      <!-- divider -->
      <line x1="80" y1="310" x2="1120" y2="310" stroke="${BORDER}" stroke-width="1.5" />
      <!-- description -->
      <text x="80" y="380" font-family="ui-sans-serif, system-ui, sans-serif" font-size="28" fill="${INK}">
        Console médicale RAG haute-attribution
      </text>
      <text x="80" y="428" font-family="ui-sans-serif, system-ui, sans-serif" font-size="24" fill="${INK_SECONDARY}">
        76 303 fiches HAS · ANSM · EDN — assertions vérifiées mot à mot
      </text>
      <!-- bottom chips -->
      <rect x="80" y="500" width="168" height="40" rx="20" fill="${ACCENT_SOFT}" />
      <text x="164" y="526" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="15" font-weight="600" fill="${ACCENT}">HAS</text>
      <rect x="264" y="500" width="168" height="40" rx="20" fill="${ACCENT_SOFT}" />
      <text x="348" y="526" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="15" font-weight="600" fill="${ACCENT}">ANSM / BDPM</text>
      <rect x="448" y="500" width="120" height="40" rx="20" fill="${ACCENT_SOFT}" />
      <text x="508" y="526" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="15" font-weight="600" fill="${ACCENT}">EDN</text>
      <!-- brand url hint -->
      <text x="1120" y="526" text-anchor="end" font-family="ui-sans-serif, system-ui, sans-serif" font-size="16" fill="${INK_SECONDARY}">ancre-med</text>
    </svg>
  `);
}

async function pngFromSvg(svgBuffer, size) {
  return sharp(svgBuffer)
    .resize(size, size, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function writePng(filePath, buffer) {
  await writeFile(filePath, buffer);
  console.log("  wrote", path.relative(root, filePath), `(${buffer.length} bytes)`);
}

async function main() {
  await mkdir(iconsDir, { recursive: true });
  console.log("Generating AncreMed brand assets…\n");

  // --- Standard PNG sizes ---
  const sizes = [
    { name: "favicon-16x16.png", size: 16, dir: publicDir },
    { name: "favicon-32x32.png", size: 32, dir: publicDir },
    { name: "apple-touch-icon.png", size: 180, dir: publicDir },
    { name: "android-chrome-192x192.png", size: 192, dir: publicDir },
    { name: "android-chrome-512x512.png", size: 512, dir: publicDir },
    { name: "icon-192.png", size: 192, dir: iconsDir },
    { name: "icon-512.png", size: 512, dir: iconsDir },
  ];

  for (const { name, size, dir } of sizes) {
    const buf = await pngFromSvg(appIconSvg(size), size);
    await writePng(path.join(dir, name), buf);
  }

  // Maskable (Android adaptive)
  const maskable = await pngFromSvg(maskableIconSvg(512), 512);
  await writePng(path.join(iconsDir, "icon-maskable-512.png"), maskable);

  // --- favicon.ico (16 + 32 + 48) ---
  const icoBuffers = await Promise.all(
    [16, 32, 48].map((s) => pngFromSvg(appIconSvg(s, 0.2), s))
  );
  const ico = await toIco(icoBuffers);
  await writePng(path.join(publicDir, "favicon.ico"), ico);

  // Also place favicon.ico where Next.js App Router looks by convention
  await writePng(path.join(root, "src", "app", "favicon.ico"), ico);

  // --- Open Graph / Twitter ---
  const og = await sharp(ogImageSvg())
    .resize(1200, 630, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writePng(path.join(publicDir, "og-image.png"), og);
  await writePng(path.join(publicDir, "twitter-image.png"), og);

  // Square share / messaging preview (WhatsApp etc. sometimes crop square)
  const squareShare = await pngFromSvg(appIconSvg(512), 512);
  await writePng(path.join(publicDir, "share-icon.png"), squareShare);

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
