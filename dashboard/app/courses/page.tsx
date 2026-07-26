'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function CoursesPage() {
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/content/courses')
      .then((r) => r.json())
      .then(setPage)
      .catch(() => setPage(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <main className="min-h-screen bg-background px-4 py-10"><div className="mx-auto max-w-6xl text-center text-muted-foreground py-20">Loading...</div></main>;

  const content = page?.content || {};
  const hero = content.hero || {};
  const courses = Array.isArray(content.courses) ? content.courses : [];
  const banners = Array.isArray(content.banners) ? content.banners : [];

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-12">
        {banners.length > 0 && (
          <div className="overflow-hidden rounded-3xl border border-border/70">
            {banners.map((b: { url?: string; alt?: string; caption?: string }, i: number) => (
              <div key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.url} alt={b.alt || b.caption || 'Banner'} className="h-64 w-full object-cover sm:h-80" />
                {b.caption && <p className="bg-card/90 px-6 py-3 text-center text-base text-muted-foreground">{b.caption}</p>}
              </div>
            ))}
          </div>
        )}

        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5">
          <div className="space-y-4 text-center">
            <p className="text-base font-semibold uppercase tracking-[0.35em] text-primary">{hero.subtitle || 'Courses'}</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{hero.title || 'Cybersecurity Courses'}</h1>
          </div>
        </section>

        {courses.length > 0 ? (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course: any, i: number) => (
              <Card key={i} className="glass-card overflow-hidden">
                {course.imageUrl && (
                  <div className="h-40 overflow-hidden bg-background/50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={course.imageUrl} alt={course.title || 'Course'} className="h-full w-full object-cover" />
                  </div>
                )}
                <CardContent className="p-6 space-y-2">
                  <h3 className="text-xl font-semibold text-white">{course.title}</h3>
                  {course.level && <p className="text-base text-primary">{course.level}</p>}
                  {course.duration && <p className="text-base text-muted-foreground">{course.duration}</p>}
                  {course.price && <p className="text-base font-semibold text-white">{course.price}</p>}
                  {course.description && <p className="text-base text-muted-foreground">{course.description}</p>}
                </CardContent>
              </Card>
            ))}
          </section>
        ) : (
          <div className="rounded-3xl border border-border/70 bg-card/80 p-10 text-center text-muted-foreground">
            No courses available yet. The administrator can add content via the Content Manager.
          </div>
        )}
      </div>
    </main>
  );
}
