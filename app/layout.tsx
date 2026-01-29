import React from 'react'
import type { Metadata } from 'next'
import './globals.css'
import { SiteLayout } from '@/components/layout/site-layout'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Guru Chat',
  description: 'Chat with your Gurus',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <SiteLayout>
          {children}
        </SiteLayout>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
