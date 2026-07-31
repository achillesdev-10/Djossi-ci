import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/adminSession';
import { JobOfferSchemaService } from '@/services/jobOfferSchemaService';

export async function POST(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    // 1. Log le démarrage
    const logId = await JobOfferSchemaService.addScraperLog('running', 0, 'Lancement manuel du scraper via le dashboard admin.');

    // 2. Simuler une exécution (ou appeler un webhook externe)
    // Ici on simule un petit délai
    setTimeout(async () => {
      // Dans un vrai cas, on appellerait le script python ou un service
      await JobOfferSchemaService.finishScraperLog(logId, 'success', 0, 'Scraper exécuté avec succès (simulation).');
    }, 2000);

    return NextResponse.json({ ok: true, message: 'Scraper lancé' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur lors du lancement' }, { status: 500 });
  }
}
