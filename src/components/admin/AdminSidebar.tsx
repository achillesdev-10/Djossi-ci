'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  {
    href: '/admin',
    label: "Vue d'ensemble",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 13h8V3H3v10Z" />
        <path d="M13 21h8v-6h-8v6Z" />
        <path d="M13 3h8v8h-8V3Z" />
        <path d="M3 21h8v-4H3v4Z" />
      </svg>
    ),
  },
  {
    href: '/admin/jobs',
    label: "Offres d'emploi",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M4 9h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9Z" />
        <path d="M4 12h16" />
      </svg>
    ),
  },
  {
    href: '/admin/scraper',
    label: 'Scraper',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 8V4" />
        <path d="m9 7 3-3 3 3" />
        <path d="M20 15a4 4 0 0 0-4-4h-1.3A6 6 0 1 0 6 17h10" />
        <path d="M16 19h6" />
        <path d="M19 16v6" />
      </svg>
    ),
  },
  {
    href: '/admin/settings',
    label: 'Paramètres',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z" />
        <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.7-.9 1 1 0 0 0-1 .2l-.2.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.7 1 1 0 0 0-.2-1l-.1-.2a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .7.9 1 1 0 0 0 1-.2l.2-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.7Z" />
      </svg>
    ),
  },
];

export default function AdminSidebar({
  email,
}: {
  email: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/admin/session', { method: 'DELETE' });
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-slate-950 text-white">
      <div className="border-b border-white/10 px-6 py-6">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-black/30">
            <span className="font-[var(--font-display)] text-xl font-black">D</span>
          </div>
          <div>
            <div className="font-[var(--font-display)] text-lg font-extrabold tracking-tight">
              Djossi Admin
            </div>
            <div className="text-xs text-slate-400">Modération et pilotage</div>
          </div>
        </Link>
      </div>

      <div className="px-4 py-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Session</div>
          <div className="mt-2 truncate text-sm font-medium text-white">{email}</div>
          <div className="mt-1 inline-flex rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
            Administrateur
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors',
                active
                  ? 'bg-white text-slate-950 shadow-lg shadow-black/20'
                  : 'text-slate-300 hover:bg-white/8 hover:text-white'
              )}
            >
              <span className={cn(active ? 'text-primary' : 'text-slate-400')}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
        >
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
