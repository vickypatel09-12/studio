"use client";

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Landmark,
  Calculator,
  Users,
  Banknote,
  FileText,
  Clock,
  ClipboardList,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/deposits', label: 'Monthly Deposits', icon: Banknote },
  { href: '/loans', label: 'Loans & Interest', icon: Landmark },
  { href: '/reports', label: 'Reports', icon: FileText },
  {
    href: '/interest-calculator',
    label: 'Interest Calculation',
    icon: Calculator,
  },
  { href: '/allocation', label: 'Loan Allocation', icon: ClipboardList },
  { href: '/session', label: 'Session Management', icon: Clock },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href}
            tooltip={item.label}
          >
            <Link href={item.href}>
              <item.icon />
              <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
