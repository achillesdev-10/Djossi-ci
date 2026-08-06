import Link from 'next/link';
import { SITE_CONFIG } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Qui sommes-nous ? — TravaillerenCi",
  description:
    "TravaillerenCi, la plateforme 100% ivoirienne des offres d'emploi, de stages, de bourses et de concours. Découvrez l'histoire du projet imaginé par le développeur ivoirien AchillesDev10.",
};

const VALUES = [
  {
    emoji: '✅',
    title: 'Des offres vérifiées',
    text: "Chaque annonce est contrôlée avant publication pour lutter contre les arnaques à l'emploi.",
  },
  {
    emoji: '🇨🇮',
    title: '100% ivoirien',
    text: 'Conçu à Abidjan, pensé pour les réalités du marché du travail en Côte d’Ivoire.',
  },
  {
    emoji: '🔓',
    title: 'Gratuit et ouvert',
    text: "La recherche d'emploi ne doit pas être un luxe : l'accès aux offres est entièrement gratuit.",
  },
  {
    emoji: '⚡',
    title: 'Simple et rapide',
    text: 'Postulez en quelques clics, sans compte obligatoire pour consulter les offres.',
  },
];

const JOURNEY = [
  {
    period: 'La genèse',
    emoji: '💡',
    title: 'Un constat simple',
    text: "En Côte d'Ivoire, l'information sur les opportunités professionnelles est dispersée entre les sites des entreprises, les réseaux sociaux et le bouche-à-oreille. De nombreux talents qualifiés passent à côté d'offres correspondant pourtant à leur profil.",
  },
  {
    period: 'La solution',
    emoji: '🛠️',
    title: 'Une plateforme unique',
    text: 'TravaillerenCi centralise les offres d’emploi, de stages, de bourses et de concours administratifs en un seul endroit, avec un scraping automatisé des sources publiques et une modération humaine de chaque contenu.',
  },
  {
    period: "Aujourd'hui",
    emoji: '🚀',
    title: 'Un projet vivant',
    text: "La plateforme évolue en continu : générateur de CV intelligent, alertes personnalisées, et bientôt de nouvelles fonctionnalités pour les candidats comme pour les recruteurs ivoiriens.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50/70 dark:from-slate-950 dark:to-slate-900">
      {/* ===== En-tête ===== */}
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-br from-primary/8 via-white to-accent/8 dark:from-primary/10 dark:via-slate-950 dark:to-accent/10">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--color-primary)_0%,_transparent_55%)] opacity-20 dark:opacity-10"
        />
        <div className="container mx-auto px-4 py-14 sm:py-20 relative z-10 max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary dark:text-emerald-400 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold mb-5">
            <span aria-hidden="true">🇨🇮</span> À propos de TravaillerenCi
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-[var(--font-display)] text-gray-900 dark:text-white">
            Qui sommes-nous&nbsp;?
          </h1>
          <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            TravaillerenCi est une plateforme <strong>100% ivoirienne</strong> qui connecte les
            talents aux opportunités : emplois, stages, bourses d’études et concours
            administratifs, réunis au même endroit.
          </p>
        </div>
      </section>

      {/* ===== Article / histoire ===== */}
      <section className="container mx-auto px-4 py-12 sm:py-16 max-w-4xl">
        <div>
          <article className="space-y-6 text-[15px] sm:text-base leading-relaxed text-gray-700 dark:text-gray-300">
            <p>
              <strong className="text-gray-900 dark:text-white">TravaillerenCi</strong> est né
              d’une idée simple : <em>«&nbsp;Chaque Ivoirien mérite de trouver sa voie
              professionnelle sans se heurter à la désinformation ou aux annonces fantômes.&nbsp;»</em>{' '}
              Le projet a été imaginé, conçu et développé par un développeur ivoirien passionné,
              connu sous le pseudo <strong className="text-gray-900 dark:text-white">AchillesDev10</strong>.
            </p>
            <p>
              Partant du constat que les candidats perdent un temps précieux à éplucher des
              dizaines de sites pour trouver une simple offre correspondant à leur profil,
              AchillesDev10 a décidé de créer une plateforme centralisée, moderne et fiable :
              un véritable <strong className="text-gray-900 dark:text-white">pont numérique</strong>{' '}
              entre les recruteurs et les talents de Côte d’Ivoire.
            </p>
            <p>
              Aujourd’hui, TravaillerenCi agrège automatiquement les offres publiées par les
              entreprises, les institutions et les organismes de formation, puis soumet chaque
              contenu à une <strong className="text-gray-900 dark:text-white">vérification humaine</strong>{' '}
              avant publication. Les utilisateurs peuvent ainsi rechercher un emploi, un stage,
              une bourse ou un concours en toute confiance.
            </p>
            <p>
              La plateforme propose également des outils pensés pour le marché local, comme un{' '}
              <Link href="/generateur-de-cv" className="text-primary font-semibold hover:underline">
                générateur de CV
              </Link>{' '}
              assisté par intelligence artificielle, pour aider chaque candidat à valoriser son
              parcours.
            </p>
          </article>
        </div>

        {/* ===== Parcours ===== */}
        <div className="mt-14 grid gap-5 sm:gap-6">
          {JOURNEY.map((step, i) => (
            <div
              key={step.title}
              className="relative bg-white dark:bg-slate-900 border border-border rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
                <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/10 flex items-center justify-center text-2xl">
                  <span aria-hidden="true">{step.emoji}</span>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
                    {String(i + 1).padStart(2, '0')} — {step.period}
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white font-[var(--font-display)]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                    {step.text}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ===== Valeurs ===== */}
        <div className="mt-14">
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white font-[var(--font-display)] mb-6">
            Nos engagements
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-5 sm:p-6 hover:border-primary/30 transition-colors"
              >
                <div className="text-2xl mb-3" aria-hidden="true">
                  {v.emoji}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">{v.title}</h3>
                <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{v.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ===== CTA ===== */}
        <div className="mt-14 rounded-3xl bg-gradient-to-br from-primary to-accent p-8 sm:p-10 text-center text-white shadow-xl shadow-primary/20">
          <h2 className="text-2xl sm:text-3xl font-extrabold font-[var(--font-display)]">
            Prêt à booster votre carrière&nbsp;?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-white/85 max-w-xl mx-auto">
            Parcourez les dernières offres vérifiées ou créez votre CV professionnel en quelques minutes.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-gray-900 font-bold text-sm hover:bg-gray-100 transition-colors shadow-lg"
            >
              Voir les offres
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/generateur-de-cv"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/30 text-white font-bold text-sm hover:bg-white/10 transition-colors"
            >
              ✨ Créer mon CV
            </Link>
          </div>
        </div>

        {/* ===== Contact ===== */}
        <div className="mt-10 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Une question, une suggestion&nbsp;? Écrivez-nous à{' '}
            <a href={`mailto:${SITE_CONFIG.supportEmail}`} className="text-primary font-semibold hover:underline">
              {SITE_CONFIG.supportEmail}
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
