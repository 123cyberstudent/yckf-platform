import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-12">
        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5">
          <div className="space-y-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">About Young Cyber Knights Foundation</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Protecting the Digital Frontier <br /> One Citizen at a Time</h1>
            <p className="mx-auto max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
              Young Cyber Knights Foundation is a non-profit organization dedicated to cybersecurity education, cybercrime prevention, and digital rights protection across Africa.
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {[
            { label: '500+ Cybercrime Reports Handled' },
            { label: '50+ Volunteer Cyber Officers' },
            { label: '15+ Partner Organizations' },
          ].map((item) => (
            <Card key={item.label} className="glass-card">
              <CardContent className="p-6">
                <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Impact</p>
                <p className="mt-4 text-2xl font-semibold text-white">{item.label}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-border/70 bg-card/80 p-8">
            <h2 className="text-2xl font-semibold text-white">Our Mission</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              YCKF exists to close the cybersecurity awareness gap across Africa. We solve the rising cybercrime surge by equipping citizens, businesses, and public institutions with the knowledge and support they need to stay safe online.
            </p>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Our commitment is to empower individuals, strengthen organizational defenses, and work with government partners to make digital protection accessible for every community.
            </p>
          </div>

          <div className="rounded-3xl border border-border/70 bg-card/80 p-8">
            <h2 className="text-2xl font-semibold text-white">Our Vision</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              We are building a future where every African citizen is digitally safe, cybercrime-free communities thrive, and cybersecurity is recognized as a basic human right.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-border/70 bg-card/80 p-8">
          <h2 className="text-3xl font-semibold text-white">The Values That Guide Us</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { title: 'Integrity', description: 'We operate with transparency and honesty in everything we do.' },
              { title: 'Innovation', description: 'We embrace cutting-edge technology to stay ahead of cyber threats.' },
              { title: 'Empowerment', description: 'We equip individuals and organizations with cybersecurity knowledge.' },
              { title: 'Collaboration', description: 'We work with partners to create a united front against cybercrime.' },
              { title: 'Excellence', description: 'We strive for the highest standards in all our services.' },
              { title: 'Community', description: 'We are driven by a commitment to protect our digital community.' },
            ].map((value) => (
              <div key={value.title} className="rounded-3xl border border-border/60 bg-background/80 p-6">
                <h3 className="text-lg font-semibold text-white">{value.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-border/70 bg-card/80 p-8">
            <h2 className="text-3xl font-semibold text-white">Our Journey</h2>
            <div className="mt-8 space-y-6">
              {[
                { year: '2020', event: 'YCKF founded by a group of cybersecurity professionals' },
                { year: '2021', event: 'Launched first community awareness campaign' },
                { year: '2022', event: 'Reached 1,000+ individuals through workshops' },
                { year: '2023', event: 'Partnered with law enforcement agencies' },
                { year: '2024', event: 'Digital reporting platform launched' },
                { year: '2025', event: 'Expanded volunteer network across Africa' },
                { year: '2026', event: 'Premium cybersecurity courses introduced' },
              ].map((item) => (
                <div key={item.year} className="flex gap-4">
                  <div className="min-w-[72px] text-sm font-semibold text-primary">{item.year}</div>
                  <p className="text-sm leading-7 text-muted-foreground">{item.event}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border/70 bg-card/80 p-8">
            <h2 className="text-3xl font-semibold text-white">Making a Real Difference</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              YCKF helps victims reclaim control after cyberattacks. We support community members with secure reporting, evidence handling, and confidential follow-up while building digital awareness across neighborhoods.
            </p>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Our programs have reached thousands of people through workshops, school campaigns, and online resources — ensuring practical protection for families, small businesses, and public institutions.
            </p>
            <div className="mt-8 space-y-4 rounded-3xl border border-border/60 bg-background/80 p-6">
              <p className="text-sm font-semibold text-white">“YCKF helped us recover after a phishing attack and taught our team how to stay safe online.”</p>
              <p className="text-sm text-muted-foreground">– Technology officer, Nairobi SME</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border/70 bg-card/80 p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-semibold text-white">Become a Cyber Knight</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
                Join our volunteer program, support our mission with donations, or partner with us to expand cybersecurity awareness and protection across Africa.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/signup">Volunteer</Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
