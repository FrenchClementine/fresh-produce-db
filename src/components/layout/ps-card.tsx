import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface PSCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

/**
 * PSEurope Card Component
 * Provides consistent card styling across the application
 * Usage: <PSCard>Content</PSCard>
 */
export function PSCard({ children, className, hover = false, onClick }: PSCardProps) {
  return (
    <div
      className={cn(
        'ps-card',
        hover && 'ps-card-hover cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

interface PSCardHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export function PSCardHeader({ title, description, action }: PSCardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-card-title">{title}</h3>
        {description && (
          <p className="text-metadata mt-1">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
