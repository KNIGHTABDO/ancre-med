import { createClient } from "@libsql/client";
import { randomUUID } from "crypto";
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
    // .env is optional; local SQLite fallback remains valid.
  }
}

async function columnExists(db, tableName, columnName) {
  const result = await db.execute({ sql: `PRAGMA table_info(${tableName});` });
  return result.rows.some((row) => row.name === columnName);
}

async function addColumnIfMissing(db, tableName, columnName, definition) {
  if (!(await columnExists(db, tableName, columnName))) {
    await db.execute({ sql: `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};` });
  }
}

async function ensureFreshnessSchema(db) {
  await addColumnIfMissing(db, "documents", "superseded", "INTEGER NOT NULL DEFAULT 0");
  await addColumnIfMissing(db, "documents", "guideline_family", "TEXT");
  await db.execute({
    sql: `
      CREATE TABLE IF NOT EXISTS source_freshness_events (
        id TEXT PRIMARY KEY,
        source_type TEXT NOT NULL,
        source_identifier TEXT,
        guideline_family TEXT,
        previous_regulatory_date TEXT,
        current_regulatory_date TEXT,
        action TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `,
  });
  await db.execute({
    sql: `
      CREATE INDEX IF NOT EXISTS idx_documents_silo_source_date
      ON documents(category_silo, source_identifier, regulatory_date);
    `,
  });
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
  await ensureFreshnessSchema(db);

  const result = await db.execute({
    sql: `
      UPDATE documents
      SET superseded = 1
      WHERE category_silo = 'ansm_bdpm_vidal'
        AND source_identifier IS NOT NULL
        AND regulatory_date IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM documents newer
          WHERE newer.category_silo = documents.category_silo
            AND newer.source_identifier = documents.source_identifier
            AND newer.regulatory_date IS NOT NULL
            AND newer.regulatory_date > documents.regulatory_date
        );
    `,
  });

  await db.execute({
    sql: `
      INSERT INTO source_freshness_events (
        id, source_type, source_identifier, guideline_family,
        previous_regulatory_date, current_regulatory_date, action, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `,
    args: [
      randomUUID(),
      "bdpm",
      null,
      null,
      null,
      null,
      `marked_superseded_rows:${result.rowsAffected}`,
      new Date().toISOString(),
    ],
  });

  console.log(`BDPM freshness pass complete. Superseded rows marked: ${result.rowsAffected}.`);
  db.close?.();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
