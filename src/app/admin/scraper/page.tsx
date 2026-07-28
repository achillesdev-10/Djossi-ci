import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function AdminScraperPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white font-[var(--font-display)]">
          Pilote du Scraper
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Surveillez et lancez l'importation automatisée d'offres d'emploi en Côte d'Ivoire.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 lg:p-8 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <div className="text-base font-bold text-white">État du service scraper</div>
            <div className="text-xs text-slate-400 mt-0.5">Python 3 / BeautifulSoup / SQLite cache</div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Prêt et opérationnel
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">Sources configurées</div>
            <div className="text-2xl font-black text-white mt-2">3 Plateformes</div>
            <div className="text-xs text-slate-500 mt-1">LinkedIn CI, Emploi.ci, Carrières locales</div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">Dernier run</div>
            <div className="text-2xl font-black text-white mt-2">Il y a 2h</div>
            <div className="text-xs text-emerald-400 mt-1">+14 nouvelles offres</div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">Mode d'exécution</div>
            <div className="text-2xl font-black text-white mt-2">Automatique</div>
            <div className="text-xs text-slate-500 mt-1">Toutes les 6 heures</div>
          </div>
        </div>

        <div className="pt-4 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Pour lancer une extraction manuelle, exécutez la commande <code className="text-primary font-mono">python scraper/scraper.py</code> dans le terminal.
          </p>
          <Link
            href="/admin/jobs"
            className="rounded-2xl bg-primary text-slate-950 px-5 py-3 text-xs font-bold hover:brightness-110 transition-all shadow-lg shadow-primary/20"
          >
            Voir les offres importées
          </Link>
        </div>
      </div>
    </div>
  );
}
