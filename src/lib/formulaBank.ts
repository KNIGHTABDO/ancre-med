import type { InValue, Row } from "@libsql/client";

import formulaSeed from "@/data/clinical_formulas.seed.json";
import type { RetrievedContextChunk } from "@/lib/clinicalTypes";
import type { SqlExecutor } from "@/lib/deepSearch";

interface FormulaSeedRecord {
  readonly id: string;
  readonly name_fr: string;
  readonly category: string;
  readonly formula_text: string;
  readonly variables_json: unknown;
  readonly interpretation_text: string;
  readonly caveats_text: string;
  readonly source_citation: string;
  readonly verified_by: string;
  readonly verified_date: string;
}

interface ClinicalFormulaRecord {
  readonly id: string;
  readonly name_fr: string;
  readonly category: string;
  readonly formula_text: string;
  readonly variables_json: string;
  readonly interpretation_text: string;
  readonly caveats_text: string;
  readonly source_citation: string;
  readonly verified_by: string;
  readonly verified_date: string;
}

const FORMULA_SEED = formulaSeed as readonly FormulaSeedRecord[];
let ensurePromise: Promise<void> | null = null;

function readString(row: Row, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value : "";
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tokenize(value: string): readonly string[] {
  return Array.from(new Set(normalize(value).match(/[a-z0-9]+/g) ?? [])).filter(
    (token) => token.length > 1,
  );
}

function formulaFromRow(row: Row): ClinicalFormulaRecord {
  return {
    id: readString(row, "id"),
    name_fr: readString(row, "name_fr"),
    category: readString(row, "category"),
    formula_text: readString(row, "formula_text"),
    variables_json: readString(row, "variables_json"),
    interpretation_text: readString(row, "interpretation_text"),
    caveats_text: readString(row, "caveats_text"),
    source_citation: readString(row, "source_citation"),
    verified_by: readString(row, "verified_by"),
    verified_date: readString(row, "verified_date"),
  };
}

function formulaSearchScore(formula: ClinicalFormulaRecord, queryTokens: readonly string[]): number {
  const title = normalize(`${formula.name_fr} ${formula.category}`);
  const body = normalize(
    `${formula.formula_text} ${formula.interpretation_text} ${formula.caveats_text}`,
  );
  return queryTokens.reduce((score, token) => {
    if (title.includes(token)) {
      return score + 4;
    }
    if (body.includes(token)) {
      return score + 1;
    }
    return score;
  }, 0);
}

function formulaToContextChunk(
  formula: ClinicalFormulaRecord,
  score: number,
): RetrievedContextChunk {
  return {
    id: `formula_${formula.id}`,
    agent_id: "agent_d_formules",
    agent_label: "Agent D (Formules cliniques)",
    text: [
      `Formule clinique: ${formula.name_fr}`,
      `Categorie: ${formula.category}`,
      `Formule: ${formula.formula_text}`,
      `Variables: ${formula.variables_json}`,
      `Interpretation: ${formula.interpretation_text}`,
      `Caveats: ${formula.caveats_text}`,
      `Source verifiee: ${formula.source_citation}`,
      `Verification: ${formula.verified_by} (${formula.verified_date})`,
    ].join("\n"),
    source_identifier: formula.id,
    source: formula.name_fr,
    page: null,
    date: formula.verified_date,
    silo: "clinical_formulas",
    fts_rank: -score,
    bm25_score: 1,
    section: "formule",
  };
}

async function createFormulaTable(db: SqlExecutor): Promise<void> {
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
}

async function upsertFormulaSeeds(db: SqlExecutor): Promise<void> {
  for (const formula of FORMULA_SEED) {
    const args: InValue[] = [
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
    ];

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
      args,
    });
  }
}

export async function ensureClinicalFormulaBank(db: SqlExecutor): Promise<void> {
  ensurePromise ??= (async () => {
    await createFormulaTable(db);
    await upsertFormulaSeeds(db);
  })();
  await ensurePromise;
}

export async function searchClinicalFormulas(
  db: SqlExecutor,
  query: string,
  limit = 4,
): Promise<readonly RetrievedContextChunk[]> {
  await ensureClinicalFormulaBank(db);
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return [];
  }

  const result = await db.execute({
    sql: `
      SELECT id, name_fr, category, formula_text, variables_json, interpretation_text,
             caveats_text, source_citation, verified_by, verified_date
      FROM clinical_formulas;
    `,
  });

  return result.rows
    .map((row) => {
      const formula = formulaFromRow(row);
      return {
        formula,
        score: formulaSearchScore(formula, queryTokens),
      };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((item) => formulaToContextChunk(item.formula, item.score));
}
