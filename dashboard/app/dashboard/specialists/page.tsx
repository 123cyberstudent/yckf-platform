'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAdmin } from '@/lib/permissions';
import { SpecialistsList } from '@/components/dashboard/specialists-list';

export default function SpecialistsPage() {
  const router = useRouter();

  useEffect(() => {
    isAdmin().then((allowed) => {
      if (!allowed) {
        router.replace('/dashboard');
      }
    });
  }, [router]);

  return <SpecialistsList />;
}
