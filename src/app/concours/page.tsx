import Link from 'next/link';
import type { Metadata } from 'next';
import { ExamService } from '@/services/examService';
import ExamCard from '@/components/exams/ExamCard';
import ExamSearchBar from '@/components/exams/ExamSearchBar';
import CategoryIcon from '@/components/exams/CategoryIcon';
import {
  DIPLOMA_FILTERS,
  EXAM_CATEGORIES,
  EXAM_CATEGORY_LABEL,
  EXAM_PHASE_LABEL,
  examPhase,
} from '@/lib/examConstants';
import { DIPLOMA_SEO } from '@/lib/examSeo';
import type { ExamPhase } from '@/types/exam';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Concours administratifs en Côte d’Ivoire',
  description:
    'Consultez les derniers concours administratifs, examens professionnels et recrutements de la fonction publique ivoirienne : dates, conditions d’éligibilité et modalités de candidature, directement depuis les sources officielles.',
  keywords: [
    'concours',
    'concours administratifs',
    'côte d’ivoire',
    'fonction publique',
    'ENA',
    'INFAS',
    'CAFOP',
    'gendarmerie',
    'recrutement',
  ],
  openGraph: {
    type: 'website',
    locale: 'fr_CI',
    title: 'Concours administratifs en Côte d’Ivoire | TravaillerEnCi',
    description:
      'Tous les concours de la fonction publique ivoirienne centralisés : dates d’inscription, conditions d’éligibilité et liens officiels.',
  },
};

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 18;
const PHASE_OPTIONS: { value: ExamPhase | ''; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'open', label: 'Inscriptions ouvertes' },
  { value: 'ongoing', label: 'En cours' },
  { value: 'results', label: 'Résultats publiés' },
  { value: 'closed', label: 'Clos' },
];

interface ConcoursPageProps {
  searchParams: Promise<{
    q?: string;
    organizer?: string;
    category?: string;
    diploma?: string;
    phase?: string;
    page?: string;
  }>;
}

