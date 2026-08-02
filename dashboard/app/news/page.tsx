'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import BackToDashboard from '@/components/dashboard/back-to-dashboard';

export default function NewsPage() {
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/content/news')
      .then((r) => r.json())
      .then(setPage)
      .catch(() => setPage(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <main className="min-h-screen bg-background px-4 py-10"><div className="mx-auto max-w-6xl text-center text-muted-foreground py-20">Loading...</div></main>;

  const content = page?.content || {};
  const hero = content.hero || {};
  const featured = content.featured;
  const articles = Array.isArray(content.articles) ? content.articles : [];
  const banners = Array.isArray(content.banners) ? content.banners : [];

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
            <p className="text-base font-semibold uppercase tracking-[0.35em] text-primary">{hero.subtitle || 'News'}</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{hero.title || 'Latest News'}</h1>
          </div>
        </section>

        {featured && (
          <Card className="glass-card overflow-hidden">
            {featured.imageUrl && (
              <div className="h-48 overflow-hidden bg-background/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={featured.imageUrl} alt={featured.title || 'Featured'} className="h-full w-full object-cover" />
              </div>
            )}
            <CardContent className="p-8 space-y-3">
              {featured.category && <Badge>{featured.category}</Badge>}
              <h2 className="text-3xl font-semibold text-white">{featured.title}</h2>
              <p className="text-base text-muted-foreground">{featured.excerpt}</p>
              <div className="text-base text-muted-foreground">
                {featured.author && <span>By {featured.author}</span>}
                {featured.date && <span> &middot; {featured.date}</span>}
              </div>
            </CardContent>
          </Card>
        )}

        {articles.length > 0 ? (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article: any, i: number) => (
              <Card key={i} className="glass-card overflow-hidden">
                {article.imageUrl && (
                  <div className="h-36 overflow-hidden bg-background/50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={article.imageUrl} alt={article.title || 'Article'} className="h-full w-full object-cover" />
                  </div>
                )}
                <CardContent className="p-6 space-y-2">
                  {article.category && <Badge variant="outline">{article.category}</Badge>}
                  <h3 className="text-lg font-semibold text-white">{article.title}</h3>
                  <p className="text-base text-muted-foreground">{article.excerpt}</p>
                  <div className="text-base text-muted-foreground">
                    {article.author && <span>By {article.author}</span>}
                    {article.date && <span> &middot; {article.date}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        ) : (
          !featured && (
            <div className="rounded-3xl border border-border/70 bg-card/80 p-10 text-center text-muted-foreground">
              No news articles yet. The administrator can add content via the Content Manager.
            </div>
          )
        )}
      </div>
    </main>
  );
}
