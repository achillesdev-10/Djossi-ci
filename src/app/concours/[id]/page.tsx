import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { JobOfferSchemaService } from '@/services/jobOfferSchemaService';
import SimpleMarkdown from '@/components/content/SimpleMarkdown';
import { formatDate, truncate } from '@/lib/utils';

export const revalidate = 300;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const exam = await JobOfferSchemaService.getById(id);
  if (!exam || exam.category !== 'exam') {
    return { title: 'Concours introuvable', robots: { index: false, follow: false } };
  }
  const desc = truncate(
    (exam.seo_description || exam.description || '').replace(/\*\*/g, '').replace(/#/g, ' '),
    170,
  );
  return {
    title: exam.seo_title || `${exam.title} | TravaillerEnCi`,
    description: desc,
    keywords: exam.seo_keywords || undefined,
    openGraph: {
      type: 'article',
      title: exam.title,
      description: desc,
      locale: 'fr_CI',
      tags: ['concours', 'fonction publique', exam.location!],
    },
  };
}

export default async function ConcoursDetailPage({ params }: PageProps) {
  const { id } = await params;
  const exam = await JobOfferSchemaService.getById(id);

  if (!exam || exam.category !== 'exam') {
    notFound();
  }

  const deadline = exam.deadline ? new Date(exam.deadline) : null;
  const deadlinePassed =
    deadline && !Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now();

  const hasLink = Boolean(exam.apply_link);
  const hasEmail = Boolean(exam.apply_email);

  return (
    <main className="flex-1 min-h-screen bg-gradient-to-b from-white to-gray-50/60 dark:from-slate-950 dark:to-slate-900 transition-colors">
      <section className="bg-gradient-to-br from-emerald-500/8 via-white to-emerald-500/8 dark:from-emerald-500/10 dark:via-slate-950 dark:to-emerald-500/10 border-b border-gray-100 dark:border-slate-800">
        <div className="container mx-auto px-4 pt-4 sm:pt-8 pb-6 max-w-4xl">
          <nav aria-label="Fil d'Ariane" className="mb-4 sm:mb-6">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] sm:text-sm text-gray-500 dark:text-gray-400">
              <li>
                <Link href="/" className="hover:text-primary hover:underline">
                  Accueil
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/concours" className="hover:text-primary hover:underline">
                  Concours
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-700 dark:text-gray-200 font-medium truncate max-w-[60vw]">
                {exam.title}
              </li>
            </ol>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
              📋 Concours administratif
            </span>
            {deadline && (
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs sm:text-sm font-semibold ${
                  deadlinePassed
                    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                    : 'bg-primary/10 text-primary dark:text-emerald-400 border border-primary/20'
                }`}
              >
                {deadlinePassed
                  ? `Clôturé le ${formatDate(exam.deadline!)}`
                  : `Limite d'inscription : ${formatDate(exam.deadline!)}`}
              </span>
            )}
          </div>

          <h1 className="text-[26px] sm:text-3xl lg:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight mb-3 font-[var(--font-display)]">
            {exam.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] sm:text-base">
            <div className="text-primary dark:text-emerald-400 font-bold">{exam.company}</div>
            <div className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
              <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {exam.location || "Côte d'Ivoire"}
            </div>
            <span className="text-[11px] sm:text-xs text-gray-400 dark:text-gray-500">
              Publié le {formatDate(exam.created_at)}
            </span>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-6 sm:py-10 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <article className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm shadow-black/5 p-5 sm:p-8">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 font-[var(--font-display)]">
                Détails du concours
              </h2>
              <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed">
                <SimpleMarkdown text={exam.description} />
              </div>
            </div>
          </article>

          <aside className="lg:col-span-1 space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-gray-900 dark:text-white">Candidater</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Via l'organisme organisateur
                  </div>
                </div>
              </div>
              <div className="space-y-2.5">
                {hasLink ? (
                  <a
                    href={exam.apply_link!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-lg shadow-primary/25 transition-all"
                  >
                    Accéder aux inscriptions
                  </a>
                ) : null}
                {hasEmail ? (
                  <a
                    href={`mailto:${exam.apply_email}?subject=${encodeURIComponent(`Candidature concours : ${exam.title}`)}`}
                    className="flex w-full items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 font-semibold text-sm transition-all"
                  >
                    Envoyer une candidature par email
                  </a>
                ) : null}
                {!hasLink && !hasEmail ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Consultez la page d'origine ci-dessous pour les modalités
                    d'inscription.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5 text-sm">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                Informations utiles
              </h3>
              <dl className="space-y-3.5">
                <MetaRow label="Organisme" value={exam.company} />
                <MetaRow label="Lieu" value={exam.location || "Côte d'Ivoire"} />
                {deadline ? (
                  <MetaRow
                    label="Date limite"
                    value={formatDate(exam.deadline!)}
                    tone={deadlinePassed ? 'danger' : 'normal'}
                  />
                ) : null}
                <MetaRow label="Publié le" value={formatDate(exam.created_at)} />
                {exam.source_url ? (
                  <MetaRow
                    label="Source"
                    value="Voir l'avis original"
                    href={exam.source_url}
                    external
                  />
                ) : null}
              </dl>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function MetaRow({
  label,
  value,
  href,
  external,
  tone = 'normal',
}: {
  label: string;
  value: string;
  href?: string;
  external?: boolean;
  tone?: 'normal' | 'danger';
}) {
  const ValueComp = href ? (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="font-medium text-primary dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
    >
      {value}
      {external && (
        <svg className="w-3.5 h-3.5 shrink-0 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 17L17 7" />
          <path d="M7 7h10v10" />
        </svg>
      )}
    </a>
  ) : (
    <span
      className={`font-medium ${
        tone === 'danger' ? 'text-rose-500' : 'text-gray-800 dark:text-gray-200'
      }`}
    >
      {value}
    </span>
  );
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-gray-500 dark:text-gray-400 shrink-0">{label}</dt>
      <dd className="text-right break-words">{ValueComp}</dd>
    </div>
  );
}
