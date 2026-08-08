'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchCurrentUser, type StoredUser } from '@/lib/clientAuth';
import SetPasswordForm from '@/components/auth/SetPasswordForm';

const BENEFITS = [
  {
    title: 'Alertes emploi personnalisées',
    description: 'Soyez informé par email dès qu’une offre correspond à votre profil.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    href: '/jobs',
    cta: 'Activer une alerte',
  },
  {
    title: 'CV professionnel + IA',
    description: 'Créez un CV moderne et optimisé par l’IA pour les recruteurs ivoiriens.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    href: '/generateur-de-cv',
    cta: 'Créer mon CV',
  },
  {
    title: 'Offres vérifiées',
    description: 'Chaque offre est contrôlée avant publication : zéro arnaque.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    href: '/jobs',
    cta: 'Voir les offres',
  },
  {
    title: 'Bourses & concours',
    description: 'Accédez aux bourses d’études et concours administratifs officiels.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    href: '/bourses',
    cta: 'Explorer',
  },
  {
    title: 'Conseils carrière',
    description: 'Guides CV, préparation aux entretiens et astuces du marché local.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    href: '/blog',
    cta: 'Lire les conseils',
  },
  {
    title: 'Candidatures suivies',
    description: 'Suivez l’état de vos candidatures et relancez les recruteurs.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    href: '/dashboard/candidate',
    cta: 'Mes candidatures',
  },
];

const STEPS = [
  { label: 'Créez votre CV en ligne', href: '/generateur-de-cv' },
  { label: 'Activez vos alertes emploi', href: '/jobs' },
  { label: 'Postulez aux offres vérifiées', href: '/jobs' },
  { label: 'Consultez bourses et concours', href: '/bourses' },
];

export default function CandidateDashboardPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState<string | null>(null);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCurrentUser()
      .then((current) => {
        if (cancelled) return;
        if (!current) {
          // Pas de session réelle → retour à la connexion.
          router.replace('/login?next=/dashboard/candidate');
          return;
        }
        setUser(current);
        // « Koffi Kouadio » → « Koffi »
        setFirstName(current.name.split(' ')[0] || current.email.split('@')[0]);
        setHydrated(true);
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 text-gray-900 dark:text-slate-50 transition-colors">
      {/* Alerte : compte migré sans mot de passe → définir un mot de passe */}
      {user?.needs_password_reset ? (
        <div className="rounded-3xl border border-orange-500/40 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-slate-900 dark:to-slate-900 dark:border-orange-500/30 p-6 lg:p-8 shadow-xl flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1 text-[11px] font-bold text-orange-600 dark:text-orange-400 border border-orange-500/30 mb-4">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Action requise
            </span>
            <h2 className="text-xl font-bold font-[var(--font-display)] mb-2">
              Sécurisez votre compte
            </h2>
            <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
              Votre compte a été migré depuis l'ancien système (ou créé via Google)
              et ne possède pas encore de mot de passe. Définissez-en un pour vous
              connecter par email et protéger vos données.
            </p>
          </div>
          <div className="w-full lg:w-80">
            <SetPasswordForm
              onSuccess={() => {
                // Le mot de passe est défini : la carte disparaît.
                setUser((prev) => (prev ? { ...prev, needs_password_reset: false } : prev));
              }}
            />
          </div>
        </div>
      ) : null}

      {/* Bannière de bienvenue */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-emerald-600 to-accent text-white p-6 sm:p-8 shadow-2xl shadow-primary/20">
        <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-orange-400/30 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl" aria-hidden="true" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold border border-white/20 backdrop-blur-sm mb-4">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.4 7.2H22l-6 4.6 2.3 7.2-6.3-4.6-6.3 4.6L8 13.8 2 9.2h7.6z" />
            </svg>
            Membre TravaillerEnCi
          </span>
          <h1 className="text-2xl lg:text-3xl font-black font-[var(--font-display)] mb-2">
            {hydrated && firstName ? `Bienvenue, ${firstName} !` : 'Bienvenue sur votre espace !'}
          </h1>
          <p className="text-white/85 text-sm sm:text-base max-w-xl">
            Votre compte est créé. Découvrez tous les avantages de votre adhésion gratuite et
            lancez votre recherche d’emploi dès maintenant.
          </p>
        </div>
      </div>

      {/* Avantages membre */}
      <div>
        <h2 className="text-lg font-bold font-[var(--font-display)] mb-4 flex items-center gap-2">
          Les avantages de votre adhésion
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BENEFITS.map((benefit) => (
            <div
              key={benefit.title}
              className="group rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-sm hover:-translate-y-0.5 hover:shadow-xl transition-all flex flex-col"
            >
              <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                {benefit.icon}
              </div>
              <h3 className="font-bold mb-1.5">{benefit.title}</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed mb-4 flex-1">
                {benefit.description}
              </p>
              <Link
                href={benefit.href}
                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
              >
                {benefit.cta}
                <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Prochaines étapes */}
      <div className="rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 lg:p-8 shadow-xl">
        <h2 className="text-lg font-bold font-[var(--font-display)] mb-5">
          Prochaines étapes pour réussir
        </h2>
        <ol className="space-y-4">
          {STEPS.map((step, index) => (
            <li key={step.label} className="flex items-center gap-4">
              <span className="w-8 h-8 shrink-0 rounded-full bg-orange-500 text-white text-xs font-black flex items-center justify-center font-[var(--font-display)]">
                {index + 1}
              </span>
              <Link
                href={step.href}
                className="flex-1 text-sm font-semibold hover:text-primary transition-colors"
              >
                {step.label}
              </Link>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
