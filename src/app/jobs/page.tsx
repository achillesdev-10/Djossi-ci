import Link from 'next/link';
import { JobOfferSchemaService } from '@/services/jobOfferSchemaService';
import SearchBar from '@/components/jobs/SearchBar';
import CompactJobCard from '@/components/home/CompactJobCard';
import type { JobOfferSchema } from '@/types';

export const metadata = {
  title: 'Toutes les offres d\'emploi en Côte d\'Ivoire',
  description: 'Parcourez, filtrez et recherchez des milliers d\'offres d\'emploi, CDI, CDD et stages à Abidjan et partout en Côte d\'Ivoire sur TravaillerEnCi.',
};

interface JobsPageProps {
  searchParams: Promise<{
    q?: string;
    city?: string;
    contract?: string;
    page?: string;
  }>;
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const resolvedParams = await searchParams;
  const keyword = resolvedParams.q || '';
  const city = resolvedParams.city || '';
  const contract = resolvedParams.contract || '';

  const { rows: jobs, total } = await JobOfferSchemaService.list({
    // Seuls les emplois et stages (dépôt unifié) apparaissent sur /jobs —
    // les bourses (scholarship) et concours (exam) ont leurs propres pages.
    category: ['job', 'internship'],
    keyword,
    location: city,
    contract_type: contract ? (contract as any) : undefined,
    status: 'published',
    limit: 50,
  });

  return (
    <main className="flex-1 min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors py-8 sm:py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <nav aria-label="Fil d'Ariane" className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/" className="hover:text-primary">Accueil</Link>
          <span className="mx-2" aria-hidden="true">/</span>
          <span className="text-gray-900 dark:text-gray-200 font-medium">Offres d'emploi</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 font-[var(--font-display)] text-gray-900 dark:text-white">
            Toutes les offres d'emploi en Côte d'Ivoire
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg max-w-2xl">
            Trouvez l'opportunité idéale parmi nos offres vérifiées à Abidjan et à l'intérieur du pays.
          </p>
        </div>

        {/* Barre de recherche interactive avec gestion des paramètres d'URL */}
        <div className="mb-8">
          <SearchBar
            initialKeyword={keyword}
            initialLocation={city}
            initialContract={contract}
          />
        </div>

        {/* Résultats */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white font-[var(--font-display)]">
            {total} {total > 1 ? 'offres trouvées' : 'offre trouvée'}
            {keyword || city || contract ? ' (filtrées)' : ''}
          </h2>
        </div>

        {jobs.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {jobs.map((job) => (
              <CompactJobCard key={job.id} job={job as JobOfferSchema} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-border rounded-2xl p-8 sm:p-12 text-center">
            <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center mb-5">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 font-[var(--font-display)]">
              Aucune offre ne correspond à vos critères
            </h3>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Essayez de modifier vos filtres, de chercher un autre mot-clé ou de réinitialiser la recherche.
            </p>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-sm shadow-md transition-all"
            >
              Voir toutes les offres
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
