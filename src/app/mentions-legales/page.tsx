export const dynamic = "force-dynamic";

export default function MentionsLegalesPage() {
  return (
    <main className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-[var(--font-display)]">Mentions Légales</h1>
          <p className="text-sm text-muted-foreground mt-2">Dernière mise à jour : 31 juillet 2026</p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">1. Éditeur du site</h2>
            <p>
              Le site <strong>TravaillerEnCi</strong> (ci-après « la Plateforme ») est édité et exploité en tant que plateforme numérique de mise en relation professionnelle et d'offres d'emploi en Côte d'Ivoire.
            </p>
            <p>
              <strong>Contact officiel :</strong><br />
              Email : <a href="mailto:achillesdev10@gmail.com" className="text-primary hover:underline">achillesdev10@gmail.com</a><br />
              Siège social : Abidjan, Côte d'Ivoire
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">2. Hébergement</h2>
            <p>
              Le site est hébergé par la société <strong>Vercel Inc.</strong><br />
              Adresse : 440 N Barranca Ave #4133 Covina, CA 91723, USA.<br />
              Site web : <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">https://vercel.com</a>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">3. Propriété intellectuelle</h2>
            <p>
              L'ensemble des éléments graphiques, textuels, de structure, ainsi que les bases de données intégrées sur TravaillerEnCi sont protégés par les lois en vigueur sur la propriété intellectuelle. Toute reproduction, représentation, modification ou exploitation non autorisée de tout ou partie des éléments du site est strictement interdite.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">4. Limitation de responsabilité</h2>
            <p>
              TravaillerEnCi agit en tant qu'agrégateur d'offres d'emploi et intermédiaire technologique. Les annonces diffusées proviennent soit de sources publiques (scraping automatisé), soit d'offres directement publiées par des entreprises partenaires. TravaillerEnCi ne saurait être tenu responsable de l'exactitude, de la véracité ou de la disponibilité des offres d'emploi publiées par des tiers.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
