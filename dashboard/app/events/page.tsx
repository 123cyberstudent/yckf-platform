import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const upcomingEvents = [
  {
    title: 'Web Application Security Masterclass',
    date: 'August 15–16, 2026',
    time: '10:00 AM – 4:00 PM (GMT)',
    format: 'Virtual (Zoom)',
    description: 'Learn how to identify and fix security vulnerabilities in web applications. Perfect for developers and cybersecurity enthusiasts.',
  },
  {
    title: 'Cybercrime Reporting Workshop – Nairobi',
    date: 'September 5, 2026',
    time: '9:00 AM – 5:00 PM (EAT)',
    format: 'In-person',
    location: 'Nairobi, Kenya',
    description: 'Hands-on training on how citizens can effectively report cybercrime and preserve digital evidence.',
  },
  {
    title: 'Cybersecurity Awareness Week',
    date: 'October 1–7, 2026',
    time: 'Various',
    format: 'Hybrid',
    description: 'A week-long campaign with daily webinars, school visits, and social media challenges to raise cybersecurity awareness.',
  },
  {
    title: 'Digital Forensics Bootcamp',
    date: 'November 10–14, 2026',
    time: '9:00 AM – 6:00 PM (GMT)',
    format: 'Virtual',
    description: 'Intensive 5-day training on digital forensics, evidence collection, and incident response.',
  },
]

const pastEvents = [
  { title: 'Cyber Safety School Tour', date: 'March 2026', summary: 'Interactive sessions for students on phishing, passwords, and online conduct.' },
  { title: 'Secure SME Roundtable', date: 'May 2026', summary: 'Business leaders learned practical defenses for remote work and data protection.' },
  { title: 'Threat Intelligence Webinar', date: 'June 2026', summary: 'An expert panel discussed emerging cybercrime trends and risk mitigation strategies.' },
]

export default function EventsPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-10">
        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5">
          <div className="space-y-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">YCKF Events & Workshops</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Empowering you through knowledge.</h1>
            <p className="mx-auto max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
              Join our cybersecurity workshops, training sessions, and community events designed to build digital safety skills for professionals, learners, and families.
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold text-white">Upcoming Events</h2>
            {upcomingEvents.map((event) => (
              <Card key={event.title} className="glass-card">
                <CardContent className="space-y-4 p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-white">{event.title}</h3>
                      <p className="text-sm text-muted-foreground">{event.format}{event.location ? ` • ${event.location}` : ''}</p>
                    </div>
                    <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold uppercase text-primary">{event.date}</span>
                  </div>
                  <p className="text-sm leading-7 text-muted-foreground">{event.description}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-background/70 px-3 py-1 text-xs text-muted-foreground">{event.time}</span>
                    <Button variant="secondary">Register Now</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-6 rounded-3xl border border-border/70 bg-card/80 p-8">
            <h2 className="text-3xl font-semibold text-white">Past Events</h2>
            <div className="space-y-4">
              {pastEvents.map((event) => (
                <div key={event.title} className="rounded-3xl border border-border/60 bg-background/80 p-5">
                  <h3 className="text-xl font-semibold text-white">{event.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{event.date}</p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{event.summary}</p>
                  <p className="mt-3 text-sm font-semibold text-primary">Watch Recordings</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border/70 bg-card/80 p-8">
          <h2 className="text-3xl font-semibold text-white">Event Registration</h2>
          <form className="mt-8 grid gap-4 sm:grid-cols-2">
            <input className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none" type="text" placeholder="Full Name" />
            <input className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none" type="email" placeholder="Email Address" />
            <input className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none" type="tel" placeholder="Phone Number" />
            <input className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none" type="text" placeholder="Organization (optional)" />
            <select className="col-span-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none">
              <option>Choose an event...</option>
              {upcomingEvents.map((event) => (
                <option key={event.title} value={event.title}>{event.title}</option>
              ))}
            </select>
            <textarea className="col-span-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none" rows={4} placeholder="Questions / Comments"></textarea>
            <button type="submit" className="col-span-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">Submit Registration</button>
          </form>
        </section>

        <section className="rounded-3xl border border-border/70 bg-card/80 p-8">
          <h2 className="text-3xl font-semibold text-white">What Participants Say</h2>
          <div className="mt-6 space-y-4">
            {[
              { quote: 'This training changed how I approach cybersecurity.', author: 'John, Developer' },
              { quote: 'I now feel empowered to report cybercrime effectively.', author: 'Amina, Student' },
              { quote: "YCKF's events are top-notch and highly educational.", author: 'Grace, IT Manager' },
            ].map((item) => (
              <div key={item.author} className="rounded-3xl border border-border/60 bg-background/80 p-6">
                <p className="text-sm leading-7 text-muted-foreground">“{item.quote}”</p>
                <p className="mt-4 text-sm font-semibold text-white">{item.author}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
