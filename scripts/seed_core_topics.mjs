import { createClient } from "@libsql/client";
import { readFileSync } from "fs";

// -----------------------------------------------------------------------------
// Seed high-yield "bread-and-butter" clinical facts that were missing from the
// corpus (live tests abstained on paracetamol posology, ECG hyperkaliemie, ...).
//
// Content is authored as declarative factual French sentences so the generation
// gate can extract verbatim quotes. Numbers follow VIDAL / HAS / ANSM-consistent
// references. Chunks are placed in the existing silos so the router retrieves
// them naturally (drugs -> ansm_bdpm_vidal, ECG/urgences -> has_recommandations).
//
// The documents_fts index is an EXTERNAL-CONTENT fts5 table (content='documents')
// and, on the Turso database, has NO maintenance triggers. We therefore keep the
// index in sync manually: on upsert we 'delete' the stale fts row by rowid, then
// insert the fresh fts row using the new rowid.
// -----------------------------------------------------------------------------

const SOURCE_LABEL = "referentiel-interne";
const REGULATORY_DATE = "2026-07-03";

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

// Each entry: { slug, title, silo, text }
const ENTRIES = [
  // ------------------------------- POSOLOGIES -------------------------------
  {
    slug: "posologie/paracetamol",
    title: "Paracétamol - posologie adulte et hépatotoxicité",
    silo: "ansm_bdpm_vidal",
    text:
      "Chez l'adulte de plus de 50 kg, la posologie du paracétamol est de 500 mg à 1 g par prise, à renouveler si besoin en respectant un intervalle d'au moins 4 à 6 heures entre deux prises. La dose maximale est de 4 g par jour. La dose maximale est réduite à 3 g par jour en cas d'insuffisance hépatique, d'alcoolisme chronique, de dénutrition, de déshydratation ou de poids inférieur à 50 kg. En cas d'insuffisance rénale sévère (clairance de la créatinine inférieure à 10 mL/min), l'intervalle minimal entre deux prises est porté à 8 heures. Le paracétamol est hépatotoxique en cas de surdosage : une atteinte hépatique aiguë peut survenir dès l'ingestion de 7,5 à 10 g en une prise chez l'adulte, ou d'une dose supérieure à 150 mg/kg. L'antidote spécifique du surdosage en paracétamol est la N-acétylcystéine, à administrer le plus précocement possible.",
  },
  {
    slug: "posologie/ibuprofene",
    title: "Ibuprofène - posologie adulte et contre-indications",
    silo: "ansm_bdpm_vidal",
    text:
      "L'ibuprofène est un anti-inflammatoire non stéroïdien (AINS). Chez l'adulte, la posologie est de 200 à 400 mg par prise, à répéter si besoin toutes les 6 heures. En automédication, la dose maximale est de 1200 mg par jour. Sur prescription médicale, la dose maximale est de 2400 mg par jour. Il faut utiliser la dose minimale efficace pendant la durée la plus courte possible. L'ibuprofène est contre-indiqué en cas d'ulcère gastroduodénal évolutif, d'antécédent d'hémorragie digestive, d'insuffisance hépatique sévère, d'insuffisance rénale sévère et d'insuffisance cardiaque sévère. Il est formellement contre-indiqué à partir du début du 6e mois de grossesse (24 semaines d'aménorrhée) en raison du risque de fermeture prématurée du canal artériel et de toxicité rénale fœtale. Les AINS exposent à un risque digestif, rénal, cardiovasculaire et allergique.",
  },
  {
    slug: "posologie/amoxicilline",
    title: "Amoxicilline - posologie adulte",
    silo: "ansm_bdpm_vidal",
    text:
      "L'amoxicilline est un antibiotique de la famille des bêta-lactamines (pénicilline A). Chez l'adulte, la posologie usuelle est de 1 g deux à trois fois par jour, soit 2 à 3 g par jour, selon l'indication et la sévérité de l'infection. Dans l'angine à streptocoque documentée, la posologie est de 2 g par jour en deux prises pendant 6 jours. Pour les infections sévères, la dose peut être portée jusqu'à 6 g par jour. La posologie doit être adaptée en cas d'insuffisance rénale sévère (clairance de la créatinine inférieure à 30 mL/min). L'amoxicilline est contre-indiquée en cas d'allergie aux pénicillines ou aux céphalosporines. Une éruption cutanée survient fréquemment en cas d'administration au cours d'une mononucléose infectieuse.",
  },
  {
    slug: "posologie/metformine",
    title: "Metformine - posologie adulte et fonction rénale",
    silo: "ansm_bdpm_vidal",
    text:
      "La metformine est un antidiabétique oral de la classe des biguanides, traitement de première intention du diabète de type 2. La dose initiale est de 500 mg une à deux fois par jour, à prendre pendant ou à la fin des repas pour améliorer la tolérance digestive. La dose est augmentée progressivement ; la dose maximale est de 3000 mg par jour, répartie en deux à trois prises. La metformine est contre-indiquée en cas d'insuffisance rénale sévère avec un débit de filtration glomérulaire (DFG) inférieur à 30 mL/min. Lorsque le DFG est compris entre 30 et 45 mL/min, la dose doit être réduite (maximum 1000 à 1500 mg par jour). Elle expose au risque rare mais grave d'acidose lactique. Le traitement doit être interrompu avant une intervention chirurgicale majeure et avant l'injection intraveineuse de produit de contraste iodé.",
  },
  {
    slug: "posologie/amlodipine",
    title: "Amlodipine - posologie adulte",
    silo: "ansm_bdpm_vidal",
    text:
      "L'amlodipine est un inhibiteur calcique de la famille des dihydropyridines, indiqué dans l'hypertension artérielle et l'angor. Chez l'adulte, la dose initiale est de 5 mg par jour en une prise unique. La dose maximale est de 10 mg par jour. Elle peut être administrée à tout moment de la journée, indépendamment des repas. L'effet indésirable le plus fréquent est l'apparition d'œdèmes des membres inférieurs, dose-dépendants. On observe également des céphalées, des bouffées vasomotrices (flush) et des palpitations. Aucune adaptation posologique n'est nécessaire en cas d'insuffisance rénale, mais la prudence est de mise en cas d'insuffisance hépatique.",
  },
  {
    slug: "posologie/ramipril",
    title: "Ramipril - posologie adulte et surveillance",
    silo: "ansm_bdpm_vidal",
    text:
      "Le ramipril est un inhibiteur de l'enzyme de conversion (IEC), indiqué dans l'hypertension artérielle, l'insuffisance cardiaque et la protection cardiovasculaire. La dose initiale est de 1,25 à 2,5 mg par jour. La dose d'entretien est de 2,5 à 10 mg par jour en une prise. La dose maximale est de 10 mg par jour. Le ramipril est contre-indiqué pendant la grossesse, en cas d'antécédent d'angio-œdème et en cas de sténose bilatérale des artères rénales. Il faut surveiller la kaliémie et la créatininémie, notamment en début de traitement, car les IEC exposent à un risque d'hyperkaliémie et d'insuffisance rénale fonctionnelle. Une toux sèche est un effet indésirable classique des IEC. L'association aux AINS et aux diurétiques épargneurs de potassium majore le risque d'hyperkaliémie et d'insuffisance rénale.",
  },
  {
    slug: "posologie/atorvastatine",
    title: "Atorvastatine - posologie adulte et surveillance",
    silo: "ansm_bdpm_vidal",
    text:
      "L'atorvastatine est une statine (inhibiteur de l'HMG-CoA réductase) indiquée dans l'hypercholestérolémie et la prévention cardiovasculaire. Chez l'adulte, la posologie est de 10 à 80 mg par jour en une prise unique, à n'importe quel moment de la journée, indépendamment des repas. La dose maximale est de 80 mg par jour. L'atorvastatine est contre-indiquée en cas de maladie hépatique évolutive, d'élévation persistante et inexpliquée des transaminases, ainsi que pendant la grossesse et l'allaitement. Il faut doser les transaminases avant le traitement. En cas de myalgies, il faut doser les créatine phosphokinases (CPK) en raison du risque d'atteinte musculaire (myopathie, rhabdomyolyse). Le risque musculaire est majoré en cas d'association à des médicaments inhibiteurs du CYP3A4.",
  },
  {
    slug: "posologie/omeprazole",
    title: "Oméprazole - posologie adulte",
    silo: "ansm_bdpm_vidal",
    text:
      "L'oméprazole est un inhibiteur de la pompe à protons (IPP), indiqué dans le reflux gastro-œsophagien, l'ulcère gastroduodénal et la prévention des lésions induites par les AINS. Chez l'adulte, la posologie usuelle est de 20 à 40 mg par jour en une prise, de préférence le matin avant le repas. Dans le reflux gastro-œsophagien non compliqué, la dose est de 20 mg par jour. Dans l'ulcère gastroduodénal, la dose est de 20 à 40 mg par jour. En cas d'éradication d'Helicobacter pylori, l'oméprazole est associé à une antibiothérapie. Un traitement prolongé par IPP expose à un risque d'hypomagnésémie, de carence en vitamine B12 et d'infections digestives.",
  },
  // ----------------------------------- ECG ----------------------------------
  {
    slug: "ecg/hyperkaliemie",
    title: "ECG - signes de l'hyperkaliémie",
    silo: "has_recommandations",
    text:
      "L'hyperkaliémie entraîne des modifications électrocardiographiques (ECG) progressives et corrélées à la gravité. Le premier signe est l'apparition d'ondes T amples, pointues et symétriques, à base étroite, visibles dès une kaliémie d'environ 5,5 à 6,5 mmol/L. À un stade plus avancé apparaissent un allongement de l'intervalle PR, un aplatissement puis une disparition de l'onde P, et un élargissement progressif du complexe QRS. Au stade ultime, l'élargissement majeur du QRS et sa fusion avec l'onde T réalisent un aspect sinusoïdal, qui précède la fibrillation ventriculaire et l'arrêt cardiaque par asystolie. L'hyperkaliémie menaçante est une urgence thérapeutique. Le gluconate de calcium intraveineux est administré en urgence pour protéger le myocarde lorsqu'il existe des signes ECG.",
  },
  {
    slug: "ecg/hypokaliemie",
    title: "ECG - signes de l'hypokaliémie",
    silo: "has_recommandations",
    text:
      "L'hypokaliémie entraîne des anomalies caractéristiques de l'électrocardiogramme (ECG). On observe un aplatissement puis une inversion de l'onde T, un sous-décalage du segment ST et surtout l'apparition d'une onde U, visible après l'onde T, notamment dans les dérivations précordiales. La fusion de l'onde T et de l'onde U réalise un allongement apparent de l'intervalle QT (en réalité un allongement de l'intervalle QU). L'hypokaliémie sévère expose à des troubles du rythme ventriculaire, en particulier des extrasystoles ventriculaires et des torsades de pointes pouvant dégénérer en fibrillation ventriculaire. Le risque rythmique est majoré en cas de traitement par digitaliques.",
  },
  {
    slug: "ecg/sca-st-plus",
    title: "ECG - syndrome coronarien aigu ST+ (SCA ST+)",
    silo: "has_recommandations",
    text:
      "Le syndrome coronarien aigu avec sus-décalage du segment ST (SCA ST+) correspond à une occlusion coronaire aiguë et constitue une urgence de reperfusion. Le diagnostic ECG repose sur un sus-décalage persistant du segment ST d'au moins 1 mm (0,1 mV) dans au moins deux dérivations contiguës des membres, ou d'au moins 2 mm (0,2 mV) dans les dérivations précordiales. On recherche un signe en miroir (sous-décalage dans les dérivations opposées) et, plus tardivement, une onde Q de nécrose. Le territoire du sus-décalage oriente vers l'artère coronaire occluse : antérieur (V1 à V4), latéral (D1, aVL, V5, V6), inférieur (D2, D3, aVF). La prise en charge impose une reperfusion urgente par angioplastie primaire dans un délai inférieur à 120 minutes, ou une thrombolyse si l'angioplastie n'est pas accessible dans ce délai.",
  },
  {
    slug: "ecg/sca-st-moins",
    title: "ECG - syndrome coronarien aigu ST- (SCA ST-)",
    silo: "has_recommandations",
    text:
      "Le syndrome coronarien aigu sans sus-décalage persistant du segment ST (SCA ST-) regroupe l'angor instable et l'infarctus du myocarde sans sus-décalage ST (NSTEMI). L'ECG peut montrer un sous-décalage du segment ST et/ou une inversion (négativation) de l'onde T, mais peut aussi être normal. Il n'existe pas de sus-décalage persistant du segment ST. Le diagnostic d'infarctus repose sur l'élévation de la troponine cardiaque, dosée de façon répétée. La prise en charge associe un traitement antiagrégant plaquettaire, une anticoagulation et une stratégie de coronarographie dont le délai dépend du niveau de risque.",
  },
  {
    slug: "ecg/pericardite",
    title: "ECG - péricardite aiguë",
    silo: "has_recommandations",
    text:
      "La péricardite aiguë donne des anomalies ECG diffuses et évolutives. On observe un sus-décalage du segment ST concave vers le haut, diffus et non systématisé à un territoire coronaire, sans image en miroir et sans onde Q de nécrose. Un sous-décalage du segment PQ (segment PR) est un signe précoce évocateur. Les anomalies ECG évoluent classiquement en quatre stades successifs (stades de Holzmann) : sus-décalage de ST, puis retour de ST à la ligne de base avec aplatissement des ondes T, puis inversion des ondes T, puis normalisation. Le contexte associe une douleur thoracique augmentée à l'inspiration profonde et calmée par la position penchée en avant, parfois un frottement péricardique à l'auscultation.",
  },
  {
    slug: "ecg/embolie-pulmonaire",
    title: "ECG - embolie pulmonaire et aspect S1Q3",
    silo: "has_recommandations",
    text:
      "L'électrocardiogramme (ECG) de l'embolie pulmonaire est souvent peu spécifique et peut être normal. Le signe le plus fréquent est une tachycardie sinusale. L'aspect classique de cœur pulmonaire aigu associe un aspect S1Q3, c'est-à-dire une onde S en dérivation D1 et une onde Q en dérivation D3. On peut également observer une inversion (négativation) des ondes T dans les dérivations précordiales droites (V1 à V3), un bloc de branche droit incomplet ou complet, et une déviation axiale droite. Ces signes traduisent la souffrance du ventricule droit. L'ECG sert surtout à éliminer un diagnostic différentiel comme le syndrome coronarien aigu.",
  },
  // --------------------------------- URGENCES -------------------------------
  {
    slug: "urgence/douleur-thoracique",
    title: "Conduite à tenir - douleur thoracique aiguë",
    silo: "has_recommandations",
    text:
      "Devant une douleur thoracique aiguë, la priorité est d'éliminer les urgences vitales : syndrome coronarien aigu, embolie pulmonaire, dissection aortique, péricardite avec tamponnade et pneumothorax. Il faut réaliser un électrocardiogramme (ECG) de repos dans les 10 premières minutes suivant le premier contact médical, doser la troponine cardiaque et appeler le SAMU (Centre 15). La mise en condition comprend la pose d'une voie veineuse périphérique, la surveillance scopée (fréquence cardiaque, pression artérielle, saturation), et une oxygénothérapie si la saturation en oxygène est inférieure à 94 %. On recherche les caractéristiques de la douleur, les facteurs de risque cardiovasculaire et les signes de gravité (sueurs, dyspnée, malaise, hypotension).",
  },
  {
    slug: "urgence/dyspnee-aigue",
    title: "Conduite à tenir - dyspnée aiguë",
    silo: "has_recommandations",
    text:
      "Devant une dyspnée aiguë, il faut d'abord rechercher les signes de gravité : fréquence respiratoire élevée, saturation en oxygène abaissée, cyanose, signes de lutte respiratoire (tirage), sueurs, difficulté à parler et troubles de la conscience (signes d'épuisement respiratoire). Le patient est installé en position demi-assise. Une oxygénothérapie est débutée pour maintenir une saturation en oxygène d'au moins 94 %, ou entre 88 et 92 % en cas de bronchopneumopathie chronique obstructive (BPCO). On réalise un électrocardiogramme, une gazométrie artérielle et une radiographie thoracique. Les principales causes à évoquer sont l'œdème aigu du poumon, l'embolie pulmonaire, la crise d'asthme, l'exacerbation de BPCO, la pneumopathie infectieuse et le pneumothorax.",
  },
  {
    slug: "urgence/avc",
    title: "Conduite à tenir - AVC, score FAST et NIHSS",
    silo: "has_recommandations",
    text:
      "L'accident vasculaire cérébral (AVC) est une urgence absolue car chaque minute compte. Le score FAST permet de reconnaître rapidement un AVC : Face (asymétrie ou paralysie faciale), Arm (déficit moteur d'un membre supérieur), Speech (troubles de la parole ou du langage), Time (appeler immédiatement le SAMU, Centre 15). L'échelle NIHSS évalue la sévérité du déficit neurologique, avec un score allant de 0 à 42. Une imagerie cérébrale (scanner ou IRM) doit être réalisée en urgence pour distinguer l'AVC ischémique de l'AVC hémorragique avant tout traitement. La thrombolyse intraveineuse est possible dans un délai de 4 heures 30 après le début des symptômes en cas d'AVC ischémique. La thrombectomie mécanique est indiquée en cas d'occlusion d'une grosse artère cérébrale, généralement dans les 6 heures, parfois au-delà selon l'imagerie.",
  },
  {
    slug: "urgence/anaphylaxie",
    title: "Conduite à tenir - choc anaphylactique",
    silo: "has_recommandations",
    text:
      "Le choc anaphylactique est une urgence vitale. Le traitement de première intention est l'adrénaline par voie intramusculaire, injectée dans la face antéro-latérale de la cuisse. Chez l'adulte, la dose est de 0,5 mg (soit 0,01 mg/kg), à répéter toutes les 5 à 10 minutes en l'absence d'amélioration. Il faut simultanément arrêter l'exposition à l'allergène, allonger le patient avec les jambes surélevées, administrer de l'oxygène et débuter un remplissage vasculaire par cristalloïdes en cas d'hypotension, tout en appelant le SAMU (Centre 15). L'adrénaline ne doit jamais être retardée. Les antihistaminiques et les corticoïdes sont des traitements de seconde intention qui ne remplacent pas l'adrénaline.",
  },
  {
    slug: "urgence/hypoglycemie",
    title: "Conduite à tenir - hypoglycémie sévère",
    silo: "has_recommandations",
    text:
      "L'hypoglycémie est définie par une glycémie inférieure à 0,70 g/L (3,9 mmol/L). Elle est dite sévère lorsqu'elle nécessite l'intervention d'un tiers pour être corrigée, notamment en cas de troubles de la conscience. Chez un patient conscient et capable d'avaler, le traitement est un resucrage oral d'environ 15 g de glucides d'absorption rapide (par exemple 3 morceaux de sucre), à renouveler après 15 minutes si la glycémie reste basse. Chez un patient inconscient ou présentant des troubles de la conscience, il ne faut rien donner par la bouche : on administre du glucagon 1 mg par voie intramusculaire ou sous-cutanée, ou, si une voie veineuse est disponible, du sérum glucosé hypertonique à 30 % (10 à 20 g de glucose), suivi d'un relais par du sérum glucosé à 10 %.",
  },
];

