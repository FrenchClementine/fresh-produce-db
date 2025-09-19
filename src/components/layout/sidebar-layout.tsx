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
    <div className="flex h-screen bg-background">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className="flex-1 overflow-auto relative">
        <div className="container mx-auto py-6 px-6">
          {children}
        </div>

        {/* Todo Sidebar Toggle Button */}
        <Button
          onClick={() => setTodoSidebarCollapsed(!todoSidebarCollapsed)}
          className={cn(
            "fixed top-6 right-6 z-50 shadow-lg transition-all duration-300",
            todoSidebarCollapsed
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
          )}
          size="sm"
        >
          {todoSidebarCollapsed ? (
            <>
              <CheckSquare className="h-4 w-4 mr-2" />
              Tasks
            </>
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>
      </main>

      {!todoSidebarCollapsed && (
        <TodoSidebar
          collapsed={false}
          onToggle={() => setTodoSidebarCollapsed(true)}
        />
      )}
    </div>
  )
}