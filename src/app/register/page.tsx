"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<"candidate" | "company">("candidate");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Simulate or call auth registration
      // In a real Supabase setup: await supabase.auth.signUp({ email, password, options: { data: { role, name: role === 'candidate' ? name : companyName } } })
      
      // For seamless demo & test without blocking, we store user session in localStorage and cookies
      const userData = {
        email,
        role,
        name: role === "candidate" ? name : companyName,
      };
      localStorage.setItem("djossi_user", JSON.stringify(userData));
      document.cookie = `djossi_role=${role}; path=/; max-age=86400`;

      if (role === "candidate") {
        router.push("/dashboard/candidate");
      } else {
        router.push("/dashboard/company");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-12 text-slate-50">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block text-2xl font-black text-primary font-[var(--font-display)]">
            Djossi<span className="text-white">.ci</span>
          </Link>
          <h1 className="text-xl font-bold">Créer un compte</h1>
          <p className="text-xs text-slate-400">Rejoignez la première plateforme d'emploi en Côte d'Ivoire</p>
        </div>

        {error ? (
          <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 text-xs text-rose-300">
            {error}
          </div>
        ) : null}

        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Je souhaite :</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole("candidate")}
              className={`rounded-2xl border p-4 text-left transition-all ${
                role === "candidate"
                  ? "border-primary bg-primary/10 text-white shadow-lg shadow-primary/10"
                  : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
              }`}
            >
              <div className="font-bold text-sm">Candidat</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Je cherche un emploi ou un stage</div>
            </button>

            <button
              type="button"
              onClick={() => setRole("company")}
              className={`rounded-2xl border p-4 text-left transition-all ${
                role === "company"
                  ? "border-primary bg-primary/10 text-white shadow-lg shadow-primary/10"
                  : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
              }`}
            >
              <div className="font-bold text-sm">Entreprise</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Je recrute des talents</div>
            </button>
          </div>
        </div>

        <form onSubmit={handleRegister} className="space-y-4 pt-2">
          {role === "candidate" ? (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nom complet</label>
              <input
                type="text"
                required
                placeholder="Koffi Kouadio"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:outline-none focus:border-primary"
              />
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nom de l'entreprise</label>
              <input
                type="text"
                required
                placeholder="MTN Côte d'Ivoire"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:outline-none focus:border-primary"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Email professionnel ou personnel</label>
            <input
              type="email"
              required
              placeholder="vous@exemple.ci"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Mot de passe</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-primary py-3.5 text-xs font-bold text-slate-950 hover:brightness-110 transition-all shadow-lg shadow-primary/20 mt-4 disabled:opacity-50"
          >
            {loading ? "Création du compte..." : "S'inscrire"}
          </button>
        </form>

        <div className="text-center text-xs text-slate-400">
          Vous avez déjà un compte ?{" "}
          <Link href="/login" className="text-primary font-bold hover:underline">
            Se connecter
          </Link>
        </div>
      </div>
    </main>
  );
}