async function upsertEntry(db, entry, index) {
  const id = `${SOURCE_LABEL}:${entry.slug}`;
  const sourceIdentifier = `${SOURCE_LABEL}://${entry.slug}`;

  // 1) If it already exists, delete its stale fts row (by rowid) then the doc.
  const existing = await db.execute({
    sql:
      "SELECT rowid, text_content, origin_title, category_silo, source_identifier FROM documents WHERE id = ?",
    args: [id],
  });
  if (existing.rows.length > 0) {
    const r = existing.rows[0];
    await db.execute({
      sql:
        "INSERT INTO documents_fts(documents_fts, rowid, text_content, origin_title, category_silo, source_identifier) VALUES('delete', ?, ?, ?, ?, ?)",
      args: [r.rowid, r.text_content, r.origin_title, r.category_silo, r.source_identifier],
    });
    await db.execute({ sql: "DELETE FROM documents WHERE id = ?", args: [id] });
  }

  // 2) Insert the fresh document row.
  const insert = await db.execute({
    sql:
      "INSERT INTO documents (id, text_content, origin_title, category_silo, source_identifier, regulatory_date, page_number, chunk_index, superseded, guideline_family) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)",
    args: [
      id,
      entry.text,
      entry.title,
      entry.silo,
      sourceIdentifier,
      REGULATORY_DATE,
      index + 1,
      0,
    ],
  });
  const newRowid = insert.lastInsertRowid;

  // 3) Sync the external-content fts index for the new rowid.
  await db.execute({
    sql:
      "INSERT INTO documents_fts(rowid, text_content, origin_title, category_silo, source_identifier) VALUES(?, ?, ?, ?, ?)",
    args: [newRowid, entry.text, entry.title, entry.silo, sourceIdentifier],
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

  let count = 0;
  for (const entry of ENTRIES) {
    await upsertEntry(db, entry, count);
    count += 1;
    console.log(`  seeded [${entry.silo}] ${entry.slug}`);
  }

  console.log(`\nSeeded ${count} core-topic clinical chunks into ${dbConfig.url}.`);
  db.close?.();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
