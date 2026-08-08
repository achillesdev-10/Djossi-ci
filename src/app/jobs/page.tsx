import Link from 'next/link';
import { JobOfferSchemaService } from '@/services/jobOfferSchemaService';
import SearchBar from '@/components/jobs/SearchBar';
import CompactJobCard from '@/components/home/CompactJobCard';
import EmptyState from '@/components/EmptyState';
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
          <EmptyState
            illustration="/illustrations/no-results.svg"
            illustrationAlt="Illustration d'un écran sans résultat de recherche d'offres d'emploi"
            title="Aucune offre ne correspond à vos critères"
            text="Essayez de modifier vos filtres, de chercher un autre mot-clé ou de réinitialiser la recherche."
            actionLabel="Voir toutes les offres"
            actionHref="/jobs"
          />
        )}
      </div>
    </main>
  );
}
