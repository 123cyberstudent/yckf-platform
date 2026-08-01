'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AboutPage() {
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/content/about')
      .then((r) => r.json())
      .then(setPage)
      .catch(() => setPage(null))
      .finally(() => setLoading(false));
    fetch('/api/members')
      .then((r) => r.json())
      .then((data) => setMembers(Array.isArray(data) ? data : data?.members || []))
      .catch(() => setMembers([]));
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

        {members.length > 0 && (
          <section className="rounded-3xl border border-border/70 bg-card/80 p-8">
            <div className="space-y-4 text-center">
              <p className="text-base font-semibold uppercase tracking-[0.35em]" style={{ color: '#2DD4BF' }}>The People Behind the Mission</p>
              <h2 className="text-3xl font-semibold text-white">Meet the Team</h2>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {members.map((m: any) => {
                const initials = (m.fullName || m.name || '?')
                  .split(' ')
                  .map((w: string) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <div
                    key={m._id || m.id}
                    className="flex flex-col items-center gap-4 rounded-3xl border border-border/60 bg-background/80 p-6 text-center transition-colors hover:border-[#2563EB]/50"
                  >
                    {m.profileImage || m.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={m.profileImage || m.image}
                        alt={m.fullName || m.name}
                        className="h-24 w-24 rounded-full object-cover ring-4 ring-[#2563EB]/30"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#2563EB]/15 text-2xl font-bold" style={{ color: '#2563EB' }}>
                        {initials}
                      </div>
                    )}
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-white">{m.fullName || m.name}</h3>
                      {(m.role || m.title) && (
                        <p className="text-sm font-medium" style={{ color: '#2DD4BF' }}>{m.role || m.title}</p>
                      )}
                    </div>
                    {m.bio && (
                      <p className="text-sm leading-6 text-muted-foreground line-clamp-3">{m.bio}</p>
                    )}
                    {(m.linkedin || m.twitter || m.socialLinks?.linkedin || m.socialLinks?.twitter) && (
                      <div className="flex gap-3 pt-1">
                        {(m.linkedin || m.socialLinks?.linkedin) && (
                          <a
                            href={m.linkedin || m.socialLinks?.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:border-[#2563EB] hover:text-[#2563EB]"
                            aria-label="LinkedIn"
                          >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                          </a>
                        )}
                        {(m.twitter || m.socialLinks?.twitter) && (
                          <a
                            href={m.twitter || m.socialLinks?.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:border-[#2563EB] hover:text-[#2563EB]"
                            aria-label="Twitter"
                          >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
