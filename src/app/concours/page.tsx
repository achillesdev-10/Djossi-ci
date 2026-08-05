import Link from 'next/link';
import { JobOfferSchemaService } from '@/services/jobOfferSchemaService';
import type { JobOfferSchema } from '@/types';
import { formatDate, truncate } from '@/lib/utils';

export const metadata = {
  title: 'Concours administratifs en Côte d\u2019Ivoire',
  description:
    'Consultez les derniers concours administratifs, examens professionnels et recrutements de la fonction publique ivoirienne : dates, conditions et modalités de candidature.',
};

export const dynamic = 'force-dynamic';

export default async function ConcoursPage() {
  const { rows: concours, total } = await JobOfferSchemaService.list({
    category: 'exam',
    status: 'published',
    limit: 100,
    order_by: 'created_at',
    order_dir: 'desc',
  });

  return (
    <main className="flex-1 min-h-screen bg-gradient-to-b from-white to-gray-50/70 dark:from-slate-950 dark:to-slate-900 transition-colors py-8 sm:py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <nav aria-label="Fil d'Ariane" className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/" className="hover:text-primary">
            Accueil
          </Link>
          <span className="mx-2" aria-hidden="true">
            /
          </span>
          <span className="text-gray-900 dark:text-gray-200 font-medium">
            Concours administratifs
          </span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 font-[var(--font-display)] text-gray-900 dark:text-white">
            Concours administratifs en Côte d'Ivoire
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg max-w-2xl">
            Accédez aux derniers concours de la fonction publique, examens
            d'entrée et recrutements administratifs ivoiriens — dates
            d'inscription, conditions et dossiers de candidature.
          </p>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white font-[var(--font-display)]">
            {total} concours recensé{total > 1 ? 's' : ''}
          </h2>
        </div>

        {concours.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {concours.map((item) => (
              <ExamCard key={item.id} exam={item as JobOfferSchema} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-border rounded-2xl p-8 sm:p-12 text-center">
            <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center mb-5">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 font-[var(--font-display)]">
              Aucun concours publié pour le moment
            </h3>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Le scraper collecte en continu les avis de concours et de
              recrutement de la fonction publique ivoirienne. Les nouvelles
              opportunités apparaîtront ici après validation par notre équipe
              de modération.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-sm shadow-md transition-all"
            >
              Retour à l'accueil
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

function ExamCard({ exam }: { exam: JobOfferSchema }) {
  const deadline = exam.deadline ? new Date(exam.deadline) : null;
  const deadlinePassed = deadline && !Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now();

  return (
    <Link
      href={`/concours/${exam.id}`}
      className="group bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg transition-all flex flex-col"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">
          📋 Concours administratif
        </span>
        {deadline && (
          <span
            className={`text-[11px] font-semibold ${
              deadlinePassed ? 'text-rose-500' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {deadlinePassed ? 'Clôturé le ' : 'Limite : '}
            {formatDate(exam.deadline!)}
          </span>
        )}
      </div>

      <h3 className="font-bold text-[15px] leading-snug text-gray-900 dark:text-white line-clamp-2 mb-1 group-hover:text-primary dark:group-hover:text-emerald-400 transition-colors">
        {exam.title}
      </h3>

      <div className="text-[13px] text-primary dark:text-emerald-400 font-semibold mb-2 truncate">
        {exam.company}
      </div>

      <p className="text-[12.5px] text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3 mb-4 flex-1">
        {truncate(
          (exam.seo_description || exam.description || '').replace(/\*\*/g, '').replace(/#/g, ''),
          160,
        )}
      </p>

      <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-800 pt-3 mt-auto">
        <div className="text-[12px] text-gray-500 dark:text-gray-400 inline-flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {exam.location || 'Côte d\u2019Ivoire'}
        </div>
        <span className="inline-flex items-center gap-1 text-[12px] font-bold text-primary dark:text-emerald-400 group-hover:gap-2 transition-all">
          Voir le concours
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
