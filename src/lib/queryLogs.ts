import type { InValue } from "@libsql/client";

import type { SqlExecutor } from "@/lib/deepSearch";

export interface QueryLogInput {
  readonly request_id: string;
  readonly timestamp: string;
  readonly primary_class: string;
  readonly secondary_class: string | null;
  readonly rounds_used: number;
  readonly sub_queries_issued: number;
  readonly distinct_sources_cited: number;
  readonly silos_touched: readonly string[];
  readonly clinical_assertions_total: number;
  readonly clinical_assertions_passed_gate: number;
  readonly clinical_assertions_failed_substring: number;
  readonly clinical_assertions_failed_entity: number;
  readonly clinical_assertions_failed_verifier: number;
  readonly abstained_sections: readonly string[];
  readonly latency_ms: number;
  readonly estimated_cost_usd: number;
  readonly gate_blocked: boolean;
}

let ensureLogPromise: Promise<void> | null = null;

async function ensureQueryLogTable(db: SqlExecutor): Promise<void> {
  ensureLogPromise ??= db.execute({
    sql: `
      CREATE TABLE IF NOT EXISTS query_logs (
        request_id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        primary_class TEXT NOT NULL,
        secondary_class TEXT,
        rounds_used INTEGER NOT NULL,
        sub_queries_issued INTEGER NOT NULL,
        distinct_sources_cited INTEGER NOT NULL,
        silos_touched TEXT NOT NULL,
        clinical_assertions_total INTEGER NOT NULL,
        clinical_assertions_passed_gate INTEGER NOT NULL,
        clinical_assertions_failed_substring INTEGER NOT NULL,
        clinical_assertions_failed_entity INTEGER NOT NULL,
        clinical_assertions_failed_verifier INTEGER NOT NULL,
        abstained_sections TEXT NOT NULL,
        latency_ms INTEGER NOT NULL,
        estimated_cost_usd REAL NOT NULL,
        gate_blocked INTEGER NOT NULL
      );
    `,
  }).then(() => undefined);
  await ensureLogPromise;
}

export async function writeQueryLog(db: SqlExecutor, input: QueryLogInput): Promise<void> {
  await ensureQueryLogTable(db);
  const args: InValue[] = [
    input.request_id,
    input.timestamp,
    input.primary_class,
    input.secondary_class,
    input.rounds_used,
    input.sub_queries_issued,
    input.distinct_sources_cited,
    JSON.stringify(input.silos_touched),
    input.clinical_assertions_total,
    input.clinical_assertions_passed_gate,
    input.clinical_assertions_failed_substring,
    input.clinical_assertions_failed_entity,
    input.clinical_assertions_failed_verifier,
    JSON.stringify(input.abstained_sections),
    input.latency_ms,
    input.estimated_cost_usd,
    input.gate_blocked ? 1 : 0,
  ];

  await db.execute({
    sql: `
      INSERT INTO query_logs (
        request_id, timestamp, primary_class, secondary_class, rounds_used,
        sub_queries_issued, distinct_sources_cited, silos_touched,
        clinical_assertions_total, clinical_assertions_passed_gate,
        clinical_assertions_failed_substring, clinical_assertions_failed_entity,
        clinical_assertions_failed_verifier, abstained_sections, latency_ms,
        estimated_cost_usd, gate_blocked
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(request_id) DO UPDATE SET
        timestamp = excluded.timestamp,
        primary_class = excluded.primary_class,
        secondary_class = excluded.secondary_class,
        rounds_used = excluded.rounds_used,
        sub_queries_issued = excluded.sub_queries_issued,
        distinct_sources_cited = excluded.distinct_sources_cited,
        silos_touched = excluded.silos_touched,
        clinical_assertions_total = excluded.clinical_assertions_total,
        clinical_assertions_passed_gate = excluded.clinical_assertions_passed_gate,
        clinical_assertions_failed_substring = excluded.clinical_assertions_failed_substring,
        clinical_assertions_failed_entity = excluded.clinical_assertions_failed_entity,
        clinical_assertions_failed_verifier = excluded.clinical_assertions_failed_verifier,
        abstained_sections = excluded.abstained_sections,
        latency_ms = excluded.latency_ms,
        estimated_cost_usd = excluded.estimated_cost_usd,
        gate_blocked = excluded.gate_blocked;
    `,
    args,
  });
}
