'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SiteNav } from '@/components/site-nav';

export function PublicNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith('/dashboard');
  const isApi = pathname.startsWith('/api');
  const isPublic = !isDashboard && !isApi;

  if (!isPublic) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteNav />
      {pathname !== '/' && (
        <div className="mx-auto w-full max-w-7xl px-6 py-3 sm:px-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-base font-semibold text-[#374151] transition hover:text-[#2563EB]"
          >
            <ArrowLeft className="size-4" />
            Back to Home
          </Link>
        </div>
      )}
      {children}
    </>
  );
}
