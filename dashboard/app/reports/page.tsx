'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ReportsPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-10">
        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">Insights & Reports</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white">Operational intelligence for YCKF investigations.</h1>
            <p className="max-w-3xl text-base leading-8 text-muted-foreground">
              Review structured reports that summarize incident trends, volunteer activity, and the outcomes of our cybercrime response efforts.
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {[
            { title: 'Incident Summary', note: 'Daily triage and escalation report' },
            { title: 'Analyst Performance', note: 'Task completion and response timing' },
            { title: 'Evidence Status', note: 'Current inventory and chain-of-custody updates' },
          ].map((item) => (
            <Card key={item.title} className="glass-card">
              <CardContent className="space-y-4 p-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">{item.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{item.note}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Real-Time</Badge>
                  <Badge variant="secondary">Secure</Badge>
                  <Badge variant="secondary">Actionable</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-card">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-2xl font-semibold text-white">Trusted Incident Reporting</h2>
              <p className="text-sm leading-7 text-muted-foreground">
                YCKF reporting aggregates cybercrime cases, identifies patterns, and helps the team prioritize high-impact threats across our community.
              </p>
              <ul className="space-y-3 text-sm leading-7 text-muted-foreground">
                <li>• Secure case summaries for partner review.</li>
                <li>• Clear risk indicators for response teams.</li>
                <li>• Shared reporting for law enforcement collaboration.</li>
              </ul>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-2xl font-semibold text-white">Operational Readiness</h2>
              <p className="text-sm leading-7 text-muted-foreground">
                Use our reporting tools to assess open investigations, agent workload, and service delivery performance for fast decision-making.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-background/70 p-4">
                  <p className="text-sm text-muted-foreground">Open Cases</p>
                  <p className="mt-2 text-3xl font-semibold text-white">24</p>
                </div>
                <div className="rounded-2xl bg-background/70 p-4">
                  <p className="text-sm text-muted-foreground">Resolved This Week</p>
                  <p className="mt-2 text-3xl font-semibold text-white">12</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
