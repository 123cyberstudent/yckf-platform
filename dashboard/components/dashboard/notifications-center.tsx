'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import type { Notification } from '@/lib/types';

export function NotificationsCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications');
        if (!response.ok) {
          throw new Error(`Failed to load notifications: ${response.status}`);
        }
        const data = await response.json();
        const parsed = data.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt),
        }));
        setNotifications(parsed);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return AlertCircle;
      case 'warning':
        return AlertTriangle;
      case 'success':
        return CheckCircle;
      default:
        return Info;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-500/10 border-red-500/20';
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/20';
      case 'success':
        return 'bg-green-500/10 border-green-500/20';
      default:
        return 'bg-blue-500/10 border-blue-500/20';
    }
  };

  const getTextColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'text-red-500';
      case 'warning':
        return 'text-amber-500';
      case 'success':
        return 'text-green-500';
      default:
        return 'text-blue-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications Center</h1>
          <p className="text-muted-foreground mt-1">System alerts and broadcast messages</p>
        </div>
        <Button>Send Broadcast</Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-border">
        <Button variant="ghost" className="border-b-2 border-primary">All</Button>
        <Button variant="ghost">Critical</Button>
        <Button variant="ghost">Warnings</Button>
        <Button variant="ghost">Unread</Button>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="pt-12 pb-12 text-center">
            <CheckCircle className="size-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No notifications</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const Icon = getIcon(notification.type);
            return (
              <Card
                key={notification.id}
                className={`glass-card border ${getColor(notification.type)} cursor-pointer hover:border-primary/50 transition-colors`}
              >
                <CardContent className="pt-6 pb-6">
                  <div className="flex gap-4">
                    <div className={`flex-shrink-0 mt-1 ${getTextColor(notification.type)}`}>
                      <Icon className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{notification.title}</h3>
                          <p className="text-sm text-muted-foreground">{notification.message}</p>
                        </div>
                        <div className="flex-shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                          {notification.createdAt.toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
