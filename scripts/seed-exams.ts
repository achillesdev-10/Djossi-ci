/**
 *  TravaillerEnCi — Seed local des concours (démonstration)
 *  Chemin : scripts/seed-exams.ts
 *
 *  ⚠️ DONNÉES DE DÉMONSTRATION uniquement : ces concours sont des exemples
 *  réalistes (ENA, INFAS, CAFOP, gendarmerie…) avec des dates relatives à
 *  aujourd'hui, pour que la page /concours affiche du contenu en local.
 *  En production, les concours proviennent du scraper officiel
 *  (`python scraper/exams_runner.py`) et sont modérés dans /admin/exams.
 *
 *  USAGE :
 *    npx tsx scripts/seed-exams.ts
 */

import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

const DB_PATH = resolve(process.cwd(), 'data', 'travaillerenci.sqlite3');

interface SeedExam {
  title: string;
  organizer: string;
  category: string;
  exam_type: string;
  description_md: string;
  registration_start: number | null; // offset en jours par rapport à aujourd'hui
  registration_end: number | null;
  exam_date: number | null;
  results_date: number | null;
  age_min: number | null;
  age_max: number | null;
  diplomas: string[];
  positions_count: number | null;
  registration_fee: string | null;
  location: string | null;
  source_url: string;
  source_website: string;
  confidence: string;
  created_days_ago: number;
}

