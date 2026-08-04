import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminApi } from '@/lib/adminSession';
import { launchScraperProcess } from '@/lib/admin-dashboard';

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if (auth.error) return auth.error;

  // Lance le scraper Python en arrière-plan. Le pipeline Python écrit ses
  // propres journaux dans `scraper_logs` (running → success/error), lus par
  // le panneau de santé du dashboard.
  launchScraperProcess();

  return NextResponse.json({
    ok: true,
    message: 'Scraper lancé en arrière-plan.',
  });
}
