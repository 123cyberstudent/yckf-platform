'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, AlertTriangle, Info, CheckCircle, Send } from 'lucide-react';
import type { Notification, NotificationPriority } from '@/lib/types';

type FilterTab = 'all' | 'critical' | 'warnings' | 'unread';

export function NotificationsCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastPriority, setBroadcastPriority] = useState<NotificationPriority>('normal');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      if (!response.ok) throw new Error(`Failed to load notifications: ${response.status}`);
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

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    switch (activeTab) {
      case 'critical':
        return n.priority === 'urgent' || n.priority === 'high' || n.type === 'alert';
      case 'warnings':
        return n.type === 'notice' || n.type === 'awareness';
      case 'unread':
        return !n.read;
      default:
        return true;
    }
  });

  const handleSendBroadcast = async () => {
    setSendError('');
    setSendSuccess(false);
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      setSendError('Title and message are required.');
      return;
    }
    setSending(true);
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: broadcastTitle,
          message: broadcastMessage,
          priority: broadcastPriority,
        }),
      });
      if (!response.ok) throw new Error(`Failed to send: ${response.status}`);
      setSendSuccess(true);
      setBroadcastTitle('');
      setBroadcastMessage('');
      setBroadcastPriority('normal');
      await fetchNotifications();
      setTimeout(() => {
        setBroadcastOpen(false);
        setSendSuccess(false);
      }, 1500);
    } catch (error: any) {
      setSendError(error.message || 'Failed to send broadcast.');
    } finally {
      setSending(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', { method: 'PATCH' });
      if (!response.ok) throw new Error(`Failed: ${response.status}`);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      if (!response.ok) throw new Error(`Failed: ${response.status}`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert':
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
      case 'alert':
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
      case 'alert':
        return 'text-red-500';
      case 'warning':
        return 'text-amber-500';
      case 'success':
        return 'text-green-500';
      default:
        return 'text-blue-500';
    }
  };

  const tabClass = (tab: FilterTab) =>
    `border-b-2 ${activeTab === tab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications Center</h1>
          <p className="text-muted-foreground mt-1">System alerts and broadcast messages</p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <Badge variant="outline" className="bg-primary/10 text-primary">
              {unreadCount} unread
            </Badge>
          )}
          <Button variant="outline" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
            Mark All Read
          </Button>
          <Button onClick={() => setBroadcastOpen(true)}>
            <Send className="size-4 mr-2" />
            Send Broadcast
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-border">
        {([
          ['all', 'All'],
          ['critical', 'Critical'],
          ['warnings', 'Warnings'],
          ['unread', 'Unread'],
        ] as const).map(([tab, label]) => (
          <Button
            key={tab}
            variant="ghost"
            className={tabClass(tab)}
            onClick={() => setActiveTab(tab)}
          >
            {label}
            {tab === 'unread' && unreadCount > 0 && (
              <Badge variant="outline" className="ml-2 bg-primary/10 text-primary text-xs">
                {unreadCount}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading notifications...</div>
      ) : filteredNotifications.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="pt-12 pb-12 text-center">
            <CheckCircle className="size-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No notifications</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const Icon = getIcon(notification.type);
            return (
              <Card
                key={notification.id}
                onClick={() => !notification.read && handleMarkRead(notification.id)}
                className={`glass-card border ${getColor(notification.type)} cursor-pointer hover:border-primary/50 transition-colors ${!notification.read ? 'ring-1 ring-primary/30' : ''}`}
              >
                <CardContent className="pt-6 pb-6">
                  <div className="flex gap-4">
                    <div className={`flex-shrink-0 mt-1 ${getTextColor(notification.type)}`}>
                      <Icon className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{notification.title}</h3>
                            {!notification.read && (
                              <span className="size-2 rounded-full bg-primary inline-block" />
                            )}
                          </div>
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

      {/* Broadcast Dialog */}
      {broadcastOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setBroadcastOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md mx-4 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold">Send Broadcast</h2>
            <p className="text-sm text-muted-foreground">Send a notification to all users.</p>

            {sendSuccess && (
              <div className="p-3 rounded-md bg-green-500/10 border border-green-500/20 text-green-500 text-sm">
                Broadcast sent successfully!
              </div>
            )}
            {sendError && (
              <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                {sendError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Title</label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-md text-sm"
                  placeholder="Broadcast title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Message</label>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-md text-sm min-h-[80px]"
                  placeholder="Broadcast message..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Priority</label>
                <select
                  value={broadcastPriority}
                  onChange={(e) => setBroadcastPriority(e.target.value as NotificationPriority)}
                  className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-md text-sm"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Critical</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setBroadcastOpen(false)} disabled={sending}>
                Cancel
              </Button>
              <Button onClick={handleSendBroadcast} disabled={sending}>
                {sending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
