/**
 *  TravaillerEnCi — Tests unitaires du calcul de phase « métier » des concours
 *  Chemin : scripts/test-exam-phase.ts
 *
 *  Couvre `examPhase` (src/lib/examConstants.ts) avec tous les cas de dates,
 *  ainsi que `groupExamsByPhase` (src/components/exams/PhaseSection.tsx) qui
 *  regroupe une liste de concours en « En cours / À venir / Clos & résultats ».
 *
 *  USAGE :
 *    npm run test:exam-phase
 *    # ou directement : npx tsx scripts/test-exam-phase.ts
 */

import assert from 'node:assert/strict';
import { examPhase } from '../src/lib/examConstants';
import { groupExamsByPhase } from '../src/components/exams/PhaseSection';
import type { Exam, ExamPhase } from '../src/types/exam';

// -----------------------------------------------------------------------------
// Utilitaires
// -----------------------------------------------------------------------------
const DAY = 86_400_000;
const now = Date.now();
/** Date ISO à N jours d'aujourd'hui (0 = maintenant, négatif = passé). */
const iso = (offsetDays: number): string => new Date(now + offsetDays * DAY).toISOString();

type ExamDates = Parameters<typeof examPhase>[0];

// -----------------------------------------------------------------------------
// examPhase — tous les cas de dates
// -----------------------------------------------------------------------------
const examPhaseCases: Array<{ name: string; exam: ExamDates; expected: ExamPhase }> = [
  // Résultats publiés
  {
    name: 'résultats publiés (inscriptions closes + épreuves passées)',
    exam: { registration_end: iso(-10), exam_date: iso(-5), results_date: iso(-2) },
    expected: 'results',
  },
  {
    name: 'résultats publiés sans autres dates',
    exam: { results_date: iso(-1) },
    expected: 'results',
  },
  // À venir (annoncés)
  {
    name: 'inscriptions pas encore ouvertes (registration_start futur)',
    exam: { registration_start: iso(3), registration_end: iso(40) },
    expected: 'upcoming',
  },
  {
    name: 'annoncé sans aucune date → à venir',
    exam: {},
    expected: 'upcoming',
  },
  {
    name: 'annoncé, épreuves futures, sans date de fin d’inscription → à venir',
    exam: { exam_date: iso(30) },
    expected: 'upcoming',
  },
  {
    name: 'registration_start futur mais registration_end passé (données incohérentes) → à venir',
    exam: { registration_start: iso(5), registration_end: iso(-5) },
    expected: 'upcoming',
  },
  {
    // Petit décalage futur : éviter l'égalité exacte avec Date.now() (résolu
    // à quelques ms près à l'intérieur d'examPhase), source de flakiness.
    name: 'épreuves très prochaines (futur proche) → à venir',
    exam: { exam_date: iso(0.01) },
    expected: 'upcoming',
  },
  // Inscriptions ouvertes
  {
    name: 'inscriptions ouvertes (registration_end futur)',
    exam: { registration_start: iso(-10), registration_end: iso(20) },
    expected: 'open',
  },
  {
    name: 'inscriptions ouvertes malgré des épreuves déjà passées (regEnd prioritaire)',
    exam: { registration_end: iso(10), exam_date: iso(-10) },
    expected: 'open',
  },
  {
    name: 'résultats publiés malgré des inscriptions encore ouvertes (results prioritaire)',
    exam: { registration_end: iso(10), results_date: iso(-2) },
    expected: 'results',
  },
  {
    name: 'inscriptions débutées mais sans date de fin connue → ouvert',
    exam: { registration_start: iso(-10) },
    expected: 'open',
  },
  // En cours
  {
    name: 'inscriptions closes, épreuves à venir → en cours',
    exam: { registration_start: iso(-40), registration_end: iso(-5), exam_date: iso(20) },
    expected: 'ongoing',
  },
  {
    name: 'inscriptions closes, épreuve non renseignée → en cours',
    exam: { registration_end: iso(-5) },
    expected: 'ongoing',
  },
  {
    name: 'inscriptions qui se clôturent aujourd’hui → en cours',
    exam: { registration_end: iso(0), exam_date: iso(15) },
    expected: 'ongoing',
  },
  {
    name: 'résultats futurs + inscriptions closes → en cours',
    exam: { registration_end: iso(-10), results_date: iso(10) },
    expected: 'ongoing',
  },
  // Clos
  {
    name: 'inscriptions closes, épreuves passées → clos',
    exam: { registration_start: iso(-80), registration_end: iso(-40), exam_date: iso(-30) },
    expected: 'closed',
  },
  {
    name: 'épreuves passées sans date de fin d’inscription → clos',
    exam: { exam_date: iso(-30) },
    expected: 'closed',
  },
  // Dates invalides / vides → traitées comme absentes
  {
    name: 'date de fin non ISO (« 15/09/2026 ») → ignorée → à venir',
    exam: { registration_end: '15/09/2026' },
    expected: 'upcoming',
  },
  {
    name: 'champ vide (chaîne) → ignoré → à venir',
    exam: { registration_end: '', registration_start: '' },
    expected: 'upcoming',
  },
  {
    name: 'dates null explicites → à venir',
    exam: { registration_start: null, registration_end: null, exam_date: null, results_date: null },
    expected: 'upcoming',
  },
];

