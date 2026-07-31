'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAdmin } from '@/lib/permissions';
import { DashboardOverview } from '@/components/dashboard/overview';

export default function AdminDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    isAdmin().then((allowed) => {
      if (!allowed) {
        router.replace('/login');
      }
    });
  }, [router]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin (Secondary Admin) Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage day-to-day operations</p>
      </div>
      <DashboardOverview />
    </div>
  );
}
