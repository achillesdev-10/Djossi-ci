'use client';

import { useState } from 'react';

interface SiteLogoProps {
  name: string;
  domain: string;
  color: string;
}

export default function SiteLogo({ name, domain, color }: SiteLogoProps) {
  const [failed, setFailed] = useState(false);
  const initial = name.charAt(0).toUpperCase();

  if (failed) {
    return (
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      >
        {initial}
      </div>
    );
  }

  return (
    <div className="w-12 h-12 rounded-xl bg-white border border-border flex items-center justify-center overflow-hidden shrink-0">
      {/* Favicon officiel du site ; repli sur une pastille lettre si indisponible. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt={`Logo ${name}`}
        width={32}
        height={32}
        loading="lazy"
        className="object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
