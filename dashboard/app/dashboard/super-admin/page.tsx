'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isSuperAdmin } from '@/lib/permissions';
import { DashboardOverview } from '@/components/dashboard/overview';

export default function SuperAdminDashboardPage() {
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
        <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Full system oversight and configuration</p>
      </div>
      <DashboardOverview />
    </div>
  );
}
