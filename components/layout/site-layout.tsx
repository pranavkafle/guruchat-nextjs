'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider } from "@/components/ui/sidebar";

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

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full flex h-14 items-center justify-between px-6">
          <Link href="/" className="font-bold">
            GuruChat
          </Link>
          {!showSidebar && (
             null
          )}
          {showSidebar && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              disabled={isLoading}
            >
              {isLoading ? 'Logging out...' : 'Logout'}
            </Button>
          )}
        </div>
      </header>

      <SidebarProvider>
        <div className="flex flex-1">
          {showSidebar && (
            <AppSidebar className="sticky top-[56px] h-[calc(100vh-56px)]" />
          )}
          <main className="flex flex-1 flex-col items-stretch justify-start p-4 md:p-6">
             {children}
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
} 