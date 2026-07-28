import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { JobOfferSchemaService } from '@/services/jobOfferSchemaService';
import type { JobOfferSchema } from '@/types';
import { formatDate, truncate } from '@/lib/utils';

export const revalidate = 300;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const job = await JobOfferSchemaService.getById(id);
  if (!job) {
    return {
      title: 'Offre introuvable',
      robots: { index: false, follow: false },
    };
  }
  const desc = truncate(
    job.description.replace(/\*\*/g, '').replace(/\n/g, ' '),
    170
  );
  return {
    title: `${job.title} — ${job.company}`,
    description: desc,
    openGraph: {
      title: `${job.title} · ${job.company}`,
      description: desc,
      type: 'article',
      tags: [job.contract_type, job.company, job.location],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${job.title} · ${job.company}`,
      description: desc,
    },
  };
}

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const job = await JobOfferSchemaService.getById(id);

  if (!job) {
    notFound();
  }

  // Suggestions : 3 offres de la même localisation ou du même type de contrat
  const [similarByType, similarByLocation] = await Promise.all([
    JobOfferSchemaService.list({ contract_type: job.contract_type, limit: 4 }),
    JobOfferSchemaService.list({ location: job.location.split(',')[0].split(' - ')[0], limit: 4 }),
  ]);

  const similarIds = new Set<string>([job.id]);
  const similar = [...similarByType.rows, ...similarByLocation.rows].filter((s) => {
    if (similarIds.has(s.id)) return false;
    similarIds.add(s.id);
    return true;
  }).slice(0, 3);

  return (
    <main className="flex-1 min-h-screen bg-gradient-to-b from-white to-gray-50/60">
      {/* ============= HERO / HEADER DU POSTE ============= */}
      <section className="bg-gradient-to-br from-primary/8 via-white to-accent/8 border-b border-gray-100">
        <div className="container mx-auto px-4 pt-4 sm:pt-8 pb-6 max-w-4xl">
          <nav aria-label="Fil d'Ariane" className="mb-4 sm:mb-6">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] sm:text-sm text-gray-500">
              <li>
                <Link href="/" className="hover:text-primary hover:underline">
                  Accueil
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/jobs" className="hover:text-primary hover:underline">
                  Offres
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-700 font-medium truncate max-w-[60vw]">
                {job.title}
              </li>
            </ol>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {job.is_verified ? (
                  <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs sm:text-sm font-bold">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 12l2 2 4-4" />
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                    </svg>
                    Offre vérifiée Djossi
                  </span>
                ) : (
                  <span className="inline-flex items-center bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
                    Non vérifiée
                  </span>
                )}
                <span className="inline-flex items-center bg-accent/10 text-accent px-3 py-1 rounded-full text-xs sm:text-sm font-bold">
                  {job.contract_type}
                </span>
                <span className="text-[11px] sm:text-xs text-gray-400 ml-auto sm:ml-0">
                  Publiée le {formatDate(job.created_at)}
                </span>
              </div>

              <h1 className="text-[26px] sm:text-3xl lg:text-4xl font-extrabold text-gray-900 leading-tight mb-2 font-[var(--font-display)]">
                {job.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4 sm:mb-5 text-[14px] sm:text-base">
                <div className="text-primary font-bold">{job.company}</div>
                <div className="inline-flex items-center gap-1.5 text-gray-600">
                  <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {job.location}
                </div>
              </div>
            </div>
          </div>

          {/* Sticky-ish CTA mobile en bas, desktop aligné : on affiche en haut ET on en a un sticky en bas sur mobile */}
          <div className="hidden sm:block">
            <ApplyBox job={job} variant="horizontal" />
          </div>
        </div>
      </section>

      {/* ============= CONTENU PRINCIPAL ============= */}
      <section className="container mx-auto px-4 py-6 sm:py-10 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Colonne gauche — description */}
          <article className="lg:col-span-2 order-2 lg:order-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/5 p-5 sm:p-8">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 font-[var(--font-display)]">
                À propos de ce poste
              </h2>
              <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
                {/* Formatage Markdown minimal sans dépendance */}
                <SimpleMarkdown text={job.description} />
              </div>
            </div>

            {/* Offres similaires (mobile-visible, desktop aussi) */}
            {similar.length > 0 && (
              <div className="mt-8 sm:mt-10">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-5 font-[var(--font-display)]">
                  Offres similaires qui pourraient vous intéresser
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 list-none m-0 p-0">
                  {similar.map((s) => (
                    <li key={s.id}>
                      <MiniJobCard job={s as JobOfferSchema} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>

          {/* Colonne droite — CTA desktop + méta */}
          <aside className="lg:col-span-1 order-1 lg:order-2 space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="sm:hidden">
              <ApplyBox job={job} variant="vertical" />
            </div>
            <div className="hidden lg:block">
              <ApplyBox job={job} variant="vertical" />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-sm">
              <h3 className="font-bold text-gray-900 mb-4">Informations utiles</h3>
              <dl className="space-y-3.5">
                <MetaRow label="Entreprise" value={job.company} />
                <MetaRow label="Ville" value={job.location} />
                <MetaRow label="Contrat" value={job.contract_type} />
                <MetaRow
                  label="Vérifié"
                  value={job.is_verified ? '✅ Oui — par Djossi.ci' : '⏳ En cours'}
                />
                <MetaRow label="Publiée le" value={formatDate(job.created_at)} />
                {job.source_url && (
                  <MetaRow
                    label="Source"
                    value="Voir l'annonce originale"
                    href={job.source_url}
                    external
                  />
                )}
              </dl>
            </div>
          </aside>
        </div>
      </section>

      {/* ============= STICKY CTA MOBILE BAS DE PAGE ============= */}
      <div className="lg:hidden sticky bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 px-3 py-3 safe-bottom">
        <ApplyBox job={job} variant="compact" />
      </div>
    </main>
  );
}

// =============================================================================
//  SOUS-COMPOSANTS
// =============================================================================

function ApplyBox({
  job,
  variant,
}: {
  job: JobOfferSchema;
  variant: 'horizontal' | 'vertical' | 'compact';
}) {
  const hasLink = Boolean(job.apply_link);
  const hasEmail = Boolean(job.apply_email);

  if (variant === 'compact') {
    return (
      <div className="flex items-stretch gap-2">
        {hasEmail ? (
          <a
            href={`mailto:${job.apply_email}?subject=${encodeURIComponent(`Candidature : ${job.title} (Djossi.ci)`)}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-md shadow-primary/25 active:scale-[0.99] transition-all"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
            Postuler par email
          </a>
        ) : null}
        {hasLink ? (
          <a
            href={job.apply_link!}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-md shadow-primary/25 active:scale-[0.99] transition-all"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            Postuler
          </a>
        ) : null}
        {hasEmail && hasLink ? (
          <a
            href={job.apply_link!}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center justify-center w-12 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700"
            aria-label="Voir l'offre sur le site de l'entreprise"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7" />
              <path d="M7 7h10v10" />
            </svg>
          </a>
        ) : null}
      </div>
    );
  }

  if (variant === 'horizontal') {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 bg-white/90 backdrop-blur rounded-2xl border border-gray-100 p-3 sm:p-4 shadow-sm">
        <div className="text-[13px] sm:text-sm text-gray-500 flex-1">
          Prêt à postuler ? Choisissez votre méthode :
        </div>
        <ApplyActions job={job} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/5 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 7h-3a2 2 0 0 1-2-2V2" />
            <path d="M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h5l5 5v9a2 2 0 0 1-2 2h-1" />
            <path d="M9 18H7a2 2 0 0 0-2 2 2 2 0 0 0 2 2h10a2 2 0 0 0 2-2 2 2 0 0 0-2-2" />
          </svg>
        </div>
        <div>
          <div className="font-bold text-gray-900">Postuler maintenant</div>
          <div className="text-xs text-gray-500">1 à 2 minutes</div>
        </div>
      </div>
      <ApplyActions job={job} />
      <p className="mt-4 text-[11px] text-gray-400 leading-relaxed">
        En postulant, vous acceptez que vos informations soient transmises à {job.company}.
        Djossi.ci n'est pas l'employeur et ne participe pas au processus de recrutement.
      </p>
    </div>
  );
}

