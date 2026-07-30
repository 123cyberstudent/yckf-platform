'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getRoleFromCookie } from '@/lib/permissions';
import { Settings } from '@/components/dashboard/settings';

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    getRoleFromCookie().then((role) => {
      if (role && role !== 'admin' && role !== 'super_admin') {
        router.replace('/dashboard');
      }
    });
  }, [router]);

  return <Settings />;
}
