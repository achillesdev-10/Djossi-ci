import { getAdminDashboardData, getScraperRunHistory } from "@/lib/admin-dashboard";
import ScraperClient from "./ScraperClient";

export const dynamic = "force-dynamic";

export default function AdminScraperPage() {
  const dashboard = getAdminDashboardData();
  const runHistory = getScraperRunHistory(10);

  const sources = (process.env.SCRAPER_SITES || "educarriere,emploici,orange,mtn")
    .split(",")
    .map((source) => source.trim())
    .filter(Boolean);

  const automationMode =
    process.env.SCRAPER_AUTOMATION_URL ||
    process.env.AUTOMATION_API_URL ||
    process.env.SCRAPER_TRIGGER_URL ||
    process.env.N8N_SCRAPER_WEBHOOK_URL
      ? "automatic"
      : "manual";

  return (
    <ScraperClient
      initialScraperHealth={dashboard.scraperHealth}
      initialRunHistory={runHistory}
      sources={sources}
      automationMode={automationMode}
    />
  );
}
