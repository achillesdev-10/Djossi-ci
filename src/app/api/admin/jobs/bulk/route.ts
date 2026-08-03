import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/adminSession';
import { JobOfferSchemaService } from '@/services/jobOfferSchemaService';

async function ensureAdmin(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Accès administrateur requis.' }, { status: 401 });
  }
  return null;
}

export async function POST(request: NextRequest) {
  const denial = await ensureAdmin(request);
  if (denial) return denial;

  try {
    const { action, ids, data } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Aucun ID fourni.' }, { status: 400 });
    }

    if (action === 'delete') {
      await Promise.all(ids.map((id) => JobOfferSchemaService.remove(id)));
    } else if (action === 'update') {
      await Promise.all(ids.map((id) => JobOfferSchemaService.update(id, data)));
    } else {
      return NextResponse.json({ error: 'Action non reconnue.' }, { status: 400 });
    }

    revalidatePath('/admin');
    revalidatePath('/admin/jobs');
    revalidatePath('/');
    revalidatePath('/jobs');

    return NextResponse.json({ ok: true, count: ids.length });
  } catch (err) {
    console.error('Bulk action error:', err);
    return NextResponse.json({ error: 'Erreur lors de l’action en masse.' }, { status: 500 });
  }
}
