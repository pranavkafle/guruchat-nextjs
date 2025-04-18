import React from 'react';

interface SiteLayoutProps {
  children: React.ReactNode;
}

export function SiteLayout({ children }: SiteLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Placeholder for Header/Nav - We'll add later */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <span>GuruChat Nav Placeholder</span>
          {/* Login/Logout buttons will go here later */}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container py-6">
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