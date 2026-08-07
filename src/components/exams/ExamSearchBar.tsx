'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { EXAM_CATEGORIES } from '@/lib/examConstants';
import { cn } from '@/lib/utils';

interface ExamSearchBarProps {
  organizers: string[];
  initialKeyword?: string;
  initialOrganizer?: string;
  initialCategory?: string;
}

export default function ExamSearchBar({
  organizers,
  initialKeyword = '',
  initialOrganizer = '',
  initialCategory = '',
}: ExamSearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [keyword, setKeyword] = useState(initialKeyword);
  const [organizer, setOrganizer] = useState(initialOrganizer);
  const [category, setCategory] = useState(initialCategory);
  const [isPending, startTransition] = useTransition();

  function buildUrl(kw: string, org: string, cat: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (kw) params.set('q', kw); else params.delete('q');
    if (org) params.set('organizer', org); else params.delete('organizer');
    if (cat) params.set('category', cat); else params.delete('category');
    params.delete('page');
    return `${pathname}${params.toString() ? `?${params.toString()}` : ''}`;
  }

  function apply(kw: string, org: string, cat: string) {
    startTransition(() => router.push(buildUrl(kw, org, cat), { scroll: true }));
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        apply(keyword, organizer, category);
      }}
      className={cn(
        'w-full rounded-2xl border border-gray-100 bg-white p-4 shadow-md shadow-black/5 sm:p-5',
        isPending && 'pointer-events-none opacity-70',
      )}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="relative flex items-stretch md:col-span-5">
          <label htmlFor="exam-search" className="sr-only">
            Rechercher un concours
          </label>
          <span className="pointer-events-none flex items-center justify-center pl-3 text-gray-400">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            id="exam-search"
            name="q"
            type="search"
            enterKeyHint="search"
            placeholder="Ex: ENA, INFAS, gendarmerie, CAFOP…"
            autoComplete="off"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              apply(e.target.value, organizer, category);
            }}
            className="w-full rounded-xl border border-transparent bg-gray-50/80 py-3 pl-2 pr-3 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-primary/40 focus:bg-white focus:ring-2 focus:ring-primary/15"
          />
        </div>

        <div className="relative md:col-span-4">
          <label htmlFor="exam-organizer" className="sr-only">
            Organisateur
          </label>
          <select
            id="exam-organizer"
            name="organizer"
            value={organizer}
            onChange={(e) => {
              setOrganizer(e.target.value);
              apply(keyword, e.target.value, category);
            }}
            className="w-full appearance-none rounded-xl border border-transparent bg-gray-50/80 py-3 pl-4 pr-9 text-[13px] text-gray-700 outline-none transition-colors focus:border-primary/40 focus:bg-white focus:ring-2 focus:ring-primary/15"
          >
            <option value="">Tous les organisateurs</option>
            {organizers.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </div>

        <div className="relative md:col-span-3">
          <label htmlFor="exam-category" className="sr-only">
            Catégorie
          </label>
          <select
            id="exam-category"
            name="category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              apply(keyword, organizer, e.target.value);
            }}
            className="w-full appearance-none rounded-xl border border-transparent bg-gray-50/80 py-3 pl-4 pr-9 text-[13px] text-gray-700 outline-none transition-colors focus:border-primary/40 focus:bg-white focus:ring-2 focus:ring-primary/15"
          >
            <option value="">Toutes les catégories</option>
            {EXAM_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </div>
      </div>
    </form>
  );
}
