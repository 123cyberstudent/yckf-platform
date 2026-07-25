'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, User, Mail, Calendar, AlertCircle } from 'lucide-react';

interface Investigator {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'investigator';
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  lastLogin: Date | null;
}

export function InvestigatorsList() {
  const [investigators, setInvestigators] = useState<Investigator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchInvestigators = async () => {
      try {
        setLoading(true);
        setError(null);
        setUsingMockData(false);
        
        const response = await fetch('/api/investigators');
        
        if (!response.ok) {
          if (response.status === 401 || response.status === 404) {
            console.warn('Authentication required, using mock data');
            setUsingMockData(true);
          }
          throw new Error(`Failed to load investigators: ${response.status}`);
        }
        
        const data = await response.json();
        const parsed = data.map((inv: any) => ({
          ...inv,
          createdAt: new Date(inv.createdAt),
          lastLogin: inv.lastLogin ? new Date(inv.lastLogin) : null,
        }));
        setInvestigators(parsed);
      } catch (error) {
        console.error('Failed to fetch investigators:', error);
        setError('Failed to load investigators. Please try again later.');
        
        // Try to load from mock endpoint as fallback
        try {
          console.log('Attempting to fetch from mock endpoint...');
          const mockResponse = await fetch('/api/investigators/mock');
          if (mockResponse.ok) {
            const mockData = await mockResponse.json();
            const parsed = mockData.map((inv: any) => ({
              ...inv,
              createdAt: new Date(inv.createdAt),
              lastLogin: inv.lastLogin ? new Date(inv.lastLogin) : null,
            }));
            setInvestigators(parsed);
            setUsingMockData(true);
          }
        } catch (mockError) {
          console.error('Failed to load mock investigators:', mockError);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchInvestigators();
  }, []);

  const filteredInvestigators = investigators.filter(inv => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return `${inv.name} ${inv.email}`.toLowerCase().includes(query);
  });

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/10 text-green-500',
    inactive: 'bg-gray-500/10 text-gray-500',
    suspended: 'bg-red-500/10 text-red-500',
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Investigators</h2>
            <p className="text-muted-foreground">Manage investigation team members</p>
          </div>
          <Button disabled>Add Investigator</Button>
        </div>
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">
          Loading investigators...
        </div>
      </div>
    );
  }

  if (error && investigators.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Investigators</h2>
            <p className="text-muted-foreground">Manage investigation team members</p>
          </div>
          <Button disabled>Add Investigator</Button>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="mx-auto size-12 text-red-500 mb-4" />
          <p className="text-red-600">{error}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Investigators</h2>
          <p className="text-muted-foreground">Manage investigation team members</p>
        </div>
        <Button>
          <User className="mr-2 size-4" />
          Add Investigator
        </Button>
      </div>

      {usingMockData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="size-4 text-yellow-600 mt-0.5" />
          <p className="text-sm text-yellow-700">
            Using demo investigator data - Backend connection unavailable
          </p>
        </div>
      )}

      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              placeholder="Search investigators by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {filteredInvestigators.length === 0 ? (
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">
          {investigators.length === 0 
            ? 'No investigators found.' 
            : 'No investigators match the current search.'}
        </div>
      ) : (
        <Card className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Name</th>
                  <th className="px-6 py-3 text-left font-semibold">Email</th>
                  <th className="px-6 py-3 text-left font-semibold">Role</th>
                  <th className="px-6 py-3 text-left font-semibold">Status</th>
                  <th className="px-6 py-3 text-left font-semibold">Joined</th>
                  <th className="px-6 py-3 text-left font-semibold">Last Login</th>
                  <th className="px-6 py-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvestigators.map((inv) => (
                  <tr key={inv.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-3 font-medium">{inv.name}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <Mail className="size-4 text-muted-foreground" />
                        <span>{inv.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-500">
                        {inv.role.charAt(0).toUpperCase() + inv.role.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant="outline" className={statusColors[inv.status]}>
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">
                      {inv.createdAt.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">
                      {inv.lastLogin ? inv.lastLogin.toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">Edit</Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          {inv.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}