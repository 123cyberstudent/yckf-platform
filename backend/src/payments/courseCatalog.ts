import { prisma } from '../shared/db.js';
import { toMinorUnits } from './money.js';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
}

/**
 * Parse a CMS price string (e.g. "Ghc 100", "GHS 150.00", "Free", 0)
 * into integer minor units. Unparseable strings default to free.
 */
export function parsePriceToMinor(raw: string | number | null | undefined): number {
  if (raw == null) return 0;
  const text = String(raw).trim();
  if (!text || /free|none/i.test(text)) return 0;
  const match = text.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  if (!match) return 0;
  return toMinorUnits(parseFloat(match[0]));
}

interface CmsCourse {
  title?: unknown;
  slug?: unknown;
  description?: unknown;
  level?: unknown;
  duration?: unknown;
  price?: unknown;
  imageUrl?: unknown;
  sortOrder?: unknown;
}

/**
 * Synchronise the Course catalogue from the CMS "courses" content page.
 * The CMS remains the source of truth for course content; this mirrors it
 * into the monetization `Course` table with server-computed prices.
 *
 * Courses removed from the CMS are deactivated (never deleted). When the CMS
 * lists no courses at all, nothing is deactivated to avoid nuking admin rows.
 */
export async function syncCoursesFromCms(): Promise<{
  created: number;
  updated: number;
  deactivated: number;
}> {
  const page = await prisma.contentPage.findUnique({ where: { slug: 'courses' } });
  const content = (page?.content ?? null) as { courses?: CmsCourse[] } | null;
  const rawCourses = Array.isArray(content?.courses) ? content.courses : [];

  let created = 0;
  let updated = 0;
  const seenSlugs: string[] = [];

  for (const raw of rawCourses) {
    const title = String(raw.title || 'Untitled course').trim();
    const slug = raw.slug ? String(raw.slug) : slugify(title);
    seenSlugs.push(slug);

    const data = {
      title,
      slug,
      description: raw.description ? String(raw.description) : null,
      level: raw.level ? String(raw.level) : null,
      duration: raw.duration ? String(raw.duration) : null,
      imageUrl: raw.imageUrl ? String(raw.imageUrl) : null,
      price: parsePriceToMinor(raw.price as string | number | undefined),
      active: true,
      sortOrder: Number(raw.sortOrder) || 0,
    };

    const existing = await prisma.course.findUnique({ where: { slug } });
    if (existing) {
      await prisma.course.update({ where: { slug }, data });
      updated += 1;
    } else {
      await prisma.course.create({ data });
      created += 1;
    }
  }

  let deactivated = 0;
  if (seenSlugs.length > 0) {
    const result = await prisma.course.updateMany({
      where: { slug: { notIn: seenSlugs }, active: true },
      data: { active: false },
    });
    deactivated = result.count;
  }

  return { created, updated, deactivated };
}

export async function listActiveCourses() {
  return prisma.course.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
}

export async function getCourseBySlug(slug: string) {
  return prisma.course.findUnique({ where: { slug } });
}
