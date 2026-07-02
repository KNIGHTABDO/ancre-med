import { createClient } from "@libsql/client";
import { readFileSync } from "fs";

const CURATED_MEDICAL_TERMS = [
  "abces",
  "aigu",
  "anemie",
  "antibiotique",
  "anticoagulation",
  "asthme",
  "bacterie",
  "bronchite",
  "bronchopneumopathie",
  "cardiaque",
  "child",
  "chads",
  "cirrhose",
  "clairance",
  "cockcroft",
  "contre",
  "creatinine",
  "diabete",
  "diagnostic",
  "dyspnee",
  "embolies",
  "fibrillation",
  "glasgow",
  "gault",
  "hemorragie",
  "hepatic",
  "hypertension",
  "hypokaliemie",
  "hyperkaliemie",
  "insuffisance",
  "medicament",
  "pneumonie",
  "posologie",
  "qsofa",
  "renale",
  "sepsis",
  "spondylarthrite",
  "traitement",
  "vasc",
];

function loadEnvFile() {
  try {
    const envContent = readFileSync(".env", "utf-8");
    for (const line of envContent.split(/\r?\n/u)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/u);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key] === undefined) {
        process.env[key] = rawValue.replace(/^["']|["']$/gu, "");
      }
    }
  } catch {
    // .env is optional; local SQLite fallback remains valid.
  }
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase();
}

function tokens(value) {
  return normalize(value).match(/[a-z0-9]{4,}/gu) || [];
}

async function insertEntries(db, entries) {
  const chunkSize = 300;
  for (let index = 0; index < entries.length; index += chunkSize) {
    const chunk = entries.slice(index, index + chunkSize);
    const placeholders = chunk.map(() => "(?, ?)").join(", ");
    const args = chunk.flatMap(([token, frequency]) => [token, frequency]);
    await db.execute({
      sql: `
        INSERT INTO search_vocabulary (token, frequency)
        VALUES ${placeholders}
        ON CONFLICT(token) DO UPDATE SET frequency = excluded.frequency;
      `,
      args,
    });
  }
}

async function main() {
  loadEnvFile();
  const dbConfig = {
    url: process.env.TURSO_DATABASE_URL || "file:clinical_ground_truth.db",
  };
  if (process.env.TURSO_AUTH_TOKEN) {
    dbConfig.authToken = process.env.TURSO_AUTH_TOKEN;
  }

  const db = createClient(dbConfig);
  await db.execute({
    sql: `
      CREATE TABLE IF NOT EXISTS search_vocabulary (
        token TEXT PRIMARY KEY,
        frequency INTEGER NOT NULL
      );
    `,
  });

  const frequencies = new Map();
  for (const term of CURATED_MEDICAL_TERMS) {
    frequencies.set(term, 1000);
  }

  const titles = await db.execute({
    sql: `
      SELECT origin_title
      FROM documents
      WHERE origin_title IS NOT NULL
        AND origin_title <> ''
      LIMIT 50000;
    `,
  });

  for (const row of titles.rows) {
    for (const token of tokens(row.origin_title)) {
      frequencies.set(token, (frequencies.get(token) || 0) + 1);
    }
  }

  const formulas = await db.execute({
    sql: `
      SELECT name_fr, category, formula_text, interpretation_text, caveats_text
      FROM clinical_formulas;
    `,
  }).catch(() => ({ rows: [] }));

  for (const row of formulas.rows) {
    for (const field of ["name_fr", "category", "formula_text", "interpretation_text", "caveats_text"]) {
      for (const token of tokens(row[field])) {
        frequencies.set(token, (frequencies.get(token) || 0) + 20);
      }
    }
  }

  const entries = Array.from(frequencies.entries())
    .filter(([, frequency]) => frequency >= 2)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5000);

  await db.execute({ sql: "DELETE FROM search_vocabulary;" });
  await insertEntries(db, entries);

  console.log(
    `Built bounded search vocabulary with ${entries.length} tokens from ${titles.rows.length} titles in ${dbConfig.url}.`,
  );
  db.close?.();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
