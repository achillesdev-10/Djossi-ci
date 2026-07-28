import Link from 'next/link';

export const metadata = {
  title: 'Entreprises qui recrutent',
  description: 'Découvrez les meilleures entreprises qui recrutent en Côte d\'Ivoire.',
};

export default function CompaniesPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <nav className="text-sm text-gray-500 mb-8">
        <Link href="/" className="hover:text-primary">Accueil</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">Entreprises</span>
      </nav>

      <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold mb-4 font-[var(--font-display)]">
            Entreprises partenaires
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl">
            Plus de 2,000 entreprises nous font confiance pour recruter les meilleurs talents en Côte d'Ivoire.
          </p>
        </div>
        <Link
          href="/companies/register"
          className="bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-semibold shadow-md shadow-primary/20 transition-all whitespace-nowrap"
        >
          Publier une offre
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-border p-12 text-center">
        <h2 className="text-2xl font-bold mb-4 font-[var(--font-display)]">
          Section Entreprises - Bientôt disponible
        </h2>
        <p className="text-gray-600 mb-8">
          Retour prochainement pour explorer le profil des meilleures entreprises ivoiriennes.
        </p>
        <Link
          href="/"
          className="inline-block bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-semibold shadow-md transition-all"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
