import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/adminSession';
import { JobOfferSchemaService } from '@/services/jobOfferSchemaService';
import type { JobContractType, JobOfferSchemaInsert } from '@/types';

const ALLOWED_CONTRACTS: JobContractType[] = [
  'CDI',
  'CDD',
  'Stage',
  'Prestation',
  'Alternance',
  'Freelance',
];

async function ensureAdmin(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Accès administrateur requis.' }, { status: 401 });
  }
  return null;
}

function normalizePatch(body: Record<string, unknown>): Partial<JobOfferSchemaInsert> {
  const patch: Partial<JobOfferSchemaInsert> = {};

  if (typeof body.title === 'string') patch.title = body.title.trim();
  if (typeof body.company === 'string') patch.company = body.company.trim();
  if (typeof body.location === 'string') patch.location = body.location.trim();
  if (typeof body.description === 'string') patch.description = body.description.trim();
  if (typeof body.apply_link === 'string' || body.apply_link === null) patch.apply_link = body.apply_link;
  if (typeof body.apply_email === 'string' || body.apply_email === null) patch.apply_email = body.apply_email;
  if (typeof body.source_url === 'string' || body.source_url === null) patch.source_url = body.source_url;
  if (typeof body.is_verified === 'boolean') patch.is_verified = body.is_verified;
  if (
    typeof body.contract_type === 'string' &&
    ALLOWED_CONTRACTS.includes(body.contract_type as JobContractType)
  ) {
    patch.contract_type = body.contract_type as JobContractType;
  }

  return patch;
}

function revalidateAdminPages(jobId: string) {
  revalidatePath('/admin');
  revalidatePath('/admin/jobs');
  revalidatePath(`/admin/jobs/${jobId}`);
  revalidatePath('/');
  revalidatePath('/jobs');
  revalidatePath(`/jobs/${jobId}`);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denial = await ensureAdmin(request);
  if (denial) return denial;

  const { id } = await params;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const patch = normalizePatch(body);

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: 'Aucune modification valide n’a été fournie.' },
        { status: 400 }
      );
    }

    const updated = await JobOfferSchemaService.update(id, patch);
    if (!updated) {
      return NextResponse.json({ error: 'Offre introuvable.' }, { status: 404 });
    }

    revalidateAdminPages(id);
    return NextResponse.json({ ok: true, job: updated });
  } catch {
    return NextResponse.json(
      { error: 'Impossible de mettre à jour cette offre.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denial = await ensureAdmin(request);
  if (denial) return denial;

  const { id } = await params;
  const removed = await JobOfferSchemaService.remove(id);

  if (!removed) {
    return NextResponse.json({ error: 'Offre introuvable.' }, { status: 404 });
  }

  revalidateAdminPages(id);
  return NextResponse.json({ ok: true });
}
