import type { ReactNode } from 'react';
import type { ExamCategory } from '@/types/exam';

const PATHS: Record<ExamCategory, ReactNode> = {
  administratif: (
    <>
      <path d="M3 21h18" />
      <path d="M4 21V10l8-6 8 6v11" />
      <path d="M9 21v-6h6v6" />
    </>
  ),
  sante: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  enseignement: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      <path d="M9 7h7M9 11h5" />
    </>
  ),
  securite: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  militaire: (
    <>
      <circle cx="12" cy="8" r="6" />
      <path d="M12 2v3M12 11v3M9.5 5.5l5 5M14.5 5.5l-5 5" />
      <path d="m8.5 13-1.5 9 5-2.5 5 2.5-1.5-9" />
    </>
  ),
  autre: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M15 2v5h5" />
      <path d="M9 13h6M9 17h6M9 9h1" />
    </>
  ),
};

export default function CategoryIcon({
  category,
  className = 'h-4 w-4',
}: {
  category: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[category as ExamCategory] ?? PATHS.autre}
    </svg>
  );
}