export default async function ConcoursPage({ searchParams }: ConcoursPageProps) {
  const sp = await searchParams;
  const keyword = sp.q || '';
  const organizer = sp.organizer || '';
  const category = sp.category || '';
  const diploma = sp.diploma || '';
  const phase = (sp.phase || '') as ExamPhase | '';
  const page = Math.max(1, Number(sp.page) || 1);

  const [organizers, all] = await Promise.all([
    ExamService.listOrganizers(),
    ExamService.list({
      keyword,
      organizer,
      category: category ? (category as any) : undefined,
      diploma,
      status: 'published',
      order_by: 'created_at',
      order_dir: 'desc',
      // Phase « métier » dérivée des dates : on charge un lot généreux puis on
      // filtre en mémoire (le volume de concours publiés reste modeste).
      limit: phase ? 500 : 200,
    }),
  ]);

  let rows = all.rows;
  let total = all.total;
  if (phase) {
    rows = rows.filter((e) => examPhase(e) === phase);
    total = rows.length;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function filterHref(params: Record<string, string | undefined>) {
    const url = new URLSearchParams();
    const next = { q: keyword, organizer, category, diploma, phase, ...params };
    Object.entries(next).forEach(([k, v]) => {
      if (v) url.set(k, v);
      else url.delete(k);
    });
    const qs = url.toString();
    return `/concours${qs ? `?${qs}` : ''}`;
  }

  return (
    <main className="flex-1 min-h-screen bg-gradient-to-b from-white to-gray-50/70 py-8 transition-colors dark:from-slate-950 dark:to-slate-900 sm:py-12">
      <div className="container mx-auto max-w-6xl px-4">
        <nav aria-label="Fil d'Ariane" className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/" className="hover:text-primary">
            Accueil
          </Link>
          <span className="mx-2" aria-hidden="true">
            /
          </span>
          <span className="font-medium text-gray-900 dark:text-gray-200">
            Concours administratifs
          </span>
        </nav>

        <div className="mb-8">
          <h1 className="mb-3 font-[var(--font-display)] text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
            Concours administratifs en Côte d'Ivoire
          </h1>
          <p className="max-w-2xl text-base text-gray-600 dark:text-gray-300 sm:text-lg">
            Les concours de la fonction publique et des grandes écoles ivoiriennes
            (ENA, INFAS, CAFOP, gendarmerie…), alimentés directement depuis les
            sources officielles — dates d'inscription, conditions et liens officiels.
          </p>
        </div>

        {/* Barre de recherche + filtres organisateur/catégorie */}
        <div className="mb-5">
          <ExamSearchBar
            organizers={organizers}
            initialKeyword={keyword}
            initialOrganizer={organizer}
            initialCategory={category}
          />
        </div>

        {/* Pills : diplômes acceptés */}
        <section aria-label="Filtrer par diplôme" className="mb-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
            Je dispose d'un diplôme
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={filterHref({ diploma: undefined })}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition-all',
                !diploma
                  ? 'border-primary bg-primary text-white shadow-md shadow-primary/20'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300',
              )}
            >
              Tous les niveaux
            </Link>
            {DIPLOMA_FILTERS.map((d) => (
              <Link
                key={d.value}
                href={filterHref({ diploma: d.value })}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition-all',
                  diploma === d.value
                    ? 'border-primary bg-primary text-white shadow-md shadow-primary/20'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300',
                )}
              >
                {d.label}
              </Link>
            ))}
          </div>
        </section>

        {/* Pills : statut (phase métier) */}
        <section aria-label="Filtrer par statut" className="mb-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
            Statut
          </p>
          <div className="flex flex-wrap gap-2">
            {PHASE_OPTIONS.map((p) => (
              <Link
                key={p.value || 'all'}
                href={filterHref({ phase: p.value || undefined, page: undefined })}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-all',
                  phase === p.value
                    ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300',
                )}
              >
                {p.label}
              </Link>
            ))}
          </div>
        </section>

        {/* Pills : catégories */}
        <section aria-label="Filtrer par catégorie" className="mb-6">
          <div className="flex flex-wrap gap-2">
            <Link
              href={filterHref({ category: undefined })}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-all',
                !category
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-primary/40 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300',
              )}
            >
              Toutes catégories
            </Link>
            {EXAM_CATEGORIES.map((c) => (
              <Link
                key={c.value}
                href={filterHref({ category: c.value })}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-all',
                  category === c.value
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-primary/40 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300',
                )}
              >
                <CategoryIcon category={c.value} className="h-3.5 w-3.5" />
                {c.label}
              </Link>
          ))}
        </div>
      </section>

      {/* Explorer par catégorie / par diplôme — pages SEO (maillage interne) */}
      <section aria-label="Explorer par catégorie ou par diplôme" className="mb-6">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
          Explorer par catégorie
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAM_CATEGORIES.map((c) => (
            <Link
              key={c.value}
              href={`/concours/categorie/${c.value}`}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-gray-600 transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300"
            >
              <CategoryIcon category={c.value} className="h-3.5 w-3.5" />
              {c.label}
            </Link>
          ))}
          </div>
          <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-widest text-gray-400">
            Par diplôme
          </p>
          <div className="flex flex-wrap gap-2">
            {DIPLOMA_SEO.map((d) => (
              <Link
                key={d.slug}
                href={`/concours/diplome/${d.slug}`}
                className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-gray-600 transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300"
              >
                {d.label}
              </Link>
            ))}
          </div>
        </section>

        {/* Compteur */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-[var(--font-display)] text-xl font-bold text-gray-900 dark:text-white">
            {total} concours recensé{total > 1 ? 's' : ''}
            {keyword || organizer || category || diploma || phase ? ' (filtrés)' : ''}
          </h2>
          {category && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Catégorie : {EXAM_CATEGORY_LABEL[category as keyof typeof EXAM_CATEGORY_LABEL] ?? category}
              {phase ? ` · ${EXAM_PHASE_LABEL[phase as ExamPhase]}` : ''}
            </span>
          )}
        </div>

        {/* Résultats */}
        {pagedRows.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
            {pagedRows.map((exam) => (
              <ExamCard key={exam.id} exam={exam} priority={safePage === 1} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900 sm:p-12">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 dark:bg-slate-800 sm:h-20 sm:w-20">
              <svg className="h-8 w-8 text-gray-400 sm:h-10 sm:w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z" />
              </svg>
            </div>
            <h3 className="mb-2 font-[var(--font-display)] text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
              Aucun concours ne correspond à vos critères
            </h3>
            <p className="mx-auto mb-6 max-w-md text-sm text-gray-500 dark:text-gray-400 sm:text-base">
              Modifiez vos filtres ou réinitialisez la recherche. Les nouveaux avis
              de concours apparaissent après validation par notre équipe.
            </p>
            <Link
              href="/concours"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-primary-dark"
            >
              Voir tous les concours
            </Link>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {safePage > 1 && (
              <Link
                href={filterHref({ page: String(safePage - 1) })}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300"
              >
                ← Précédent
              </Link>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<number[]>((acc, p) => {
                if (acc.length && p - acc[acc.length - 1] > 1) acc.push(-1);
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === -1 ? (
                  <span key={`gap-${i}`} className="px-1 text-gray-400">
                    …
                  </span>
                ) : (
                  <Link
                    key={p}
                    href={filterHref({ page: String(p) })}
                    aria-current={p === safePage ? 'page' : undefined}
                    className={cn(
                      'rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
                      p === safePage
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'border border-gray-200 bg-white text-gray-600 hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300',
                    )}
                  >
                    {p}
                  </Link>
                ),
              )}
            {safePage < totalPages && (
              <Link
                href={filterHref({ page: String(safePage + 1) })}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300"
              >
                Suivant →
              </Link>
            )}
          </nav>
        )}

        {/* Bloc sources officielles (crédibilité + SEO) */}
        <section className="mt-12 rounded-2xl border border-gray-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-gray-900 dark:text-white">
            Des informations vérifiées, directement à la source
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            Chaque concours est collecté auprès des institutions officielles ivoiriennes
            (Ministère de la Fonction Publique, ENA, Ministère de la Défense, INFAS, INJS,
            CAFOP/DECO, INSFS…) puis relu par notre équipe avant publication. La fiche de
            chaque concours renvoie toujours vers le communiqué officiel d'origine, pour
            une information transparente et fiable.
          </p>
        </section>
      </div>
    </main>
  );
}
