import Link from 'next/link'
import { CybersecurityTips } from '@/components/cybersecurity-tips'
import { HeroStats, ImpactStats } from '@/components/homepage-stats'
import {
  Shield,
  ShieldAlert,
  Users,
  GraduationCap,
  Handshake,
  ChevronDown,
  ArrowRight,
  Lock,
  Eye,
  Globe,
} from 'lucide-react'

const styles = `
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-40px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 8px rgba(45,212,191,0.3); }
  50% { box-shadow: 0 0 24px rgba(45,212,191,0.6), 0 0 48px rgba(45,212,191,0.2); }
}
@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-12px) rotate(3deg); }
}
@keyframes float-delay {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-8px) rotate(-2deg); }
}
@keyframes bounce-arrow {
  0%, 100% { transform: translateY(0); opacity: 0.6; }
  50% { transform: translateY(8px); opacity: 1; }
}
@keyframes countUp {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
@keyframes dot-float {
  0%, 100% { transform: translate(0, 0); opacity: 0.3; }
  25% { transform: translate(10px, -15px); opacity: 0.6; }
  50% { transform: translate(-5px, -25px); opacity: 0.4; }
  75% { transform: translate(15px, -10px); opacity: 0.5; }
}
`

const animBase = 'opacity-0'
const animFadeInUp = 'animate-[fadeInUp_0.8s_ease-out_forwards]'
const animSlideInLeft = 'animate-[slideInLeft_0.8s_ease-out_forwards]'

const stagger = (i: number) => `${animFadeInUp} [animation-delay:${i * 150}ms]`

