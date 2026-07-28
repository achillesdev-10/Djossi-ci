import Link from 'next/link';

export const metadata = {
  title: 'Talents & Candidats',
  description: 'Découvrez des profils de candidats qualifiés en Côte d\'Ivoire.',
};

export default function CandidatesPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <nav className="text-sm text-gray-500 mb-8">
        <Link href="/" className="hover:text-primary">Accueil</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">Candidats</span>
      </nav>

      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-4 font-[var(--font-display)]">
          Découvrez nos talents
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl">
          Une base de 50,000+ profils qualifiés, prêts à rejoindre votre équipe.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-border p-12 text-center">
        <h2 className="text-2xl font-bold mb-4 font-[var(--font-display)]">
          Annuaire des talents - Bientôt en ligne
        </h2>
        <p className="text-gray-600 mb-8 max-w-xl mx-auto">
          Connectez-vous pour accéder aux profils complets et prendre contact avec les meilleurs candidats.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/auth/employer/register"
            className="w-full sm:w-auto bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-semibold shadow-md shadow-primary/20 transition-all"
          >
            Inscription recruteur
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-900 px-8 py-3 rounded-xl font-semibold transition-all"
          >
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
