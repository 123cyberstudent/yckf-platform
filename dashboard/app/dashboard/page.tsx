'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getRoleFromCookie } from '@/lib/permissions';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    getRoleFromCookie().then((role) => {
      if (role === 'super_admin') {
        router.replace('/dashboard/super-admin');
      } else if (role === 'admin') {
        router.replace('/dashboard/admin');
      } else if (role === 'volunteer' || role === 'investigator') {
        router.replace('/dashboard/volunteer');
      } else if (role === null) {
        router.replace('/login');
      } else {
        router.replace('/dashboard/user-portal');
      }
    });
  }, [router]);

  return null;
}
