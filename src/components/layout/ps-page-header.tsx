import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface PSPageHeaderProps {
  title: string
  description?: string
  icon?: ReactNode
  actions?: ReactNode
  className?: string
}

/**
 * PSEurope Page Header Component
 * Consistent page header with title, description, icon, and actions
 * Usage:
 * <PSPageHeader
 *   title="Market Opportunities"
 *   description="Manage your market opportunities"
 *   icon={<Store className="h-8 w-8" />}
 *   actions={<Button>Add New</Button>}
 * />
 */
export function PSPageHeader({
  title,
  description,
  icon,
  actions,
  className
}: PSPageHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-6 pb-4 border-b border-border', className)}>
      <div className="flex items-center gap-4">
        {icon && (
          <div className="flex-shrink-0 text-pseurope-green">{icon}</div>
        )}
        <div>
          <h1 className="text-page-title">{title}</h1>
          {description && (
            <p className="text-body text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2">{actions}</div>
      )}
    </div>
  )
}