function ApplyActions({ job }: { job: JobOfferSchema }) {
  const hasLink = Boolean(job.apply_link);
  const hasEmail = Boolean(job.apply_email);

  return (
    <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 w-full sm:w-auto sm:shrink-0">
      {/* Bouton PRINCIPAL POSTULER (le plus clair possible) */}
      {hasLink ? (
        <a
          href={job.apply_link!}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm sm:text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.99] transition-all w-full sm:w-auto"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
          Postuler à l'offre
          <svg className="w-4 h-4 shrink-0 opacity-80 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17L17 7" />
            <path d="M7 7h10v10" />
          </svg>
        </a>
      ) : hasEmail ? (
        <a
          href={`mailto:${job.apply_email}?subject=${encodeURIComponent(`Candidature : ${job.title} (Djossi.ci)`)}`}
          className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm sm:text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.99] transition-all w-full sm:w-auto"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
          Postuler par email
        </a>
      ) : null}

      {/* Bouton SECONDAIRE */}
      {hasLink && hasEmail ? (
        <a
          href={`mailto:${job.apply_email}?subject=${encodeURIComponent(`Candidature : ${job.title} (Djossi.ci)`)}`}
          className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-800 font-semibold text-sm sm:text-base transition-all w-full sm:w-auto"
        >
          <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
          Postuler par email
        </a>
      ) : null}
    </div>
  );
}

