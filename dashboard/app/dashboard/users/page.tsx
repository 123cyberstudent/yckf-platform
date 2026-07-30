'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isSuperAdmin } from '@/lib/permissions';
import { UsersList } from '@/components/dashboard/users-list';

export default function UsersPage() {
  const router = useRouter();

  useEffect(() => {
    isSuperAdmin().then((allowed) => {
      if (!allowed) {
        router.replace('/dashboard');
      }
    });
  }, [router]);

  return <UsersList />;
}
