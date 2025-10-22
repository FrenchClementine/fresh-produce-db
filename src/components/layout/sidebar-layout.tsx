'use client'

import { useState } from 'react'
import { AppSidebar } from './app-sidebar'
import { TodoSidebar } from './todo-sidebar'
import { Button } from '@/components/ui/button'
import { CheckSquare, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarLayoutProps {
  children: React.ReactNode
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [todoSidebarCollapsed, setTodoSidebarCollapsed] = useState(true)

  return (
    <div className="flex h-screen bg-terminal-dark">
      {/* Sidebar pushes content */}
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content starts after sidebar */}
      <main className="flex-1 h-screen overflow-auto bg-terminal-dark print:w-full">
        {children}
      </main>
    </div>
  )
}