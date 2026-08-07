import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ExamService } from '@/services/examService';

/**
 * Incrément du compteur de vues d'un concours (appelé par le composant client
 * de la fiche détail — pas de rechargement de page).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const exam = await ExamService.getById(id);
    if (!exam) {
      return NextResponse.json({ error: 'Concours introuvable.' }, { status: 404 });
    }
    await ExamService.incrementViews(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/exams/[id]/view error:', err);
    return NextResponse.json(
      { error: 'Impossible de comptabiliser la visite.' },
      { status: 500 },
    );
  }
}
