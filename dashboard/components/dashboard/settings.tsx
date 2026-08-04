'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Lock, Bell, Eye, Shield, Mail, Clock, Copy, Check } from 'lucide-react';

interface User {
  id: string;
  fullName: string;
  email: string;
  role?: string;
}

interface ActivityLog {
  id: number;
  action: string;
  ipAddress: string;
  userAgent?: string;
  timestamp: string;
}

export function Settings() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountSuccess, setAccountSuccess] = useState('');
  const [accountError, setAccountError] = useState('');

  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [twoFaError, setTwoFaError] = useState('');
  const [twoFaSetup, setTwoFaSetup] = useState<{ secret: string; otpauthUrl: string; qrCodeDataURL: string } | null>(null);
  const [twoFaVerifyCode, setTwoFaVerifyCode] = useState('');
  const [twoFaVerifyLoading, setTwoFaVerifyLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [siemConnected, setSiemConnected] = useState(false);
  const [siemLoading, setSiemLoading] = useState(true);

  const [emailConnected, setEmailConnected] = useState(false);

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

  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);

  useEffect(() => {
    const init = async () => {
      let userId: string | null = null;
      try {
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const me = await meRes.json();
          userId = me.id?.toString() ?? null;
          const user: User = {
            id: userId ?? '1',
            fullName: me.fullName || me.name || 'User',
            email: me.email || '',
            role: me.role,
          };
          setCurrentUser(user);
          setFullName(user.fullName);
        } else {
          setCurrentUser(null);
        }
      } catch {
        setCurrentUser(null);
      }

      try {
        const faRes = await fetch('/api/auth/2fa');
        if (faRes.ok) {
          const fa = await faRes.json();
          setTwoFaEnabled(!!(fa.twoFactorEnabled ?? fa.twoFaEnabled ?? fa.enabled));
        }
      } catch { /* ignore */ }

      try {
        const siemRes = await fetch('/api/siem/status');
        if (siemRes.ok) {
          const siem = await siemRes.json();
          setSiemConnected(!!siem.connected);
        }
      } catch { /* ignore */ }
      finally { setSiemLoading(false); }

      try {
        const emailRes = await fetch('/api/email/status');
        if (emailRes.ok) {
          const email = await emailRes.json();
          setEmailConnected(!!email.configured);
        }
      } catch {
        setEmailConnected(false);
      }

      try {
        const qs = userId ? `?limit=5&userId=${encodeURIComponent(userId)}` : '?limit=5';
        const logsRes = await fetch(`/api/audit/logs${qs}`);
        if (logsRes.ok) {
          const logs = await logsRes.json();
          const items = Array.isArray(logs) ? logs : logs.auditLogs;
          setRecentActivity(Array.isArray(items) ? items.slice(0, 5) : []);
        }
      } catch { /* ignore */ }

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
          throw new Error(body.error || body.message || 'Failed to change password');
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
    setTwoFaError('');
    setTwoFaLoading(true);
    try {
      if (twoFaEnabled) {
        const res = await fetch('/api/auth/2fa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'disable' }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || data.message || 'Failed to disable 2FA');
        setTwoFaEnabled(false);
      } else {
        const res = await fetch('/api/auth/2fa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'enable' }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || data.message || 'Failed to start 2FA setup');
        if (!data.secret || !data.qrCodeDataURL) throw new Error('Invalid 2FA setup response');
        setTwoFaSetup(data);
        setTwoFaVerifyCode('');
      }
    } catch (error: any) {
      setTwoFaError(error.message || 'Failed to toggle 2FA');
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    setTwoFaError('');
    setTwoFaVerifyLoading(true);
    try {
      const res = await fetch('/api/auth/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', token: twoFaVerifyCode.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Invalid verification code');
      setTwoFaEnabled(true);
      setTwoFaSetup(null);
      setTwoFaVerifyCode('');
    } catch (error: any) {
      setTwoFaError(error.message || 'Failed to verify 2FA code');
    } finally {
      setTwoFaVerifyLoading(false);
    }
  };

  const handleCopySecret = async () => {
    if (twoFaSetup?.secret && navigator.clipboard) {
      await navigator.clipboard.writeText(twoFaSetup.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
    } finally { setSystemSaving(false); }
  };

  const formatActivity = (log: ActivityLog) => {
    const actionMap: Record<string, string> = {
      login: 'Login',
      logout: 'Logout',
      register: 'Registration',
      password_change: 'Password Changed',
      password_reset: 'Password Reset',
      create: 'Record Created',
      update: 'Record Updated',
      delete: 'Record Deleted',
    };
    const action = actionMap[log.action] || log.action;
    const timeAgo = getTimeAgo(log.timestamp);
    return { action, timeAgo, ip: log.ipAddress || 'Unknown' };
  };

  const getTimeAgo = (timestamp: string) => {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
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
            <Input value={currentUser?.email || ''} className="mt-2" disabled />
          </div>
          <div>
            <label className="text-sm font-medium">Role</label>
            <Input value={currentUser?.role || 'User'} className="mt-2" disabled />
          </div>
          <div>
            <label className="text-sm font-medium">Current Password</label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-2"
              placeholder="Leave blank if not changing"
            />
          </div>
          <div>
            <label className="text-sm font-medium">New Password</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-2"
              placeholder="Enter new password"
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
          {twoFaError && (
            <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              {twoFaError}
            </div>
          )}

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
              <option value="Africa/Accra">Africa/Accra (GMT)</option>
              <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
              <option value="EST">EST</option>
              <option value="CST">CST</option>
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
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
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
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="size-5 text-primary" />
              <div>
                <p className="font-medium">Email Service</p>
                <p className={`text-sm ${emailConnected ? 'text-green-500' : 'text-amber-500'}`}>
                  {emailConnected ? 'SMTP Configured' : 'Using Log Fallback (No SMTP)'}
                </p>
              </div>
            </div>
            <Badge variant="outline" className={emailConnected ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}>
              {emailConnected ? 'Connected' : 'Not Configured'}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="size-5 text-primary" />
              <div>
                <p className="font-medium">SIEM Platform</p>
                <p className={`text-sm ${siemConnected ? 'text-green-500' : 'text-red-500'}`}>
                  {siemLoading ? 'Checking...' : siemConnected ? 'Connected' : 'Not Connected'}
                </p>
              </div>
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
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Your account activity log</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No recent activity found.</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((log) => {
                const { action, timeAgo, ip } = formatActivity(log);
                return (
                  <div key={log.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <p className="font-medium">{action}</p>
                      <p className="text-sm text-muted-foreground">{ip}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{timeAgo}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!twoFaSetup} onOpenChange={(open) => { if (!open) { setTwoFaSetup(null); setTwoFaError(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app, then enter the 6-digit code to confirm.
            </DialogDescription>
          </DialogHeader>
          {twoFaSetup && (
            <div className="space-y-4">
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={twoFaSetup.qrCodeDataURL} alt="2FA QR code" className="size-48 rounded-md border border-border" />
              </div>
              <div className="flex items-center justify-between gap-2 p-3 rounded-md border border-border bg-muted/50">
                <code className="text-sm break-all">{twoFaSetup.secret}</code>
                <Button variant="outline" size="icon" onClick={handleCopySecret} aria-label="Copy secret">
                  {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                </Button>
              </div>
              {twoFaError && (
                <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                  {twoFaError}
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Verification Code</label>
                <Input
                  value={twoFaVerifyCode}
                  onChange={(e) => setTwoFaVerifyCode(e.target.value)}
                  className="mt-2"
                  placeholder="6-digit code"
                  maxLength={6}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTwoFaSetup(null); setTwoFaError(''); }}>Cancel</Button>
            <Button onClick={handleVerify2FA} disabled={twoFaVerifyLoading || twoFaVerifyCode.trim().length < 6}>
              {twoFaVerifyLoading ? 'Verifying...' : 'Verify & Enable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
