import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import BackToDashboard from '@/components/dashboard/back-to-dashboard'

const services = [
  { title: 'Public Speaking & Keynotes', description: 'Expert speakers for conferences, corporate events, and awareness campaigns.' },
  { title: 'Corporate Training', description: 'Custom cybersecurity training for employees, phishing simulations, and secure remote work.' },
  { title: 'Security Assessment', description: 'Vulnerability assessments, security audits, and compliance reviews.' },
  { title: 'Incident Response', description: 'Expert advice during cyber incidents, investigation support, and recovery planning.' },
  { title: 'Policy Development', description: 'Cybersecurity policies, data protection frameworks, and response plans.' },
  { title: 'One-on-One Mentoring', description: 'Personalized coaching for cybersecurity professionals and career guidance.' },
]

const experts = [
  { name: 'Dr. Grace Mwangi', role: 'Lead Cybersecurity Instructor', specialties: ['Digital Forensics', 'Incident Response'], languages: 'English, Kiswahili', availability: 'Available' },
  { name: 'James Ochieng', role: 'Senior Ethical Hacker', specialties: ['Penetration Testing', 'Web App Security'], languages: 'English', availability: 'Booked' },
  { name: 'Amina Yusuf', role: 'Cyber Threat Analyst', specialties: ['Threat Intelligence', 'SOC Operations'], languages: 'English, Arabic', availability: 'Available' },
  { name: 'Lina Njeri', role: 'Security Policy Advisor', specialties: ['Governance', 'Compliance'], languages: 'English', availability: 'Available' },
]

const pricing = [
  { service: 'Keynote Speech', duration: '45 min', price: '$200 – $500' },
  { service: 'Half-Day Training', duration: '4 hours', price: '$500 – $1,200' },
  { service: 'Full-Day Training', duration: '8 hours', price: '$1,000 – $2,500' },
  { service: 'Security Assessment', duration: '2–5 days', price: '$1,500 – $5,000' },
  { service: 'Policy Development', duration: '1–3 weeks', price: '$2,000 – $8,000' },
  { service: 'Mentoring (per session)', duration: '1 hour', price: '$100 – $250' },
]

export default function BookPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-10">
        <BackToDashboard />
        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5">
          <div className="space-y-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">Book a Cybersecurity Expert</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Get expert cybersecurity support.</h1>
            <p className="mx-auto max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
              Need a consultant, speaker, or trainer? Book our certified cybersecurity experts for your organization, event, or project.
            </p>
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <Card key={service.title} className="glass-card">
              <CardContent className="space-y-4 p-6">
                <h2 className="text-xl font-semibold text-white">{service.title}</h2>
                <p className="text-sm leading-7 text-muted-foreground">{service.description}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="rounded-3xl border border-border/70 bg-card/80 p-8">
          <h2 className="text-3xl font-semibold text-white">Expert Profiles</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {experts.map((expert) => (
              <Card key={expert.name} className="glass-card">
                <CardContent className="space-y-4 p-6">
                  <h3 className="text-xl font-semibold text-white">{expert.name}</h3>
                  <p className="text-sm text-muted-foreground">{expert.role}</p>
                  <div className="space-y-2 text-sm leading-7 text-muted-foreground">
                    <p>Specializations: {expert.specialties.join(', ')}</p>
                    <p>Languages: {expert.languages}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${expert.availability === 'Available' ? 'bg-success/15 text-success' : 'bg-muted/20 text-muted-foreground'}`}>{expert.availability}</span>
                  <Button asChild>
                    <a href="/contact">Book Now</a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border/70 bg-card/80 p-8">
          <h2 className="text-3xl font-semibold text-white">Expert Pricing</h2>
          <div className="mt-6 overflow-x-auto rounded-3xl border border-border/60 bg-background/80">
            <table className="w-full min-w-[640px] text-left text-sm text-muted-foreground">
              <thead>
                <tr>
                  <th className="border-b border-border/60 px-4 py-4">Service Type</th>
                  <th className="border-b border-border/60 px-4 py-4">Duration</th>
                  <th className="border-b border-border/60 px-4 py-4">Price Range</th>
                </tr>
              </thead>
              <tbody>
                {pricing.map((item) => (
                  <tr key={item.service} className="border-b border-border/60 last:border-none">
                    <td className="px-4 py-4 text-white">{item.service}</td>
                    <td className="px-4 py-4">{item.duration}</td>
                    <td className="px-4 py-4">{item.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-sm leading-7 text-muted-foreground">Prices vary based on expertise level and location. Contact us for custom quotes.</p>
        </section>
      </div>
    </main>
  )
}
