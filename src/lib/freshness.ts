import type { Row } from "@libsql/client";

import type { SqlExecutor } from "@/lib/deepSearch";

let ensureFreshnessPromise: Promise<void> | null = null;

async function columnExists(db: SqlExecutor, tableName: string, columnName: string): Promise<boolean> {
  const result = await db.execute({ sql: `PRAGMA table_info(${tableName});` });
  return result.rows.some((row: Row) => row["name"] === columnName);
}

async function addColumnIfMissing(
  db: SqlExecutor,
  tableName: string,
  columnName: string,
  definition: string,
): Promise<void> {
  if (!(await columnExists(db, tableName, columnName))) {
    await db.execute({ sql: `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};` });
  }
}

export async function ensureFreshnessSchema(db: SqlExecutor): Promise<void> {
  ensureFreshnessPromise ??= (async () => {
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
  })();
  await ensureFreshnessPromise;
}
