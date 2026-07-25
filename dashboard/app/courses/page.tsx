import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const courses = [
  {
    title: 'Cybersecurity Fundamentals',
    level: 'Beginner',
    duration: '4 weeks',
    price: '$49/month',
    description: 'Understand core cybersecurity concepts, threats, and protection measures.',
  },
  {
    title: 'Network Security Basics',
    level: 'Beginner',
    duration: '4 weeks',
    price: '$49/month',
    description: 'Learn to secure networks, detect intrusions, and implement firewalls.',
  },
  {
    title: 'Ethical Hacking & Penetration Testing',
    level: 'Intermediate',
    duration: '8 weeks',
    price: '$99/month',
    description: 'Learn ethical hacking techniques and how to conduct penetration tests.',
  },
  {
    title: 'Digital Forensics & Incident Response',
    level: 'Intermediate',
    duration: '8 weeks',
    price: '$99/month',
    description: 'Master forensic techniques, evidence collection, and incident handling.',
  },
  {
    title: 'SOC Analyst',
    level: 'Advanced',
    duration: '12 weeks',
    price: '$199/month',
    description: 'Build skills for security monitoring, threat hunting, and incident management.',
  },
  {
    title: 'Cyber Threat Intelligence',
    level: 'Advanced',
    duration: '10 weeks',
    price: '$199/month',
    description: 'Learn to analyze threats, collect intelligence, and predict attacks.',
  },
]

export default function CoursesPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-10">
        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5">
          <div className="space-y-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">Premium Cybersecurity Courses</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Advance your career with premium cybersecurity training.</h1>
            <p className="mx-auto max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
              Unlock in-demand skills with expert-led courses, hands-on labs, and recognized certificates designed for learners at every stage.
            </p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-border/70 bg-card/80 p-8">
              <h2 className="text-3xl font-semibold text-white">Why Choose YCKF Certifications?</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Gain industry-relevant skills, practical experience, and career-ready credentials recognized by employers and partner organizations across Africa.
              </p>
              <ul className="mt-6 space-y-3 text-sm leading-7 text-muted-foreground">
                <li>• Hands-on labs, real-world projects, and expert guidance.</li>
                <li>• Flexible online access with self-paced and instructor-led options.</li>
                <li>• Certifications designed to support career growth and job readiness.</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-border/70 bg-card/80 p-8">
              <h2 className="text-3xl font-semibold text-white">What’s Included</h2>
              <ul className="mt-6 space-y-3 text-sm leading-7 text-muted-foreground">
                <li>✅ On-demand video lectures</li>
                <li>✅ Practical labs and hands-on exercises</li>
                <li>✅ Real-world projects</li>
                <li>✅ Downloadable resources</li>
                <li>✅ Instructor support</li>
                <li>✅ Certification of completion</li>
              </ul>
            </div>
          </div>

          <div className="rounded-3xl border border-border/70 bg-card/80 p-8">
            <h2 className="text-3xl font-semibold text-white">Flexible Payment Plans</h2>
            <div className="mt-6 space-y-4">
              {[
                { title: 'Monthly Subscription', detail: 'Pay as you go with the freedom to cancel anytime.' },
                { title: 'Full Course Payment', detail: 'One-time payment with lifetime access and savings.' },
                { title: 'Group Discounts', detail: 'Discounts for teams and corporate learners.' },
              ].map((item) => (
                <div key={item.title} className="rounded-3xl border border-border/60 bg-background/90 p-5">
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.title} className="glass-card">
              <CardContent className="space-y-4 p-6">
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">{course.level}</p>
                <h2 className="text-2xl font-semibold text-white">{course.title}</h2>
                <p className="text-sm leading-7 text-muted-foreground">{course.description}</p>
                <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>{course.duration}</span>
                  <span className="font-semibold text-white">{course.price}</span>
                </div>
                <Button asChild>
                  <Link href="/signup">Enroll Now</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </main>
  )
}
