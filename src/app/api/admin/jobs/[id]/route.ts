import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/adminSession';
import { JobOfferSchemaService } from '@/services/jobOfferSchemaService';
import type { JobContractType, JobOfferSchemaInsert, JobOfferSchemaStatus } from '@/types';

const ALLOWED_CONTRACTS: JobContractType[] = [
  'CDI',
  'CDD',
  'Stage',
  'Prestation',
  'Alternance',
  'Freelance',
];

const ALLOWED_STATUSES: JobOfferSchemaStatus[] = [
  'pending',
  'published',
  'rejected',
  'archived',
];

async function ensureAdmin(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Accès administrateur requis.' }, { status: 401 });
  }
  return null;
}

function normalizePatch(body: Record<string, unknown>): Partial<JobOfferSchemaInsert> {
  const patch: Record<string, any> = {};

  if (typeof body.title === 'string') patch.title = body.title.trim();
  if (typeof body.company === 'string') patch.company = body.company.trim();
  if (typeof body.location === 'string') patch.location = body.location.trim();
  if (typeof body.description === 'string') patch.description = body.description.trim();

  if (typeof body.apply_link === 'string') {
    patch.apply_link = body.apply_link.trim() ? body.apply_link.trim() : null;
  } else if (body.apply_link === null) {
    patch.apply_link = null;
  }

  if (typeof body.apply_email === 'string') {
    patch.apply_email = body.apply_email.trim() ? body.apply_email.trim() : null;
  } else if (body.apply_email === null) {
    patch.apply_email = null;
  }

  // NB : pas de fallback ici — la contrainte `valid_apply_method` est garantie
  // dans JobOfferSchemaService.update() qui connaît l'offre existante. Cela
  // évite d'écraser un apply_email déjà renseigné lors d'une édition banale.

  if (typeof body.source_url === 'string') patch.source_url = body.source_url.trim() ? body.source_url.trim() : null;
  if (typeof body.source_website === 'string') patch.source_website = body.source_website.trim() ? body.source_website.trim() : null;
  if (typeof body.seo_title === 'string') patch.seo_title = body.seo_title.trim() ? body.seo_title.trim() : null;
  if (typeof body.seo_description === 'string') patch.seo_description = body.seo_description.trim() ? body.seo_description.trim() : null;
  if (typeof body.seo_keywords === 'string') patch.seo_keywords = body.seo_keywords.trim() ? body.seo_keywords.trim() : null;
  if (typeof body.slug === 'string') patch.slug = body.slug.trim() ? body.slug.trim() : null;

  if (typeof body.is_verified === 'boolean') patch.is_verified = body.is_verified;
  if (typeof body.is_archived === 'boolean') patch.is_archived = body.is_archived;
  if (typeof body.is_expired === 'boolean') patch.is_expired = body.is_expired;

  if (
    typeof body.status === 'string' &&
    ALLOWED_STATUSES.includes(body.status as JobOfferSchemaStatus)
  ) {
    patch.status = body.status as JobOfferSchemaStatus;
    if (patch.status === 'published') {
      patch.is_verified = true;
    }
  }

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
  } catch (err) {
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
