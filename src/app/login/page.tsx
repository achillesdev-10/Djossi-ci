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

  async function handleGoogleLogin() {
    setError(null);
    setLoading(true);
    try {
      const userData = {
        email: "google.user@travaillerenci.ci",
        role: roleOverride,
        name: "Utilisateur Google",
      };
      localStorage.setItem("travaillerenci_user", JSON.stringify(userData));
      document.cookie = `travaillerenci_role=${roleOverride}; path=/; max-age=86400`;

      if (roleOverride === "candidate") {
        router.push("/dashboard/candidate");
      } else {
        router.push("/dashboard/company");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la connexion Google");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const userData = {
        email,
        role: roleOverride,
        name: email.split("@")[0],
      };
      localStorage.setItem("travaillerenci_user", JSON.stringify(userData));
      document.cookie = `travaillerenci_role=${roleOverride}; path=/; max-age=86400`;

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
    <main className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col items-center justify-center px-4 py-12 text-gray-900 dark:text-slate-50 transition-colors">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-2xl">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block text-2xl font-black text-primary font-[var(--font-display)]">
            Travailleren<span className="text-gray-900 dark:text-white">Ci</span>
          </Link>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Connexion à votre espace</h1>
          <p className="text-xs text-gray-500 dark:text-slate-400">Accédez à votre tableau de bord candidat ou recruteur</p>
        </div>

        {error ? (
          <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 text-xs text-rose-600 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        <div className="space-y-3">
          <label className="block text-xs font-bold text-gray-700 dark:text-slate-400 uppercase tracking-widest">Connexion en tant que :</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRoleOverride("candidate")}
              className={`rounded-2xl border p-3 text-center transition-all text-xs font-bold ${
                roleOverride === "candidate"
                  ? "border-primary bg-primary/10 text-primary dark:text-white shadow-lg shadow-primary/10"
                  : "border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-gray-700 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-700"
              }`}
            >
              Candidat
            </button>
            <button
              type="button"
              onClick={() => setRoleOverride("company")}
              className={`rounded-2xl border p-3 text-center transition-all text-xs font-bold ${
                roleOverride === "company"
                  ? "border-primary bg-primary/10 text-primary dark:text-white shadow-lg shadow-primary/10"
                  : "border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-gray-700 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-700"
              }`}
            >
              Entreprise
            </button>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 pt-2">
          <div>
            <label className="block text-[10px] font-bold text-gray-600 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email</label>
            <input
              type="email"
              required
              placeholder="vous@exemple.ci"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-600 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Mot de passe</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-primary py-3.5 text-xs font-bold text-white hover:brightness-110 transition-all shadow-lg shadow-primary/20 mt-4 disabled:opacity-50"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-slate-900 px-2 text-gray-500 dark:text-slate-400">Ou continuer avec</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 py-3.5 px-4 text-xs font-bold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.1 8.9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.6 6.4C.6 8.4 0 10.1 0 12s.6 3.6 1.6 5.6l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5.3L1.6 15.6C3.5 19.4 7.4 23 12 23z"
            />
          </svg>
          Se connecter avec Google
        </button>

        <div className="text-center text-xs text-gray-500 dark:text-slate-400">
          Pas encore de compte ?{" "}
          <Link href="/register" className="text-primary font-bold hover:underline">
            S'inscrire
          </Link>
        </div>
      </div>
    </main>
  );
}
