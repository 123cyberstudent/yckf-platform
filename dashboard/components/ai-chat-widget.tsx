'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, X, Send, Bot, User, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'How do I report a cybercrime?',
  'What courses are available?',
  'How can I volunteer?',
  'Give me a cybersecurity tip',
];

export function AIChatWidget() {
  const pathname = usePathname();
  const isApi = pathname.startsWith('/api');
  const isDashboard = pathname.startsWith('/dashboard');
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: isDashboard
      ? 'Hello! I\'m YCKF AI Assistant. I can help you with cybersecurity questions, case management, and admin tasks. How can I help?'
      : 'Welcome to YCKF! I\'m your AI assistant. I can help you report cybercrimes, find courses, volunteer, get cybersecurity tips, and more. How can I help?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  if (isApi) return null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.slice(-10),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply || 'Sorry, I could not process that.' }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {open && (
        <div className="mb-4 w-96 max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#06292D] shadow-2xl shadow-black/40">
          <div className="bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">YCKF AI Assistant</p>
                  <p className="text-xs text-white/70">Powered by Young Cyber Knights</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-full p-1 text-white/70 hover:bg-white/20">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="h-80 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2563EB]/20 mt-1">
                    <Bot className="h-4 w-4 text-[#2563EB]" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#2563EB] text-white rounded-br-sm'
                    : 'bg-white/10 text-gray-200 rounded-bl-sm'
                }`}>
                  {msg.content.split('\n').map((line, j) => (
                    <span key={j}>{line}{j < msg.content.split('\n').length - 1 && <br />}</span>
                  ))}
                </div>
                {msg.role === 'user' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 mt-1">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2563EB]/20">
                  <Bot className="h-4 w-4 text-[#2563EB]" />
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 px-4 pb-3">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-400 transition hover:border-[#2563EB]/40 hover:bg-[#2563EB]/10 hover:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-white/10 p-3">
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-[#2563EB]/50 focus:bg-white/10"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563EB] text-white transition hover:bg-[#1d4ed8] disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/30 transition-all hover:scale-110 hover:shadow-xl hover:shadow-[#2563EB]/40"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
