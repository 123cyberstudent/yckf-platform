import Link from 'next/link'
import { SiteNav } from '@/components/site-nav'

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col bg-[#FFFFFF] text-[#111827]">
      <SiteNav />

      <section className="bg-gradient-to-br from-[#06292D] via-[#091B1D] to-[#0D2E32]">
        <div className="mx-auto w-full max-w-7xl px-6 py-24 sm:px-10 lg:py-32">
          <div className="max-w-3xl space-y-8">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#2DD4BF]">
              Young Cyber Knights Foundation
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Protecting the Digital Frontier
            </h1>
            <p className="max-w-xl text-base leading-8 text-gray-400 sm:text-lg">
              YCKF blends cybersecurity expertise, community education, and secure
              incident support to protect individuals, businesses, and public
              institutions across Africa.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/about"
                className="inline-flex items-center rounded-full bg-[#2563EB] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#2563EB]/90"
              >
                Learn About YCKF
              </Link>
              <Link
                href="/report"
                className="inline-flex items-center rounded-full border border-white px-7 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Report Cybercrime
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-10 w-full max-w-7xl px-6 sm:px-10">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { stat: '500+', label: 'Cybercrime Reports Handled' },
            { stat: '50+', label: 'Volunteer Cyber Officers' },
            { stat: '15+', label: 'Partner Organizations' },
            { stat: '24/7', label: 'Digital Support Network' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <p className="text-3xl font-bold text-[#2563EB]">{item.stat}</p>
              <p className="mt-2 text-sm font-medium text-[#6B7280]">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-20 sm:px-10">
        <div className="grid gap-8 lg:grid-cols-3">
          {[
            {
              title: 'Community Awareness',
              detail:
                'Free trainings and digital safety resources for schools, families, and small businesses.',
              icon: '🛡',
            },
            {
              title: 'Trusted Reporting',
              detail:
                'Secure cybercrime reporting with evidence preservation and support throughout investigation.',
              icon: '🔒',
            },
            {
              title: 'Expert Partnerships',
              detail:
                'Collaborations with government, NGOs, and industry to build safer digital ecosystems.',
              icon: '🤝',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-[#2563EB]/20 bg-white p-8 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#2563EB]/10 text-xl">
                {item.icon}
              </div>
              <h2 className="text-xl font-bold text-[#111827]">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#6B7280]">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-[#E5E7EB] bg-[#F8FAFC] px-6 py-16 sm:px-10">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-[#06292D]">Our Mission</h2>
            <p className="mt-4 text-sm leading-7 text-[#6B7280]">
              YCKF exists to close the cybersecurity awareness gap across Africa.
              We respond to growing cybercrime, educate citizens, and strengthen
              local resilience through hands-on guidance and trusted digital
              safety programs.
            </p>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-[#06292D]">Our Vision</h2>
            <p className="mt-4 text-sm leading-7 text-[#6B7280]">
              We envision a future where every citizen navigates the internet
              confidently, communities are cybercrime-resilient, and digital
              safety is recognized as a basic right for all.
            </p>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-[#06292D]">
              Join the Mission
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#6B7280]">
              Become a volunteer, partner, or supporter. Together we build safer
              online spaces for families, businesses, and public institutions
              across the continent.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
