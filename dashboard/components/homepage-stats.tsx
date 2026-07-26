'use client';

import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Handshake,
  Zap,
  Shield,
  Globe,
  Lock,
  Eye,
  GraduationCap,
  BarChart3,
  FileText,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ShieldAlert, Users, Handshake, Zap, Shield,
  Globe, Lock, Eye, GraduationCap, BarChart3, FileText,
};

interface SiteStat {
  id: number;
  section: string;
  stat: string;
  label: string;
  icon: string | null;
  order: number;
  isActive: boolean;
}

const FALLBACK_HERO = [
  { stat: '500+', label: 'Cybercrime Reports Handled', icon: 'ShieldAlert' },
  { stat: '50+', label: 'Volunteer Cyber Officers', icon: 'Users' },
  { stat: '15+', label: 'Partner Organizations', icon: 'Handshake' },
  { stat: '24/7', label: 'Digital Support Network', icon: 'Zap' },
];

const FALLBACK_IMPACT = [
  { stat: '500+', label: 'Reports Resolved' },
  { stat: '10K+', label: 'Citizens Educated' },
  { stat: '50+', label: 'Expert Volunteers' },
  { stat: '98%', label: 'Response Rate' },
];

const animBase = 'opacity-0';
const animFadeInUp = 'animate-[fadeInUp_0.8s_ease-out_forwards]';
const stagger = (i: number) => `${animFadeInUp} [animation-delay:${i * 150}ms]`;

export function HeroStats() {
  const [items, setItems] = useState(FALLBACK_HERO);

  useEffect(() => {
    fetch('/api/site-stats/public?section=hero')
      .then((r) => r.json())
      .then((data: SiteStat[]) => {
        if (data.length > 0) {
          setItems(data.map((s) => ({ stat: s.stat, label: s.label, icon: s.icon || 'ShieldAlert' })));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section className="relative -mt-12 z-10 mx-auto w-full max-w-7xl px-6 sm:px-10">
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {items.map((item, i) => {
          const Icon = ICON_MAP[item.icon] || ShieldAlert;
          return (
            <div
              key={item.label}
              className={`${animBase} ${stagger(i)} group rounded-2xl border border-gray-200 bg-white p-6 shadow-lg shadow-gray-200/50 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:border-[#2563EB]/30 sm:p-8`}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563EB]/10 text-[#2563EB] transition-colors duration-300 group-hover:bg-[#2563EB] group-hover:text-white">
                <Icon className="h-5 w-5" />
              </div>
              <p
                className="text-3xl font-bold text-[#2563EB] sm:text-4xl"
                style={{ animation: 'countUp 0.6s ease-out forwards' }}
              >
                {item.stat}
              </p>
              <p className="mt-2 text-sm font-medium text-gray-500" style={{ lineHeight: 1.6 }}>
                {item.label}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ImpactStats() {
  const [items, setItems] = useState(FALLBACK_IMPACT);

  useEffect(() => {
    fetch('/api/site-stats/public?section=impact')
      .then((r) => r.json())
      .then((data: SiteStat[]) => {
        if (data.length > 0) {
          setItems(data.map((s) => ({ stat: s.stat, label: s.label })));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] py-16 sm:py-20">
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="relative mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 sm:px-10 lg:grid-cols-4">
        {items.map((item, i) => (
          <div
            key={item.label}
            className={`${animBase} ${stagger(i)} text-center`}
          >
            <p className="text-4xl font-bold text-white sm:text-5xl">{item.stat}</p>
            <p className="mt-2 text-sm font-medium text-white/70 uppercase tracking-wider">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
