import React from 'react';

/**
 * Rendu Markdown minimaliste (titres ##, puces, gras, italique) pour les
 * descriptions de contenus (emplois, bourses, concours…). Aucune dépendance.
 */
export default function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul
        key={`ul-${key++}`}
        className="my-3 pl-4 sm:pl-5 space-y-1.5 list-disc marker:text-primary marker:opacity-70"
      >
        {listBuffer.map((it, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: inline(it) }} />
        ))}
      </ul>,
    );
    listBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      flushList();
      continue;
    }
    const m = trimmed.match(/^#{1,3}\s+(.*)$/);
    if (m) {
      flushList();
      const level = (trimmed.match(/^#+/)![0].length) as 1 | 2 | 3;
      const sizes = {
        1: 'text-xl sm:text-2xl font-bold mt-6 mb-3',
        2: 'text-lg sm:text-xl font-bold mt-5 mb-2.5',
        3: 'text-base sm:text-lg font-bold mt-4 mb-2',
      } as const;
      const Tag = (`h${level + 1}` as unknown) as 'h3';
      blocks.push(
        <Tag
          key={`h-${key++}`}
          className={`${sizes[level]} text-gray-900 dark:text-white font-[var(--font-display)]`}
          dangerouslySetInnerHTML={{ __html: inline(m[1]) }}
        />,
      );
      continue;
    }
    if (/^\s*[-*•]\s+/.test(trimmed)) {
      listBuffer.push(trimmed.replace(/^\s*[-*•]\s+/, ''));
      continue;
    }
    flushList();
    blocks.push(
      <p
        key={`p-${key++}`}
        className="my-2.5"
        dangerouslySetInnerHTML={{ __html: inline(trimmed) }}
      />,
    );
  }
  flushList();
  return <>{blocks}</>;
}

function inline(src: string): string {
  let s = src
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-gray-900 dark:text-white">$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return s;
}
