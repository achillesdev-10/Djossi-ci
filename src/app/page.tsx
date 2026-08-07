import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';
import SearchBar from '@/components/jobs/SearchBar';
import { JobOfferSchemaService } from '@/services/jobOfferSchemaService';
import { ExamService } from '@/services/examService';
import { BlogService } from '@/services/blogService';
import type { JobOfferSchema, JobContractType } from '@/types';
import NewsTicker, { type TickerItem } from '@/components/home/NewsTicker';
import HomeCarousel from '@/components/home/HomeCarousel';
import PollWidget from '@/components/home/PollWidget';
import OffersGrid from '@/components/home/OffersGrid';

export const revalidate = 60;

const QUICK_LINKS = [
  {
    label: 'Offres d\u2019emploi',
    desc: 'CDI, CDD, prestation',
    href: '/jobs',
    gradient: 'from-orange-500 to-amber-500',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 sm:h-7 sm:w-7 drop-shadow">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
  {
    label: 'Stages',
    desc: 'Pour étudiants & jeunes diplômés',
    href: '/jobs?contract=Stage',
    gradient: 'from-sky-500 to-cyan-500',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 sm:h-7 sm:w-7 drop-shadow">
        <path d="M22 10 12 5 2 10l10 5 10-5Z" />
        <path d="M6 12v5c0 1 2.7 3 6 3s6-2 6-3v-5" />
      </svg>
    ),
  },
  {
    label: 'Bourses d\u2019études',
    desc: 'Étudier en CI & à l\u2019étranger',
    href: '/bourses',
    gradient: 'from-emerald-500 to-green-500',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 sm:h-7 sm:w-7 drop-shadow">
        <path d="M22 10 12 5 2 10l10 5 10-5Z" />
        <path d="M6 12.5v4.5c0 1.2 2.7 2.5 6 2.5s6-1.3 6-2.5v-4.5" />
        <path d="M22 10v5" />
      </svg>
    ),
  },
  {
    label: 'Concours admin.',
    desc: 'ENA, INFAS, CAFOP\u2026',
    href: '/concours',
    gradient: 'from-accent to-indigo-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 sm:h-7 sm:w-7 drop-shadow">
        <path d="M3 21h18" />
        <path d="M4 21V10l8-6 8 6v11" />
        <path d="M9 21v-6h6v6" />
      </svg>
    ),
  },
  {
    label: 'Générateur de CV',
    desc: 'Un CV pro avec l\u2019IA',
    href: '/generateur-de-cv',
    gradient: 'from-fuchsia-500 to-purple-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 sm:h-7 sm:w-7 drop-shadow">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="M9 13h6M9 17h4" />
      </svg>
    ),
  },
  {
    label: 'Conseils & Blog',
    desc: 'Astuces candidature',
    href: '/blog',
    gradient: 'from-rose-500 to-pink-500',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 sm:h-7 sm:w-7 drop-shadow">
        <path d="M15 12h-5M15 8h-5M8 3h5.6a1 1 0 0 1 .7.3l3.4 3.4a1 1 0 0 1 .3.7V21a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      </svg>
    ),
  },
];

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

  const [jobs, examRows, blogRows, bourseRows] = await Promise.all([
    JobOfferSchemaService.list({
      keyword: keyword || undefined,
      location: location || undefined,
      contract_type: contract || undefined,
      status: 'published',
      limit: 60,
      order_by: 'created_at',
      order_dir: 'desc',
    }),
    ExamService.list({ status: 'published', limit: 6, order_by: 'created_at', order_dir: 'desc' }),
    BlogService.list({ status: 'published', limit: 4, order_by: 'published_at', order_dir: 'desc' }),
    JobOfferSchemaService.list({
      category: 'scholarship',
      status: 'published',
      limit: 4,
      order_by: 'created_at',
      order_dir: 'desc',
    }),
  ]);

  const { rows: jobsList, total } = jobs;
  const totalKnown = Math.max(total, jobsList.length);

  const tickerItems: TickerItem[] = [
    ...jobsList.slice(0, 5).map((job) => ({
      id: `job-${job.id}`,
      title: job.title,
      href: `/jobs/${job.id}`,
      type: 'offre' as const,
    })),
    ...examRows.rows.slice(0, 4).map((exam) => ({
      id: `exam-${exam.id}`,
      title: exam.title,
      href: `/concours/${exam.slug || exam.id}`,
      type: 'concours' as const,
    })),
    ...bourseRows.rows.slice(0, 3).map((bourse) => ({
      id: `bourse-${bourse.id}`,
      title: bourse.title,
      href: `/bourses/${bourse.id}`,
      type: 'bourse' as const,
    })),
    ...blogRows.rows.slice(0, 3).map((post) => ({
      id: `post-${post.id}`,
      title: post.title,
      href: `/blog/${post.slug}`,
      type: 'blog' as const,
    })),
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'TravaillerenCi',
    alternateName: 'TravaillerEnCi',
    url: 'https://travaillerenci.ci',
    inLanguage: 'fr-CI',
    description:
      "Plateforme d'offres d'emploi, de stages, de bourses et de concours administratifs en Côte d'Ivoire.",
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://travaillerenci.ci/jobs?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <main className="flex-1 min-h-screen bg-gradient-to-b from-white to-gray-50/70 dark:from-slate-950 dark:to-slate-900 transition-colors">
      {/* JSON-LD (SEO) : WebSite + SearchAction */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* ======================================================================== */}
      {/*   FIL ACTU (sous la barre de navigation) : offres, concours, bourses…     */}
      {/* ======================================================================== */}
      <NewsTicker items={tickerItems} />
      {/* ======================================================================== */}
      {/*   HERO — Mobile-first : texte lisible, peu de padding vertical            */}
      {/* ======================================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/8 via-white to-accent/8 dark:from-primary/10 dark:via-slate-950 dark:to-accent/10 pt-8 pb-8 sm:pt-14 sm:pb-10 border-b border-border/40">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--color-primary)_0%,_transparent_55%)] opacity-20 dark:opacity-10"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -right-20 w-72 h-72 rounded-full bg-secondary/10 blur-3xl animate-float-slow"
        />
        <div
          aria-hidden="true"
          className="absolute -top-20 -left-16 w-72 h-72 rounded-full bg-accent/10 blur-3xl animate-float"
        />

        <div className="container mx-auto px-4 relative z-10 max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Colonne texte */}
            <div className="text-center lg:text-left animate-fade-in-up">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary dark:text-emerald-400 px-3.5 py-1.5 rounded-full text-[12px] sm:text-sm font-semibold mb-4 sm:mb-5">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                Plateforme 100% ivoirienne
              </div>

              <h1 className="text-[28px] leading-[1.15] sm:text-4xl lg:text-[44px] xl:text-5xl font-extrabold mb-3 sm:mb-5 font-[var(--font-display)] text-gray-900 dark:text-white">
                Travailleren<span className="text-primary">Ci</span>
                <span className="block text-gray-800 dark:text-gray-200 text-[22px] sm:text-3xl lg:text-[32px] mt-1 sm:mt-2">
                  Trouvez un job qui <span className="text-gradient-primary">vaut le coup</span>
                </span>
              </h1>

              <p className="text-[15px] sm:text-lg text-gray-600 dark:text-gray-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Des <strong className="text-gray-900 dark:text-white">offres vérifiées</strong>, des entreprises de confiance,
                et zéro spam. Postulez simplement — on s'occupe du reste.
              </p>
            </div>

            {/* Colonne illustration (desktop uniquement) */}
            <div className="hidden lg:flex justify-center lg:justify-end">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/hero-illustration.svg"
                alt="Recherche d'emploi en Côte d'Ivoire : offres vérifiées, mallette et localisation"
                width={520}
                height={445}
                className="w-full max-w-[520px] h-auto drop-shadow-xl animate-float"
                fetchPriority="high"
              />
            </div>
          </div>

          {/* Barre de recherche pleine largeur */}
          <div className="mt-8 sm:mt-10 max-w-4xl mx-auto">
            <Suspense fallback={<SearchBarSkeleton />}>
              <SearchBar
                initialKeyword={keyword}
                initialLocation={location}
                initialContract={contract}
              />
            </Suspense>

            <div className="mt-5 sm:mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-5 text-[12px] sm:text-sm text-gray-500 dark:text-gray-400">
              <Stat
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-emerald-500">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                }
                label="Offres vérifiées"
              />
              <Stat
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-orange-500">
                    <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
                  </svg>
                }
                label="Réponse rapide"
              />
              <Stat
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-primary">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2a15.3 15.3 0 0 1 0 20 15.3 15.3 0 0 1 0-20ZM2 12h20" />
                  </svg>
                }
                label="100% Côte d'Ivoire"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================================== */}
      {/*   WIDGETS : carrousel (images des sources) + sondage                     */}
      {/* ======================================================================== */}
      <section className="container mx-auto px-4 mt-8 sm:mt-12 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 items-stretch">
          <div className="lg:col-span-2 animate-fade-in-up">
            <SectionHeading
              kicker="À la une"
              title="Les opportunités du moment"
              actionHref="/jobs"
              actionLabel="Tout voir"
            />
            <HomeCarousel />
          </div>
          <div className="animate-fade-in-up" style={{ animationDelay: '120ms' }}>
            <PollWidget />
          </div>
        </div>
      </section>

      {/* ======================================================================== */}
      {/*   ACCÈS RAPIDES : catégories colorées (2 colonnes sur mobile)            */}
      {/* ======================================================================== */}
      <section className="container mx-auto px-4 mt-10 sm:mt-14 max-w-6xl">
        <SectionHeading kicker="Explorez" title="Où voulez-vous commencer ?" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {QUICK_LINKS.map((link, i) => (
            <Link
              key={link.label}
              href={link.href}
              className="group relative overflow-hidden rounded-2xl p-4 sm:p-5 text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl animate-fade-in-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${link.gradient} opacity-100`} />
              <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/15 transition-transform duration-500 group-hover:scale-150" />
              <div className="relative flex flex-col gap-1.5">
                <span className="text-2xl sm:text-3xl drop-shadow" aria-hidden="true">
                  {link.icon}
                </span>
                <span className="font-[var(--font-display)] text-sm sm:text-base font-extrabold leading-tight">
                  {link.label}
                </span>
                <span className="text-[11px] sm:text-xs text-white/85 leading-tight">
                  {link.desc}
                </span>
                <span className="mt-1 inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold opacity-0 transition-opacity group-hover:opacity-100">
                  Explorer
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ======================================================================== */}
      {/*   OFFRE À LA UNE — grille 2 colonnes dès le mobile                        */}
      {/* ======================================================================== */}
      <section className="container mx-auto px-4 pb-4 sm:pb-8 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 mt-10 sm:mt-14 mb-4 sm:mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white font-[var(--font-display)]">
              {keyword || location || contract
                ? `${totalKnown} résultat${totalKnown > 1 ? 's' : ''}`
                : 'Dernières offres'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {keyword || location || contract
                ? <>Triées par : pertinence + nouveauté</>
                : <>Les dernières opportunités publiées sur TravaillerenCi</>}
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

        {jobsList.length === 0 ? (
          <EmptyState keyword={keyword} location={location} contract={contract} />
        ) : (
          <OffersGrid jobs={jobsList as JobOfferSchema[]} />
        )}
      </section>

      {/* ======================================================================== */}
      {/*   DERNIERS ARTICLES DU BLOG — 2 colonnes dès le mobile                    */}
      {/* ======================================================================== */}
      {blogRows.rows.length > 0 && (
        <section className="container mx-auto px-4 pb-16 sm:pb-24 max-w-6xl">
          <SectionHeading
            kicker="Le blog"
            title="Conseils & actualités"
            actionHref="/blog"
            actionLabel="Tous les articles"
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {blogRows.rows.map((post, i) => (
              <HomeBlogCard key={post.id} post={post} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* ======================================================================== */}
      {/*   BANDEAU CTA                                                             */}
      {/* ======================================================================== */}
      <section className="container mx-auto px-4 pb-16 sm:pb-24 max-w-6xl">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-emerald-600 to-accent px-6 py-10 sm:p-12 text-center text-white shadow-xl shadow-primary/20 animate-gradient-x">
          <div
            aria-hidden="true"
            className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-12 -right-8 h-48 w-48 rounded-full bg-orange-400/25 blur-3xl"
          />
          <div className="relative">
            <h2 className="font-[var(--font-display)] text-2xl sm:text-4xl font-extrabold mb-3">
              Prêt à décrocher votre prochain job ?
            </h2>
            <p className="mx-auto max-w-2xl text-sm sm:text-base text-white/90 mb-6">
              Créez un CV professionnel en quelques minutes avec notre générateur IA,
              puis postulez aux meilleures offres en Côte d'Ivoire.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/generateur-de-cv"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-extrabold text-primary shadow-lg transition-transform hover:scale-105"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                  <path d="M14 2v6h6" />
                  <path d="M9 13h6M9 17h4" />
                </svg>
                Générer mon CV
              </Link>
              <Link
                href="/jobs"
                className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/20"
              >
                Parcourir les offres
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

// -----------------------------------------------------------------------------
//  Sous-composants — inline car la page est un Server Component
// -----------------------------------------------------------------------------

function SectionHeading({
  kicker,
  title,
  actionHref,
  actionLabel,
}: {
  kicker: string;
  title: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3 mb-4 sm:mb-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary dark:text-emerald-400 mb-1">
          {kicker}
        </p>
        <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white font-[var(--font-display)] leading-tight">
          {title}
        </h2>
      </div>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="shrink-0 inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-primary hover:gap-2 transition-all"
        >
          {actionLabel}
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
      )}
    </div>
  );
}

function HomeBlogCard({
  post,
  index,
}: {
  post: { title: string; slug: string; excerpt?: string | null; cover_image?: string | null; author?: string };
  index: number;
}) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-primary/25 animate-fade-in-up"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="relative h-24 sm:h-32 overflow-hidden bg-gradient-to-br from-primary/15 via-white to-accent/15 dark:from-primary/10 dark:via-slate-900 dark:to-accent/10">
        {post.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_image}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center opacity-60">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 sm:h-10 sm:w-10" aria-hidden="true">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
              <path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="font-bold text-[12.5px] sm:text-sm leading-snug text-gray-900 line-clamp-2 transition-colors group-hover:text-primary">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="mt-1.5 flex-1 text-[11px] sm:text-xs text-gray-500 line-clamp-2 leading-relaxed">
            {post.excerpt}
          </p>
        )}
        <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-primary">
          Lire l'article
          <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

function Stat({ icon, label }: { icon: ReactNode; label: string }) {
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
