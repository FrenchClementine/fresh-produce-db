import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface PSContainerProps {
  children: ReactNode
  className?: string
}

/**
 * PSEurope Container Component
 * Provides consistent max-width and padding for page content
 * Usage: <PSContainer>Page content</PSContainer>
 */
export function PSContainer({ children, className }: PSContainerProps) {
  return (
    <main className={cn('ps-container', className)}>
      {children}
    </main>
  )
}

interface PSGridProps {
  children: ReactNode
  className?: string
}

/**
 * PSEurope Grid Component
 * 12-column responsive grid system
 * Usage: <PSGrid><div className="col-span-6">Content</div></PSGrid>
 */
export function PSGrid({ children, className }: PSGridProps) {
  return (
    <div className={cn('ps-grid', className)}>
      {children}
    </div>
  )
}
