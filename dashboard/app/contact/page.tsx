'use client'

import { Card, CardContent } from '@/components/ui/card'
import { useState, useEffect } from 'react'

interface ContactData {
  hero: { title: string; subtitle: string; description: string }
  phone: { numbers: string[]; availability: string }
  email: { general: string; reporting: string; media: string }
  address: { organization: string; poBox: string; city: string }
  social: Record<string, string>
  faqs: { question: string; answer: string }[]
}

const FALLBACK: ContactData = {
  hero: {
    title: 'Get in Touch with YCKF',
    subtitle: "We're here to help.",
    description: 'Whether you are reporting cybercrime, seeking cybersecurity advice, or looking to partner with us \u2013 reach out today.',
  },
  phone: {
    numbers: ['+254 700 123 456', '+254 700 789 012'],
    availability: 'Mon\u2013Fri, 8 AM \u2013 6 PM (EAT)',
  },
  email: {
    general: 'info@youngcyberknightsfoundation.org',
    reporting: 'report@youngcyberknightsfoundation.org',
    media: 'media@youngcyberknightsfoundation.org',
  },
  address: {
    organization: 'Young Cyber Knights Foundation',
    poBox: 'P.O. Box 12345-00100',
    city: 'Nairobi, Kenya',
  },
  social: {
    linkedin: 'linkedin.com/company/youngcyberknights',
    twitter: '@ycik_foundation',
    facebook: 'facebook.com/youngcyberknights',
    youtube: 'youtube.com/@youngcyberknights',
    instagram: '@ycik_foundation',
  },
  faqs: [
    { question: 'How do I report a cybercrime?', answer: 'Use our reporting form on the Cybercrime Reporting page or email report@youngcyberknightsfoundation.org.' },
    { question: 'Is my report confidential?', answer: 'Yes. We maintain strict confidentiality. Your identity is only shared with law enforcement if required.' },
    { question: 'How can I become a volunteer?', answer: 'Visit our Volunteer page, fill out the application form, and our team will contact you within 5 business days.' },
    { question: 'Do you offer cybersecurity training?', answer: 'Yes. We offer free workshops and premium paid courses. Visit our Courses section for more details.' },
    { question: 'How can my organization partner with YCKF?', answer: 'Contact us at partnerships@youngcyberknightsfoundation.org with a brief proposal.' },
    { question: 'How quickly do you respond to cybercrime reports?', answer: 'We respond within 24\u201348 hours. Critical cases are prioritized.' },
  ],
}

export default function ContactPage() {
  const [data, setData] = useState<ContactData>(FALLBACK)

  useEffect(() => {
    fetch('/api/content/contact')
      .then((r) => r.json())
      .then((page) => {
        if (page?.content) {
          const c = typeof page.content === 'string' ? JSON.parse(page.content) : page.content
          setData({
            hero: c.hero || FALLBACK.hero,
            phone: c.phone || FALLBACK.phone,
            email: c.email || FALLBACK.email,
            address: c.address || FALLBACK.address,
            social: c.social || FALLBACK.social,
            faqs: Array.isArray(c.faqs) && c.faqs.length > 0 ? c.faqs : FALLBACK.faqs,
          })
        }
      })
      .catch(() => {})
  }, [])

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-10">
        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5">
          <div className="space-y-4 text-center">
            <p className="text-base font-semibold uppercase tracking-[0.35em] text-primary">{data.hero.title}</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{data.hero.subtitle}</h1>
            <p className="mx-auto max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
              {data.hero.description}
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="glass-card">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-2xl font-semibold text-white">Phone</h2>
              <p className="text-base leading-8 text-muted-foreground">
                {data.phone.numbers.join('\n')}
              </p>
              {data.phone.availability && (
                <p className="text-base text-muted-foreground">Available: {data.phone.availability}</p>
              )}
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-2xl font-semibold text-white">Email</h2>
              <p className="text-base leading-8 text-muted-foreground">
                {data.email.general && <>General: {data.email.general}<br /></>}
                {data.email.reporting && <>Reporting: {data.email.reporting}<br /></>}
                {data.email.media && <>Media: {data.email.media}</>}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-2xl font-semibold text-white">Address</h2>
              <p className="text-base leading-8 text-muted-foreground">
                {data.address.organization}<br />
                {data.address.poBox}<br />
                {data.address.city}
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-3xl border border-border/70 bg-card/80 p-8">
          <div className="flex flex-col items-center gap-8 sm:flex-row">
            <div className="shrink-0">
              <img
                src="/images/founder.jpeg"
                alt="Bright Peter Kwaku Boateng"
                className="h-48 w-48 rounded-2xl object-cover shadow-lg ring-2 ring-[#2563EB]/20 sm:h-56 sm:w-56"
              />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#2563EB] mb-2">Meet Our Founder</p>
              <h2 className="text-3xl font-bold text-white">Bright Peter Kwaku Boateng</h2>
              <p className="mt-1 text-lg font-medium text-muted-foreground">Founder &amp; Supervisor</p>
              <p className="mt-4 text-base leading-8 text-muted-foreground">
                Leading the charge in cybersecurity awareness and digital safety across Africa.
                Bright founded the Young Cyber Knights Foundation with a vision to empower every
                citizen with the knowledge and tools to stay safe online.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border/70 bg-card/80 p-8">
          <h2 className="text-3xl font-semibold text-white">Contact Form</h2>
          <form className="mt-8 grid gap-4 sm:grid-cols-2">
            <input className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-base text-foreground outline-none" type="text" placeholder="Full Name" required />
            <input className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-base text-foreground outline-none" type="email" placeholder="Email Address" required />
            <input className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-base text-foreground outline-none" type="tel" placeholder="Phone Number" />
            <select className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-base text-foreground outline-none">
              <option>Subject</option>
              <option>Cybercrime Report</option>
              <option>General Inquiry</option>
              <option>Volunteer Application</option>
              <option>Partnership Opportunity</option>
              <option>Event Registration</option>
              <option>Other</option>
            </select>
            <textarea className="col-span-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-base text-foreground outline-none" rows={5} placeholder="Message" required />
            <input className="col-span-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-base text-foreground outline-none" type="file" />
            <button type="submit" className="col-span-full rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition hover:bg-primary/90">Send Message</button>
          </form>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-border/70 bg-card/80 p-8">
            <h2 className="text-3xl font-semibold text-white">Connect With Us</h2>
            <div className="mt-6 grid gap-3 text-base text-muted-foreground">
              {data.social.linkedin && <p>LinkedIn: {data.social.linkedin}</p>}
              {data.social.twitter && <p>Twitter/X: {data.social.twitter}</p>}
              {data.social.facebook && <p>Facebook: {data.social.facebook}</p>}
              {data.social.youtube && <p>YouTube: {data.social.youtube}</p>}
              {data.social.instagram && <p>Instagram: {data.social.instagram}</p>}
            </div>
          </div>
          <div className="rounded-3xl border border-border/70 bg-card/80 p-8">
            <h2 className="text-3xl font-semibold text-white">Frequently Asked Questions</h2>
            <div className="mt-6 space-y-3">
              {data.faqs.map((faq) => (
                <details key={faq.question} className="rounded-3xl border border-border/60 bg-background/90 p-4">
                  <summary className="cursor-pointer text-base font-semibold text-white">{faq.question}</summary>
                  <p className="mt-3 text-base leading-8 text-muted-foreground">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
