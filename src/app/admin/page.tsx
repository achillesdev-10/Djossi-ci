import Link from 'next/link';
import { JobOfferSchemaService } from '@/services/jobOfferSchemaService';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const stats = await JobOfferSchemaService.getAdminStats(7);

  const { totalOffers, verifiedOffers, offersToday, activity, latestOffers } = stats;
  const maxCount = Math.max(...activity.map((d) => d.total), 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white font-[var(--font-display)]">
          Vue d'ensemble
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Bienvenue sur le tableau de bord de pilotage Djossi.ci. Suivez l'activité et gérez les offres.
        </p>
      </div>

      {/* Cartes Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">Total des offres</div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl lg:text-4xl font-black text-white">{totalOffers}</span>
            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
              Actif
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">Offres vérifiées</div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl lg:text-4xl font-black text-white">{verifiedOffers}</span>
            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
              {totalOffers ? Math.round((verifiedOffers / totalOffers) * 100) : 0}% du total
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl" />
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">Offres du jour</div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl lg:text-4xl font-black text-white">{offersToday}</span>
            <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
              Aujourd'hui
            </span>
          </div>
        </div>
      </div>

      {/* Graphique d'activité */}
      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 lg:p-8 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">Graphique d'activité</h2>
            <p className="text-xs text-slate-400">Volume des nouvelles offres publiées sur les 7 derniers jours</p>
          </div>
          <Link
            href="/admin/jobs"
            className="text-xs font-semibold text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-xl"
          >
            Gérer les offres &rarr;
          </Link>
        </div>

        <div className="h-64 flex items-end gap-3 sm:gap-6 pt-6 px-2 border-b border-slate-800 pb-2">
          {activity.map((item) => {
            const heightPercent = Math.max((item.total / maxCount) * 100, 12);
            return (
              <div key={item.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <span className="text-xs font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.total}
                </span>
                <div
                  style={{ height: `${heightPercent}%` }}
                  className="w-full max-w-[48px] rounded-2xl bg-gradient-to-t from-primary/40 to-primary transition-all duration-300 group-hover:brightness-125"
                />
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mt-1">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dernières offres et raccourcis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-950 p-6 lg:p-8 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-white text-base">Dernières offres enregistrées</h3>
            <Link href="/admin/jobs" className="text-xs font-semibold text-slate-400 hover:text-white">
              Voir tout
            </Link>
          </div>
          <div className="space-y-4">
            {latestOffers.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">Aucune offre disponible.</p>
            ) : (
              latestOffers.map((offer) => (
                <div key={offer.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                  <div className="min-w-0 pr-4">
                    <div className="text-sm font-bold text-white truncate">{offer.title}</div>
                    <div className="text-xs text-slate-400 truncate mt-0.5">{offer.company} • {offer.location}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                      offer.is_verified ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {offer.is_verified ? 'Vérifiée' : 'En attente'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 flex flex-col justify-between h-[calc(50%-10px)] min-h-[160px]">
            <div>
              <h3 className="font-bold text-white text-base">Gestion des offres</h3>
              <p className="text-xs text-slate-400 mt-1">Filtrer, vérifier, modifier ou supprimer des offres.</p>
            </div>
            <Link
              href="/admin/jobs"
              className="mt-4 inline-flex items-center justify-center rounded-2xl bg-white text-slate-950 px-4 py-2.5 text-xs font-bold hover:bg-slate-200 transition-colors"
            >
              Accéder aux offres
            </Link>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 flex flex-col justify-between h-[calc(50%-10px)] min-h-[160px]">
            <div>
              <h3 className="font-bold text-white text-base">Scraper d'offres</h3>
              <p className="text-xs text-slate-400 mt-1">Lancer et surveiller l'importation automatique d'offres.</p>
            </div>
            <Link
              href="/admin/scraper"
              className="mt-4 inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-white px-4 py-2.5 text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              Configurer le scraper
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
