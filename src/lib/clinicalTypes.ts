export const TOPIC_CLASSES = [
  "definition_item_edn",
  "semiologie_cas_clinique",
  "pharmacologie_therapeutique",
  "anatomie_physiologie",
  "calcul_clinique",
  "urgence_conduite_a_tenir",
  "conversationnel",
] as const;

export type TopicClass = (typeof TOPIC_CLASSES)[number];

export type RetrievalTargetSilo = "edn" | "has" | "bdpm" | "formulas" | "any";

export type CategorySilo =
  | "colles_enseignants_edn"
  | "has_recommandations"
  | "ansm_bdpm_vidal"
  | "clinical_formulas"
  | "chat";

export interface RetrievalSubQuery {
  readonly section: string;
  readonly query: string;
  readonly target_silo: RetrievalTargetSilo;
}

export interface RetrievalPlan {
  readonly primary_class: TopicClass;
  readonly secondary_class: TopicClass | null;
  readonly sub_queries: readonly RetrievalSubQuery[];
}

export interface RetrievedContextChunk {
  readonly id: string;
  readonly agent_id: string;
  readonly agent_label: string;
  readonly text: string;
  readonly source_identifier: string | null;
  readonly source: string | null;
  readonly page: number | null;
  readonly date: string | null;
  readonly silo: CategorySilo | string | null;
  readonly qdrant_score: number;
  readonly cosine_similarity: number;
  readonly section?: string;
}

export interface Playbook {
  readonly requiredSections: readonly string[];
  readonly defaultTargetSilo: RetrievalTargetSilo;
  readonly defaultSubQueries: readonly RetrievalSubQuery[];
}

export const PLAYBOOKS: Record<TopicClass, Playbook> = {
  definition_item_edn: {
    requiredSections: ["definition", "physiopathologie", "epidemiologie", "classification"],
    defaultTargetSilo: "edn",
    defaultSubQueries: [
      { section: "definition", query: "definition structure item EDN", target_silo: "edn" },
      { section: "physiopathologie", query: "physiopathologie mecanisme", target_silo: "edn" },
      { section: "epidemiologie", query: "epidemiologie frequence facteurs risque", target_silo: "has" },
      { section: "classification", query: "classification formes criteres", target_silo: "edn" },
    ],
  },
  semiologie_cas_clinique: {
    requiredSections: [
      "signes_cliniques",
      "paraclinique",
      "diagnostics_differentiels",
      "criteres_gravite",
      "conduite_a_tenir",
    ],
    defaultTargetSilo: "edn",
    defaultSubQueries: [
      { section: "signes_cliniques", query: "signes cliniques semiologie", target_silo: "edn" },
      { section: "paraclinique", query: "examens paracliniques diagnostic", target_silo: "edn" },
      {
        section: "diagnostics_differentiels",
        query: "diagnostics differentiels",
        target_silo: "edn",
      },
      { section: "criteres_gravite", query: "criteres gravite urgence", target_silo: "has" },
      { section: "conduite_a_tenir", query: "conduite a tenir prise en charge", target_silo: "has" },
    ],
  },
  pharmacologie_therapeutique: {
    requiredSections: ["indication", "posologie", "contre_indications", "surveillance"],
    defaultTargetSilo: "bdpm",
    defaultSubQueries: [
      { section: "indication", query: "indication traitement avis", target_silo: "bdpm" },
      { section: "posologie", query: "posologie dose adaptation", target_silo: "bdpm" },
      {
        section: "contre_indications",
        query: "contre indication precaution interaction",
        target_silo: "bdpm",
      },
      { section: "surveillance", query: "surveillance suivi effets indesirables", target_silo: "has" },
    ],
  },
  anatomie_physiologie: {
    requiredSections: ["structure", "rapports", "fonction"],
    defaultTargetSilo: "edn",
    defaultSubQueries: [
      { section: "structure", query: "anatomie structure", target_silo: "edn" },
      { section: "rapports", query: "rapports anatomiques", target_silo: "edn" },
      { section: "fonction", query: "fonction physiologie innervation vascularisation", target_silo: "edn" },
    ],
  },
  calcul_clinique: {
    requiredSections: ["formule", "interpretation"],
    defaultTargetSilo: "formulas",
    defaultSubQueries: [
      { section: "formule", query: "formule score clinique", target_silo: "formulas" },
      { section: "interpretation", query: "interpretation seuil score", target_silo: "formulas" },
    ],
  },
  urgence_conduite_a_tenir: {
    requiredSections: ["reconnaissance", "gestes_immediats", "traitement", "orientation"],
    defaultTargetSilo: "has",
    defaultSubQueries: [
      { section: "reconnaissance", query: "reconnaissance signes gravite urgence", target_silo: "has" },
      { section: "gestes_immediats", query: "gestes immediats urgence", target_silo: "has" },
      { section: "traitement", query: "traitement urgence prise en charge", target_silo: "bdpm" },
      { section: "orientation", query: "orientation hospitalisation surveillance", target_silo: "has" },
    ],
  },
  conversationnel: {
    requiredSections: [],
    defaultTargetSilo: "any",
    defaultSubQueries: [],
  },
};

export const SADIQ_AGENTS = [
  {
    id: "agent_a_semiologie",
    label: "Agent A (Semiologie)",
    silo: "colles_enseignants_edn",
  },
  {
    id: "agent_b_pharmacologie",
    label: "Agent B (Pharmacologie)",
    silo: "ansm_bdpm_vidal",
  },
  {
    id: "agent_c_anatomie",
    label: "Agent C (Anatomie)",
    silo: "has_recommandations",
  },
  {
    id: "agent_d_formules",
    label: "Agent D (Formules cliniques)",
    silo: "clinical_formulas",
  },
] as const;

export type SadiqAgent = (typeof SADIQ_AGENTS)[number];

export function isTopicClass(value: unknown): value is TopicClass {
  return typeof value === "string" && TOPIC_CLASSES.includes(value as TopicClass);
}

export function requiredSectionsForPlan(
  primaryClass: TopicClass,
  secondaryClass: TopicClass | null,
): readonly string[] {
  const sections = new Set<string>(PLAYBOOKS[primaryClass].requiredSections);
  if (secondaryClass !== null && secondaryClass !== primaryClass) {
    for (const section of PLAYBOOKS[secondaryClass].requiredSections) {
      sections.add(section);
    }
  }
  return Array.from(sections);
}

export function categorySiloForTarget(targetSilo: RetrievalTargetSilo): CategorySilo | null {
  if (targetSilo === "edn") {
    return "colles_enseignants_edn";
  }
  if (targetSilo === "has") {
    return "has_recommandations";
  }
  if (targetSilo === "bdpm") {
    return "ansm_bdpm_vidal";
  }
  if (targetSilo === "formulas") {
    return "clinical_formulas";
  }
  return null;
}

export function agentForSilo(silo: string | null | undefined): SadiqAgent {
  return SADIQ_AGENTS.find((agent) => agent.silo === silo) ?? SADIQ_AGENTS[0];
}
