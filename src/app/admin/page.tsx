import AdminDashboardClient from "./AdminDashboardClient";
import { getAdminDashboardData } from "../../lib/admin-dashboard";
import { JobOfferSchemaService } from "@/services/jobOfferSchemaService";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [initialData, adminStats] = await Promise.all([
    getAdminDashboardData(),
    JobOfferSchemaService.getAdminStats(7),
  ]);

  return (
    <AdminDashboardClient
      initialData={initialData}
      activity={adminStats.activity}
    />
  );
}
