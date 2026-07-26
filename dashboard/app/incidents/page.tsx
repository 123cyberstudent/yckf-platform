'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function IncidentsPage() {
  return (
    <main className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Incident Management</h1>
          <p className="mt-2 text-muted-foreground">
            Review the latest cybersecurity incidents, assign response owners, and monitor case progress.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: 'Critical Alerts', value: '8', detail: 'Need immediate review' },
            { title: 'Open Cases', value: '24', detail: 'Awaiting volunteer action' },
            { title: 'Resolved This Week', value: '12', detail: 'Recovered with monitoring' },
          ].map((item) => (
            <Card key={item.title} className="glass-card">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">{item.title}</p>
                <p className="mt-2 text-2xl font-semibold">{item.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="glass-card">
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Latest Incident Activity</h2>
                <p className="text-sm text-muted-foreground">Volunteers are actively tracking logged threats and containment steps.</p>
              </div>
              <Link href="/dashboard/incidents">
                <Button>Open Operations Console</Button>
              </Link>
            </div>
            <div className="rounded-lg border border-border bg-background/40 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Critical</Badge>
                <span className="text-sm font-medium">Suspicious login spike</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">A sudden increase in MFA failures triggered a review of login anomalies and account protection controls.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}