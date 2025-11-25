'use client';
import { useState, useEffect, type ReactNode } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarTrigger,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { SidebarNav } from '@/components/SidebarNav';
import { usePathname, useRouter } from 'next/navigation';
import { Landmark, LogOut, User, ChevronDown, Loader2, Building } from 'lucide-react';
import Link from 'next/link';
import { useAuth, useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Badge } from '@/components/ui/badge';
import { doc, Timestamp } from 'firebase/firestore';
import { format, formatDistanceToNowStrict } from 'date-fns';

function getPageTitle(pathname: string) {
  switch (pathname) {
    case '/':
      return 'Dashboard';
    case '/customers':
      return 'Customers';
    case '/deposits':
      return 'Monthly Deposits';
    case '/loans':
      return 'Loan & Interest';
    case '/reports':
      return 'Reports';
    case '/interest-calculator':
      return 'Interest Calculation Tool';
    case '/allocation':
      return 'Loan Allocation';
    default:
      if (pathname.startsWith('/customers/')) return 'Customer Details';
      return 'Bachat Bank ERP';
  }
}

type Session = {
  id: 'status';
  status: 'active' | 'closed';
  startDate?: Timestamp;
  endDate?: Timestamp;
  interestRate?: number;
};


export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const title = getPageTitle(pathname);
  const firestore = useFirestore();

  const sessionDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'session', 'status');
  }, [firestore]);

  const { data: session } = useDoc<Session>(sessionDocRef);
  
  const getSessionInfo = () => {
    if (!session) {
      return { status: 'Not Started', details: '' };
    }
    
    if (session.status === 'active' && session.startDate) {
        const startDate = session.startDate.toDate();
        const duration = formatDistanceToNowStrict(startDate);
        return {
            status: 'Active',
            details: `(Started ${format(startDate, 'MMM yyyy')}, running for ${duration})`
        };
    }
    
    if (session.status === 'closed' && session.startDate && session.endDate) {
        const startDate = session.startDate.toDate();
        const endDate = session.endDate.toDate();
        const duration = formatDistanceToNowStrict(startDate, { addSuffix: false, unit: 'month' });
        return {
            status: 'Closed',
            details: `(Ran from ${format(startDate, 'MMM yyyy')} to ${format(endDate, 'MMM yyyy')})`
        };
    }
    
    return { status: session.status === 'active' ? 'Active' : 'Closed', details: ''};
  }

  const sessionInfo = getSessionInfo();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (!user) {
     return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex h-12 w-full items-center justify-start gap-3 p-2.5 text-left group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:w-11 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/20 text-primary group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9">
                    <Landmark className="h-5 w-5"/>
                  </div>
                  <div className="group-data-[collapsible=icon]:hidden">
                    <p className="font-medium">Bachat Bank</p>
                    <p className="text-xs text-muted-foreground">Workspace</p>
                  </div>
                   <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
                <DropdownMenuItem className="flex items-center gap-2">
                   <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/20 text-primary">
                      <Landmark className="h-5 w-5"/>
                    </div>
                    <div>
                      <p className="font-medium">Bachat Bank</p>
                      <p className="text-xs text-muted-foreground">Workspace</p>
                    </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter className="p-2 group-data-[collapsible=icon]:p-2.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <Button variant="ghost" className="flex h-12 w-full items-center justify-start gap-3 p-2 text-left group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:w-11 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
                    <User className="size-8 rounded-full border p-1 group-data-[collapsible=icon]:size-9" />
                    <div className="group-data-[collapsible=icon]:hidden">
                       <p className="font-medium text-sm">{user.email}</p>
                    </div>
                 </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 mb-2">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <LogOut className="mr-2 size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col min-h-svh">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm lg:px-6 no-print">
            <SidebarTrigger className="group-data-[collapsible=icon]:hidden" />
            <div className="flex-1">
                <h1 className="font-headline text-lg font-semibold">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Session:</span>
                <Badge
                    variant={session?.status === 'active' ? 'default' : 'secondary'}
                    className={
                        session?.status === 'active'
                        ? 'bg-green-500 text-white'
                        : session?.status === 'closed'
                        ? 'bg-destructive'
                        : 'bg-muted'
                    }
                    >
                    {sessionInfo.status}
                    </Badge>
                    {sessionInfo.details && <span className="text-xs text-muted-foreground">{sessionInfo.details}</span>}
            </div>
            </header>
            <main className="flex-1 p-4 sm:p-6">{children}</main>
            <footer className="p-4 text-center text-sm text-muted-foreground no-print">
                <p>Created by: Vikesh Patel</p>
                <p>&copy; 2024 Vikesh Patel. All Rights Reserved.</p>
            </footer>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
