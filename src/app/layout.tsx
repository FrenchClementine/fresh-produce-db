import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'
import { MainNav } from '@/components/layout/main-nav'
import { QueryProvider } from '@/components/providers/query-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Fresh Produce Finder',
  description: 'International fresh produce supplier database and management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <div className="min-h-screen bg-background">
            <MainNav />
            <main className="container mx-auto py-6">
              {children}
            </main>
          </div>
          <Toaster />
          <SonnerToaster />
        </QueryProvider>
      </body>
    </html>
  )
}