'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function ResourcesPage() {
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/content/resources')
      .then((r) => r.json())
      .then(setPage)
      .catch(() => setPage(null))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = (item: any) => {
    const title = item.title || 'Resource';
    if (item.downloadUrl) {
      window.open(item.downloadUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    const lines = [
      title,
      '-'.repeat(title.length),
      '',
      `Format: ${item.format || 'Guide'}`,
      '',
      item.description || 'Young Cyber Knights Foundation resource.',
      '',
      'Young Cyber Knights Foundation',
      'www.youngcyberknightsfoundation.org',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeFileName(title)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const safeFileName = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '') || 'resource';

  if (loading) return <main className="min-h-screen bg-background px-4 py-10"><div className="mx-auto max-w-6xl text-center text-muted-foreground py-20">Loading...</div></main>;

  const content = page?.content || {};
  const hero = content.hero || {};
  const downloads = Array.isArray(content.downloads) ? content.downloads : [];
  const videos = Array.isArray(content.videos) ? content.videos : [];
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
            <p className="text-base font-semibold uppercase tracking-[0.35em] text-primary">{hero.subtitle || 'Resources'}</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{hero.title || 'Cyber Safety Resources'}</h1>
          </div>
        </section>

        {downloads.length > 0 && (
          <section className="rounded-3xl border border-border/70 bg-card/80 p-8">
            <h2 className="text-3xl font-semibold text-white">Free Downloads</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {downloads.map((item: any, i: number) => (
                <Card key={i} className="glass-card overflow-hidden">
                  {item.imageUrl && (
                    <div className="h-36 overflow-hidden bg-background/50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.imageUrl} alt={item.title || 'Resource'} className="h-full w-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                    <p className="text-base text-primary mt-1">{item.format}</p>
                    <p className="text-base text-muted-foreground mt-2">{item.description}</p>
                    <Button
                      className="mt-4 w-full bg-gradient-to-r from-[#2563EB] to-[#3B82F6]"
                      onClick={() => handleDownload(item)}
                    >
                      <Download className="mr-2 size-4" /> Download
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {videos.length > 0 && (
          <section className="rounded-3xl border border-border/70 bg-card/80 p-8">
            <h2 className="text-3xl font-semibold text-white">Watch and Learn</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((item: any, i: number) => (
                <Card key={i} className="glass-card">
                  <CardContent className="p-6">
                    <p className="text-base text-white">{typeof item === 'string' ? item : item.title || JSON.stringify(item)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {downloads.length === 0 && videos.length === 0 && (
          <div className="rounded-3xl border border-border/70 bg-card/80 p-10 text-center text-muted-foreground">
            No resources available yet. The administrator can add content via the Content Manager.
          </div>
        )}
      </div>
    </main>
  );
}
