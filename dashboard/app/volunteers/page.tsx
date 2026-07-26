'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

const professionalFields = [
  'Software Engineering',
  'Network Security',
  'Digital Forensics',
  'Cybersecurity Consulting',
  'IT Administration',
  'Other',
];

const experienceRanges = ['0-1', '1-3', '3-5', '5-10', '10+'];

const referralSources = ['Social Media', 'Friend/Colleague', 'Website', 'Other'];

export default function VolunteersPublicPage() {
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [professionalField, setProfessionalField] = useState('');
  const [skills, setSkills] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [motivation, setMotivation] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetch('/api/content/volunteers')
      .then((r) => r.json())
      .then(setPage)
      .catch(() => setPage(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <main className="min-h-screen bg-background px-4 py-10"><div className="mx-auto max-w-6xl text-center text-muted-foreground py-20">Loading...</div></main>;

  const content = page?.content || {};
  const hero = content.hero || {};
  const members = Array.isArray(content.members) ? content.members : [];
  const banners = Array.isArray(content.banners) ? content.banners : [];

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim() || !email.trim() || !motivation.trim()) {
      setFormError('Please fill in all required fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setFormLoading(true);

    try {
      const response = await fetch('/api/volunteer-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          professionalField,
          skills: skills.trim(),
          yearsOfExperience,
          motivation: motivation.trim(),
          referralSource,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Submission failed. Please try again.');
      }

      setFormSubmitted(true);
    } catch (err: any) {
      setFormError(err.message || 'Something went wrong.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-12">
        {banners.length > 0 && (
          <div className="overflow-hidden rounded-3xl border border-border/70">
            {banners.map((b: { url?: string; alt?: string; caption?: string }, i: number) => (
              <div key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.url} alt={b.alt || b.caption || 'Banner'} className="h-64 w-full object-cover sm:h-80" />
                {b.caption && <p className="bg-card/90 px-6 py-3 text-center text-base text-muted-foreground">{b.caption}</p>}
              </div>
            ))}
          </div>
        )}

        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5">
          <div className="space-y-4 text-center">
            <p className="text-base font-semibold uppercase tracking-[0.35em] text-primary">{hero.subtitle || 'Volunteers'}</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{hero.title || 'Meet Our Volunteers'}</h1>
          </div>
        </section>

        {members.length > 0 ? (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member: any, i: number) => (
              <Card key={i} className="glass-card overflow-hidden">
                {member.imageUrl && (
                  <div className="h-40 overflow-hidden bg-background/50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={member.imageUrl} alt={member.name || 'Volunteer'} className="h-full w-full object-cover" />
                  </div>
                )}
                <CardContent className="p-6 space-y-3">
                  <h3 className="text-xl font-semibold text-white">{member.name}</h3>
                  {member.role && <p className="text-base text-primary">{member.role}</p>}
                  {member.bio && <p className="text-base text-muted-foreground">{member.bio}</p>}
                  {member.location && <p className="text-base text-muted-foreground">{member.location}</p>}
                  {Array.isArray(member.expertise) && member.expertise.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {member.expertise.map((skill: string, j: number) => (
                        <Badge key={j} variant="outline" className="text-sm">{skill}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </section>
        ) : (
          <div className="rounded-3xl border border-border/70 bg-card/80 p-10 text-center text-base text-muted-foreground">
            No volunteer profiles yet. The administrator can add content via the Content Manager.
          </div>
        )}

        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5">
          <div className="space-y-4 text-center">
            <p className="text-lg font-semibold uppercase tracking-[0.35em] text-[#2563EB]">
              Volunteer with YCKF
            </p>
            <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Join Our Mission
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Help us protect communities from cyber threats. Fill out the form below to apply as a volunteer.
            </p>
          </div>

          {!formSubmitted ? (
            <form onSubmit={handleFormSubmit} className="mt-8 grid gap-5">
              {formError && (
                <div className="rounded-3xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-base text-red-500 text-center">
                  {formError}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-base font-medium text-foreground">
                  Full Name <span className="text-[#2DD4BF]">*</span>
                </label>
                <input
                  className="w-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-base text-foreground outline-none"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-base font-medium text-foreground">
                    Email <span className="text-[#2DD4BF]">*</span>
                  </label>
                  <input
                    className="w-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-base text-foreground outline-none"
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-base font-medium text-foreground">
                    Phone Number
                  </label>
                  <input
                    className="w-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-base text-foreground outline-none"
                    type="tel"
                    placeholder="+254 700 123 456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-base font-medium text-foreground">
                    Professional Field
                  </label>
                  <select
                    className="w-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-base text-foreground outline-none"
                    value={professionalField}
                    onChange={(e) => setProfessionalField(e.target.value)}
                  >
                    <option value="">Select field</option>
                    {professionalFields.map((field) => (
                      <option key={field} value={field}>{field}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-base font-medium text-foreground">
                    Years of Experience
                  </label>
                  <select
                    className="w-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-base text-foreground outline-none"
                    value={yearsOfExperience}
                    onChange={(e) => setYearsOfExperience(e.target.value)}
                  >
                    <option value="">Select range</option>
                    {experienceRanges.map((range) => (
                      <option key={range} value={range}>{range} years</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-base font-medium text-foreground">
                  Skills &amp; Expertise
                </label>
                <textarea
                  className="w-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-base text-foreground outline-none"
                  rows={3}
                  placeholder="List your relevant skills and certifications"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-base font-medium text-foreground">
                  Why do you want to volunteer? <span className="text-[#2DD4BF]">*</span>
                </label>
                <textarea
                  className="w-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-base text-foreground outline-none"
                  rows={4}
                  placeholder="Tell us what motivates you to volunteer with YCKF..."
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-base font-medium text-foreground">
                  How did you hear about us?
                </label>
                <select
                  className="w-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-base text-foreground outline-none"
                  value={referralSource}
                  onChange={(e) => setReferralSource(e.target.value)}
                >
                  <option value="">Select source</option>
                  {referralSources.map((source) => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="inline-flex items-center justify-center rounded-full bg-[#2563EB] px-8 py-3.5 text-lg font-semibold text-white transition hover:bg-[#1D4ED8] disabled:opacity-50"
              >
                {formLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </button>
            </form>
          ) : (
            <div className="mt-8 rounded-3xl border border-[#2DD4BF]/30 bg-[#2DD4BF]/10 p-8 text-center">
              <p className="text-2xl font-semibold text-white">Application Submitted!</p>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                Thank you for your interest! Your application has been sent to our admin team for review.
                You will receive an email with your login credentials once approved.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
