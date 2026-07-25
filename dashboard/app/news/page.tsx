import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const featured = {
  title: 'Phishing Attacks on the Rise: How to Spot and Avoid Them in 2026',
  excerpt: 'Learn the latest phishing tactics and practical steps to protect your accounts, identity, and work devices from evolving scams.',
  author: 'YCKF Staff',
  date: 'July 2026',
  category: 'Cyber Threats',
}

const articles = [
  { title: 'Digital Identity Theft: What You Need to Know', category: 'Privacy', excerpt: 'Understand how identity theft happens and what protection measures you can use right away.', author: 'YCKF Staff', date: 'June 2026' },
  { title: '10 Cybersecurity Tips for Remote Workers', category: 'Awareness', excerpt: 'Secure your remote workspace with device controls, VPN best practices, and safe Wi-Fi setup.', author: 'YCKF Staff', date: 'May 2026' },
  { title: 'How YCKF is Bridging the Cybersecurity Gap in Africa', category: 'Community', excerpt: 'Discover our initiatives, partnerships, and success stories from across the continent.', author: 'YCKF Staff', date: 'May 2026' },
  { title: 'The Importance of Cyber Hygiene in Everyday Life', category: 'Prevention', excerpt: 'Simple daily habits that make your personal devices and accounts much harder to attack.', author: 'YCKF Staff', date: 'April 2026' },
  { title: 'Understanding Ransomware: Prevention and Response', category: 'Threats', excerpt: 'What ransomware is, how recent attacks work, and how to protect your data and systems.', author: 'YCKF Staff', date: 'March 2026' },
  { title: 'AI and Cybersecurity: The Future of Digital Protection', category: 'Innovation', excerpt: 'Explore how AI is strengthening defenses and what risks organizations should prepare for.', author: 'YCKF Staff', date: 'February 2026' },
]

export default function NewsPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-10">
        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5">
          <div className="space-y-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">Cybersecurity Insights & News</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Stay informed, stay safe.</h1>
            <p className="mx-auto max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
              The latest news, insights, and updates on cybersecurity, digital rights, and online safety from YCKF.
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <Card className="glass-card">
            <CardContent className="space-y-6 p-8">
              <div className="space-y-3">
                <Badge variant="secondary">Featured Post</Badge>
                <h2 className="text-3xl font-semibold text-white">{featured.title}</h2>
                <p className="text-sm leading-7 text-muted-foreground">{featured.excerpt}</p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span>{featured.author}</span>
                <span>•</span>
                <span>{featured.date}</span>
                <span>•</span>
                <span>{featured.category}</span>
              </div>
              <div className="mt-4">
                <Link href="/news" className="inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">Read the full article</Link>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4 rounded-3xl border border-border/70 bg-card/80 p-8">
            <h2 className="text-2xl font-semibold text-white">Browse by Category</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {['Cybercrime Trends', 'Cybersecurity Awareness', 'Digital Rights & Privacy', 'YCKF Updates', 'Tech Innovations', 'Case Studies', 'Volunteer Stories', 'Prevention Tips'].map((tag) => (
                <span key={tag} className="rounded-full border border-border/60 bg-background/80 px-4 py-2 text-sm text-muted-foreground">{tag}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {articles.map((article) => (
            <Card key={article.title} className="glass-card">
              <CardContent className="space-y-4 p-6">
                <Badge variant="outline">{article.category}</Badge>
                <h3 className="text-xl font-semibold text-white">{article.title}</h3>
                <p className="text-sm leading-7 text-muted-foreground">{article.excerpt}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{article.author}</span>
                  <span>{article.date}</span>
                </div>
                <Link href="/news" className="text-sm font-semibold text-primary transition hover:text-primary/80">Read More →</Link>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="rounded-3xl border border-border/70 bg-card/80 p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Get the Latest Updates</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">Subscribe to our weekly cybersecurity newsletter for news, threat alerts, and digital safety tips.</p>
            </div>
            <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input type="email" placeholder="Your email address" className="w-full rounded-full border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none focus:border-primary" />
              <button type="submit" className="inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">Subscribe</button>
            </form>
          </div>
        </section>
      </div>
    </main>
  )
}
