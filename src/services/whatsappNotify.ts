/**
 *  TravaillerEnCi — Service de notification WhatsApp (module Concours)
 *  Chemin : src/services/whatsappNotify.ts
 *
 *  ⚠️ PRÊT MAIS INACTIF PAR DÉFAUT.
 *  L'envoi n'est déclenché que si TOUTES les variables suivantes sont définies
 *  côté serveur :
 *    - WHATSAPP_NOTIFY_ENABLED   = "1"
 *    - WHATSAPP_TOKEN            = jeton d'accès système Meta (WhatsApp Cloud API)
 *    - WHATSAPP_PHONE_NUMBER_ID  = ID du numéro de téléphone de l'app Meta
 *    - WHATSAPP_TARGET_PHONE     = numéro de la chaîne/du groupe à notifier
 *                                   (format international, ex: 2250700000000)
 *
 *  Sans ces variables, notifyExamPublished() ne fait RIEN (log uniquement) —
 *  la publication n'est jamais bloquée.
 *
 *  Docs : https://developers.facebook.com/docs/whatsapp/cloud-api
 */
import 'server-only';
import { getSiteUrl } from '@/lib/site';
import type { Exam } from '@/types/exam';

const WHATSAPP_API_VERSION = 'v21.0';

function isEnabled(): boolean {
  return (
    process.env.WHATSAPP_NOTIFY_ENABLED === '1' &&
    Boolean(
      process.env.WHATSAPP_TOKEN &&
        process.env.WHATSAPP_PHONE_NUMBER_ID &&
        process.env.WHATSAPP_TARGET_PHONE,
    )
  );
}

function buildMessage(exam: Exam): string {
  const lines = [
    `📢 *NOUVEAU CONCOURS* — ${exam.title}`,
    `🏛️ ${exam.organizer}`,
  ];
  if (exam.category) lines.push(`📂 Catégorie : ${exam.category}`);
  if (exam.registration_end) {
    const d = new Date(exam.registration_end).toLocaleDateString('fr-FR');
    lines.push(`📅 Clôture des inscriptions : ${d}`);
  }
  if (exam.diplomas.length > 0) lines.push(`🎓 Diplômes : ${exam.diplomas.join(', ')}`);
  // URL SEO : slug descriptif si disponible, sinon ID (legacy).
  const url = `${getSiteUrl()}/concours/${exam.slug || exam.id}`;
  lines.push(`🔗 Voir la fiche : ${url}`);
  return lines.join('\n');
}

/**
 * Notifie la chaîne WhatsApp à chaque concours nouvellement publié.
 * Ne lève JAMAIS : échec → log console uniquement.
 */
export async function notifyExamPublished(exam: Exam): Promise<void> {
  if (!isEnabled()) {
    console.log(
      '[whatsappNotify] notifications désactivées (WHATSAPP_NOTIFY_ENABLED absent).',
    );
    return;
  }

  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
    const token = process.env.WHATSAPP_TOKEN!;
    const target = process.env.WHATSAPP_TARGET_PHONE!;

    const res = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: target,
          type: 'text',
          text: { body: buildMessage(exam) },
        }),
      },
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error(`[whatsappNotify] échec Meta API (${res.status}): ${detail.slice(0, 300)}`);
    } else {
      console.log(`[whatsappNotify] concours notifié : ${exam.id}`);
    }
  } catch (err) {
    console.error('[whatsappNotify] erreur:', err);
  }
}
