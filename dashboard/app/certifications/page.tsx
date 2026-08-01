import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const programs = [
  {
    title: 'Certified Cyber Security Foundation (CCSF)',
    audience: 'Beginners, students, career changers',
    duration: '4 weeks',
    assessment: 'Online exam + project',
    cost: 'Free',
    career: 'IT Support, Junior Security Roles',
  },
  {
    title: 'Certified Cyber Crime Analyst (CCCA)',
    audience: 'Professionals, law enforcement, researchers',
    duration: '8 weeks',
    assessment: 'Case study + practical exam',
    cost: 'Premium',
    career: 'Digital Forensics, Crime Analysis',
  },
  {
    title: 'Certified Security Operations Professional (CSOP)',
    audience: 'Advanced professionals, IT managers',
    duration: '12 weeks',
    assessment: 'Exam + capstone project',
    cost: 'Premium',
    career: 'SOC Analyst, Security Manager',
  },
]

const faqs = [
  { question: 'How do I register for a certification?', answer: 'Register on our platform, choose your program, and start learning.' },
  { question: 'Are certifications recognized internationally?', answer: 'Yes, YCKF certifications are recognized across Africa and globally by industry partners.' },
  { question: 'What is the validity period?', answer: 'Certifications are valid for 2 years. Renewal requires continuing education credits.' },
  { question: 'Can I retake the exam if I fail?', answer: 'Yes, you can retake the exam once free of charge. Additional attempts are charged.' },
  { question: 'Are there scholarships available?', answer: 'Yes, we offer scholarships for students and active volunteers. Contact us for details.' },
]

export default function CertificationsPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-10">
        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5">
          <div className="space-y-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">YCKF Cybersecurity Certifications</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Earn your cybersecurity credentials.</h1>
            <p className="mx-auto max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
              Validate your skills with YCKF&apos;s industry-recognized certification programs for beginners, analysts, and security leaders.
            </p>
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {programs.map((program) => (
            <Card key={program.title} className="glass-card">
              <CardContent className="space-y-4 p-6">
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">{program.audience}</p>
                <h2 className="text-2xl font-semibold text-white">{program.title}</h2>
                <div className="space-y-2 text-sm leading-7 text-muted-foreground">
                  <p><strong>Duration:</strong> {program.duration}</p>
                  <p><strong>Assessment:</strong> {program.assessment}</p>
                  <p><strong>Cost:</strong> {program.cost}</p>
                </div>
                <p className="text-sm text-muted-foreground">Career Path: {program.career}</p>
                <Button asChild>
                  <Link href="/signup">Enroll Now</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="rounded-3xl border border-border/70 bg-card/80 p-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold text-white">Why Choose YCKF Certifications?</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Build knowledge that matters. Our certifications are practical, employer-focused, and designed to help you transition into cybersecurity roles with confidence.
              </p>
            </div>
            <div className="space-y-3 text-sm leading-7 text-muted-foreground">
              <p>• Industry relevance with hands-on learning and verified outcomes.</p>
              <p>• Practical project-based assessments that mirror real cyber challenges.</p>
              <p>• Recognition from employers, public sector partners, and volunteer networks.</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border/70 bg-card/80 p-8">
          <h2 className="text-3xl font-semibold text-white">Frequently Asked Questions</h2>
          <div className="mt-6 space-y-4">
            {faqs.map((faq) => (
              <details key={faq.question} className="rounded-3xl border border-border/60 bg-background/90 p-5">
                <summary className="cursor-pointer text-sm font-semibold text-white">{faq.question}</summary>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
