'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Lock, Bell, Eye, Shield } from 'lucide-react';

export function Settings() {
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
          <div>
            <label className="text-sm font-medium">Full Name</label>
            <Input defaultValue="Sarah Chen" className="mt-2" />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input defaultValue="admin@yckf.org" className="mt-2" disabled />
          </div>
          <div>
            <label className="text-sm font-medium">Current Password</label>
            <Input type="password" className="mt-2" />
          </div>
          <div>
            <label className="text-sm font-medium">New Password</label>
            <Input type="password" className="mt-2" />
          </div>
          <Button>Update Account</Button>
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
            <Badge variant="outline" className="bg-green-500/10 text-green-500">Enabled</Badge>
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
          <div>
            <label className="text-sm font-medium">Timezone</label>
            <select className="w-full mt-2 px-3 py-2 bg-input border border-border rounded-md">
              <option>UTC</option>
              <option>EST</option>
              <option>CST</option>
              <option>MST</option>
              <option>PST</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Date Format</label>
            <select className="w-full mt-2 px-3 py-2 bg-input border border-border rounded-md">
              <option>MM/DD/YYYY</option>
              <option>DD/MM/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
          </div>
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <p className="font-medium">Dark Mode</p>
              <p className="text-sm text-muted-foreground">Always enabled</p>
            </div>
            <Badge variant="outline" className="bg-green-500/10 text-green-500">On</Badge>
          </div>
          <Button>Save Changes</Button>
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
            { name: 'Slack', status: 'Connected', color: 'text-blue-500' },
            { name: 'Email Service', status: 'Connected', color: 'text-green-500' },
            { name: 'SIEM Platform', status: 'Not Connected', color: 'text-red-500' },
          ].map((integration) => (
            <div key={integration.name} className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <p className="font-medium">{integration.name}</p>
                <p className={`text-sm ${integration.color}`}>{integration.status}</p>
              </div>
              <Button variant="outline" size="sm">Configure</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Audit Log */}
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
