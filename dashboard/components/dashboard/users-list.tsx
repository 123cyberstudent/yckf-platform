'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Mail, ShieldCheck, UserPlus, AlertCircle } from 'lucide-react';
import type { User } from '@/lib/types';

export function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        setUsingMockData(false);
        
        const response = await fetch('/api/users');
        
        if (!response.ok) {
          // If we get a 401, the API route should already handle it with mock data
          // but we'll handle it here just in case
          if (response.status === 401) {
            console.warn('Authentication required, using mock data');
            setUsingMockData(true);
          }
          throw new Error(`Failed to load users: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check if we're using mock data (you could add a header or flag)
        // For now, we'll check if the data matches our mock data structure
        const parsed = data.map((user: any) => ({
          ...user,
          createdAt: new Date(user.createdAt),
          lastLogin: user.lastLogin ? new Date(user.lastLogin) : null,
        }));
        
        setUsers(parsed);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        setError('Failed to load users. Please try again later.');
        
        // As a last resort, try to fetch from a mock endpoint
        try {
          console.log('Attempting to fetch from mock endpoint...');
          const mockResponse = await fetch('/api/users/mock');
          if (mockResponse.ok) {
            const mockData = await mockResponse.json();
            const parsed = mockData.map((user: any) => ({
              ...user,
              createdAt: new Date(user.createdAt),
              lastLogin: user.lastLogin ? new Date(user.lastLogin) : null,
            }));
            setUsers(parsed);
            setUsingMockData(true);
          }
        } catch (mockError) {
          console.error('Failed to load mock users:', mockError);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery = !query || `${user.name} ${user.email}`.toLowerCase().includes(query);
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const roleColors: Record<string, string> = {
    admin: 'bg-red-500/10 text-red-500',
    investigator: 'bg-blue-500/10 text-blue-500',
    viewer: 'bg-gray-500/10 text-gray-500',
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/10 text-green-500',
    inactive: 'bg-gray-500/10 text-gray-500',
    suspended: 'bg-red-500/10 text-red-500',
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Users</h1>
            <p className="text-muted-foreground mt-1">Manage system users and access control</p>
          </div>
          <Button disabled>
            <UserPlus className="mr-2 size-4" />
            Add User
          </Button>
        </div>
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">
          Loading users...
        </div>
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Users</h1>
            <p className="text-muted-foreground mt-1">Manage system users and access control</p>
          </div>
          <Button disabled>
            <UserPlus className="mr-2 size-4" />
            Add User
          </Button>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-10 text-center">
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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground mt-1">Manage system users and access control</p>
        </div>
        <Button>
          <UserPlus className="mr-2 size-4" />
          Add User
        </Button>
      </div>

      {usingMockData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="size-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">Using Demo Data</p>
            <p className="text-sm text-yellow-700">
              The backend connection is unavailable. Showing sample user data for demonstration purposes.
            </p>
          </div>
        </div>
      )}

      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input 
                placeholder="Search users by name or email" 
                value={search} 
                onChange={(event) => setSearch(event.target.value)} 
                className="pl-10" 
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select 
                value={roleFilter} 
                onChange={(event) => setRoleFilter(event.target.value)} 
                className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="investigator">Investigator</option>
              </select>
              <select 
                value={statusFilter} 
                onChange={(event) => setStatusFilter(event.target.value)} 
                className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">
          {users.length === 0 ? 'No users found.' : 'No users match the current filters.'}
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
                  <th className="px-6 py-3 text-left font-semibold">Last Login</th>
                  <th className="px-6 py-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-3 font-medium">{user.name}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <Mail className="size-4 text-muted-foreground" />
                        <span>{user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant="outline" className={roleColors[user.role]}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant="outline" className={statusColors[user.status]}>
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">
                      {user.lastLogin ? user.lastLogin.toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">Edit</Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          {user.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
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