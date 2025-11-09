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
import { Landmark, LogOut, User, ChevronDown, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth, useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Badge } from '@/components/ui/badge';
import { doc, Timestamp } from 'firebase/firestore';

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
    case '/session':
      return 'Session Management';
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

  useEffect(() => {
    // This is the single source of truth for auth redirection.
    // It waits until Firebase has confirmed the auth state.
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  // While Firebase is checking the auth state, show a loader to prevent flashes of content.
  if (isUserLoading || !user) {
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
        <SidebarFooter>{/* User menu moved to header */}</SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm lg:px-6">
          <SidebarTrigger className="md:hidden" />
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
                {session?.status === 'active'
                    ? 'Active'
                    : session?.status === 'closed'
                    ? 'Closed'
                    : 'Not Started'}
                </Badge>
          </div>
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <User className="size-5 rounded-full" />
                  <div className="flex flex-col items-start text-sm">
                    <span className="font-semibold">{user.email}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
          </div>
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
