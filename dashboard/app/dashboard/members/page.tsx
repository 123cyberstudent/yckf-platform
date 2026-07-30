'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getRoleFromCookie } from '@/lib/permissions';
import { MembersList } from '@/components/dashboard/members-list';

export default function MembersPage() {
  const router = useRouter();

  useEffect(() => {
    getRoleFromCookie().then((role) => {
      if (role && role !== 'admin' && role !== 'super_admin') {
        router.replace('/dashboard');
      }
    });
  }, [router]);

  return <MembersList />;
}
