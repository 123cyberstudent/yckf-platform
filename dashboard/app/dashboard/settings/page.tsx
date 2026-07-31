'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isSuperAdmin } from '@/lib/permissions';

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    isSuperAdmin().then((allowed) => {
      if (!allowed) {
        router.replace('/dashboard');
      }
    });
  }, [router]);
}
