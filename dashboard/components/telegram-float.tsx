'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { X, Send } from 'lucide-react';

const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'YCKFBot';

const QUICK_REPLIES = [
  { label: 'Report Cybercrime', command: '/report' },
  { label: 'Browse Courses', command: '/courses' },
  { label: 'Volunteer', command: '/volunteer' },
  { label: 'Cybersecurity Tips', command: '/tips' },
  { label: 'View Events', command: '/events' },
  { label: 'Contact Us', command: '/contact' },
];

export function TelegramFloat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const pathname = usePathname();
  const isDashboard = pathname.startsWith('/dashboard') || pathname.startsWith('/api');

  if (isDashboard) return null;

  const openBot = (text?: string) => {
    const msg = text || input || '/start';
    window.open(`https://t.me/${TELEGRAM_BOT_USERNAME}?start=${encodeURIComponent(msg)}`, '_blank');
    setOpen(false);
    setInput('');
  };

  return (
    <div className="fixed bottom-6 right-24 z-50">
      {open && (
        <div className="mb-4 w-80 overflow-hidden rounded-2xl border border-white/10 bg-[#06292D] shadow-2xl shadow-black/40">
          <div className="bg-gradient-to-r from-[#0088CC] to-[#0066AA] px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">YCKF Telegram Bot</p>
                <p className="text-xs text-white/80">Instant replies via Telegram</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-full p-1 text-white/80 hover:bg-white/20">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="space-y-2 p-4">
            <p className="text-xs text-gray-400">Choose a topic or type a command:</p>
            {QUICK_REPLIES.map((item) => (
              <button
                key={item.command}
                onClick={() => openBot(item.command)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-left text-sm text-white transition hover:border-[#0088CC]/40 hover:bg-[#0088CC]/10"
              >
                <span className="font-semibold text-[#0088CC]">{item.command}</span>
                <span className="ml-2 text-gray-400">{item.label}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-white/10 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && openBot()}
                placeholder="Type a message..."
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-[#0088CC]/50 focus:bg-white/10"
              />
              <button
                onClick={() => openBot()}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0088CC] text-white transition hover:bg-[#0066AA]"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => openBot()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0088CC] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0066AA]"
            >
              Open Telegram Bot
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="group flex h-14 w-14 items-center justify-center rounded-full bg-[#0088CC] text-white shadow-lg shadow-[#0088CC]/30 transition-all hover:scale-110 hover:shadow-xl hover:shadow-[#0088CC]/40"
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
        )}
      </button>
    </div>
  );
}
