'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield, Menu, X } from 'lucide-react';

const links = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/team', label: 'Volunteers' },
  { href: '/news', label: 'News' },
  { href: '/events', label: 'Events' },
  { href: '/courses', label: 'Courses' },
  { href: '/resources', label: 'Resources' },
  { href: '/contact', label: 'Contact' },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-gray-200 bg-white px-4 py-3 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#06292D]">
            <Shield className="h-5 w-5 text-[#2DD4BF]" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-[#111827]">YCKF</span>
            <span className="text-[11px] leading-tight text-[#6B7280]">Young Cyber Knights Foundation</span>
          </div>
        </Link>

        <button
          type="button"
          className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-2 text-[#6B7280] transition hover:bg-gray-50 hover:text-[#111827] md:hidden"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>

        <nav className={`absolute left-0 right-0 top-full z-30 mt-2 rounded-xl border border-gray-200 bg-white p-4 shadow-lg transition-all duration-200 md:static md:mt-0 md:flex md:w-auto md:flex-row md:items-center md:gap-6 md:border-0 md:bg-transparent md:p-0 md:shadow-none ${open ? 'block' : 'hidden'}`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[#6B7280] transition hover:text-[#2563EB]"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4 md:mt-0 md:flex-row md:border-t-0 md:pt-0">
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-full border border-[#2563EB] bg-transparent px-5 py-2 text-sm font-semibold text-[#2563EB] transition hover:bg-[#2563EB] hover:text-white md:w-auto"
              onClick={() => setOpen(false)}
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="inline-flex w-full items-center justify-center rounded-full bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] md:w-auto"
              onClick={() => setOpen(false)}
            >
              Sign Up
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
