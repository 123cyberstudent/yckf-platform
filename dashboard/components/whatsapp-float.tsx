'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { X, MessageCircle } from 'lucide-react';

const WHATSAPP_NUMBER = '+233505313578';
const QUICK_REPLIES = [
  'I want to report a cybercrime',
  'How can I volunteer?',
  'What courses do you offer?',
  'I need help with account security',
  'General inquiry',
];

export function WhatsAppFloat() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isDashboard = pathname.startsWith('/dashboard') || pathname.startsWith('/api');

  useEffect(() => { setOpen(false); }, [pathname]);

  if (isDashboard) return null;

  const sendQuick = (msg: string) => {
    window.open(`https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=${encodeURIComponent(msg)}`, '_blank');
    setOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-4 w-80 overflow-hidden rounded-2xl border border-white/10 bg-[#06292D] shadow-2xl shadow-black/40">
          <div className="bg-[#25D366] px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">YCKF Support</p>
                <p className="text-xs text-white/80">Typically replies in minutes</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-full p-1 text-white/80 hover:bg-white/20">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="space-y-2 p-4">
            <p className="text-xs text-gray-400">Choose a topic or type your own:</p>
            {QUICK_REPLIES.map((reply) => (
              <button
                key={reply}
                onClick={() => sendQuick(reply)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-left text-sm text-white transition hover:border-[#25D366]/40 hover:bg-[#25D366]/10"
              >
                {reply}
              </button>
            ))}
          </div>
          <div className="border-t border-white/10 p-4">
            <button
              onClick={() => {
                window.open(`https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}`, '_blank');
                setOpen(false);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#20BD5A]"
            >
              <MessageCircle className="h-4 w-4" />
              Open WhatsApp Chat
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 transition-all hover:scale-110 hover:shadow-xl hover:shadow-[#25D366]/40"
      >
        <span className="absolute -right-1 -top-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
        </span>
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
