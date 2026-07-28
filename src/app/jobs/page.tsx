import Link from 'next/link';

export const metadata = {
  title: 'Toutes les offres d\'emploi',
  description: 'Parcourez et recherchez des milliers d\'offres d\'emploi en Côte d\'Ivoire.',
};

export default function JobsPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <nav className="text-sm text-gray-500 mb-8">
        <Link href="/" className="hover:text-primary">Accueil</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">Offres d'emploi</span>
      </nav>

      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-4 font-[var(--font-display)]">
          Toutes les offres d'emploi
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl">
          Explorez nos offres et trouvez l'opportunité qui correspond à vos compétences et vos aspirations.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-border p-12 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
        </div>
        <h2 className="text-2xl font-bold mb-2 font-[var(--font-display)]">
          Page en cours de construction
        </h2>
        <p className="text-gray-600 max-w-lg mx-auto mb-8">
          La fonctionnalité de recherche avancée et le listing des offres arrivent très vite. 
          Revenez sur la page d'accueil pour découvrir quelques offres à la une.
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