function MetaRow({
  label,
  value,
  href,
  external,
}: {
  label: string;
  value: string;
  href?: string;
  external?: boolean;
}) {
  const ValueComp = href ? (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="font-medium text-primary hover:underline inline-flex items-center gap-1"
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
    <span className="font-medium text-gray-800">{value}</span>
  );
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-gray-500 shrink-0">{label}</dt>
      <dd className="text-right break-words">{ValueComp}</dd>
    </div>
  );
}

function MiniJobCard({ job }: { job: JobOfferSchema }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group block bg-white rounded-xl border border-gray-100 hover:border-primary/25 hover:shadow-md p-4 transition-all"
    >
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
          job.is_verified
            ? 'bg-primary/10 text-primary'
            : 'bg-gray-100 text-gray-500'
        }`}>
          {job.is_verified ? '✓ Vérifié' : job.contract_type}
        </span>
        {job.is_verified ? (
          <span className="inline-flex items-center bg-accent/10 text-accent px-2 py-0.5 rounded-full text-[10.5px] font-bold">
            {job.contract_type}
          </span>
        ) : null}
      </div>
      <h3 className="font-bold text-[14px] leading-snug text-gray-900 line-clamp-2 mb-1 group-hover:text-primary transition-colors">
        {job.title}
      </h3>
      <div className="text-[13px] text-primary font-semibold mb-0.5 truncate">
        {job.company}
      </div>
      <div className="text-[12px] text-gray-500 truncate">{job.location}</div>
    </Link>
  );
}

/** Parseur Markdown minimal — pas de dépendance (gras/italique/listes/br) */
function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul
        key={`ul-${key++}`}
        className="my-3 pl-4 sm:pl-5 space-y-1.5 list-disc marker:text-primary marker:opacity-70"
      >
        {listBuffer.map((it, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: inline(it) }} />
        ))}
      </ul>
    );
    listBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }
    // Titres Markdown 1 à 3
    let m: RegExpMatchArray | null;
    if ((m = trimmed.match(/^#{1,3}\s+(.*)$/))) {
      flushList();
      const level = (trimmed.match(/^#+/)![0].length) as 1 | 2 | 3;
      const sizes = {
        1: 'text-xl sm:text-2xl font-bold mt-6 mb-3',
        2: 'text-lg sm:text-xl font-bold mt-5 mb-2.5',
        3: 'text-base sm:text-lg font-bold mt-4 mb-2',
      } as const;
      const Tag = (`h${level + 1}` as unknown) as 'h3';
      blocks.push(
        <Tag
          key={`h-${key++}`}
          className={`${sizes[level]} text-gray-900 font-[var(--font-display)]`}
          dangerouslySetInnerHTML={{ __html: inline(m[1]) }}
        />
      );
      continue;
    }
    // Listes à puces
    if (/^\s*[-*•]\s+/.test(trimmed)) {
      listBuffer.push(trimmed.replace(/^\s*[-*•]\s+/, ''));
      continue;
    }
    // Paragraphe normal
    flushList();
    blocks.push(
      <p
        key={`p-${key++}`}
        className="my-2.5"
        dangerouslySetInnerHTML={{ __html: inline(line) }}
      />
    );
  }
  flushList();
  return <>{blocks}</>;
}

function inline(src: string): string {
  // Échapper HTML d'abord (sauf <br/> à la fin)
  let s = src
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // Gras **texte**
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-gray-900">$1</strong>');
  // Italique *texte*
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return s;
}
