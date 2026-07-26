'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function EventsPage() {
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/content/events')
      .then((r) => r.json())
      .then(setPage)
      .catch(() => setPage(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <main className="min-h-screen bg-background px-4 py-10"><div className="mx-auto max-w-6xl text-center text-muted-foreground py-20">Loading...</div></main>;

  const content = page?.content || {};
  const hero = content.hero || {};
  const upcoming = Array.isArray(content.upcomingEvents) ? content.upcomingEvents : [];
  const past = Array.isArray(content.pastEvents) ? content.pastEvents : [];
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
            <p className="text-base font-semibold uppercase tracking-[0.35em] text-primary">{hero.subtitle || 'Events'}</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{hero.title || 'YCKF Events'}</h1>
          </div>
        </section>

        {upcoming.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-3xl font-semibold text-white">Upcoming Events</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {upcoming.map((event: any, i: number) => (
                <Card key={i} className="glass-card overflow-hidden">
                  {event.imageUrl && (
                    <div className="h-36 overflow-hidden bg-background/50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={event.imageUrl} alt={event.title || 'Event'} className="h-full w-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-6 space-y-2">
                    <h3 className="text-xl font-semibold text-white">{event.title}</h3>
                    <p className="text-base text-primary">{event.date} {event.time && `at ${event.time}`}</p>
                    {event.format && <p className="text-base text-muted-foreground">{event.format}</p>}
                    {event.location && <p className="text-base text-muted-foreground">{event.location}</p>}
                    {event.description && <p className="text-base text-muted-foreground">{event.description}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-3xl font-semibold text-white">Past Events</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {past.map((event: any, i: number) => (
                <Card key={i} className="glass-card overflow-hidden">
                  {event.imageUrl && (
                    <div className="h-36 overflow-hidden bg-background/50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={event.imageUrl} alt={event.title || 'Event'} className="h-full w-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-6 space-y-2">
                    <h3 className="text-xl font-semibold text-white">{event.title}</h3>
                    <p className="text-base text-primary">{event.date}</p>
                    {event.summary && <p className="text-base text-muted-foreground">{event.summary}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {upcoming.length === 0 && past.length === 0 && (
          <div className="rounded-3xl border border-border/70 bg-card/80 p-10 text-center text-muted-foreground">
            No events available yet. The administrator can add content via the Content Manager.
          </div>
        )}
      </div>
    </main>
  );
}
