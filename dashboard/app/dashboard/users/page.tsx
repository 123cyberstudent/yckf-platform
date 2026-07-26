'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getRoleFromCookie } from '@/lib/permissions';
import { UsersList } from '@/components/dashboard/users-list';

export default function UsersPage() {
  const router = useRouter();

  useEffect(() => {
    getRoleFromCookie().then((role) => {
      if (role && role !== 'admin') {
        router.replace('/dashboard');
      }
    });
  }, [router]);

  return <UsersList />;
}
