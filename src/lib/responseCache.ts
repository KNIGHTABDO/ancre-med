import type { InValue, Row } from "@libsql/client";

import type { SqlExecutor } from "@/lib/deepSearch";

interface CachedResponseRow {
  readonly response_json: string;
  readonly cited_source_ids_json: string;
}

export interface CachedResponsePayload {
  readonly model: string | null;
  readonly payload: Record<string, unknown>;
}

let ensureCachePromise: Promise<void> | null = null;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenSet(value: string): readonly string[] {
  return Array.from(new Set(normalize(value).split(/\s+/u).filter((token) => token.length > 1)));
}

export function isCacheableTopic(topicClass: string | null): boolean {
  return topicClass === "definition_item_edn" || topicClass === "anatomie_physiologie";
}

export function normalizedItemSlug(
  topicClass: string | null,
  query: string,
  retrievalPlan: Record<string, unknown> | null,
): string {
  const subQueries = retrievalPlan?.["sub_queries"];
  const planText = Array.isArray(subQueries)
    ? subQueries
        .map((item) => (typeof item === "object" && item !== null && "query" in item ? item["query"] : ""))
        .filter((value): value is string => typeof value === "string")
        .join(" ")
    : "";
  const tokens = tokenSet(`${query} ${planText}`).slice(0, 18);
  return `${topicClass ?? "unknown"}:${tokens.join("-")}`;
}

async function ensureCachedResponsesTable(db: SqlExecutor): Promise<void> {
  ensureCachePromise ??= db.execute({
    sql: `
      CREATE TABLE IF NOT EXISTS cached_responses (
        id TEXT PRIMARY KEY,
        topic_class TEXT NOT NULL,
        normalized_item_slug TEXT NOT NULL,
        response_json TEXT NOT NULL,
        cited_source_ids_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(topic_class, normalized_item_slug)
      );
    `,
  }).then(() => undefined);
  await ensureCachePromise;
}

function cachedRow(row: Row): CachedResponseRow {
  return {
    response_json: typeof row["response_json"] === "string" ? row["response_json"] : "",
    cited_source_ids_json:
      typeof row["cited_source_ids_json"] === "string" ? row["cited_source_ids_json"] : "[]",
  };
}

async function hasSupersededSource(
  db: SqlExecutor,
  citedSourceIds: readonly string[],
): Promise<boolean> {
  if (citedSourceIds.length === 0) {
    return false;
  }

  try {
    const placeholders = citedSourceIds.map(() => "?").join(", ");
    const result = await db.execute({
      sql: `
        SELECT COUNT(*) AS count
        FROM documents
        WHERE source_identifier IN (${placeholders})
          AND COALESCE(superseded, 0) = 1;
      `,
      args: [...citedSourceIds],
    });
    const count = result.rows[0]?.["count"];
    return typeof count === "number" && count > 0;
  } catch {
    return false;
  }
}

export async function getCachedResponse(
  db: SqlExecutor,
  topicClass: string | null,
  query: string,
  retrievalPlan: Record<string, unknown> | null,
): Promise<CachedResponsePayload | null> {
  if (!isCacheableTopic(topicClass)) {
    return null;
  }

  await ensureCachedResponsesTable(db);
  const slug = normalizedItemSlug(topicClass, query, retrievalPlan);
  const result = await db.execute({
    sql: `
      SELECT response_json, cited_source_ids_json
      FROM cached_responses
      WHERE topic_class = ? AND normalized_item_slug = ?
      LIMIT 1;
    `,
    args: [topicClass ?? "", slug],
  });
  const firstRow = result.rows[0];
  if (firstRow === undefined) {
    return null;
  }

  const row = cachedRow(firstRow);
  const citedSourceIds = JSON.parse(row.cited_source_ids_json) as unknown;
  const sourceIds = Array.isArray(citedSourceIds)
    ? citedSourceIds.filter((value): value is string => typeof value === "string")
    : [];
  if (await hasSupersededSource(db, sourceIds)) {
    await db.execute({
      sql: "DELETE FROM cached_responses WHERE topic_class = ? AND normalized_item_slug = ?;",
      args: [topicClass ?? "", slug],
    });
    return null;
  }

  return JSON.parse(row.response_json) as CachedResponsePayload;
}

export async function storeCachedResponse({
  db,
  topicClass,
  query,
  retrievalPlan,
  response,
  citedSourceIds,
}: {
  readonly db: SqlExecutor;
  readonly topicClass: string | null;
  readonly query: string;
  readonly retrievalPlan: Record<string, unknown> | null;
  readonly response: CachedResponsePayload;
  readonly citedSourceIds: readonly string[];
}): Promise<void> {
  if (!isCacheableTopic(topicClass)) {
    return;
  }

  await ensureCachedResponsesTable(db);
  const slug = normalizedItemSlug(topicClass, query, retrievalPlan);
  const args: InValue[] = [
    `${topicClass}:${slug}`,
    topicClass ?? "",
    slug,
    JSON.stringify(response),
    JSON.stringify(Array.from(new Set(citedSourceIds))),
    new Date().toISOString(),
  ];
  await db.execute({
    sql: `
      INSERT INTO cached_responses (
        id, topic_class, normalized_item_slug, response_json,
        cited_source_ids_json, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(topic_class, normalized_item_slug) DO UPDATE SET
        response_json = excluded.response_json,
        cited_source_ids_json = excluded.cited_source_ids_json,
        created_at = excluded.created_at;
    `,
    args,
  });
}
