export const dynamic = "force-dynamic";

export default function CandidateDashboardPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-8 text-gray-900 dark:text-slate-50 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="inline-flex rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400 border border-sky-500/20 mb-2">
            Espace Candidat
          </span>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white font-[var(--font-display)]">
            Mon Tableau de Bord
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Gérez vos candidatures, CV et alertes emploi en Côte d'Ivoire.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-xl">
          <div className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">Candidatures envoyées</div>
          <div className="text-3xl font-black text-gray-900 dark:text-white mt-2">3</div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">2 en attente de réponse</div>
        </div>

        <div className="rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-xl">
          <div className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">Profil complété</div>
          <div className="text-3xl font-black text-gray-900 dark:text-white mt-2">85%</div>
          <div className="text-xs text-primary mt-1">Ajoutez votre CV PDF</div>
        </div>

        <div className="rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-xl">
          <div className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">Alertes Emploi</div>
          <div className="text-3xl font-black text-gray-900 dark:text-white mt-2">2 Actives</div>
          <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">Développeur & Marketing Abidjan</div>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 lg:p-8 shadow-xl space-y-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Mes dernières candidatures</h2>
        <div className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
          <div className="py-4 flex items-center justify-between">
            <div>
              <div className="font-bold text-gray-900 dark:text-white">Développeur Full Stack Senior</div>
              <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">MTN Côte d'Ivoire · Abidjan - Plateau</div>
            </div>
            <span className="inline-flex rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
              En attente
            </span>
          </div>

          <div className="py-4 flex items-center justify-between">
            <div>
              <div className="font-bold text-gray-900 dark:text-white">Chef de Projet Marketing Digital</div>
              <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Société Générale CI · Abidjan - Cocody</div>
            </div>
            <span className="inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Consulté par recruteur
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
