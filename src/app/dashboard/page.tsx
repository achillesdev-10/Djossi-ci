import Link from 'next/link';

export const metadata = {
  title: 'Tableau de bord',
};

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-4 font-[var(--font-display)]">
          Tableau de bord
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl">
          Accédez à votre espace personnel pour gérer vos candidatures, vos offres ou votre profil.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-border p-12 text-center">
        <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
        </div>
        <h2 className="text-2xl font-bold mb-4 font-[var(--font-display)]">
          Votre espace personnel
        </h2>
        <p className="text-gray-600 mb-8 max-w-xl mx-auto">
          Connectez-vous ou créez un compte pour accéder à toutes les fonctionnalités : 
          sauvegarder des offres, postuler, publier des annonces, gérer vos candidatures.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/auth/candidate/login"
            className="w-full sm:w-auto bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-semibold shadow-md shadow-primary/20 transition-all"
          >
            Je suis candidat
          </Link>
          <Link
            href="/auth/employer/login"
            className="w-full sm:w-auto bg-accent hover:bg-accent-light text-white px-8 py-3 rounded-xl font-semibold shadow-md shadow-accent/20 transition-all"
          >
            Je suis recruteur
          </Link>
        </div>
      </div>
    </div>
  );
}
