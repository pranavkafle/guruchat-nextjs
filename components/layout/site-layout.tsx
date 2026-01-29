'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

interface SiteLayoutProps {
  children: React.ReactNode;
}

export function SiteLayout({ children }: SiteLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/login');
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const showSidebar = pathname !== '/login' && pathname !== '/register';

  // Auth pages - no sidebar, centered content
  if (!showSidebar) {
    return (
      <div className="flex h-screen flex-col">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-14 shrink-0">
          <div className="w-full flex items-center justify-center px-6 h-full">
            <Link href="/" className="font-bold">
              GuruChat
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center overflow-hidden">
          {children}
        </main>
      </div>
    );
  }

  // Main app with sidebar - shadcn sidebar-16 pattern
  // Header INSIDE SidebarProvider, then sidebar/content below
  return (
    <div className="[--header-height:3.5rem] h-svh overflow-hidden">
      <SidebarProvider className="flex h-full w-full flex-col">
        {/* Header - inside SidebarProvider so it works with sidebar toggle */}
        <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b h-[var(--header-height)] shrink-0">
          <div className="flex w-full items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Link href="/" className="font-bold">
              GuruChat
            </Link>
            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={isLoading}
              >
                {isLoading ? 'Logging out...' : 'Logout'}
              </Button>
            </div>
          </div>
        </header>

        {/* Sidebar + Main content */}
        <div className="flex flex-1 min-h-0">
          <AppSidebar />
          <SidebarInset className="min-h-0 overflow-hidden">
            {children}
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}
