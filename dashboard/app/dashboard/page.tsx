'use client';

import { DashboardOverview } from '@/components/dashboard/overview';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome to YCKF Security Portal</p>
      </div>
      <DashboardOverview />
    </div>
  );
}
