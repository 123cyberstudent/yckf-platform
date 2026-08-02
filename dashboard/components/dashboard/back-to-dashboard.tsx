'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BackToDashboard() {
  const [href, setHref] = useState('/dashboard');

  useEffect(() => {
    let cancelled = false;

    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        const role = (json?.data?.role ?? '').toLowerCase();
        if (role === 'super_admin') setHref('/dashboard/super-admin');
        else if (role === 'admin') setHref('/dashboard/admin');
        else if (role === 'volunteer' || role === 'investigator') setHref('/dashboard/volunteer');
        else if (role) setHref('/dashboard/user-portal');
        else setHref('/login');
      })
      .catch(() => {
        if (!cancelled) setHref('/login');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mb-6">
      <Button asChild variant="outline" className="gap-2">
        <Link href={href}>
          <ArrowLeft className="size-4" />
          Back to Dashboard
        </Link>
      </Button>
    </div>
  );
}
