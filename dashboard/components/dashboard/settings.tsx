'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Lock, Bell, Eye, Shield } from 'lucide-react';

interface User {
  id: string;
  fullName: string;
  email: string;
}

export function Settings() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Account fields
  const [fullName, setFullName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountSuccess, setAccountSuccess] = useState('');
  const [accountError, setAccountError] = useState('');

  // 2FA
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [twoFaLoading, setTwoFaLoading] = useState(false);

  // SIEM integration
  const [siemConnected, setSiemConnected] = useState(false);
  const [siemLoading, setSiemLoading] = useState(true);

  // System settings
  const [timezone, setTimezone] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('settings_timezone') || 'UTC';
    return 'UTC';
  });
  const [dateFormat, setDateFormat] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('settings_dateFormat') || 'MM/DD/YYYY';
    return 'MM/DD/YYYY';
  });
  const [systemSuccess, setSystemSuccess] = useState('');
  const [systemSaving, setSystemSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const me = await meRes.json();
          const user: User = { id: me.id, fullName: me.fullName || me.name || '', email: me.email || '' };
          setCurrentUser(user);
          setFullName(user.fullName);
        } else {
          setCurrentUser({ id: '1', fullName: 'Admin User', email: 'yckfadmin@youngcyberknightsfoundation.org' });
          setFullName('Admin User');
        }
      } catch {
        setCurrentUser({ id: '1', fullName: 'Admin User', email: 'yckfadmin@youngcyberknightsfoundation.org' });
        setFullName('Admin User');
      }

      try {
        const faRes = await fetch('/api/auth/2fa/status');
        if (faRes.ok) {
          const fa = await faRes.json();
          setTwoFaEnabled(!!fa.enabled);
        }
      } catch {
        setTwoFaEnabled(false);
      }

      try {
        const siemRes = await fetch('/api/siem/status');
        if (siemRes.ok) {
          const siem = await siemRes.json();
          setSiemConnected(!!siem.connected);
        }
      } catch {
        setSiemConnected(false);
      } finally {
        setSiemLoading(false);
      }

      setLoading(false);
    };
    init();
  }, []);

  const handleUpdateAccount = async () => {
    setAccountError('');
    setAccountSuccess('');
    setAccountLoading(true);

    try {
      if (currentUser && fullName !== currentUser.fullName) {
        const res = await fetch(`/api/users/${currentUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName }),
        });
        if (!res.ok) throw new Error('Failed to update name');
        setCurrentUser((prev) => (prev ? { ...prev, fullName } : prev));
      }

      if (currentPassword && newPassword) {
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || 'Failed to change password');
        }
        setCurrentPassword('');
        setNewPassword('');
      }

      setAccountSuccess('Account updated successfully.');
      setTimeout(() => setAccountSuccess(''), 3000);
    } catch (error: any) {
      setAccountError(error.message || 'Failed to update account.');
    } finally {
      setAccountLoading(false);
    }
  };

  const handleToggle2FA = async () => {
    setTwoFaLoading(true);
    try {
      const endpoint = twoFaEnabled ? '/api/auth/2fa/disable' : '/api/auth/2fa/enable';
      const res = await fetch(endpoint, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to toggle 2FA');
      setTwoFaEnabled(!twoFaEnabled);
    } catch {
      // silently fail
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleSaveSystem = async () => {
    setSystemSaving(true);
    setSystemSuccess('');
    try {
      localStorage.setItem('settings_timezone', timezone);
      localStorage.setItem('settings_dateFormat', dateFormat);
      setSystemSuccess('System settings saved.');
      setTimeout(() => setSystemSuccess(''), 3000);
    } finally {
      setSystemSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">System configuration and preferences</p>
      </div>

      {/* Account Settings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>Manage your profile and account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accountSuccess && (
            <div className="p-3 rounded-md bg-green-500/10 border border-green-500/20 text-green-500 text-sm">
              {accountSuccess}
            </div>
          )}
          {accountError && (
            <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              {accountError}
            </div>
          )}
          <div>
            <label className="text-sm font-medium">Full Name</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input defaultValue={currentUser?.email || ''} className="mt-2" disabled />
          </div>
          <div>
            <label className="text-sm font-medium">Current Password</label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">New Password</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-2"
            />
          </div>
          <Button onClick={handleUpdateAccount} disabled={accountLoading}>
            {accountLoading ? 'Updating...' : 'Update Account'}
          </Button>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            Security & Privacy
          </CardTitle>
          <CardDescription>Manage security and privacy preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <Lock className="size-5 text-primary" />
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggle2FA}
              disabled={twoFaLoading}
              className={twoFaEnabled ? 'bg-green-500/10 text-green-500 hover:bg-red-500/10 hover:text-red-500' : ''}
            >
              {twoFaLoading ? '...' : twoFaEnabled ? 'Disable' : 'Enable'}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <Eye className="size-5 text-primary" />
              <div>
                <p className="font-medium">Session Timeout</p>
                <p className="text-sm text-muted-foreground">Automatically logout after 30 minutes</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500">30 min</Badge>
          </div>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="size-5 text-primary" />
              <div>
                <p className="font-medium">Security Alerts</p>
                <p className="text-sm text-muted-foreground">Get notified of suspicious activity</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-green-500/10 text-green-500">Enabled</Badge>
          </div>
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
          <CardDescription>Configure system-wide preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {systemSuccess && (
            <div className="p-3 rounded-md bg-green-500/10 border border-green-500/20 text-green-500 text-sm">
              {systemSuccess}
            </div>
          )}
          <div>
            <label className="text-sm font-medium">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full mt-2 px-3 py-2 bg-input border border-border rounded-md"
            >
              <option value="UTC">UTC</option>
              <option value="EST">EST</option>
              <option value="CST">CST</option>
              <option value="MST">MST</option>
              <option value="PST">PST</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Date Format</label>
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              className="w-full mt-2 px-3 py-2 bg-input border border-border rounded-md"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <p className="font-medium">Dark Mode</p>
              <p className="text-sm text-muted-foreground">Always enabled</p>
            </div>
            <Badge variant="outline" className="bg-green-500/10 text-green-500">On</Badge>
          </div>
          <Button onClick={handleSaveSystem} disabled={systemSaving}>
            {systemSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Third-party service integrations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { name: 'Slack', status: 'Connected', color: 'text-green-500' },
            { name: 'Email Service', status: 'Connected', color: 'text-green-500' },
          ].map((integration) => (
            <div key={integration.name} className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <p className="font-medium">{integration.name}</p>
                <p className={`text-sm ${integration.color}`}>{integration.status}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  alert('Coming soon');
                }}
              >
                Configure
              </Button>
            </div>
          ))}
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <p className="font-medium">SIEM Platform</p>
              <p className={`text-sm ${siemConnected ? 'text-green-500' : 'text-red-500'}`}>
                {siemLoading ? 'Checking...' : siemConnected ? 'Connected' : 'Not Connected'}
              </p>
            </div>
            <Link href="/dashboard/siem">
              <Button variant="outline" size="sm">
                View Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your account activity log</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { action: 'Login', time: '2 hours ago', ip: '192.168.1.1' },
              { action: 'Password changed', time: '5 days ago', ip: '192.168.1.1' },
              { action: 'Two-factor enabled', time: '10 days ago', ip: '192.168.1.1' },
            ].map((activity) => (
              <div key={`${activity.action}-${activity.time}`} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="font-medium">{activity.action}</p>
                  <p className="text-sm text-muted-foreground">{activity.ip}</p>
                </div>
                <p className="text-sm text-muted-foreground">{activity.time}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
