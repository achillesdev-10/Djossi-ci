import Image from 'next/image';
import Link from 'next/link';

/**
 * TravaillerEnCi — État vide réutilisable
 * Affiche une illustration (SVG unDraw en /illustrations/), un titre, un texte
 * d'explication et un lien d'action facultatif. Utilisé sur /jobs, /bourses,
 * /concours et l'accueil quand un listing ne retourne aucun résultat.
 */
export interface EmptyStateProps {
  /** Chemin public de l'illustration (ex. "/illustrations/no-results.svg"). */
  illustration?: string;
  /** Alt descriptif en français (charte : toute image a un alt pertinent). */
  illustrationAlt?: string;
  title: string;
  text?: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}

export default function EmptyState({
  illustration = '/illustrations/no-results.svg',
  illustrationAlt = 'Illustration indiquant qu\u2019aucun résultat n\u2019est disponible',
  title,
  text,
  actionLabel,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-border bg-white p-8 text-center dark:bg-slate-900 sm:p-12 ${
        className ?? ''
      }`}
    >
      {illustration && (
        <div className="relative mx-auto mb-6 h-32 w-64 max-w-full sm:h-40">
          <Image
            src={illustration}
            alt={illustrationAlt}
            fill
            sizes="16rem"
            className="object-contain"
          />
        </div>
      )}

      <h3 className="mb-2 font-[var(--font-display)] text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
        {title}
      </h3>

      {text && (
        <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-gray-500 dark:text-gray-400 sm:text-base">
          {text}
        </p>
      )}

      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary-dark"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
