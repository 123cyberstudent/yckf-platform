'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AboutPage() {
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/content/about')
      .then((r) => r.json())
      .then(setPage)
      .catch(() => setPage(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <main className="min-h-screen bg-background px-4 py-10"><div className="mx-auto max-w-6xl text-center text-muted-foreground py-20">Loading...</div></main>;

  const content = page?.content || {};
  const hero = content.hero || {};
  const values = Array.isArray(content.values) ? content.values : [];
  const timeline = Array.isArray(content.timeline) ? content.timeline : [];
  const banners = Array.isArray(content.banners) ? content.banners : [];

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-12">
        {banners.length > 0 && (
          <div className="overflow-hidden rounded-3xl border border-border/70">
            {banners.map((b: { url?: string; alt?: string; caption?: string }, i: number) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.url} alt={b.alt || b.caption || 'Banner'} className="h-64 w-full object-cover sm:h-80" />
                {b.caption && <p className="bg-card/90 px-6 py-3 text-center text-base text-muted-foreground">{b.caption}</p>}
              </div>
            ))}
          </div>
        )}

        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5">
          <div className="space-y-4 text-center">
            <p className="text-base font-semibold uppercase tracking-[0.35em] text-primary">{hero.subtitle || 'About'}</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{hero.title || 'About YCKF'}</h1>
          </div>
        </section>

        {content.mission && (
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-border/70 bg-card/80 p-8">
              <h2 className="text-3xl font-semibold text-white">Our Mission</h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">{content.mission}</p>
            </div>
            {content.vision && (
              <div className="rounded-3xl border border-border/70 bg-card/80 p-8">
                <h2 className="text-3xl font-semibold text-white">Our Vision</h2>
                <p className="mt-4 text-base leading-8 text-muted-foreground">{content.vision}</p>
              </div>
            )}
          </section>
        )}

        {values.length > 0 && (
          <section className="rounded-3xl border border-border/70 bg-card/80 p-8">
            <h2 className="text-3xl font-semibold text-white">The Values That Guide Us</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {values.map((v: any, i: number) => (
                <div key={i} className="rounded-3xl border border-border/60 bg-background/80 p-6">
                  <h3 className="text-xl font-semibold text-white">{v.title}</h3>
                  <p className="mt-2 text-base leading-8 text-muted-foreground">{v.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {timeline.length > 0 && (
          <section className="rounded-3xl border border-border/70 bg-card/80 p-8">
            <h2 className="text-3xl font-semibold text-white">Our Journey</h2>
            <div className="mt-8 space-y-6">
              {timeline.map((item: any, i: number) => (
                <div key={i} className="flex gap-4">
                  <div className="min-w-[72px] text-base font-semibold text-primary">{item.year}</div>
                  <p className="text-base leading-8 text-muted-foreground">{item.event}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {values.length === 0 && timeline.length === 0 && !content.mission && (
          <div className="rounded-3xl border border-border/70 bg-card/80 p-10 text-center text-muted-foreground">
            This page has no content yet. The administrator can add content via the Content Manager in the dashboard.
          </div>
        )}

        <section className="rounded-3xl border border-border/70 bg-card/80 p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-semibold text-white">Become a Cyber Knight</h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
                Join our volunteer program, support our mission with donations, or partner with us.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild><Link href="/signup">Volunteer</Link></Button>
              <Button variant="secondary" asChild><Link href="/contact">Contact Us</Link></Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
