import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const downloads = [
  { title: 'Personal Security Checklist', format: 'PDF', description: 'Daily habits to stay secure online' },
  { title: 'Password Management Guide', format: 'PDF', description: 'Create and manage strong passwords' },
  { title: 'Phishing Recognition Guide', format: 'Infographic', description: 'How to spot phishing emails and messages' },
  { title: 'Small Business Cyber Security', format: 'PDF', description: 'Essential security for small businesses' },
  { title: 'Family Digital Safety Agreement', format: 'PDF', description: 'Template for families' },
  { title: 'Cybercrime Reporting Guide', format: 'PDF', description: 'Step-by-step reporting process' },
  { title: 'Secure Remote Work Checklist', format: 'PDF', description: 'Stay safe when working from home' },
  { title: 'Data Backup Strategy Guide', format: 'PDF', description: 'Protect your data from ransomware' },
  { title: 'Social Media Privacy Tips', format: 'Infographic', description: 'Control your digital footprint' },
  { title: 'Cybersecurity Glossary', format: 'PDF', description: 'Common terms explained' },
]

const videos = [
  'Introduction to Cybersecurity',
  'How to Report a Cybercrime',
  'Password Security 101',
  'Digital Privacy for Beginners',
  'Cybersecurity Interview – Expert Panel',
]

export default function ResourcesPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-10">
        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5">
          <div className="space-y-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">Cybersecurity Awareness Resources</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Your guide to digital safety.</h1>
            <p className="mx-auto max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
              Explore our comprehensive resources to stay safe online, protect your data, and defend against cyber threats.
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-border/70 bg-card/80 p-8">
            <h2 className="text-3xl font-semibold text-white">Protect Yourself Online</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Use strong passwords, enable multi-factor authentication, recognize phishing emails, and keep your devices secure with privacy settings and regular updates.
            </p>
            <Button className="mt-6">Download Personal Security Checklist</Button>
          </div>
          <div className="rounded-3xl border border-border/70 bg-card/80 p-8">
            <h2 className="text-3xl font-semibold text-white">Keep Your Business Cyber Safe</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Train employees, back up data, secure remote work, and create an incident response plan that helps your organization recover from threats quickly.
            </p>
            <Button variant="secondary" className="mt-6">Download Small Business Guide</Button>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="glass-card">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-xl font-semibold text-white">Family Safety</h2>
              <p className="text-sm leading-7 text-muted-foreground">Keep children safe online with parental controls, cyberbullying guidance, and digital literacy support.</p>
              <Button variant="secondary">Download Family Agreement</Button>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-xl font-semibold text-white">Cybercrime Prevention</h2>
              <p className="text-sm leading-7 text-muted-foreground">Learn to avoid phishing, fraud, identity theft, and other common cybercrimes with proactive protection tips.</p>
              <Button variant="secondary">Download Prevention Tips</Button>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-xl font-semibold text-white">Reporting Cybercrime</h2>
              <p className="text-sm leading-7 text-muted-foreground">Find out what to document, how to preserve evidence, and where to submit reports for faster response.</p>
              <Button variant="secondary">Download Reporting Guide</Button>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6 rounded-3xl border border-border/70 bg-card/80 p-8">
          <h2 className="text-3xl font-semibold text-white">Free Downloads</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {downloads.map((item) => (
              <div key={item.title} className="rounded-3xl border border-border/60 bg-background/80 p-6">
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">{item.format}</p>
                <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.description}</p>
                <button className="mt-4 inline-flex rounded-full border border-border/70 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5">Download</button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6 rounded-3xl border border-border/70 bg-card/80 p-8">
          <h2 className="text-3xl font-semibold text-white">Watch and Learn</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {videos.map((title) => (
              <div key={title} className="rounded-3xl border border-border/60 bg-background/80 p-6">
                <div className="mb-4 h-40 rounded-3xl bg-slate-950/40" />
                <h3 className="text-lg font-semibold text-white">{title}</h3>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
