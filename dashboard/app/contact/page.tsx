import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const faqs = [
  { question: 'How do I report a cybercrime?', answer: 'Use our reporting form on the Cybercrime Reporting page or email report@youngcyberknightsfoundation.org.' },
  { question: 'Is my report confidential?', answer: 'Yes. We maintain strict confidentiality. Your identity is only shared with law enforcement if required.' },
  { question: 'How can I become a volunteer?', answer: 'Visit our Volunteer page, fill out the application form, and our team will contact you within 5 business days.' },
  { question: 'Do you offer cybersecurity training?', answer: 'Yes. We offer free workshops and premium paid courses. Visit our Courses section for more details.' },
  { question: 'How can my organization partner with YCKF?', answer: 'Contact us at partnerships@youngcyberknightsfoundation.org with a brief proposal.' },
  { question: 'How quickly do you respond to cybercrime reports?', answer: 'We respond within 24–48 hours. Critical cases are prioritized.' },
]

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-10">
        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5">
          <div className="space-y-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">Get in Touch with YCKF</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">We’re here to help.</h1>
            <p className="mx-auto max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
              Whether you are reporting cybercrime, seeking cybersecurity advice, or looking to partner with us – reach out today.
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="glass-card">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-xl font-semibold text-white">Phone</h2>
              <p className="text-sm leading-7 text-muted-foreground">+254 700 123 456<br />+254 700 789 012</p>
              <p className="text-sm text-muted-foreground">Available: Mon–Fri, 8 AM – 6 PM (EAT)</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-xl font-semibold text-white">Email</h2>
              <p className="text-sm leading-7 text-muted-foreground">General: info@youngcyberknightsfoundation.org<br />Reporting: report@youngcyberknightsfoundation.org<br />Media: media@youngcyberknightsfoundation.org</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-xl font-semibold text-white">Address</h2>
              <p className="text-sm leading-7 text-muted-foreground">Young Cyber Knights Foundation<br />P.O. Box 12345-00100<br />Nairobi, Kenya</p>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-3xl border border-border/70 bg-card/80 p-8">
          <h2 className="text-3xl font-semibold text-white">Contact Form</h2>
          <form className="mt-8 grid gap-4 sm:grid-cols-2">
            <input className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none" type="text" placeholder="Full Name" required />
            <input className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none" type="email" placeholder="Email Address" required />
            <input className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none" type="tel" placeholder="Phone Number" />
            <select className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none">
              <option>Subject</option>
              <option>Cybercrime Report</option>
              <option>General Inquiry</option>
              <option>Volunteer Application</option>
              <option>Partnership Opportunity</option>
              <option>Event Registration</option>
              <option>Other</option>
            </select>
            <textarea className="col-span-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none" rows={5} placeholder="Message" required />
            <input className="col-span-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none" type="file" />
            <button type="submit" className="col-span-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">Send Message</button>
          </form>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-border/70 bg-card/80 p-8">
            <h2 className="text-3xl font-semibold text-white">Connect With Us</h2>
            <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
              <p>LinkedIn: linkedin.com/company/youngcyberknights</p>
              <p>Twitter/X: @ycik_foundation</p>
              <p>Facebook: facebook.com/youngcyberknights</p>
              <p>YouTube: youtube.com/@youngcyberknights</p>
              <p>Instagram: @ycik_foundation</p>
            </div>
          </div>
          <div className="rounded-3xl border border-border/70 bg-card/80 p-8">
            <h2 className="text-3xl font-semibold text-white">Frequently Asked Questions</h2>
            <div className="mt-6 space-y-3">
              {faqs.map((faq) => (
                <details key={faq.question} className="rounded-3xl border border-border/60 bg-background/90 p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-white">{faq.question}</summary>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
