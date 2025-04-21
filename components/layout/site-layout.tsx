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

// Define header height as a CSS variable value
const headerHeight = '3.5rem'; // Corresponds to h-14

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
    <div 
      className="flex h-full flex-col"
      style={{ '--header-height': headerHeight } as React.CSSProperties} // Define CSS variable
    >
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-[var(--header-height)] shrink-0"> {/* Use variable for height and add shrink-0 */}
        <div className="w-full flex items-center justify-between px-6 h-full"> {/* Ensure inner div uses full header height */}
          <Link href="/" className="font-bold">
            GuruChat
          </Link>
          {!showSidebar && (
             null // Or perhaps login/register links if desired
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
        <div className="flex flex-1 overflow-hidden">
          {showSidebar && (
            // Use CSS variable for top offset and height calculation
            <AppSidebar className="top-[var(--header-height)] h-[calc(100vh-var(--header-height))]" /> 
          )}
          {/* Main content area with specific overflow handling based on path */}
          <main className={`flex flex-1 ${
            showSidebar 
              ? 'flex-col items-stretch justify-start overflow-auto' 
              : 'items-center justify-center overflow-hidden h-[calc(100vh-var(--header-height))]'
            } px-4 md:px-6 py-0`}>
             {children}
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
} 