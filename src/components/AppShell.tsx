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
import { usePathname } from 'next/navigation';
import { Landmark, LogOut, User, ChevronDown } from 'lucide-react';
import Link from 'next/link';

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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
          <div className="ml-auto">
            {isClient && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <User className="size-5 rounded-full" />
                    <div className="flex flex-col items-start text-sm">
                      <span className="font-semibold">Vikesh</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                    <LogOut className="mr-2 size-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
