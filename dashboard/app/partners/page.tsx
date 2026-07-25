import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const sponsors = [
  { name: 'Platinum Sponsor', company: 'SecureBank', tier: 'Platinum' },
  { name: 'Gold Sponsor', company: 'CloudSafe', tier: 'Gold' },
  { name: 'Silver Sponsor', company: 'NetGuard', tier: 'Silver' },
  { name: 'Bronze Sponsor', company: 'DigitalBridge', tier: 'Bronze' },
]

export default function PartnersPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-10">
        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5">
          <div className="space-y-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">Our Partners & Sponsors</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">United for a safer digital future.</h1>
            <p className="mx-auto max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
              We collaborate with governments, businesses, NGOs, academic institutions, and media partners to build stronger cyber-resilient communities.
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-border/70 bg-card/80 p-8">
            <h2 className="text-3xl font-semibold text-white">Join the Fight Against Cybercrime</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Partnering with YCKF gives you the chance to amplify social impact, share expertise, and build safer digital ecosystems across Africa.
            </p>
            <ul className="mt-6 space-y-3 text-sm leading-7 text-muted-foreground">
              <li>• Partner in awareness campaigns and community trainings.</li>
              <li>• Share resources, technology, and research for strong defenses.</li>
              <li>• Increase trust with shared reporting and incident response support.</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-border/70 bg-card/80 p-8">
            <h2 className="text-3xl font-semibold text-white">Partner Testimonials</h2>
            <div className="mt-6 space-y-4">
              {[
                { quote: 'YCKF is a critical partner in our cybersecurity awareness initiatives.', author: 'Ministry of ICT' },
                { quote: 'Working with YCKF has amplified our community impact.', author: 'SecureBank' },
              ].map((item) => (
                <div key={item.author} className="rounded-3xl border border-border/60 bg-background/80 p-5">
                  <p className="text-sm leading-7 text-muted-foreground">“{item.quote}”</p>
                  <p className="mt-3 text-sm font-semibold text-white">{item.author}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border/70 bg-card/80 p-8">
          <h2 className="text-3xl font-semibold text-white">Our Sponsors</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {sponsors.map((sponsor) => (
              <Card key={sponsor.company} className="glass-card">
                <CardContent className="p-6">
                  <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">{sponsor.tier}</p>
                  <h3 className="mt-3 text-xl font-semibold text-white">{sponsor.company}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border/70 bg-card/80 p-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold text-white">Partner With Us</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                We offer strategic partnerships for government agencies, private sector organizations, NGOs, academic institutions, and media outlets.
              </p>
            </div>
            <div className="space-y-3 text-sm leading-7 text-muted-foreground">
              <p>• Joint awareness campaigns</p>
              <p>• Shared training and research programs</p>
              <p>• Resource and technology collaboration</p>
              <p>• Custom partnership packages with measurable impact</p>
            </div>
          </div>
          <div className="mt-8">
            <Button asChild>
              <a href="/contact">Become a Partner</a>
            </Button>
          </div>
        </section>
      </div>
    </main>
  )
}
