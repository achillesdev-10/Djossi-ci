import { NextResponse } from 'next/server';
import { JobOfferSchemaService } from '@/services/jobOfferSchemaService';
import { ExamService } from '@/services/examService';
import { BlogService } from '@/services/blogService';
import type { ContentCategory } from '@/types';

export const revalidate = 3600;

export interface CarouselSlide {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  type: 'offre' | 'stage' | 'bourse' | 'concours' | 'blog';
  image: string | null;
  sourceUrl: string | null;
  fallback: {
    domain: string;
    initial: string;
    color: string;
  };
}

// -----------------------------------------------------------------------------
// Cache mémoire des images OpenGraph (évite de re-scraper chaque source à
// chaque requête : la réponse de la route est elle-même revalidée par Next).
// -----------------------------------------------------------------------------
const ogImageCache = new Map<string, { value: string | null; expires: number }>();
const inFlight = new Map<string, Promise<string | null>>();

const TTL = 6 * 3600 * 1000; // 6 h
const FETCH_TIMEOUT = 4000;

async function fetchOgImage(url: string): Promise<string | null> {
  const cached = ogImageCache.get(url);
  if (cached && cached.expires > Date.now()) return cached.value;
  if (inFlight.has(url)) return inFlight.get(url)!;

  const promise = (async () => {
    let image: string | null = null;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'user-agent': 'Mozilla/5.0 (TravaillerEnCi/1.0 +https://travaillerenci.ci)',
          accept: 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
        cache: 'no-store',
      });
      clearTimeout(timer);
      if (res.ok) {
        const html = await res.text();
        const og =
          html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
          html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
        if (og && og[1]) {
          image = og[1].startsWith('//') ? `https:${og[1]}` : og[1];
        }
        if (!image) {
          const link =
            html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i) ||
            html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']image_src["']/i);
          if (link && link[1]) image = link[1];
        }
      }
    } catch {
      image = null;
    }
    ogImageCache.set(url, { value: image, expires: Date.now() + TTL });
    return image;
  })();

  inFlight.set(url, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(url);
  }
}

function getDomain(url: string | null): string {
  if (!url) return 'travaillerenci.ci';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'travaillerenci.ci';
  }
}

const COLORS = [
  'bg-orange-500',
  'bg-emerald-600',
  'bg-sky-600',
  'bg-purple-600',
  'bg-rose-500',
  'bg-slate-800',
];

function fallbackFor(url: string | null, title: string, index: number): CarouselSlide['fallback'] {
  const domain = getDomain(url);
  return {
    domain,
    initial: (title.trim().charAt(0) || 'T').toUpperCase(),
    color: COLORS[index % COLORS.length],
  };
}

export async function GET() {
  const [offers, exams, posts] = await Promise.all([
    JobOfferSchemaService.list({
      status: 'published',
      category: ['job', 'internship', 'scholarship'],
      limit: 6,
      order_by: 'created_at',
      order_dir: 'desc',
    }),
    ExamService.list({ status: 'published', limit: 4, order_by: 'created_at', order_dir: 'desc' }),
    BlogService.list({ status: 'published', limit: 3, order_by: 'published_at', order_dir: 'desc' }),
  ]);

  const slides: CarouselSlide[] = [];

  for (const [i, job] of offers.rows.entries()) {
    const cat = (job.category || 'job') as ContentCategory;
    const type: CarouselSlide['type'] =
      cat === 'internship' ? 'stage' : cat === 'scholarship' ? 'bourse' : 'offre';
    slides.push({
      id: `job-${job.id}`,
      title: job.title,
      subtitle: `${job.company} · ${job.location}`,
      href: `/jobs/${job.id}`,
      type,
      image: null,
      sourceUrl: job.source_url || job.apply_link,
      fallback: fallbackFor(job.source_url || job.apply_link, job.title, i),
    });
  }

  for (const [i, exam] of exams.rows.entries()) {
    slides.push({
      id: `exam-${exam.id}`,
      title: exam.title,
      subtitle: `${exam.organizer} · Concours ${exam.category}`,
      href: `/concours/${exam.slug || exam.id}`,
      type: 'concours',
      image: null,
      sourceUrl: exam.source_url,
      fallback: fallbackFor(exam.source_url, exam.title, i + offers.rows.length),
    });
  }

  for (const [i, post] of posts.rows.entries()) {
    slides.push({
      id: `post-${post.id}`,
      title: post.title,
      subtitle: `Blog · ${post.author}`,
      href: `/blog/${post.slug}`,
      type: 'blog',
      image: post.cover_image || null,
      sourceUrl: null,
      fallback: fallbackFor(null, post.title, i + offers.rows.length + exams.rows.length),
    });
  }

  // Récupération asynchrone des images OpenGraph depuis les sites d'origine
  // (chaque échec bascule proprement sur la couleur locale + favicon).
  const results = await Promise.allSettled(
    slides.map((s) =>
      s.image ? Promise.resolve(s.image) : s.sourceUrl ? fetchOgImage(s.sourceUrl) : Promise.resolve(null),
    ),
  );

  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) {
      slides[i].image = r.value;
    }
  });

  return NextResponse.json({ slides: slides.slice(0, 8) });
}
