import Image from 'next/image';
import Link from 'next/link';

/**
 * TravaillerEnCi — Page 404 (App Router : not-found.tsx)
 * Rendu pour toute route inconnue et après un notFound() dans une page.
 */
export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center bg-gray-50 px-4 py-16 transition-colors dark:bg-slate-950 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        {/* Illustration unDraw « page mangée » (recolorée vert charte) */}
        <div className="relative mx-auto h-52 w-72 max-w-full sm:h-64 sm:w-96">
          <Image
            src="/illustrations/page-not-found.svg"
            alt="Illustration d'une page partiellement déchirée, symbole de l'erreur 404"
            fill
            sizes="24rem"
            className="object-contain"
          />
        </div>

        <p className="mt-8 text-[11px] font-bold uppercase tracking-widest text-primary dark:text-emerald-400">
          Erreur 404
        </p>
        <h1 className="mt-2 font-[var(--font-display)] text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
          Cette page est introuvable
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-gray-500 dark:text-gray-400 sm:text-base">
          La page que vous cherchez a peut-être été déplacée, renommée ou supprimée.
          Vérifiez l'adresse, ou repartez de l'accueil pour retrouver les dernières
          opportunités.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary-dark sm:w-auto"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M3 12h14" />
              <path d="m10 5-7 7 7 7" />
            </svg>
            Retour à l'accueil
          </Link>
          <Link
            href="/jobs"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200 dark:hover:text-emerald-400 sm:w-auto"
          >
            Voir les offres
          </Link>
        </div>
      </div>
    </main>
  );
}
