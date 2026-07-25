'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const leadership = [
  { name: 'Amina Njoroge', role: 'Executive Director', bio: 'Leading YCKF with a decade of cybersecurity and governance experience.' },
  { name: 'David Mwangi', role: 'Head of Operations', bio: 'Oversees volunteer programs and incident response coordination.' },
  { name: 'Sofia Adede', role: 'Head of Cybersecurity Research', bio: 'Drives threat research and training curriculum development.' },
  { name: 'Samuel Ochieng', role: 'Volunteer Coordinator', bio: 'Supports volunteers across workshops, outreach, and field operations.' },
  { name: 'Lina Kimani', role: 'Legal Advisor', bio: 'Ensures data protection and ethical cybercrime reporting standards.' },
];

const volunteers = [
  { name: 'Ruth', expertise: ['Malware Analysis', 'Phishing Defense', 'Awareness'], location: 'Nairobi, Kenya', experience: '4 years', languages: 'English, Kiswahili' },
  { name: 'Michael', expertise: ['Incident Response', 'Network Security', 'Digital Forensics'], location: 'Lagos, Nigeria', experience: '6 years', languages: 'English' },
  { name: 'Aisha', expertise: ['Cybersecurity Awareness', 'Data Protection', 'Social Media Safety'], location: 'Accra, Ghana', experience: '3 years', languages: 'English' },
  { name: 'Paul', expertise: ['Penetration Testing', 'Vulnerability Assessment', 'Secure Systems'], location: 'Kampala, Uganda', experience: '5 years', languages: 'English, Luganda' },
];

export default function TeamPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-10">
        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5">
          <div className="space-y-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">Volunteer Cyber Officers</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Meet the guardians of the digital world.</h1>
            <p className="mx-auto max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              Our dedicated network of volunteers includes students, professionals, and experienced cyber specialists working together to detect threats, support victims, and raise awareness across communities.
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-border/70 bg-card/80 p-8">
            <h2 className="text-2xl font-semibold text-white">The Power of Volunteerism</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              YCKF volunteers are students, retired experts, IT professionals, and mindful citizens united by a shared mission: protect people online and help communities respond to cyber threats with confidence and care.
            </p>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              They join YCKF to make a direct impact, gain hands-on experience, and grow cybersecurity skills while supporting cybercrime reporting, digital awareness campaigns, and local training events.
            </p>
          </div>
          <div className="rounded-3xl border border-border/70 bg-card/80 p-8">
            <h2 className="text-2xl font-semibold text-white">How We Support Volunteers</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
              <li>• Regular training sessions and mentorship from cybersecurity experts.</li>
              <li>• Access to tools, case studies, and incident response resources.</li>
              <li>• Recognition through certificates, community awards, and public showcases.</li>
            </ul>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold text-white">Leadership</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {leadership.map((member) => (
                <Card key={member.name} className="glass-card">
                  <CardContent className="space-y-3 p-6">
                    <div>
                      <p className="text-lg font-semibold text-white">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">{member.bio}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">Leadership</Badge>
                      <Badge variant="secondary">Cybersecurity</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border/70 bg-card/80 p-8">
            <h2 className="text-3xl font-semibold text-white">Become a Volunteer</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Join YCKF and help protect your community from cyber threats. Volunteers receive training, mentoring, and the chance to work on real awareness and response initiatives.
            </p>
            <ul className="mt-6 space-y-3 text-sm leading-7 text-muted-foreground">
              <li>• Support cybercrime reporting and evidence collection.</li>
              <li>• Deliver digital safety workshops for students and families.</li>
              <li>• Help build a safer internet for all citizens.</li>
            </ul>
            <div className="mt-8 rounded-3xl border border-border/70 bg-background/80 p-6">
              <p className="text-sm font-semibold text-white">Ready to join?</p>
              <p className="mt-2 text-sm text-muted-foreground">Send us a request through the Contact page and our team will respond within 5 business days.</p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-3xl font-semibold text-white">Our Volunteer Cyber Officers</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
            {volunteers.map((officer) => (
              <Card key={officer.name} className="glass-card">
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-white">{officer.name}</p>
                      <p className="text-sm text-muted-foreground">{officer.location}</p>
                    </div>
                    <span className="rounded-full bg-primary/20 px-3 py-1 text-xs uppercase tracking-[0.25em] text-primary">{officer.experience}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {officer.expertise.map((skill) => (
                      <Badge key={skill} variant="outline">{skill}</Badge>
                    ))}
                  </div>
                  <p className="text-sm leading-7 text-muted-foreground">Languages: {officer.languages}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
