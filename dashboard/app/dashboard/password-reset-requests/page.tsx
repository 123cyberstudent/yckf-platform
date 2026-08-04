'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isSuperAdmin } from '@/lib/permissions';
import { PasswordResetRequestsList } from '@/components/dashboard/password-reset-requests-list';

export default function PasswordResetRequestsPage() {
  const router = useRouter();

  useEffect(() => {
    isSuperAdmin().then((allowed) => {
      if (!allowed) {
        router.replace('/dashboard');
      }
    });
  }, [router]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Password Reset Requests</h1>
        <p className="text-muted-foreground mt-1">
          Review requests from volunteers and secondary admins who forgot their email or password,
          then approve a reset link or temporary password.
        </p>
      </div>
      <PasswordResetRequestsList />
    </div>
  );
}
