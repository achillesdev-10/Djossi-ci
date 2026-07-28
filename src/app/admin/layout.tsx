import AdminSidebar from '@/components/admin/AdminSidebar';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const email = process.env.ADMIN_EMAIL || 'admin@djossi.ci';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col lg:flex-row">
      {/* Sidebar Desktop */}
      <div className="hidden lg:block lg:w-72 lg:fixed lg:inset-y-0 z-30">
        <AdminSidebar email={email} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-72 min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-medium text-slate-300">
              Console Administrateur Sécurisée
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-white">{email}</div>
              <div className="text-[10px] text-emerald-400">Rôle Admin Actif</div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 border border-primary/30 text-primary font-bold text-sm">
              {email.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
