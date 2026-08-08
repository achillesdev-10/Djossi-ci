'use client';

import { useState } from 'react';

/**
 * Image de couverture avec repli gracieux : si l'URL est cassée (image supprimée,
 * hotlink bloqué, mauvais chemin…), on affiche un visuel de remplacement aux
 * couleurs du site plutôt qu'une icône d'image cassée.
 */
const FALLBACK_URI =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#064e3b"/><stop offset="1" stop-color="#009639"/>' +
      '</linearGradient></defs>' +
      '<rect width="1200" height="630" fill="url(#g)"/>' +
      '<circle cx="600" cy="315" r="110" fill="#ffffff" opacity="0.18"/>' +
      '<text x="600" y="372" font-family="Poppins, Arial, sans-serif" font-size="150" ' +
      'font-weight="800" fill="#ffffff" text-anchor="middle">CI</text>' +
      '</svg>',
  );

export default function CoverImage({
  src,
  alt,
  className = '',
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [current, setCurrent] = useState<string>(src);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setCurrent(FALLBACK_URI)}
      className={className}
    />
  );
}
