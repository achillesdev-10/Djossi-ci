import Link from 'next/link';
import ContactForm from '@/components/contact/ContactForm';
import { SITE_CONFIG } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Nous contacter — TravaillerenCi',
  description:
    "Une question, une suggestion ou un partenariat ? Contactez l'équipe TravaillerenCi par email : achillesdev10@gmail.com. Réponse sous 24-48h.",
};

const INFO_ITEMS = [
  {
    emoji: '📧',
    title: 'Email',
    value: SITE_CONFIG.supportEmail,
    href: `mailto:${SITE_CONFIG.supportEmail}`,
  },
  {
    emoji: '📍',
    title: 'Localisation',
    value: 'Abidjan, Côte d\u2019Ivoire',
  },
  {
    emoji: '⚡',
    title: 'Temps de réponse',
    value: 'Sous 24 à 48 heures ouvrées',
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50/70 dark:from-slate-950 dark:to-slate-900">
      {/* ===== En-tête ===== */}
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-br from-primary/8 via-white to-accent/8 dark:from-primary/10 dark:via-slate-950 dark:to-accent/10">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--color-primary)_0%,_transparent_55%)] opacity-20 dark:opacity-10"
        />
        <div className="container mx-auto px-4 py-12 sm:py-16 relative z-10 max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary dark:text-emerald-400 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold mb-5">
            <span aria-hidden="true">💬</span> Nous contacter
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-[var(--font-display)] text-gray-900 dark:text-white">
            Parlons-en&nbsp;!
          </h1>
          <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Une question sur une offre, une suggestion pour améliorer la plateforme, un
            partenariat&nbsp;? Écrivez-nous, on vous répond rapidement.
          </p>
        </div>
      </section>

      {/* ===== Contenu : infos + formulaire ===== */}
      <section className="container mx-auto px-4 py-10 sm:py-14 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-8 lg:gap-12 items-start">
          {/* Colonne infos */}
          <div className="space-y-4 lg:sticky lg:top-24">
            {INFO_ITEMS.map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-4 rounded-2xl border border-border bg-white dark:bg-slate-900 p-5 shadow-sm hover:border-primary/30 transition-colors"
              >
                <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/10 flex items-center justify-center text-2xl">
                  <span aria-hidden="true">{item.emoji}</span>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    {item.title}
                  </div>
                  {item.href ? (
                    <a
                      href={item.href}
                      className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white hover:text-primary transition-colors break-all"
                    >
                      {item.value}
                    </a>
                  ) : (
                    <div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                      {item.value}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Réseaux sociaux */}
            <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
                Suivez-nous
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={SITE_CONFIG.social.facebook}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-primary hover:text-white flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                  </svg>
                </a>
                <a
                  href={SITE_CONFIG.social.twitter}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="X (Twitter)"
                  className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-primary hover:text-white flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href={SITE_CONFIG.social.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn"
                  className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-primary hover:text-white flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
                <a
                  href={SITE_CONFIG.social.instagram}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-primary hover:text-white flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* CTA emploi */}
            <Link
              href="/jobs"
              className="group flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-primary to-accent p-5 text-white shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
            >
              <div>
                <div className="font-bold font-[var(--font-display)]">Envie de trouver un job ?</div>
                <div className="text-sm text-white/80">Parcourez les offres vérifiées 🇨🇮</div>
              </div>
              <svg className="w-5 h-5 shrink-0 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Colonne formulaire */}
          <ContactForm />
        </div>
      </section>
    </main>
  );
}
