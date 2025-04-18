'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

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

  return (
    <div className="flex min-h-screen flex-col">
      {/* Placeholder for Header/Nav */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full flex h-14 items-center justify-between px-6"> 
          <span className="font-bold">GuruChat</span>
          {pathname !== '/login' && (
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

      {/* Main Content Area - Center its content */}
      <main className="flex flex-1 items-center justify-center">
         {children}
      </main>

      {/* Placeholder for Footer */}
      <footer className="py-6 md:px-8 md:py-0 border-t">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
           <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
             Built with Next.js & Shadcn/UI.
           </p>
        </div>
      </footer>
    </div>
  );
} 