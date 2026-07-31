'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { JobOfferSchema } from '@/types';

export default function AdminJobsPage({
  initialJobs,
}: {
  initialJobs: JobOfferSchema[];
}) {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobOfferSchema[]>(initialJobs);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'unverified' | 'archived' | 'expired'>('all');
  const [contractFilter, setContractFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  // Modal d'édition
  const [editingJob, setEditingJob] = useState<JobOfferSchema | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    company: '',
    location: '',
    contract_type: 'CDI' as JobOfferSchema['contract_type'],
    description: '',
  });

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.company.toLowerCase().includes(search.toLowerCase()) ||
      job.location.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? !job.is_archived && !job.is_expired
        : statusFilter === 'verified'
        ? job.is_verified && !job.is_archived && !job.is_expired
        : statusFilter === 'unverified'
        ? !job.is_verified && !job.is_archived && !job.is_expired
        : statusFilter === 'archived'
        ? job.is_archived
        : job.is_expired;

    const matchesContract =
      contractFilter === 'all' ? true : job.contract_type === contractFilter;

    const matchesCity =
      cityFilter === 'all' ? true : job.location.toLowerCase().includes(cityFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesContract && matchesCity;
  });

  async function handleToggleVerified(job: JobOfferSchema) {
    const nextVerified = !job.is_verified;
    setJobs((prev) =>
      prev.map((j) => (j.id === job.id ? { ...j, is_verified: nextVerified } : j))
    );

    try {
      const res = await fetch(`/api/admin/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_verified: nextVerified }),
      });

      if (!res.ok) throw new Error('Échec de la mise à jour');
      startTransition(() => { router.refresh(); });
    } catch {
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, is_verified: job.is_verified } : j))
      );
      alert('Impossible de modifier le statut de vérification.');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette offre ?')) return;
    const previousJobs = [...jobs];
    setJobs((prev) => prev.filter((j) => j.id !== id));
    try {
      const res = await fetch(`/api/admin/jobs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Échec de suppression');
      startTransition(() => { router.refresh(); });
    } catch {
      setJobs(previousJobs);
      alert('Impossible de supprimer cette offre.');
    }
  }

  async function handleBulkAction(action: 'delete' | 'verify' | 'archive') {
    if (selectedIds.length === 0) return;
    if (action === 'delete' && !confirm(`Supprimer ${selectedIds.length} offres ?`)) return;

    try {
      const res = await fetch('/api/admin/jobs/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action === 'delete' ? 'delete' : 'update',
          ids: selectedIds,
          data: action === 'verify' ? { is_verified: true } : action === 'archive' ? { is_archived: true } : {},
        }),
      });

      if (!res.ok) throw new Error('Erreur lors de l’action en masse');

      if (action === 'delete') {
        setJobs((prev) => prev.filter((j) => !selectedIds.includes(j.id)));
      } else {
        setJobs((prev) =>
          prev.map((j) =>
            selectedIds.includes(j.id)
              ? {
                  ...j,
                  ...(action === 'verify' ? { is_verified: true } : { is_archived: true }),
                }
              : j
          )
        );
      }
      setSelectedIds([]);
      startTransition(() => { router.refresh(); });
    } catch (err) {
      alert('Une erreur est survenue lors de l’action en masse.');
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredJobs.length && filteredJobs.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredJobs.map((j) => j.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const cities = Array.from(new Set(jobs.map((j) => {
    const parts = j.location.split('-');
    return parts[0].trim();
  }))).sort();

  function openEditModal(job: JobOfferSchema) {
    setEditingJob(job);
    setEditForm({
      title: job.title,
      company: job.company,
      location: job.location,
      contract_type: job.contract_type,
      description: job.description,
    });
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingJob) return;
    try {
      const res = await fetch(`/api/admin/jobs/${editingJob.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la modification');
      setJobs((prev) =>
        prev.map((j) => (j.id === editingJob.id ? { ...j, ...editForm } : j))
      );
      setEditingJob(null);
      startTransition(() => { router.refresh(); });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }

  return (
    <div className="space-y-8 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white font-[var(--font-display)]">
            Offres d'emploi ({filteredJobs.length})
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Recherchez, filtrez, validez ou modifiez les offres publiées sur la plateforme.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-80 relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-slate-800 bg-slate-900 pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-primary"
          >
            <option value="all">Tous les statuts</option>
            <option value="verified">Vérifiées</option>
            <option value="unverified">En attente</option>
            <option value="archived">Archivées</option>
            <option value="expired">Expirées</option>
          </select>

          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-primary"
          >
            <option value="all">Toutes les villes</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>

          <select
            value={contractFilter}
            onChange={(e) => setContractFilter(e.target.value)}
            className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-primary"
          >
            <option value="all">Tous les contrats</option>
            <option value="CDI">CDI</option>
            <option value="CDD">CDD</option>
            <option value="Stage">Stage</option>
            <option value="Freelance">Freelance</option>
            <option value="Alternance">Alternance</option>
            <option value="Prestation">Prestation</option>
          </select>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredJobs.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-700 bg-slate-900 text-primary focus:ring-primary h-4 w-4"
                  />
                </th>
                <th className="py-4 px-6">Poste / Entreprise</th>
                <th className="py-4 px-6">Lieu</th>
                <th className="py-4 px-6">Contrat</th>
                <th className="py-4 px-6">Statut</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {filteredJobs.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-500">Aucune offre trouvée.</td></tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={job.id} className={`hover:bg-slate-900/40 transition-colors ${selectedIds.includes(job.id) ? 'bg-primary/5' : ''}`}>
                    <td className="py-4 px-6 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(job.id)}
                        onChange={() => toggleSelect(job.id)}
                        className="rounded border-slate-700 bg-slate-900 text-primary focus:ring-primary h-4 w-4"
                      />
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-white max-w-xs truncate">{job.title}</div>
                      <div className="text-xs text-slate-400 truncate mt-0.5">{job.company}</div>
                    </td>
                    <td className="py-4 px-6 text-slate-300 text-xs">{job.location}</td>
                    <td className="py-4 px-6">
                      <span className="inline-flex rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300">
                        {job.contract_type}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        type="button"
                        onClick={() => handleToggleVerified(job)}
                        disabled={isPending}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          job.is_verified
                            ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${job.is_verified ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        {job.is_verified ? 'Vérifiée' : 'En attente'}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEditModal(job)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold"
                      >
                        Éditer
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(job.id)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl">
          <div className="bg-slate-900 border border-primary/30 shadow-2xl shadow-primary/20 rounded-3xl p-4 flex items-center justify-between backdrop-blur-md">
            <div className="hidden sm:block pl-2">
              <span className="text-sm font-bold text-white">
                {selectedIds.length} sélectionnée{selectedIds.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button onClick={() => handleBulkAction('verify')} className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold border border-emerald-500/20">Vérifier</button>
              <button onClick={() => handleBulkAction('archive')} className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold border border-slate-700">Archiver</button>
              <button onClick={() => handleBulkAction('delete')} className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold border border-rose-500/20">Supprimer</button>
              <button onClick={() => setSelectedIds([])} className="p-2.5 rounded-2xl bg-slate-800 text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {editingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 lg:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white font-[var(--font-display)]">Modifier l'offre</h3>
              <button type="button" onClick={() => setEditingJob(null)} className="text-slate-400 hover:text-white text-lg font-bold">&times;</button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Titre du poste</label>
                <input type="text" required value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:outline-none focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Entreprise</label>
                  <input type="text" required value={editForm.company} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Lieu</label>
                  <input type="text" required value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Contrat</label>
                <select value={editForm.contract_type} onChange={(e) => setEditForm({ ...editForm, contract_type: e.target.value as any })} className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:outline-none focus:border-primary">
                  <option value="CDI">CDI</option><option value="CDD">CDD</option><option value="Stage">Stage</option><option value="Freelance">Freelance</option><option value="Alternance">Alternance</option><option value="Prestation">Prestation</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Description</label>
                <textarea rows={4} required value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:outline-none focus:border-primary" />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingJob(null)} className="rounded-2xl bg-slate-800 px-5 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700 transition-colors">Annuler</button>
                <button type="submit" className="rounded-2xl bg-primary px-5 py-3 text-xs font-bold text-slate-950 hover:brightness-110 transition-all shadow-lg shadow-primary/20">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
