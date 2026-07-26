'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Incident } from '@/lib/types';

export default function IncidentDetailPage() {
  const params = useParams<{ id: string }>();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIncident = async () => {
      try {
        const response = await fetch('/api/incidents');
        if (!response.ok) {
          throw new Error('Unable to load incident');
        }
        const payload = await response.json();
        const found = (payload.items ?? payload).find((item: Incident) => item.id === params.id);
        setIncident(found ?? null);
      } catch (error) {
        console.error('Failed to fetch incident', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIncident();
  }, [params.id]);

  const severityStyles = useMemo(() => ({
    critical: 'bg-red-500/10 text-red-500 border-red-500/20',
    high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  }), []);

  if (loading) {
    return <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">Loading incident…</div>;
  }

  if (!incident) {
    return <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">Incident not found.</div>;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 p-6 md:p-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{incident.title}</h1>
          <p className="mt-1 text-muted-foreground">{incident.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={severityStyles[incident.severity]}>Severity: {incident.severity}</Badge>
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500">Status: {incident.status}</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Investigation Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(incident.notes ?? []).length > 0 ? incident.notes.map((note) => (
              <div key={note.id} className="rounded-lg border border-border bg-background/40 p-4">
                <p className="text-sm text-muted-foreground">{note.authorName}</p>
                <p className="mt-2 text-sm">{note.content}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No notes available yet.</p>}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Incident Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><span className="text-muted-foreground">Reporter:</span> {incident.reportedByName}</div>
            <div><span className="text-muted-foreground">Assigned volunteer:</span> {incident.assignedToName ?? 'Unassigned'}</div>
            <div><span className="text-muted-foreground">Category:</span> {incident.category ?? incident.type}</div>
            <div><span className="text-muted-foreground">Created:</span> {new Date(incident.createdAt).toLocaleString()}</div>
            <div><span className="text-muted-foreground">Updated:</span> {new Date(incident.updatedAt).toLocaleString()}</div>
            <Button className="mt-4 w-full">Update Status</Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
