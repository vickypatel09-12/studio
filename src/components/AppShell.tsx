'use client';
import type { ReactNode } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarTrigger,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { SidebarNav } from '@/components/SidebarNav';
import { usePathname } from 'next/navigation';
import { Landmark, LogOut, User } from 'lucide-react';
import Link from 'next/link';

function getPageTitle(pathname: string) {
  switch (pathname) {
    case '/':
      return 'Dashboard';
    case '/deposits':
      return 'Monthly Deposits';
    case '/loans':
      return 'Loan & Interest';
    case '/customers':
      return 'Customer Management';
    case '/reports':
      return 'Reports';
    case '/settings':
      return 'Settings';
    case '/interest-calculator':
      return 'Interest Calculation Tool';
    default:
      if (pathname.startsWith('/customers/')) return 'Customer Details';
      return 'Bachat Bank ERP';
  }
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <Landmark className="size-6 text-primary" />
              </Link>
            </Button>
            <span className="font-headline text-lg font-semibold">
              Bachat Bank
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-3 p-3">
            <User className="size-9 rounded-full border bg-card p-1.5" />
            <div className="flex flex-col text-sm">
              <span className="font-semibold">Vikesh</span>
              <span className="text-xs text-muted-foreground">
                vikesh@example.com
              </span>
            </div>
            <Button variant="ghost" size="icon" className="ml-auto">
              <LogOut className="size-5" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm lg:px-6">
          <SidebarTrigger className="md:hidden" />
          <div className="flex-1">
            <h1 className="font-headline text-lg font-semibold">{title}</h1>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
