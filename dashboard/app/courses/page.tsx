'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, PlayCircle } from 'lucide-react';
import BackToDashboard from '@/components/dashboard/back-to-dashboard';

interface CmsCourse {
  slug?: string;
  title?: string;
  description?: string;
  level?: string;
  duration?: string;
  price?: string;
  imageUrl?: string;
}

interface CmsHero {
  title?: string;
  subtitle?: string;
}

interface CoursesPageData {
  content?: {
    hero?: CmsHero;
    courses?: CmsCourse[];
    banners?: { url?: string; alt?: string; caption?: string }[];
  };
}

export default function CoursesPage() {
  const [page, setPage] = useState<CoursesPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [enrolledSlugs, setEnrolledSlugs] = useState<string[]>([]);
  const [subscribingSlug, setSubscribingSlug] = useState<string | null>(null);

  const refreshEnrolments = useCallback(async () => {
    const res = await fetch('/api/enrolments/my').catch(() => null);
    if (res?.ok) {
      const payload = await res.json();
      const list = (Array.isArray(payload) ? payload : payload?.enrolments ?? []) as { course: { slug?: string } }[];
      setEnrolledSlugs(list.map((e) => e.course.slug).filter(Boolean) as string[]);
    }
  }, []);

  useEffect(() => {
    fetch('/api/content/courses')
      .then((r) => r.json())
      .then(setPage)
      .catch(() => setPage(null))
      .finally(() => setLoading(false));

    fetch('/api/auth/me')
      .then((r) => {
        if (r.ok) {
          setLoggedIn(true);
          return refreshEnrolments();
        }
        return undefined;
      })
      .catch(() => undefined);
  }, [refreshEnrolments]);

  const handleSubscribe = async (slug?: string) => {
    if (!slug) return;
    setSubscribingSlug(slug);
    try {
      const res = await fetch('/api/enrolments/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      if (res.ok) {
        await refreshEnrolments();
      }
    } catch {
      // silently fail
    } finally {
      setSubscribingSlug(null);
    }
  };

  if (loading) return <main className="min-h-screen bg-background px-4 py-10"><div className="mx-auto max-w-6xl text-center text-muted-foreground py-20">Loading...</div></main>;

  const content = page?.content || {};
  const hero = content.hero || {};
  const courses = Array.isArray(content.courses) ? content.courses : [];
  const banners = Array.isArray(content.banners) ? content.banners : [];

  const enrolled = new Set(enrolledSlugs);

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-12">
        <BackToDashboard />
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
            {courses.map((course: CmsCourse, i: number) => {
              const isEnrolled = course.slug ? enrolled.has(course.slug) : false;
              return (
                <Card key={course.slug || i} className="glass-card overflow-hidden flex flex-col">
                  {course.imageUrl && (
                    <div className="h-40 overflow-hidden bg-background/50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={course.imageUrl} alt={course.title || 'Course'} className="h-full w-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-6 space-y-2 flex-1 flex flex-col">
                    <h3 className="text-xl font-semibold text-white">{course.title}</h3>
                    {course.level && <p className="text-base text-primary">{course.level}</p>}
                    {course.duration && <p className="text-base text-muted-foreground">{course.duration}</p>}
                    {course.price && <p className="text-base font-semibold text-white">{course.price}</p>}
                    {course.description && <p className="text-base text-muted-foreground">{course.description}</p>}
                    <div className="pt-4 mt-auto">
                      {!loggedIn ? (
                        <Button asChild className="w-full bg-gradient-to-r from-[#2563EB] to-[#3B82F6]">
                          <Link href="/login">Sign in to Subscribe</Link>
                        </Button>
                      ) : isEnrolled ? (
                        <Badge className="w-full justify-center bg-green-500/10 text-green-500 border-green-500/20 py-2">
                          <CheckCircle2 className="mr-1 size-4" /> Enrolled
                        </Badge>
                      ) : (
                        <Button
                          className="w-full bg-gradient-to-r from-[#2563EB] to-[#3B82F6]"
                          disabled={subscribingSlug === course.slug}
                          onClick={() => handleSubscribe(course.slug)}
                        >
                          {subscribingSlug === course.slug ? (
                            'Subscribing...'
                          ) : (
                            <>
                              <PlayCircle className="mr-2 size-4" />
                              Subscribe for Free
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
