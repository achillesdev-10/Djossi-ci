import AdminAppShell from "@/components/admin/AdminAppShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const email = process.env.ADMIN_EMAIL || "admin@djossi.ci";

  return <AdminAppShell email={email}>{children}</AdminAppShell>;
}