// -----------------------------------------------------------------------------
// groupExamsByPhase — regroupement d'une liste mixte
// -----------------------------------------------------------------------------
function fakeExam(id: string, dates: ExamDates): Exam {
  return {
    id,
    title: `Concours ${id}`,
    slug: null,
    organizer: 'Organisateur test',
    category: 'administratif',
    exam_type: null,
    status: 'published',
    description_md: '',
    registration_start: dates.registration_start ?? null,
    registration_end: dates.registration_end ?? null,
    exam_date: dates.exam_date ?? null,
    results_date: dates.results_date ?? null,
    age_min: null,
    age_max: null,
    age_reference_date: null,
    nationality: null,
    diplomas: [],
    min_diploma_level: null,
    positions_count: null,
    registration_fee: null,
    location: null,
    cities: [],
    documents: [],
    source_url: null,
    source_website: null,
    confidence: 'medium',
    views_count: 0,
    is_verified: true,
    seo_title: null,
    seo_description: null,
    seo_keywords: null,
    published_at: null,
    created_at: new Date(now).toISOString(),
    updated_at: new Date(now).toISOString(),
  };
}

// -----------------------------------------------------------------------------
// Exécution
// -----------------------------------------------------------------------------
let failures = 0;
let totalChecks = 0;

function check(name: string, fn: () => void) {
  totalChecks++;
  try {
    fn();
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failures++;
    console.error(`  ❌ ${name} — ${(err as Error).message}`);
  }
}

console.log(`▶ examPhase (${examPhaseCases.length} cas de dates) :`);
for (const c of examPhaseCases) {
  check(c.name, () => {
    assert.equal(examPhase(c.exam), c.expected, `attendu "${c.expected}"`);
  });
}

console.log('\n▶ groupExamsByPhase (liste mixte) :');
const mixed = [
  fakeExam('open-1', { registration_end: iso(10) }),
  fakeExam('ongoing-1', { registration_end: iso(-5), exam_date: iso(10) }),
  fakeExam('upcoming-1', { registration_start: iso(5) }),
  fakeExam('closed-1', { registration_end: iso(-50), exam_date: iso(-40) }),
  fakeExam('results-1', { results_date: iso(-1) }),
];
check('5 concours répartis en 2 en cours / 1 à venir / 2 archives', () => {
  const g = groupExamsByPhase(mixed);
  assert.deepEqual(
    g.current.map((e) => e.id).sort(),
    ['ongoing-1', 'open-1'],
    'current doit contenir open + ongoing',
  );
  assert.deepEqual(g.upcoming.map((e) => e.id), ['upcoming-1']);
  assert.deepEqual(g.past.map((e) => e.id).sort(), ['closed-1', 'results-1']);
});
check('liste vide → trois groupes vides', () => {
  const g = groupExamsByPhase([]);
  assert.equal(g.current.length, 0);
  assert.equal(g.upcoming.length, 0);
  assert.equal(g.past.length, 0);
});
check('liste non triée → ordre d’entrée conservé dans chaque groupe', () => {
  const g = groupExamsByPhase([mixed[4], mixed[2], mixed[0]]);
  assert.deepEqual(g.past.map((e) => e.id), ['results-1']);
  assert.deepEqual(g.upcoming.map((e) => e.id), ['upcoming-1']);
  assert.deepEqual(g.current.map((e) => e.id), ['open-1']);
});

if (failures > 0) {
  console.error(`\n❌ ${failures} test(s) en échec sur ${totalChecks}.`);
  process.exit(1);
}
console.log(`\n✅ Tous les tests passent (${totalChecks} tests : ${examPhaseCases.length} cas examPhase + ${totalChecks - examPhaseCases.length} cas de regroupement).`);
