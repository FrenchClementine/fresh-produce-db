'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ChevronDown,
  ChevronRight,
  Home,
  Package,
  Users,
  Building2,
  Truck,
  Settings,
  TrendingUp,
  Euro,
  BarChart3,
  Network,
  Search,
  Calendar,
  PanelLeft,
  User,
  LogOut
} from 'lucide-react'
import { UserMenu } from '@/components/auth/user-menu'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<any>
  description?: string
  children?: NavItem[]
}

const navigationItems: NavItem[] = [
  {
    href: '/trade/overview',
    label: 'Dashboard',
    icon: Home,
  },
  {
    href: '/product-sourcing',
    label: 'Product Sourcing',
    icon: Search,
    children: [
      {
        href: '/product-sourcing/finder',
        label: 'Product Finder',
        icon: Search,
      },
      {
        href: '/product-sourcing/calendar',
        label: 'Availability Calendar',
        icon: Calendar,
      },
      {
        href: '/transport',
        label: 'Transport Planning',
        icon: Truck,
      },
    ],
  },
  {
    href: '/trade',
    label: 'Trade',
    icon: TrendingUp,
    children: [
      {
        href: '/trade',
        label: 'Trade Overview',
        icon: TrendingUp,
      },
      {
        href: '/trade/prices',
        label: 'Input Prices',
        icon: Euro,
      },
      {
        href: '/trade/requests',
        label: 'Customer Requests',
        icon: Search,
      },
      {
        href: '/trade/trader',
        label: 'Trade Opportunities',
        icon: BarChart3,
      },
      {
        href: '/trade/potential',
        label: 'Trade Potential',
        icon: Network,
      },
    ],
  },
  {
    href: '/admin',
    label: 'Admin',
    icon: Settings,
    children: [
      {
        href: '/products',
        label: 'Products',
        icon: Package,
      },
      {
        href: '/suppliers',
        label: 'Suppliers',
        icon: Building2,
      },
      {
        href: '/customers',
        label: 'Customers',
        icon: Users,
      },
    ],
  },
  {
    href: '/transporters',
    label: 'Transport',
    icon: Truck,
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
  },
]

function NavItemComponent({ item, collapsed, level = 0 }: { item: NavItem; collapsed: boolean; level?: number }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const hasChildren = item.children && item.children.length > 0
  const isActive = pathname === item.href || (hasChildren && item.children?.some(child => pathname.startsWith(child.href)))

  const Icon = item.icon

  if (hasChildren) {
    return (
      <div className="space-y-1">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                'hover:bg-terminal-dark',
                level > 0 && 'ml-3',
                isActive && 'bg-terminal-accent/20 text-terminal-accent',
                !isActive && 'text-terminal-muted',
                collapsed && 'justify-center px-2'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="truncate text-left flex-1">{item.label}</span>
                  <div className="ml-auto">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </>
              )}
            </button>
          </CollapsibleTrigger>
          {!collapsed && (
            <CollapsibleContent className="space-y-1 ml-6">
              {item.children?.map((child) => (
                <NavItemComponent
                  key={child.href}
                  item={child}
                  collapsed={collapsed}
                  level={level + 1}
                />
              ))}
            </CollapsibleContent>
          )}
        </Collapsible>
      </div>
    )
  }

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-md transition-colors group',
        level > 0 ? 'px-3 py-1.5 text-xs font-normal' : 'px-3 py-2 text-sm font-medium',
        'hover:bg-terminal-dark',
        pathname === item.href && 'bg-terminal-accent/20 text-terminal-accent',
        pathname !== item.href && 'text-terminal-muted',
        collapsed && 'justify-center px-2'
      )}
    >
      {level === 0 && <Icon className="h-5 w-5 shrink-0" />}
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )
}

export function AppSidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <div className={cn(
      'flex flex-col h-screen bg-terminal-panel border-r border-terminal-border transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-terminal-border">
        {!collapsed && (
          <Link href="/" className="flex items-center">
            <Image
              src="/Produce-Services-Europe-Logo-RGB (1).jpg"
              alt="Produce Services Europe"
              width={140}
              height={32}
              className="h-8 w-auto"
            />
          </Link>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-md hover:bg-terminal-dark transition-colors text-terminal-text"
        >
          <PanelLeft className="h-4 w-4 text-terminal-muted" />
        </button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navigationItems.map((item) => (
            <NavItemComponent
              key={item.href}
              item={item}
              collapsed={collapsed}
            />
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-terminal-border">
        {!collapsed && (
          <div className="mb-4">
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-terminal-muted rounded-md hover:bg-terminal-dark transition-colors font-mono">
              <Search className="h-4 w-4" />
              <span>Search...</span>
              <kbd className="ml-auto text-xs bg-terminal-dark text-terminal-accent px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
            </button>
          </div>
        )}
        <div className={cn('flex items-center', collapsed && 'justify-center')}>
          {collapsed ? (
            <button className="p-2 rounded-md hover:bg-terminal-dark transition-colors">
              <User className="h-5 w-5 text-terminal-muted" />
            </button>
          ) : (
            <UserMenu />
          )}
        </div>
      </div>
    </div>
  )
}