'use client';

import { useEffect, useRef } from 'react';

/**
 * Incrémente le compteur de vues du concours à la première visite (fire-and-forget).
 * S'exécute une seule fois par montage de page.
 */
export default function ExamViewsTracker({ examId }: { examId: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    fetch(`/api/exams/${examId}/view`, { method: 'POST' }).catch(() => {
      /* silencieux : le compteur n'est pas critique */
    });
  }, [examId]);

  return null;
}