const EXAMPLES: SeedExam[] = [
  {
    title: 'Concours direct ENA — Cycle Moyen Supérieur',
    organizer: "École Nationale d'Administration (ENA)",
    category: 'administratif',
    exam_type: 'concours_direct',
    description_md:
      '## Présentation\nLe concours direct d’entrée au Cycle Moyen Supérieur de l’ENA est ouvert aux candidats ivoiriens titulaires d’une Licence ou d’un Master.\n\n## Conditions\n- Être de nationalité ivoirienne\n- Âgé de 22 à 35 ans au 31 décembre de l’année en cours\n- Être titulaire d’une Licence ou d’un Master\n\n## Inscriptions\nLes inscriptions se font exclusivement en ligne sur le Guichet Unique des Concours Administratifs. Le dossier de candidature comprend la quittance de paiement des frais d’inscription et les pièces justificatives.',
    registration_start: -20,
    registration_end: 35,
    exam_date: 75,
    results_date: null,
    age_min: 22,
    age_max: 35,
    diplomas: ['LICENCE', 'MASTER'],
    positions_count: 120,
    registration_fee: '15 000 Fcfa',
    location: 'Abidjan',
    source_url: 'https://gucaci.ciconcours.com',
    source_website: 'Guichet Unique des Concours (GUCACI)',
    confidence: 'high',
    created_days_ago: 2,
  },
  {
    title: 'Concours CAFOP — Instituteurs adjoints',
    organizer: "Ministère de l'Éducation Nationale — DECO",
    category: 'enseignement',
    exam_type: 'concours_direct',
    description_md:
      '## Présentation\nLe concours d’entrée au CAFOP pour la formation des instituteurs adjoints est ouvert aux titulaires du BEPC.\n\n## Conditions\n- Être de nationalité ivoirienne\n- Âgé de 18 à 30 ans\n- Être titulaire du BEPC ou d’un diplôme équivalent\n\n## Inscriptions\nLes inscriptions en ligne se font via le Guichet Unique des Concours Administratifs, suivies du dépôt du dossier physique au CAFOP de votre région.',
    registration_start: -15,
    registration_end: 30,
    exam_date: 55,
    results_date: null,
    age_min: 18,
    age_max: 30,
    diplomas: ['BEPC'],
    positions_count: 800,
    registration_fee: '10 000 Fcfa',
    location: 'Toutes les régions',
    source_url: 'https://www.men-deco.org',
    source_website: 'Ministère de l’Éducation Nationale (DECO)',
    confidence: 'high',
    created_days_ago: 4,
  },
  {
    title: "Concours d'entrée INFAS — Sciences infirmières",
    organizer: 'INFAS — Institut National de Formation des Agents de Santé',
    category: 'sante',
    exam_type: 'entree_ecole',
    description_md:
      '## Présentation\nLe concours d’entrée à l’INFAS est ouvert pour la filière Sciences infirmières (cycle préparatoire).\n\n## Conditions\n- Être de nationalité ivoirienne\n- Âgé de 18 à 30 ans\n- Être titulaire du Baccalauréat (série D, C ou E)\n\n## Inscriptions\nLa préinscription en ligne se fait sur la plateforme de l’INFAS. La liste des admis aux épreuves écrites est publiée sur le site officiel.',
    registration_start: -5,
    registration_end: 40,
    exam_date: 80,
    results_date: null,
    age_min: 18,
    age_max: 30,
    diplomas: ['BAC'],
    positions_count: 450,
    registration_fee: '15 000 Fcfa',
    location: 'Abidjan, Bouaké, Korhogo',
    source_url: 'https://infas.ciconcours.com',
    source_website: 'INFAS',
    confidence: 'high',
    created_days_ago: 1,
  },
  {
    title: 'Concours des Douanes ivoiriennes — Agents de constatation',
    organizer: 'Direction Générale des Douanes',
    category: 'administratif',
    exam_type: 'recrutement_nouveau',
    description_md:
      '## Présentation\nLa Direction Générale des Douanes recrute des agents de constatation par concours direct.\n\n## Conditions\n- Être de nationalité ivoirienne\n- Âgé de 18 à 30 ans au 31 décembre de l’année en cours\n- Être titulaire du BAC, du BTS ou du DUT\n\n## Inscriptions\nLes inscriptions sont ouvertes uniquement en ligne sur la plateforme officielle des concours des douanes. Les épreuves écrites se dérouleront à Abidjan.',
    registration_start: 3,
    registration_end: 55,
    exam_date: 95,
    results_date: null,
    age_min: 18,
    age_max: 30,
    diplomas: ['BAC', 'BTS/DUT'],
    positions_count: 200,
    registration_fee: '12 000 Fcfa',
    location: 'Abidjan',
    source_url: 'https://www.douanes.ci',
    source_website: 'Direction Générale des Douanes',
    confidence: 'medium',
    created_days_ago: 6,
  },
  {
    title: 'Concours Gendarmerie Nationale — Sous-officiers',
    organizer: 'Ministère de la Défense',
    category: 'militaire',
    exam_type: 'recrutement_nouveau',
    description_md:
      '## Présentation\nLe concours de recrutement des sous-officiers de la Gendarmerie Nationale est ouvert aux jeunes ivoiriens.\n\n## Conditions\n- Être de nationalité ivoirienne\n- Âgé de 18 à 25 ans au 31 décembre de l’année en cours\n- Être titulaire du BEPC\n\n## Épreuves\nLes épreuves écrites sont prévues en septembre. Les candidats retenus subiront ensuite les épreuves sportives et la visite médicale.',
    registration_start: -30,
    registration_end: -7,
    exam_date: 40,
    results_date: null,
    age_min: 18,
    age_max: 25,
    diplomas: ['BEPC'],
    positions_count: 1500,
    registration_fee: null,
    location: 'Abidjan et provinces',
    source_url: 'https://concours-defense.ciconcours.com',
    source_website: 'Ministère de la Défense',
    confidence: 'high',
    created_days_ago: 10,
  },
  {
    title: 'Concours direct ENA — Cycle Supérieur',
    organizer: "École Nationale d'Administration (ENA)",
    category: 'administratif',
    exam_type: 'concours_direct',
    description_md:
      '## Présentation\nLe concours direct d’entrée au Cycle Supérieur de l’ENA est ouvert aux titulaires d’un Master.\n\n## Conditions\n- Être de nationalité ivoirienne\n- Âgé de 23 à 38 ans au 31 décembre de l’année en cours\n- Être titulaire d’un Master ou d’un diplôme jugé équivalent\n\n## Inscriptions\nLes inscriptions seront ouvertes sur le Guichet Unique des Concours Administratifs. Les épreuves écrites et orales se dérouleront à l’ENA d’Abidjan.',
    registration_start: 55,
    registration_end: 115,
    exam_date: 160,
    results_date: null,
    age_min: 23,
    age_max: 38,
    diplomas: ['MASTER'],
    positions_count: 60,
    registration_fee: '15 000 Fcfa',
    location: 'Abidjan',
    source_url: 'https://gucaci.ciconcours.com',
    source_website: 'Guichet Unique des Concours (GUCACI)',
    confidence: 'high',
    created_days_ago: 12,
  },
  {
    title: "Concours INJS — Professeurs d'éducation physique (PC-EPS)",
    organizer: 'INJS — Institut National de la Jeunesse et des Sports',
    category: 'enseignement',
    exam_type: 'concours_direct',
    description_md:
      '## Présentation\nLe concours d’entrée à l’INJS pour la filière PC-EPS forme les futurs professeurs d’éducation physique et sportive.\n\n## Conditions\n- Être de nationalité ivoirienne\n- Âgé de 17 à 24 ans\n- Être titulaire du Baccalauréat\n\n## Inscriptions\nLes candidatures se font en ligne sur la plateforme de l’INJS. Les épreuves sportives et la visite médicale complètent les épreuves écrites.',
    registration_start: -25,
    registration_end: 15,
    exam_date: 45,
    results_date: null,
    age_min: 17,
    age_max: 24,
    diplomas: ['BAC'],
    positions_count: 150,
    registration_fee: '12 000 Fcfa',
    location: 'Abidjan',
    source_url: 'https://concours.injsabidjan.ci',
    source_website: 'INJS',
    confidence: 'medium',
    created_days_ago: 3,
  },
  {
    title: 'Concours ENSOA Zambakro — Élèves sous-officiers',
    organizer: 'Ministère de la Défense',
    category: 'militaire',
    exam_type: 'recrutement_nouveau',
    description_md:
      '## Présentation\nLe concours d’entrée à l’ENSOA de Zambakro est ouvert pour la formation des élèves sous-officiers d’active.\n\n## Conditions\n- Être de nationalité ivoirienne\n- Âgé de 18 à 23 ans au 31 décembre de l’année en cours\n- Être titulaire du BEPC\n\n## Inscriptions\nLes inscriptions seront ouvertes sur la plateforme des concours militaires. Le concours comprend des épreuves écrites, sportives et une visite médicale.',
    registration_start: 8,
    registration_end: 60,
    exam_date: 100,
    results_date: null,
    age_min: 18,
    age_max: 23,
    diplomas: ['BEPC'],
    positions_count: 800,
    registration_fee: null,
    location: 'Zambakro',
    source_url: 'https://concours-defense.ciconcours.com',
    source_website: 'Ministère de la Défense',
    confidence: 'medium',
    created_days_ago: 8,
  },
  {
    title: 'Concours INSFS — Travailleurs sociaux',
    organizer: 'INSFS — Institut National Supérieur de Formation Sociale',
    category: 'sante',
    exam_type: 'concours_direct',
    description_md:
      '## Présentation\nLe concours d’entrée à l’INSFS est ouvert pour les filières de travailleurs sociaux et d’éducateurs préscolaires.\n\n## Conditions\n- Être de nationalité ivoirienne\n- Âgé de 18 à 30 ans\n- Être titulaire du Baccalauréat\n\n## Inscriptions\nLes préinscriptions seront ouvertes sur la plateforme de l’INSFS. Les épreuves écrites se dérouleront dans les centres d’examen des chefs-lieux de région.',
    registration_start: 35,
    registration_end: 75,
    exam_date: 115,
    results_date: null,
    age_min: 18,
    age_max: 30,
    diplomas: ['BAC'],
    positions_count: 180,
    registration_fee: '15 000 Fcfa',
    location: 'Abidjan',
    source_url: 'https://insfs.ciconcours.com',
    source_website: 'INSFS',
    confidence: 'medium',
    created_days_ago: 9,
  },
  {
    title: 'Concours INFAS 2025 — Résultats des épreuves',
    organizer: 'INFAS — Institut National de Formation des Agents de Santé',
    category: 'sante',
    exam_type: 'examen',
    description_md:
      '## Résultats\nLes résultats des épreuves écrites du concours d’entrée à l’INFAS 2025 sont publiés. Les candidats admis sont invités à compléter leur dossier d’inscription pédagogique auprès de leur école d’affectation.\n\nLes recours sont recevables dans un délai de dix jours auprès du secrétariat général de l’Institut.',
    registration_start: -200,
    registration_end: -150,
    exam_date: -140,
    results_date: -5,
    age_min: 18,
    age_max: 30,
    diplomas: ['BAC'],
    positions_count: 450,
    registration_fee: '15 000 Fcfa',
    location: 'Abidjan, Bouaké, Korhogo',
    source_url: 'https://infas.ciconcours.com',
    source_website: 'INFAS',
    confidence: 'high',
    created_days_ago: 30,
  },
  {
    title: 'Concours direct de la Fonction Publique — Grades D1 à A3',
    organizer: "Ministère de la Fonction Publique et de la Modernisation de l'Administration",
    category: 'administratif',
    exam_type: 'recrutement_nouveau',
    description_md:
      '## Présentation\nLes concours administratifs sont ouverts pour le recrutement dans les grades D1 à A3 de la Fonction Publique ivoirienne.\n\n## Conditions\n- Être de nationalité ivoirienne\n- Âgé de 18 à 35 ans selon le grade\n- Être titulaire du BEPC, du BAC ou de la Licence selon le grade visé\n\n## Épreuves\nLes inscriptions en ligne sont closes. Les épreuves écrites sont prévues dans les centres d’examen d’Abidjan, Bouaké, Daloa et Korhogo.',
    registration_start: -40,
    registration_end: -10,
    exam_date: 20,
    results_date: null,
    age_min: 18,
    age_max: 35,
    diplomas: ['BEPC', 'BAC', 'LICENCE'],
    positions_count: 2500,
    registration_fee: '15 000 Fcfa',
    location: 'Toute la Côte d’Ivoire',
    source_url: 'https://gucaci.ciconcours.com',
    source_website: 'Guichet Unique des Concours (GUCACI)',
    confidence: 'high',
    created_days_ago: 15,
  },
  {
    title: 'Concours ENM — Magistrature',
    organizer: 'École Nationale de la Magistrature (ENM)',
    category: 'administratif',
    exam_type: 'concours_direct',
    description_md:
      '## Présentation\nLe concours d’entrée à l’École Nationale de la Magistrature est ouvert aux titulaires d’un Master en droit.\n\n## Conditions\n- Être de nationalité ivoirienne\n- Âgé de 25 à 40 ans\n- Être titulaire d’un Master en droit ou d’un diplôme jugé équivalent\n\n## Inscriptions\nLes inscriptions seront ouvertes sur le Guichet Unique des Concours Administratifs. Le concours comporte des épreuves écrites d’admissibilité puis un oral d’admission.',
    registration_start: 85,
    registration_end: 130,
    exam_date: 175,
    results_date: null,
    age_min: 25,
    age_max: 40,
    diplomas: ['MASTER'],
    positions_count: 40,
    registration_fee: '20 000 Fcfa',
    location: 'Abidjan',
    source_url: 'https://gucaci.ciconcours.com',
    source_website: 'Guichet Unique des Concours (GUCACI)',
    confidence: 'medium',
    created_days_ago: 18,
  },
  {
    title: 'Concours AFA Zambakro — Élèves officiers',
    organizer: 'Ministère de la Défense',
    category: 'militaire',
    exam_type: 'recrutement_nouveau',
    description_md:
      '## Présentation\nLe concours d’entrée à l’Académie des Forces Armées (AFA) de Zambakro est ouvert pour la formation des élèves officiers.\n\n## Conditions\n- Être de nationalité ivoirienne\n- Âgé de 18 à 24 ans\n- Être titulaire du Baccalauréat\n\n## Inscriptions\nLes inscriptions seront ouvertes sur la plateforme des concours militaires. Les candidats passeront les épreuves écrites, sportives, puis la visite médicale.',
    registration_start: 15,
    registration_end: 70,
    exam_date: 110,
    results_date: null,
    age_min: 18,
    age_max: 24,
    diplomas: ['BAC'],
    positions_count: 300,
    registration_fee: null,
    location: 'Zambakro',
    source_url: 'https://concours-defense.ciconcours.com',
    source_website: 'Ministère de la Défense',
    confidence: 'medium',
    created_days_ago: 7,
  },
  {
    title: 'Concours ENA 2025 — Session terminée',
    organizer: "École Nationale d'Administration (ENA)",
    category: 'administratif',
    exam_type: 'concours_direct',
    description_md:
      '## Session terminée\nLa session 2025 du concours direct de l’ENA est clôturée. Les listes définitives des admis ont été publiées sur le site de l’École et au Guichet Unique des Concours Administratifs.\n\nLa prochaine session 2026 sera annoncée sur cette page dès publication du communiqué officiel.',
    registration_start: -400,
    registration_end: -380,
    exam_date: -370,
    results_date: -300,
    age_min: 22,
    age_max: 35,
    diplomas: ['LICENCE'],
    positions_count: 120,
    registration_fee: '15 000 Fcfa',
    location: 'Abidjan',
    source_url: 'https://www.ena.ci',
    source_website: 'ENA',
    confidence: 'high',
    created_days_ago: 60,
  },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function main() {
  const db = new DatabaseSync(DB_PATH);

  // Schéma miroir de l'ExamService (au cas où la BDD serait fraîche).
  db.exec(`
    CREATE TABLE IF NOT EXISTS exams (
      id                  TEXT PRIMARY KEY,
      title               TEXT NOT NULL,
      slug                TEXT,
      organizer           TEXT NOT NULL,
      category            TEXT NOT NULL DEFAULT 'administratif',
      exam_type           TEXT,
      status              TEXT NOT NULL DEFAULT 'pending',
      description_md      TEXT NOT NULL DEFAULT '',
      registration_start  TEXT,
      registration_end    TEXT,
      exam_date           TEXT,
      results_date        TEXT,
      age_min             INTEGER,
      age_max             INTEGER,
      age_reference_date  TEXT,
      nationality         TEXT,
      diplomas            TEXT NOT NULL DEFAULT '[]',
      min_diploma_level   INTEGER,
      positions_count     INTEGER,
      registration_fee    TEXT,
      location            TEXT,
      cities              TEXT NOT NULL DEFAULT '[]',
      documents           TEXT NOT NULL DEFAULT '[]',
      source_url          TEXT,
      source_website      TEXT,
      confidence          TEXT NOT NULL DEFAULT 'medium',
      views_count         INTEGER NOT NULL DEFAULT 0,
      is_verified         INTEGER NOT NULL DEFAULT 0,
      seo_title           TEXT,
      seo_description     TEXT,
      seo_keywords        TEXT,
      published_at        TEXT,
      created_at          TEXT NOT NULL,
      updated_at          TEXT NOT NULL
    );
  `);

  // 1. Nettoyage : suppression de l'enregistrement de test (ex. « ENA — test »).
  const removed = db
    .prepare(`DELETE FROM exams WHERE title LIKE '%test%' OR slug LIKE '%test%' OR organizer LIKE '%test%'`)
    .run();
  console.log(`🧹 ${removed.changes} enregistrement(s) de test supprimé(s).`);

  // 2. Nettoyage du seed précédent (slugs du jeu de démo, suffixés par l'ID)
  //    pour une exécution idempotente.
  const demoSlugs = EXAMPLES.map((e) => `${slugify(`${e.title} ${e.organizer}`)}-%`);
  const stmtSlug = db.prepare(
    `DELETE FROM exams WHERE ` + demoSlugs.map(() => 'slug LIKE ?').join(' OR '),
  );
  const removedDemo = stmtSlug.run(...demoSlugs);
  if (removedDemo.changes > 0) {
    console.log(`🧹 ${removedDemo.changes} enregistrement(s) du seed précédent remplacé(s).`);
  }

  // 3. Insertion du jeu de démonstration.
  const now = Date.now();
  const DAY = 86_400_000;
  const iso = (offset: number | null): string | null =>
    offset === null ? null : new Date(now + offset * DAY).toISOString();

  const insert = db.prepare(`
    INSERT INTO exams (
      id, title, slug, organizer, category, exam_type, status, description_md,
      registration_start, registration_end, exam_date, results_date,
      age_min, age_max, age_reference_date, nationality, diplomas, min_diploma_level,
      positions_count, registration_fee, location, cities, documents,
      source_url, source_website, confidence, views_count, is_verified,
      seo_title, seo_description, seo_keywords, published_at, created_at, updated_at
    ) VALUES (
      $id, $title, $slug, $organizer, $category, $exam_type, 'published', $description_md,
      $registration_start, $registration_end, $exam_date, $results_date,
      $age_min, $age_max, $age_reference_date, $nationality, $diplomas, $min_diploma_level,
      $positions_count, $registration_fee, $location, '[]', '[]',
      $source_url, $source_website, $confidence, 0, 1,
      $seo_title, $seo_description, $seo_keywords, $published_at, $created_at, $updated_at
    )
  `);

  const LEVELS: Record<string, number> = {
    CEPE: 1, BEPC: 2, 'CAP/BEP': 3, BAC: 4, 'BTS/DUT': 5, LICENCE: 6, MASTER: 7,
  };

  for (const e of EXAMPLES) {
    const id = randomUUID();
    const slug = `${slugify(`${e.title} ${e.organizer}`)}-${id.slice(0, 6)}`;
    const created = iso(-e.created_days_ago)!;
    const levels = e.diplomas.map((d) => LEVELS[d] ?? null).filter((l): l is number => l !== null);

    insert.run({
      $id: id,
      $title: e.title,
      $slug: slug,
      $organizer: e.organizer,
      $category: e.category,
      $exam_type: e.exam_type,
      $description_md: e.description_md,
      $registration_start: iso(e.registration_start),
      $registration_end: iso(e.registration_end),
      $exam_date: iso(e.exam_date),
      $results_date: iso(e.results_date),
      $age_min: e.age_min,
      $age_max: e.age_max,
      $age_reference_date: '31 décembre de l’année en cours',
      $nationality: 'Ivoirienne',
      $diplomas: JSON.stringify(e.diplomas),
      $min_diploma_level: levels.length ? Math.min(...levels) : null,
      $positions_count: e.positions_count,
      $registration_fee: e.registration_fee,
      $location: e.location,
      $source_url: e.source_url,
      $source_website: e.source_website,
      $confidence: e.confidence,
      $seo_title: `${e.title} | TravaillerEnCi`,
      $seo_description: e.description_md.replace(/\*\*/g, '').replace(/#/g, '').slice(0, 170),
      $seo_keywords: `concours, ${e.organizer}, ${e.category}`,
      $published_at: created,
      $created_at: created,
      $updated_at: created,
    });
  }

  // 4. Récapitulatif.
  const total = db.prepare("SELECT COUNT(*) AS n FROM exams WHERE status = 'published'").get() as { n: number };
  const byStatus = db
    .prepare('SELECT status, COUNT(*) AS n FROM exams GROUP BY status ORDER BY n DESC')
    .all() as Array<{ status: string; n: number }>;

  console.log(`\n✅ ${EXAMPLES.length} concours de démonstration insérés.`);
  console.log(`   Total concours « published » : ${total.n}`);
  console.log('   Répartition par statut :', JSON.stringify(byStatus));

  db.close();
}

main();
