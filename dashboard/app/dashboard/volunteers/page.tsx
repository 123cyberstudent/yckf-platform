'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isSuperAdmin } from '@/lib/permissions';
import { InvestigatorsList } from '@/components/dashboard/investigators-list';

export default function VolunteersPage() {
  const router = useRouter();

  useEffect(() => {
    isSuperAdmin().then((allowed) => {
      if (!allowed) {
        router.replace('/dashboard');
      }
    });
  }, [router]);

  return <InvestigatorsList />;
}
