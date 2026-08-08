'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import BackToDashboard from '@/components/dashboard/back-to-dashboard';
import { Calendar } from 'lucide-react';

interface CmsHero {
  title?: string;
  subtitle?: string;
}

interface CmsBanner {
  url?: string;
  alt?: string;
  caption?: string;
}

interface NewsArticle {
  title?: string;
  excerpt?: string;
  author?: string;
  category?: string;
  date?: string;
  imageUrl?: string;
}

interface NewsEvent {
  title?: string;
  date?: string;
  time?: string;
  format?: string;
  location?: string;
  description?: string;
  summary?: string;
  imageUrl?: string;
}

interface NewsPageData {
  content?: {
    hero?: CmsHero;
    featured?: NewsArticle;
    articles?: NewsArticle[];
    banners?: CmsBanner[];
  };
}

interface EventsPageData {
  content?: {
    hero?: CmsHero;
    upcomingEvents?: NewsEvent[];
    pastEvents?: NewsEvent[];
    banners?: CmsBanner[];
  };
}

export default function NewsPage() {
  const [newsPage, setNewsPage] = useState<NewsPageData | null>(null);
  const [eventsPage, setEventsPage] = useState<EventsPageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/content/news').then((r) => r.json()).catch(() => null),
      fetch('/api/content/events').then((r) => r.json()).catch(() => null),
    ])
      .then(([newsRes, eventsRes]) => {
        setNewsPage(newsRes);
        setEventsPage(eventsRes);
      })
      .catch(() => {
        setNewsPage(null);
        setEventsPage(null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <main className="min-h-screen bg-background px-4 py-10"><div className="mx-auto max-w-6xl text-center text-muted-foreground py-20">Loading...</div></main>;

  const newsContent = newsPage?.content || {};
  const eventsContent = eventsPage?.content || {};
  const hero = { ...(newsContent.hero || {}), ...(eventsContent.hero || {}) };
  const featured = newsContent.featured;
  const articles = Array.isArray(newsContent.articles) ? newsContent.articles : [];
  const newsBanners = Array.isArray(newsContent.banners) ? newsContent.banners : [];
  const upcoming = Array.isArray(eventsContent.upcomingEvents) ? eventsContent.upcomingEvents : [];
  const past = Array.isArray(eventsContent.pastEvents) ? eventsContent.pastEvents : [];
  const eventBanners = Array.isArray(eventsContent.banners) ? eventsContent.banners : [];
  const banners = newsBanners.length > 0 ? newsBanners : eventBanners;
  const hasEvents = upcoming.length > 0 || past.length > 0;
  const hasContent = hasEvents || articles.length > 0 || !!featured;

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
            <p className="text-base font-semibold uppercase tracking-[0.35em] text-primary">{hero.subtitle || 'What\u2019s New'}</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{hero.title || 'News & Events'}</h1>
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
          <section className="space-y-4">
            <h2 className="text-3xl font-semibold text-white">News Articles</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article: NewsArticle, i: number) => (
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
            </div>
          </section>
        ) : null}

        {upcoming.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="size-6 text-primary" />
              <h2 className="text-3xl font-semibold text-white">Upcoming Events</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {upcoming.map((event: NewsEvent, i: number) => (
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
            <div className="flex items-center gap-2">
              <Calendar className="size-6 text-muted-foreground" />
              <h2 className="text-2xl font-semibold text-white">Past Events</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {past.map((event: NewsEvent, i: number) => (
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

        {!featured && articles.length === 0 && !hasContent && (
          <div className="rounded-3xl border border-border/70 bg-card/80 p-10 text-center text-muted-foreground">
            No news or events yet. The administrator can add content via the Content Manager.
          </div>
        )}
      </div>
    </main>
  );
}