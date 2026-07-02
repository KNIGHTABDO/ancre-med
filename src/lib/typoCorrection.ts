import type { Row } from "@libsql/client";

import type { SqlExecutor } from "@/lib/deepSearch";

const STATIC_MEDICAL_VOCABULARY = [
  "asthme",
  "aigu",
  "grave",
  "bacterie",
  "bacteries",
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
  "embolies",
  "fibrillation",
  "glasgow",
  "gault",
  "hypertension",
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
] as const;

let vocabularyPromise: Promise<ReadonlySet<string>> | null = null;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tokenParts(value: string): readonly string[] {
  return normalize(value).match(/[a-z0-9]+/g) ?? [];
}

function boundedLevenshtein(left: string, right: string, maxDistance: number): number {
  if (Math.abs(left.length - right.length) > maxDistance) {
    return maxDistance + 1;
  }

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array<number>(right.length + 1);

  for (let i = 1; i <= left.length; i++) {
    current[0] = i;
    let rowMin = current[0] ?? i;
    for (let j = 1; j <= right.length; j++) {
      const substitutionCost = left[i - 1] === right[j - 1] ? 0 : 1;
      const value = Math.min(
        (previous[j] ?? maxDistance) + 1,
        (current[j - 1] ?? maxDistance) + 1,
        (previous[j - 1] ?? maxDistance) + substitutionCost,
      );
      current[j] = value;
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > maxDistance) {
      return maxDistance + 1;
    }
    for (let j = 0; j <= right.length; j++) {
      previous[j] = current[j] ?? maxDistance + 1;
    }
  }

  return previous[right.length] ?? maxDistance + 1;
}

function rowToken(row: Row): string | null {
  const token = row["token"];
  return typeof token === "string" && token.length > 1 ? normalize(token) : null;
}

async function loadVocabulary(db: SqlExecutor): Promise<ReadonlySet<string>> {
  vocabularyPromise ??= (async () => {
    const vocabulary = new Set<string>(STATIC_MEDICAL_VOCABULARY.map(normalize));
    try {
      const result = await db.execute({
        sql: "SELECT token FROM search_vocabulary ORDER BY frequency DESC LIMIT 5000;",
      });
      for (const row of result.rows) {
        const token = rowToken(row);
        if (token !== null) {
          vocabulary.add(token);
        }
      }
    } catch {
      // The optional vocabulary table is built offline; static terms keep correction portable.
    }
    return vocabulary;
  })();
  return vocabularyPromise;
}

function findClosestToken(
  token: string,
  vocabulary: ReadonlySet<string>,
  maxDistance: number,
): string | null {
  let bestToken: string | null = null;
  let bestDistance = maxDistance + 1;
  const first = token[0];

  for (const candidate of vocabulary) {
    if (candidate[0] !== first || candidate.length < 4) {
      continue;
    }
    const distance = boundedLevenshtein(token, candidate, maxDistance);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestToken = candidate;
    }
  }

  return bestDistance <= maxDistance ? bestToken : null;
}

export async function correctMedicalTypos(db: SqlExecutor, query: string): Promise<string> {
  const vocabulary = await loadVocabulary(db);
  return query
    .split(/(\s+)/u)
    .map((part) => {
      if (/^\s+$/u.test(part)) {
        return part;
      }

      const tokens = tokenParts(part);
      if (tokens.length !== 1) {
        return part;
      }

      const normalized = tokens[0];
      if (
        normalized === undefined ||
        normalized.length < 5 ||
        vocabulary.has(normalized) ||
        /^[A-Z0-9]+$/u.test(part)
      ) {
        return part;
      }

      const corrected = findClosestToken(normalized, vocabulary, 2);
      return corrected ?? part;
    })
    .join("");
}
