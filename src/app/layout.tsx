import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'
import { SidebarLayout } from '@/components/layout/sidebar-layout'
import { QueryProvider } from '@/components/providers/query-provider'
import { AuthProvider } from '@/contexts/auth-context'
import { AuthWrapper } from '@/components/auth/auth-wrapper'

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
          <AuthProvider>
            <AuthWrapper>
              <SidebarLayout>
                {children}
              </SidebarLayout>
            </AuthWrapper>
            <Toaster />
            <SonnerToaster />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}