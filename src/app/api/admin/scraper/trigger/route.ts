import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminApi } from '@/lib/adminSession';
import { triggerScraperRun } from '@/lib/admin-dashboard';

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if (auth.error) return auth.error;

  try {
    const scraperHealth = await triggerScraperRun();
    return NextResponse.json({
      ok: true,
      scraperHealth,
      message: scraperHealth.message ?? 'Scraper lancé en arrière-plan.',
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Le scraper n'a pas pu être déclenché.",
      },
      { status: 500 }
    );
  }
}
