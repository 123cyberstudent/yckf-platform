'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  BarChart3,
  AlertTriangle,
  Users,
  FileText,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  Shield,
  Globe,
  Ticket,
  ClipboardList,
  Hash,
  Phone,
  AlertCircle,
  MessageSquare,
  BookOpen,
  Receipt,
  Crown,
  Megaphone,
  KeyRound,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getRoleFromCookie, resetCachedRole } from '@/lib/permissions';

export function DashboardSidebar() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    getRoleFromCookie().then(setRole);
  }, []);

  const isActive = (href: string) => {
    if (href === '/dashboard/super-admin' || href === '/dashboard/admin' || href === '/dashboard/volunteer') {
      return pathname === href;
    }
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    resetCachedRole();
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin' || role === 'super_admin';

  const dashboardHref = isSuperAdmin ? '/dashboard/super-admin' : isAdmin ? '/dashboard/admin' : '/dashboard/volunteer';
  const dashboardLabel = isSuperAdmin ? 'Super Admin Dashboard' : isAdmin ? 'Admin Dashboard' : 'Volunteer Dashboard';

  const menuItems = [
    { icon: Home, label: dashboardLabel, href: dashboardHref, roles: ['super_admin', 'admin', 'volunteer'] },
    { icon: BookOpen, label: 'My Portal', href: '/dashboard/user-portal', roles: ['user'] },
    { icon: AlertTriangle, label: 'Report an Incident', href: '/report-a-cybercrime', roles: ['user'] },
    { icon: AlertTriangle, label: 'Incidents', href: '/dashboard/incidents', roles: ['super_admin', 'admin', 'volunteer'] },
    { icon: FileText, label: 'Evidence Vault', href: '/dashboard/evidence', roles: ['super_admin', 'admin', 'volunteer'] },
    { icon: BarChart3, label: 'Analytics', href: '/dashboard/analytics', roles: ['super_admin', 'admin', 'volunteer'] },
    { icon: Bell, label: 'Notifications', href: '/dashboard/notifications', roles: ['super_admin', 'admin', 'volunteer', 'user'] },
  ];

  const adminOnlyItems = [
    { icon: Users, label: 'Members', href: '/dashboard/members' },
    { icon: Hash, label: 'Site Stats', href: '/dashboard/site-stats' },
    { icon: Receipt, label: 'Orders', href: '/dashboard/orders' },
    { icon: Crown, label: 'Subscriptions', href: '/dashboard/subscriptions' },
    { icon: AlertCircle, label: 'Emergency Reports', href: '/dashboard/emergencies' },
    { icon: Smartphone, label: 'Protected Devices', href: '/dashboard/devices' },
    { icon: Phone, label: 'Bookings', href: '/dashboard/bookings' },
    { icon: Users, label: 'Specialists', href: '/dashboard/specialists' },
    { icon: MessageSquare, label: 'Enquiries', href: '/dashboard/enquiries' },
    { icon: Shield, label: 'SIEM Platform', href: '/dashboard/siem' },
    { icon: ClipboardList, label: 'Login Logs', href: '/dashboard/login-logs' },
  ];

  const superAdminItems = [
    { icon: Globe, label: 'Content Manager', href: '/dashboard/content' },
    { icon: Ticket, label: 'Coupons', href: '/dashboard/coupons' },
    { icon: Megaphone, label: 'Promotions', href: '/dashboard/promotions' },
    { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
    { icon: Users, label: 'Users', href: '/dashboard/users' },
    { icon: KeyRound, label: 'Password Reset Requests', href: '/dashboard/password-reset-requests' },
    { icon: BarChart3, label: 'Volunteer Stats', href: '/dashboard/volunteer-stats' },
  ];

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50 bg-white border border-gray-200 shadow-sm"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      <div
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity md:hidden ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setOpen(false)}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 transform overflow-hidden bg-white border-r border-gray-200 transition-transform duration-300 md:static md:translate-x-0 md:w-64 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="h-full flex flex-col">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/companylogo.png"
                alt="YCKF"
                className="size-10 rounded-xl object-cover shadow-sm"
              />
              <div className="flex flex-col">
                <span className="font-bold text-gray-900 tracking-tight">YCKF</span>
                <span className="text-xs text-gray-400 font-medium">Security Portal</span>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Menu
            </p>
            <div className="space-y-1">
              {menuItems.filter((item) => role && item.roles.includes(role)).map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors border-l-[3px] pl-[9px] ${
                      active
                        ? 'bg-blue-50 text-[#2563EB] border-[#2563EB]'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-transparent'
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
            {isAdmin && (
              <>
                <p className="px-3 mt-5 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Admin
                </p>
                <div className="space-y-1">
                  {adminOnlyItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors border-l-[3px] pl-[9px] ${
                          active
                            ? 'bg-blue-50 text-[#2563EB] border-[#2563EB]'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-transparent'
                        }`}
                        onClick={() => setOpen(false)}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
            {isSuperAdmin && (
              <>
                <p className="px-3 mt-5 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Super Admin
                </p>
                <div className="space-y-1">
                  {superAdminItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors border-l-[3px] pl-[9px] ${
                          active
                            ? 'bg-blue-50 text-[#2563EB] border-[#2563EB]'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-transparent'
                        }`}
                        onClick={() => setOpen(false)}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </nav>

          <div className="p-3 border-t border-gray-100">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start gap-3 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
            >
              <LogOut className="size-4" />
              <span className="text-sm font-medium">Logout</span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
