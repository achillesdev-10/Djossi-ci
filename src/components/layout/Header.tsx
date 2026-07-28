'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks';

const NAV_LINKS = [
  { label: 'Offres d\'emploi', href: '/jobs' },
  { label: 'Entreprises', href: '/companies' },
  { label: 'Candidats', href: '/candidates' },
  { label: 'Tableau de bord', href: '/dashboard', protected: true },
];

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-all duration-300 border-b',
        scrolled
          ? 'bg-white/90 backdrop-blur-md border-border shadow-sm'
          : 'bg-white border-transparent'
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
              <span className="text-white font-black text-xl font-[var(--font-display)]">D</span>
            </div>
            <div>
              <div className="text-xl font-black font-[var(--font-display)] tracking-tight">
                Djossi<span className="text-primary">.ci</span>
              </div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground -mt-1">
                L'emploi en Côte d'Ivoire
              </div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.filter((l) => !l.protected || isAuthenticated).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-700 hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-gray-700 hover:text-primary"
                >
                  {user?.first_name || user?.email}
                </Link>
                <button
                  onClick={() => logout()}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/candidate/login"
                  className="text-sm font-medium text-gray-700 hover:text-primary px-4 py-2"
                >
                  Connexion
                </Link>
                <Link
                  href="/auth/candidate/register"
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark shadow-md shadow-primary/20 transition-all"
                >
                  S'inscrire
                </Link>
              </>
            )}
          </div>

          <button
            className="lg:hidden p-2 -mr-2"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {open && (
          <div className="lg:hidden border-t border-border py-4 space-y-1">
            {NAV_LINKS.filter((l) => !l.protected || isAuthenticated).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block px-2 py-3 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 mt-4 border-t border-border space-y-2">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="block px-2 py-3 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    Mon espace
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setOpen(false);
                    }}
                    className="w-full text-left px-2 py-3 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/candidate/login"
                    onClick={() => setOpen(false)}
                    className="block px-2 py-3 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/auth/candidate/register"
                    onClick={() => setOpen(false)}
                    className="block px-2 py-3 rounded-lg bg-primary text-white text-sm font-semibold text-center"
                  >
                    Créer un compte
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
