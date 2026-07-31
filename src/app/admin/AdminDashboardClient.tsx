"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  AdminDashboardData,
  BulkAction,
  DashboardOffer,
  ScraperHealth,
} from "../../lib/admin-dashboard";

type AdminDashboardClientProps = {
  initialData: AdminDashboardData;
};

const STATUS_OPTIONS = ["Toutes", "En attente", "Vérifiées", "Expirées"] as const;

const BULK_ACTIONS: Array<{
  action: BulkAction;
  label: string;
  tone: string;
}> = [
  {
    action: "delete",
    label: "Supprimer la sélection",
    tone: "bg-rose-500 text-white hover:bg-rose-600",
  },
  {
    action: "verify",
    label: "Marquer comme vérifiées",
    tone: "bg-emerald-500 text-white hover:bg-emerald-600",
  },
  {
    action: "archive",
    label: "Archiver",
    tone: "bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white",
  },
];

function formatDate(date: string | null) {
  if (!date) {
    return "Date inconnue";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function statusClasses(status: DashboardOffer["status"]) {
  switch (status) {
    case "Vérifiées":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200";
    case "Expirées":
      return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200";
  }
}

function scraperStatusLabel(status: ScraperHealth["status"]) {
  switch (status) {
    case "success":
      return "Succès";
    case "running":
      return "En cours";
    case "error":
      return "Échec";
    default:
      return "En attente";
  }
}

function scraperStatusClasses(status: ScraperHealth["status"]) {
  switch (status) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200";
    case "running":
      return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200";
    case "error":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
  }
}

export default function AdminDashboardClient({
  initialData,
}: AdminDashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [offers, setOffers] = useState(initialData.offers);
  const [cities, setCities] = useState(initialData.cities);
  const [stats, setStats] = useState(initialData.stats);
  const [scraperHealth, setScraperHealth] = useState(initialData.scraperHealth);
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_OPTIONS)[number]>("Toutes");
  const [cityFilter, setCityFilter] = useState("Toutes");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      const matchesStatus =
        statusFilter === "Toutes" || offer.status === statusFilter;
      const matchesCity = cityFilter === "Toutes" || offer.city === cityFilter;

      return matchesStatus && matchesCity;
    });
  }, [cityFilter, offers, statusFilter]);

  const filteredIds = filteredOffers.map((offer) => offer.id);
  const allVisibleSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));

  function updateFromPayload(payload: AdminDashboardData) {
    setOffers(payload.offers);
    setCities(payload.cities);
    setStats(payload.stats);
    setScraperHealth(payload.scraperHealth);
  }

  async function handleBulkAction(action: BulkAction) {
    if (selectedIds.length === 0) {
      return;
    }

    setFeedback(null);

    const response = await fetch("/api/admin/offers/bulk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        ids: selectedIds,
      }),
    });

    const payload = (await response.json()) as
      | (AdminDashboardData & { message?: string })
      | { error?: string };

    if (!response.ok || !("offers" in payload)) {
      setFeedback({
        tone: "error",
        text:
          "error" in payload && payload.error
            ? payload.error
            : "L'action en masse a échoué.",
      });
      return;
    }

    updateFromPayload(payload);
    setSelectedIds([]);
    setFeedback({
      tone: "success",
      text:
        "message" in payload && payload.message
          ? payload.message
          : "La sélection a bien été traitée.",
    });

    startTransition(() => {
      router.refresh();
    });
  }

  async function handleTriggerScraper() {
    setFeedback(null);

    const response = await fetch("/api/admin/scraper", {
      method: "POST",
    });

    const payload = (await response.json()) as
      | { scraperHealth: ScraperHealth; message?: string }
      | { error?: string };

    if (!response.ok || !("scraperHealth" in payload)) {
      setFeedback({
        tone: "error",
        text:
          "error" in payload && payload.error
            ? payload.error
            : "Impossible de déclencher le scraper.",
      });
      return;
    }

    setScraperHealth(payload.scraperHealth);
    setFeedback({
      tone: "success",
      text:
        payload.message ??
        payload.scraperHealth.message ??
        "Le scraper a bien été déclenché.",
    });

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 px-4 py-6 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-sky-600 dark:text-sky-300">
                Djossi.ci Admin
              </p>
              <div>
                <h1 className="text-2xl font-semibold sm:text-3xl">
                  Dashboard des offres
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                  Suivez la santé du scraper, filtrez rapidement les annonces et
                  gérez plusieurs offres en une seule action.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTriggerScraper}
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Traitement..." : "Déclencher le scraper"}
            </button>
          </div>

          {feedback ? (
            <div
              className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
                feedback.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                  : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
              }`}
            >
              {feedback.text}
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 xl:grid-cols-5">
          <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Offres actives
            </p>
            <p className="mt-3 text-3xl font-semibold">{stats.totalActiveOffers}</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Annonces en attente ou déjà vérifiées.
            </p>
          </article>

          <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nouvelles cette semaine
            </p>
            <p className="mt-3 text-3xl font-semibold">{stats.newOffersThisWeek}</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Offres ajoutées sur les 7 derniers jours.
            </p>
          </article>

          <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Clics totaux
            </p>
            <p className="mt-3 text-3xl font-semibold">{stats.totalClicks}</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Total cumulé des interactions suivies.
            </p>
          </article>

          <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Visites du site
              </p>
              <span className="inline-flex rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Aujourd'hui: {stats.visitsToday}
              </span>
            </div>
            <p className="mt-3 text-3xl font-semibold">{stats.totalVisits}</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {stats.visitsThisWeek} visites sur les 7 derniers jours.
            </p>
          </article>

          <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Santé du scraper
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {scraperHealth.message ?? "Dernière exécution disponible"}
                </p>
              </div>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${scraperStatusClasses(
                  scraperHealth.status,
                )}`}
              >
                {scraperStatusLabel(scraperHealth.status)}
              </span>
            </div>

            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500 dark:text-slate-400">
                  Dernière exécution
                </dt>
                <dd className="text-right font-medium">
                  {formatDate(scraperHealth.lastRunAt)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500 dark:text-slate-400">
                  Offres ajoutées
                </dt>
                <dd className="font-medium">
                  {scraperHealth.offersAdded ?? "N/A"}
                </dd>
              </div>
            </dl>
          </article>
        </section>

        <section className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Liste des offres</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {filteredOffers.length} offre
                {filteredOffers.length > 1 ? "s" : ""} affichée
                {filteredOffers.length > 1 ? "s" : ""} sur {offers.length}.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-slate-500 dark:text-slate-400">Statut</span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as (typeof STATUS_OPTIONS)[number],
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="text-slate-500 dark:text-slate-400">Ville</span>
                <select
                  value={cityFilter}
                  onChange={(event) => setCityFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="Toutes">Toutes</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left dark:divide-slate-800">
                <thead className="bg-slate-50/80 dark:bg-slate-950/80">
                  <tr className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    <th className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={() => {
                          if (allVisibleSelected) {
                            setSelectedIds((current) =>
                              current.filter((id) => !filteredIds.includes(id)),
                            );
                            return;
                          }

                          setSelectedIds((current) =>
                            Array.from(new Set([...current, ...filteredIds])),
                          );
                        }}
                        aria-label="Sélectionner toutes les offres visibles"
                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                    </th>
                    <th className="px-4 py-4">Offre</th>
                    <th className="px-4 py-4">Ville</th>
                    <th className="px-4 py-4">Statut</th>
                    <th className="px-4 py-4">Ajoutée le</th>
                    <th className="px-4 py-4">Clics</th>
                    <th className="px-4 py-4">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                  {filteredOffers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                      >
                        Aucune offre ne correspond aux filtres actuels.
                      </td>
                    </tr>
                  ) : null}

                  {filteredOffers.map((offer) => {
                    const isSelected = selectedIds.includes(offer.id);

                    return (
                      <tr
                        key={offer.id}
                        className="align-top transition hover:bg-slate-50/80 dark:hover:bg-slate-950/60"
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedIds((current) =>
                                current.includes(offer.id)
                                  ? current.filter((id) => id !== offer.id)
                                  : [...current, offer.id],
                              );
                            }}
                            aria-label={`Sélectionner ${offer.title}`}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="min-w-[240px]">
                            <p className="font-medium">{offer.title}</p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              {offer.company}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {offer.city}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClasses(
                              offer.status,
                            )}`}
                          >
                            {offer.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {formatDate(offer.createdAt)}
                        </td>
                        <td className="px-4 py-4 text-sm font-medium">
                          {offer.clicks}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {offer.sourceUrl ? (
                            <a
                              href={offer.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-sky-600 transition hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200"
                            >
                              Ouvrir
                            </a>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">
                              N/A
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {selectedIds.length > 0 ? (
        <div className="fixed inset-x-3 bottom-4 z-50 mx-auto flex max-w-5xl flex-col gap-3 rounded-3xl border border-slate-900/10 bg-slate-950/95 p-4 text-white shadow-2xl backdrop-blur dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium">
            {selectedIds.length} offre
            {selectedIds.length > 1 ? "s" : ""} sélectionnée
            {selectedIds.length > 1 ? "s" : ""}.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            {BULK_ACTIONS.map((bulkAction) => (
              <button
                key={bulkAction.action}
                type="button"
                onClick={() => void handleBulkAction(bulkAction.action)}
                disabled={isPending}
                className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${bulkAction.tone}`}
              >
                {bulkAction.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </main>
  );
}
