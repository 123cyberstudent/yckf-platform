'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Key, Wifi, Mail, Smartphone, Shield, Eye, Lock } from 'lucide-react';

const tips = [
  { icon: Key, title: 'Use Strong Passwords', text: 'Create passwords with 12+ characters mixing letters, numbers, and symbols. Never reuse passwords across sites.' },
  { icon: Wifi, title: 'Avoid Public Wi-Fi for Banking', text: 'Public networks are easily intercepted. Use a VPN or wait until you are on a trusted connection for sensitive transactions.' },
  { icon: Mail, title: 'Verify Email Senders', text: 'Check sender addresses carefully. Phishing emails often use lookalike domains with subtle misspellings.' },
  { icon: Smartphone, title: 'Keep Devices Updated', text: 'Enable automatic updates on all devices. Security patches fix vulnerabilities that hackers actively exploit.' },
  { icon: Shield, title: 'Enable Two-Factor Authentication', text: 'Add an extra layer of security to all accounts. Even if your password leaks, 2FA keeps attackers out.' },
  { icon: Eye, title: 'Review App Permissions', text: 'Audit which apps access your camera, microphone, and contacts. Revoke permissions you no longer need.' },
  { icon: Lock, title: 'Back Up Your Data', text: 'Follow the 3-2-1 rule: 3 copies, on 2 different media, with 1 stored offsite or in the cloud.' },
  { icon: AlertTriangle, title: 'Recognise Social Engineering', text: 'Attackers manipulate urgency and fear. Always verify requests for money or personal information through a separate channel.' },
  { icon: Key, title: 'Use a Password Manager', text: 'Let a trusted password manager generate and store unique passwords for every account you own.' },
];

export function CybersecurityTips() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % tips.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const tip = tips[current];
  const Icon = tip.icon;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#06292D] via-[#0A3A3F] to-[#0D2E32] py-16 sm:py-20">
      <div className="pointer-events-none absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #2DD4BF 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      <div className="relative mx-auto max-w-7xl px-6 sm:px-10">
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-[#2DD4BF]">Free Cybersecurity Tip</p>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Stay Safe Online</h2>
        </div>
        <div className="mx-auto max-w-2xl rounded-2xl border border-[#2DD4BF]/20 bg-white/5 p-8 backdrop-blur-sm transition-all duration-500 sm:p-10">
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2DD4BF]/10 ring-2 ring-[#2DD4BF]/20">
              <Icon className="h-8 w-8 text-[#2DD4BF]" />
            </div>
            <h3 className="mb-3 text-xl font-bold text-white">{tip.title}</h3>
            <p className="text-base leading-relaxed text-gray-400" style={{ lineHeight: 1.8 }}>{tip.text}</p>
          </div>
          <div className="mt-8 flex items-center justify-center gap-2">
            {tips.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all duration-300 ${i === current ? 'w-8 bg-[#2DD4BF]' : 'w-2 bg-white/20 hover:bg-white/40'}`}
                aria-label={`Tip ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
