'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getRoleFromCookie } from '@/lib/permissions';
import { ContentManager } from '@/components/dashboard/content-manager';

export default function ContentPage() {
  const router = useRouter();

  useEffect(() => {
    getRoleFromCookie().then((role) => {
      if (role && role !== 'admin' && role !== 'super_admin') {
        router.replace('/dashboard');
      }
    });
  }, [router]);

  return <ContentManager />;
}
