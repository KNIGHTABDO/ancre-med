import { createClient } from "@libsql/client";
import { readFileSync } from "fs";

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
    // .env is optional; the local SQLite fallback is still valid.
  }
}

function loadSeed() {
  return JSON.parse(readFileSync("src/data/clinical_formulas.seed.json", "utf-8"));
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
  const formulas = loadSeed();

  await db.execute({
    sql: `
      CREATE TABLE IF NOT EXISTS clinical_formulas (
        id TEXT PRIMARY KEY,
        name_fr TEXT,
        category TEXT,
        formula_text TEXT,
        variables_json TEXT,
        interpretation_text TEXT,
        caveats_text TEXT,
        source_citation TEXT,
        verified_by TEXT,
        verified_date TEXT
      );
    `,
  });

  for (const formula of formulas) {
    await db.execute({
      sql: `
        INSERT INTO clinical_formulas (
          id, name_fr, category, formula_text, variables_json, interpretation_text,
          caveats_text, source_citation, verified_by, verified_date
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name_fr = excluded.name_fr,
          category = excluded.category,
          formula_text = excluded.formula_text,
          variables_json = excluded.variables_json,
          interpretation_text = excluded.interpretation_text,
          caveats_text = excluded.caveats_text,
          source_citation = excluded.source_citation,
          verified_by = excluded.verified_by,
          verified_date = excluded.verified_date;
      `,
      args: [
        formula.id,
        formula.name_fr,
        formula.category,
        formula.formula_text,
        JSON.stringify(formula.variables_json),
        formula.interpretation_text,
        formula.caveats_text,
        formula.source_citation,
        formula.verified_by,
        formula.verified_date,
      ],
    });
  }

  console.log(`Seeded ${formulas.length} clinical formulas into ${dbConfig.url}.`);
  db.close?.();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
