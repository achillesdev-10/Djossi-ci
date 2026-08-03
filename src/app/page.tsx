import Link from 'next/link';
import { Suspense } from 'react';
import SearchBar from '@/components/jobs/SearchBar';
import JobCard from '@/components/jobs/JobCard';
import { JobOfferSchemaService } from '@/services/jobOfferSchemaService';
import type { JobOfferSchema, JobContractType } from '@/types';

export const revalidate = 60;

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    city?: string;
    contract?: string;
  }>;
}) {
  const sp = await searchParams;
  const keyword = (sp?.q || '').trim();
  const location = (sp?.city || '').trim();
  const contract = (sp?.contract || '').trim() as JobContractType;

  const { rows: jobs, total } = await JobOfferSchemaService.list({
    keyword: keyword || undefined,
    location: location || undefined,
    contract_type: contract || undefined,
    status: 'published',
    limit: 30,
    order_by: 'created_at',
    order_dir: 'desc',
  });

  const totalKnown = Math.max(total, jobs.length);

  return (
    <main className="flex-1 min-h-screen bg-gradient-to-b from-white to-gray-50/70 dark:from-slate-950 dark:to-slate-900 transition-colors">
      {/* ======================================================================== */}
      {/*   EN-TÊTE / HERO — Mobile-first : texte lisible, peu de padding vertical */}
      {/* ======================================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/8 via-white to-accent/8 dark:from-primary/10 dark:via-slate-950 dark:to-accent/10 pt-10 pb-8 sm:pt-16 sm:pb-12 border-b border-border/40">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--color-primary)_0%,_transparent_55%)] opacity-20 dark:opacity-10"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -right-20 w-72 h-72 rounded-full bg-secondary/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -top-20 -left-16 w-72 h-72 rounded-full bg-accent/10 blur-3xl"
        />

        <div className="container mx-auto px-4 relative z-10 max-w-4xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary dark:text-emerald-400 px-3.5 py-1.5 rounded-full text-[12px] sm:text-sm font-semibold mb-4 sm:mb-6">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Plateforme 100% ivoirienne
            </div>

            <h1 className="text-[28px] leading-[1.15] sm:text-4xl lg:text-5xl font-extrabold mb-3 sm:mb-5 font-[var(--font-display)] text-gray-900 dark:text-white">
              Travailleren<span className="text-primary">Ci</span>
              <span className="block text-gray-800 dark:text-gray-200 text-[22px] sm:text-3xl lg:text-4xl mt-1 sm:mt-2">
                Trouvez un job qui <span className="text-gradient-primary">vaut le coup</span>
              </span>
            </h1>

            <p className="text-[15px] sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed mb-6 sm:mb-8">
              Des <strong className="text-gray-900 dark:text-white">offres vérifiées</strong>, des entreprises de confiance,
              et zéro spam. Postulez simplement — on s'occupe du reste 🇨🇮
            </p>
          </div>

          <Suspense fallback={<SearchBarSkeleton />}>
            <SearchBar
              initialKeyword={keyword}
              initialLocation={location}
              initialContract={contract}
            />
          </Suspense>

          <div className="mt-5 sm:mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-5 text-[12px] sm:text-sm text-gray-500 dark:text-gray-400">
            <Stat icon="✅" label="Offres vérifiées" />
            <Stat icon="⚡" label="Réponse rapide" />
            <Stat icon="🇨🇮" label="100% Côte d'Ivoire" />
          </div>
        </div>
      </section>

      {/* ======================================================================== */}
      {/*   LISTE DES OFFRES — cards verticales sur mobile, 1-2-3 colonnes resp.  */}
      {/* ======================================================================== */}
      <section className="container mx-auto px-4 pb-16 sm:pb-24 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 mt-8 sm:mt-12 mb-4 sm:mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white font-[var(--font-display)]">
              {keyword || location || contract
                ? `${totalKnown} résultat${totalKnown > 1 ? 's' : ''}`
                : 'Offres à la une'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {keyword || location || contract
                ? <>Triées par : pertinence + nouveauté</>
                : <>Les dernières offres publiées sur TravaillerenCi</>}
            </p>
          </div>
          {(keyword || location || contract) && (
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-1.5 self-start sm:self-auto px-3.5 py-2 text-sm rounded-lg border border-border hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200 font-medium"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h14" />
                <path d="m10 5-7 7 7 7" />
              </svg>
              Réinitialiser
            </Link>
          )}
        </div>

        {jobs.length === 0 ? (
          <EmptyState
            keyword={keyword}
            location={location}
            contract={contract}
          />
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-3.5 sm:gap-5 md:grid-cols-2 xl:grid-cols-3 list-none p-0 m-0">
              {jobs.map((job, i) => (
                <li key={job.id}>
                  <JobCard job={job as JobOfferSchema} priority={i < 4} />
                </li>
              ))}
            </ul>

            <div className="mt-8 sm:mt-12 flex items-center justify-center">
              <Link
                href="/jobs"
                className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 rounded-xl bg-white dark:bg-slate-900 border border-border hover:border-primary/30 hover:shadow-sm text-gray-800 dark:text-gray-200 hover:text-primary font-semibold text-sm sm:text-base transition-colors"
              >
                Voir toutes les offres
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

// -----------------------------------------------------------------------------
//  Sous-composants — inline car la page est un Server Component
// -----------------------------------------------------------------------------

function Stat({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-white/70 dark:bg-slate-900/75 backdrop-blur px-2.5 sm:px-3 py-1.5 rounded-full border border-border shadow-sm text-gray-700 dark:text-gray-300">
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}

function SearchBarSkeleton() {
  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-border rounded-2xl shadow-md shadow-black/5 p-4 sm:p-6 animate-pulse">
      <div className="grid gap-3 grid-cols-1 md:grid-cols-12">
        <div className="md:col-span-6 h-[52px] bg-gray-100 dark:bg-slate-800 rounded-xl" />
        <div className="md:col-span-4 grid grid-cols-2 gap-3">
          <div className="h-[52px] bg-gray-100 dark:bg-slate-800 rounded-xl" />
          <div className="h-[52px] bg-gray-100 dark:bg-slate-800 rounded-xl" />
        </div>
        <div className="md:col-span-2 h-[52px] bg-gray-100 dark:bg-slate-800 rounded-xl" />
      </div>
    </div>
  );
}

function EmptyState({
  keyword,
  location,
  contract,
}: {
  keyword: string;
  location: string;
  contract: string;
}) {
  const label =
    [
      keyword ? `"${keyword}"` : '',
      location ? `à ${location}` : '',
      contract ? `en ${contract}` : '',
    ]
      .filter(Boolean)
      .join(' ') || 'cette zone';

  return (
    <div className="bg-white dark:bg-slate-900 border border-dashed border-border rounded-2xl p-8 sm:p-12 text-center">
      <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center mb-5">
        <svg
          className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 dark:text-gray-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 font-[var(--font-display)]">
        Aucune offre trouvée pour {label}
      </h3>
      <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
        Essayez avec un autre mot-clé, une ville voisine, ou supprimez certains filtres.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-sm shadow-md shadow-primary/20"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        Réinitialiser les filtres
      </Link>
    </div>
  );
}
