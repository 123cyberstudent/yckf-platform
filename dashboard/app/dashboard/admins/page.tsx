'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isSuperAdmin } from '@/lib/permissions';
import { AdminsList } from '@/components/dashboard/admins-list';

export default function AdminsPage() {
  const router = useRouter();

  useEffect(() => {
    isSuperAdmin().then((allowed) => {
      if (!allowed) {
        router.replace('/dashboard');
      }
    });
  }, [router]);

  return <AdminsList />;
}
