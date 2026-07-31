import AdminDashboardClient from "./AdminDashboardClient";
import { getAdminDashboardData } from "../../lib/admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const initialData = getAdminDashboardData();

  return <AdminDashboardClient initialData={initialData} />;
}
