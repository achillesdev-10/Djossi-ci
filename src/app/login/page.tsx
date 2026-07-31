"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleOverride, setRoleOverride] = useState<"candidate" | "company">("candidate");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Simulate auth or Supabase sign-in
      const userData = {
        email,
        role: roleOverride,
        name: email.split("@")[0],
      };
      localStorage.setItem("djossi_user", JSON.stringify(userData));
      document.cookie = `djossi_role=${roleOverride}; path=/; max-age=86400`;

      if (roleOverride === "candidate") {
        router.push("/dashboard/candidate");
      } else {
        router.push("/dashboard/company");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Identifiants incorrects");
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
          <h1 className="text-xl font-bold">Connexion à votre espace</h1>
          <p className="text-xs text-slate-400">Accédez à votre tableau de bord candidat ou recruteur</p>
        </div>

        {error ? (
          <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 text-xs text-rose-300">
            {error}
          </div>
        ) : null}

        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Connexion en tant que :</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRoleOverride("candidate")}
              className={`rounded-2xl border p-3 text-center transition-all text-xs font-bold ${
                roleOverride === "candidate"
                  ? "border-primary bg-primary/10 text-white shadow-lg shadow-primary/10"
                  : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
              }`}
            >
              Candidat
            </button>
            <button
              type="button"
              onClick={() => setRoleOverride("company")}
              className={`rounded-2xl border p-3 text-center transition-all text-xs font-bold ${
                roleOverride === "company"
                  ? "border-primary bg-primary/10 text-white shadow-lg shadow-primary/10"
                  : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
              }`}
            >
              Entreprise
            </button>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 pt-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Email</label>
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
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <div className="text-center text-xs text-slate-400">
          Pas encore de compte ?{" "}
          <Link href="/register" className="text-primary font-bold hover:underline">
            S'inscrire
          </Link>
        </div>
      </div>
    </main>
  );
}
