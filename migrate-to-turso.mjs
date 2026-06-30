/**
 * migrate-to-turso.mjs
 * 
 * Reads the local clinical_ground_truth.db and pushes all data
 * to a remote Turso database via @libsql/client using concurrent batches.
 * 
 * Usage:
 *   node migrate-to-turso.mjs
 */

import { createClient } from "@libsql/client";
import { readFileSync } from "fs";

function loadEnv() {
  try {
    const envContent = readFileSync(".env", "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env not found
  }
}

loadEnv();

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error("❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env");
  process.exit(1);
}

console.log("📦 Opening local database: clinical_ground_truth.db");
const localDb = createClient({ url: "file:clinical_ground_truth.db" });

console.log(`☁️  Connecting to Turso: ${TURSO_URL}`);
const remoteDb = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

async function migrate() {
  console.log("\n🔍 Reading local schema...");
  const tablesResult = await localDb.execute(
    "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );

  const tables = tablesResult.rows;
  console.log(`   Found ${tables.length} table(s): ${tables.map(t => t.name).join(", ")}`);

  console.log("\n🏗️  Creating tables on Turso...");
  for (const table of tables) {
    const sql = String(table.sql);
    try {
      await remoteDb.execute(sql);
      console.log(`   ✅ Created: ${table.name}`);
    } catch (err) {
      if (String(err).includes("already exists")) {
        console.log(`   ⏭️  Already exists: ${table.name} (skipping)`);
      } else {
        throw err;
      }
    }
  }

  // Virtual tables check
  const vtablesResult = await localDb.execute(
    "SELECT name, sql FROM sqlite_master WHERE type='table' AND sql LIKE '%VIRTUAL TABLE%'"
  );
  for (const vtable of vtablesResult.rows) {
    const sql = String(vtable.sql);
    try {
      await remoteDb.execute(sql);
      console.log(`   ✅ Created FTS: ${vtable.name}`);
    } catch (err) {
      if (String(err).includes("already exists")) {
        console.log(`   ⏭️  Already exists: ${vtable.name} (skipping)`);
      } else {
        console.warn(`   ⚠️  FTS creation warning: ${err}`);
      }
    }
  }

  console.log("\n📤 Migrating data concurrently...");
  
  const dataTables = tables.filter(t => {
    const name = String(t.name);
    return !name.includes("_fts_") && !name.endsWith("_content") && 
           !name.endsWith("_segments") && !name.endsWith("_segdir") &&
           !name.endsWith("_docsize") && !name.endsWith("_config") &&
           !name.endsWith("_data") && !name.endsWith("_idx");
  });

  for (const table of dataTables) {
    const tableName = String(table.name);
    
    const countResult = await localDb.execute(`SELECT COUNT(*) as cnt FROM "${tableName}"`);
    const totalRows = Number(countResult.rows[0].cnt);
    
    if (totalRows === 0) {
      console.log(`   ⏭️  ${tableName}: 0 rows`);
      continue;
    }
    
    console.log(`   📊 ${tableName}: ${totalRows} rows to migrate`);
    
    const columnsResult = await localDb.execute(`PRAGMA table_info("${tableName}")`);
    const columns = columnsResult.rows.map(c => String(c.name));
    
    const BATCH_SIZE = 100;
    const CONCURRENCY = 15; // 15 concurrent requests
    let offset = 0;
    let migrated = 0;
    
    while (offset < totalRows) {
      const promises = [];
      
      for (let i = 0; i < CONCURRENCY && offset < totalRows; i++) {
        const currentOffset = offset;
        offset += BATCH_SIZE;
        
        const promise = (async () => {
          const batch = await localDb.execute({
            sql: `SELECT * FROM "${tableName}" LIMIT ? OFFSET ?`,
            args: [BATCH_SIZE, currentOffset],
          });
          
          if (batch.rows.length === 0) return 0;
          
          const statements = batch.rows.map(row => {
            const placeholders = columns.map(() => "?").join(", ");
            const values = columns.map(col => row[col] ?? null);
            return {
              sql: `INSERT OR IGNORE INTO "${tableName}" (${columns.map(c => `"${c}"`).join(", ")}) VALUES (${placeholders})`,
              args: values,
            };
          });
          
          await remoteDb.batch(statements);
          return batch.rows.length;
        })();
        
        promises.push(promise);
      }
      
      const results = await Promise.all(promises);
      const batchSum = results.reduce((a, b) => a + b, 0);
      migrated += batchSum;
      
      const pct = Math.min(100, Math.round((migrated / totalRows) * 100));
      process.stdout.write(`\r   📤 ${tableName}: ${migrated}/${totalRows} (${pct}%)`);
    }
    
    console.log(`\n   ✅ ${tableName}: ${migrated} rows migrated`);
  }

  console.log("\n🔄 Rebuilding FTS indexes on Turso...");
  try {
    await remoteDb.execute("INSERT INTO documents_fts(documents_fts) VALUES('rebuild')");
    console.log("   ✅ FTS index rebuilt successfully");
  } catch (err) {
    console.warn(`   ⚠️  FTS rebuild warning: ${err}`);
  }

  console.log("\n🔍 Verifying migration...");
  for (const table of dataTables) {
    const tableName = String(table.name);
    try {
      const localCount = await localDb.execute(`SELECT COUNT(*) as cnt FROM "${tableName}"`);
      const remoteCount = await remoteDb.execute(`SELECT COUNT(*) as cnt FROM "${tableName}"`);
      const local = Number(localCount.rows[0].cnt);
      const remote = Number(remoteCount.rows[0].cnt);
      const status = local === remote ? "✅" : "⚠️";
      console.log(`   ${status} ${tableName}: local=${local}, remote=${remote}`);
    } catch {
      // skip
    }
  }

  console.log("\n🎉 Migration complete!");
}

migrate().catch(err => {
  console.error("\n❌ Migration failed:", err);
  process.exit(1);
});
