'use client'

import { QueryProvider } from '@/components/providers/query-provider'
import { AuthProvider } from '@/contexts/auth-context'
import { AuthWrapper } from '@/components/auth/auth-wrapper'
import { SidebarLayout } from '@/components/layout/sidebar-layout'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'

export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
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
  )
}