export default function Page() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      <main className="flex min-h-screen flex-col bg-white text-gray-900">

        {/* ── Hero ──────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#06292D] via-[#091B1D] to-[#0D2E32]">
          {/* Gradient overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 70% 20%, rgba(37,99,235,0.25) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 20% 80%, rgba(45,212,191,0.15) 0%, transparent 70%)',
            }}
          />

          <div className="relative mx-auto w-full max-w-7xl px-6 py-14 sm:px-10 lg:py-20">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              {/* Left: Text */}
              <div className="space-y-6">
                <p
                  className={`${animBase} ${animSlideInLeft} text-2xl font-extrabold tracking-wide text-[#2DD4BF] sm:text-3xl lg:text-4xl`}
                >
                  Young Cyber Knights Foundation
                </p>
                <h1
                  className={`${animBase} ${animFadeInUp} text-6xl font-bold tracking-tight text-white sm:text-7xl lg:text-8xl`}
                  style={{ lineHeight: 1.05 }}
                >
                  Empowering a Safer{' '}
                  <span className="bg-gradient-to-r from-[#2DD4BF] to-[#2563EB] bg-clip-text text-transparent">
                    Digital World
                  </span>
                </h1>
                <p
                  className={`${animBase} ${stagger(2)} max-w-xl text-xl leading-relaxed text-gray-400`}
                  style={{ lineHeight: 1.8 }}
                >
                  Join our mission to educate, protect, and advocate for
                  cybersecurity awareness and resilience.
                </p>
                <div className={`${animBase} ${stagger(3)} flex flex-col gap-4 pt-2 sm:flex-row sm:items-center`}>
                  <Link
                    href="/about"
                    className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#2563EB] px-8 py-4 text-lg font-bold text-white shadow-lg shadow-[#2563EB]/25 transition-all duration-300 hover:bg-[#1D4ED8] hover:shadow-xl hover:shadow-[#2563EB]/30 hover:scale-105"
                  >
                    Learn About YCKF
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href="/report-a-cybercrime"
                    className="group inline-flex items-center justify-center gap-3 rounded-2xl border-2 border-[#2DD4BF] bg-[#2DD4BF]/10 px-10 py-5 text-xl font-bold text-[#2DD4BF] backdrop-blur-sm transition-all duration-300 hover:bg-[#2DD4BF] hover:text-[#06292D] hover:scale-105 hover:shadow-2xl hover:shadow-[#2DD4BF]/30"
                    style={{ animation: 'pulse-glow 3s ease-in-out infinite' }}
                  >
                    <ShieldAlert className="h-6 w-6" />
                    Report Cybercrime
                    <ShieldAlert className="h-6 w-6" />
                  </Link>
                </div>
              </div>

              {/* Right: Hero Image */}
              <div className={`${animBase} ${animFadeInUp} relative hidden lg:block`}>
                <div className="relative -mr-6 overflow-hidden rounded-3xl shadow-2xl shadow-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/one.jpg"
                    alt="YCKF Cybersecurity Team"
                    className="h-[480px] w-[110%] object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#06292D]/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2DD4BF]/20 backdrop-blur-sm">
                        <Shield className="h-6 w-6 text-[#2DD4BF]" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-white">Trusted by 500+ Citizens</p>
                        <p className="text-sm text-white/60">Across Africa</p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Floating badge */}
                <div className="absolute -bottom-6 -left-6 rounded-2xl bg-[#2563EB] px-6 py-4 shadow-xl" style={{ animation: 'float 4s ease-in-out infinite' }}>
                  <p className="text-2xl font-bold text-white">24/7</p>
                  <p className="text-xs font-medium text-white/70">Support Active</p>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="relative pb-4 text-center">
            <div
              className="inline-flex flex-col items-center gap-2 text-[#2DD4BF]/60"
              style={{ animation: 'bounce-arrow 2s ease-in-out infinite' }}
            >
              <span className="text-xs font-medium tracking-widest uppercase">
                Scroll
              </span>
              <ChevronDown className="h-5 w-5" />
            </div>
          </div>
        </section>

        {/* ── Stats Counter ─────────────────────────────────────────── */}
        <HeroStats />

        {/* ── Services ──────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-7xl px-6 py-24 sm:px-10">
          <div className="mb-14 max-w-2xl">
            <p className={`${animBase} ${animFadeInUp} mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-[#2563EB]`}>
              What We Do
            </p>
            <h2
              className={`${animBase} ${stagger(1)} text-3xl font-bold tracking-tight text-[#06292D] sm:text-4xl`}
              style={{ lineHeight: 1.2 }}
            >
              Comprehensive Cybersecurity Services
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: 'Community Awareness',
                detail:
                  'Free trainings and digital safety resources for schools, families, and small businesses.',
                icon: GraduationCap,
                color: '#2563EB',
              },
              {
                title: 'Trusted Reporting',
                detail:
                  'Secure cybercrime reporting with evidence preservation and support throughout investigation.',
                icon: Lock,
                color: '#06292D',
              },
              {
                title: 'Expert Partnerships',
                detail:
                  'Collaborations with government, NGOs, and industry to build safer digital ecosystems.',
                icon: Handshake,
                color: '#2DD4BF',
              },
              {
                title: 'Threat Intelligence',
                detail:
                  'Real-time monitoring and analysis of emerging cyber threats targeting African infrastructure.',
                icon: Eye,
                color: '#2563EB',
              },
            ].map((item, i) => (
              <div
                key={item.title}
                className={`${animBase} ${stagger(i)} group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:border-[${item.color}]/20`}
              >
                {/* Hover gradient overlay */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background: `linear-gradient(135deg, ${item.color}05 0%, ${item.color}08 100%)`,
                  }}
                />
                <div className="relative">
                  <div
                    className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
                    style={{ backgroundColor: `${item.color}15` }}
                  >
                    <item.icon className="h-7 w-7" style={{ color: item.color }} />
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-[#111827]">{item.title}</h3>
                  <p className="text-base text-gray-500" style={{ lineHeight: 1.8 }}>
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Community Image Banner */}
          <div className="mt-14 overflow-hidden rounded-3xl shadow-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/group.jpeg"
              alt="YCKF Community and Volunteers"
              className="h-96 w-full object-cover object-top sm:h-[28rem]"
            />
          </div>
        </section>

        {/* ── About / Mission ───────────────────────────────────────── */}
        <section className="border-t border-gray-100 bg-[#F8FAFC]">
          <div className="mx-auto grid max-w-7xl gap-0 lg:grid-cols-2">
            {/* Left: Mission + Vision */}
            <div className="space-y-0">
              <div className={`${animBase} ${animFadeInUp} p-8 sm:p-12 lg:p-16`}>
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-[#2563EB]">
                  Our Purpose
                </p>
                <h2
                  className="mb-6 text-3xl font-bold tracking-tight text-[#06292D] sm:text-4xl"
                  style={{ lineHeight: 1.2 }}
                >
                  Closing the Cybersecurity Awareness Gap
                </h2>
                <p className="mb-8 text-lg text-gray-500" style={{ lineHeight: 1.8 }}>
                  YCKF exists to close the cybersecurity awareness gap across
                  Africa. We respond to growing cybercrime, educate citizens, and
                  strengthen local resilience through hands-on guidance and
                  trusted digital safety programs.
                </p>
              </div>

              <div className="grid sm:grid-cols-2">
                <div className={`${animBase} ${stagger(1)} border-t border-gray-200 p-8 sm:p-10`}>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#06292D]/10">
                    <Globe className="h-6 w-6 text-[#06292D]" />
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-[#06292D]">Our Vision</h3>
                  <p className="text-base text-gray-500" style={{ lineHeight: 1.8 }}>
                    A future where every citizen navigates the internet
                    confidently, communities are cybercrime-resilient, and
                    digital safety is a basic right for all.
                  </p>
                </div>
                <div className={`${animBase} ${stagger(2)} border-t border-l-0 sm:border-l border-gray-200 p-8 sm:p-10`}>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#2563EB]/10">
                    <Users className="h-6 w-6 text-[#2563EB]" />
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-[#06292D]">Join the Mission</h3>
                  <p className="text-base text-gray-500" style={{ lineHeight: 1.8 }}>
                    Become a volunteer, partner, or supporter. Together we build
                    safer online spaces for families, businesses, and public
                    institutions across the continent.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Image */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#06292D] via-[#091B1D] to-[#0D2E32]">
              <div className="relative h-full min-h-[400px] w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/history.jpeg"
                  alt="YCKF Purpose and History"
                  className="absolute inset-0 h-full w-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#06292D] via-[#06292D]/40 to-transparent" />
                <div className="relative z-10 flex h-full min-h-[400px] flex-col items-center justify-center p-12 sm:p-16 lg:p-20 text-center">
                  <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-[#2DD4BF]/15 backdrop-blur-sm" style={{ animation: 'pulse-glow 3s ease-in-out infinite' }}>
                    <Shield className="h-12 w-12 text-[#2DD4BF]" />
                  </div>
                  <h3 className="mb-4 text-3xl font-bold text-white sm:text-4xl" style={{ lineHeight: 1.2 }}>
                    Building a Safer
                    <br />
                    <span className="text-[#2DD4BF]">Digital Africa</span>
                  </h3>
                  <p className="mx-auto max-w-sm text-base text-gray-300" style={{ lineHeight: 1.8 }}>
                    Empowering communities with knowledge, tools, and trusted
                    partnerships to navigate the digital world securely.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats Banner ──────────────────────────────────────────── */}
        <ImpactStats />

        {/* ── Cybersecurity Tips ─────────────────────────────────────── */}
        <CybersecurityTips />

        {/* ── Report Cybercrime Spotlight ────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-r from-red-600 via-red-500 to-orange-500 py-20 sm:py-28">
          <div className="pointer-events-none absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-white/10" />
          <div className="relative mx-auto max-w-7xl px-6 text-center sm:px-10">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-sm" style={{ animation: 'pulse-glow 3s ease-in-out infinite' }}>
              <ShieldAlert className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-white sm:text-5xl lg:text-6xl" style={{ lineHeight: 1.1 }}>
              Witnessed a Cybercrime?
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80" style={{ lineHeight: 1.8 }}>
              Don&apos;t stay silent. Report it immediately and our trained volunteers will investigate, preserve evidence, and help bring cybercriminals to justice.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/report-a-cybercrime"
                className="group inline-flex items-center gap-3 rounded-2xl bg-white px-12 py-5 text-xl font-bold text-red-600 shadow-2xl shadow-black/20 transition-all duration-300 hover:scale-110 hover:shadow-3xl"
              >
                <ShieldAlert className="h-7 w-7" />
                Report Cybercrime Now
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
            <p className="mt-6 text-sm font-medium text-white/60">Your identity is always protected. Reports are confidential.</p>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-7xl px-6 py-24 sm:px-10">
          <div
            className={`${animBase} ${animFadeInUp} relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#06292D] via-[#091B1D] to-[#0D2E32] px-8 py-16 sm:px-16 sm:py-20`}
          >
            {/* Background team image */}
            <div className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/team.jfif"
                alt="YCKF Team"
                className="h-full w-full object-cover opacity-15"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#06292D] via-[#06292D]/90 to-[#06292D]/70" />
            </div>

            {/* Decorative gradient */}
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-20"
              style={{
                background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)',
              }}
            />
            <div
              className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full opacity-15"
              style={{
                background: 'radial-gradient(circle, #2DD4BF 0%, transparent 70%)',
              }}
            />

            <div className="relative z-10">
              <h2
                className="mb-6 text-3xl font-bold text-white sm:text-4xl"
                style={{ lineHeight: 1.2 }}
              >
                Ready to Make a Difference?
              </h2>
              <p className="mx-auto mb-10 max-w-xl text-lg text-gray-300" style={{ lineHeight: 1.8 }}>
                Join hundreds of cybersecurity professionals, volunteers, and
                organizations working together to create a safer digital
                environment across Africa.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/signup"
                  className="group inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#2563EB]/25 transition-all duration-300 hover:bg-[#1D4ED8] hover:shadow-xl hover:scale-105"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-8 py-3.5 text-base font-semibold text-white transition-all duration-300 hover:border-[#2DD4BF] hover:bg-[#2DD4BF]/10 hover:text-[#2DD4BF] hover:scale-105"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <footer className="border-t border-gray-200 bg-[#F8FAFC]">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 py-12 sm:flex-row sm:justify-between sm:px-10">
            <div className="flex items-center gap-3">
              <img src="/images/companylogo.png" alt="YCKF Logo" className="h-12 w-12 rounded-xl object-cover shadow-sm" />
              <span className="text-xl font-bold text-[#111827]">YCKF</span>
            </div>
            <p className="text-base text-gray-500">
              &copy; {new Date().getFullYear()} Young Cyber Knights Foundation. All rights reserved.
            </p>
            <div className="flex gap-8">
              <Link href="/about" className="text-base font-medium text-gray-500 transition hover:text-[#2563EB]">
                About
              </Link>
              <Link href="/contact" className="text-base font-medium text-gray-500 transition hover:text-[#2563EB]">
                Contact
              </Link>
              <Link href="/resources" className="text-base font-medium text-gray-500 transition hover:text-[#2563EB]">
                Resources
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </>
  )
}
