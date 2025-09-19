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
import { useCurrentStaffMember } from '@/hooks/use-staff'

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
    href: '/',
    label: 'Dashboard',
    icon: Home,
  },
  {
    href: '/my',
    label: 'My Workspace',
    icon: User,
    children: [
      {
        href: '/my/suppliers',
        label: 'My Suppliers',
        icon: Building2,
      },
      {
        href: '/my/customers',
        label: 'My Customers',
        icon: Users,
      },
      {
        href: '/my/transporters',
        label: 'My Transporters',
        icon: Truck,
      },
    ],
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
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                level > 0 && 'ml-3',
                isActive && 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100',
                !isActive && 'text-gray-700 dark:text-gray-300',
                collapsed && 'justify-center px-2'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="truncate text-left">{item.label}</span>
                    {item.href === '/trade' && (
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
                        UNDER CONSTRUCTION
                      </span>
                    )}
                  </div>
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
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        pathname === item.href && 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100',
        pathname !== item.href && 'text-gray-700 dark:text-gray-300',
        collapsed && 'justify-center px-2'
      )}
    >
      {level === 0 && <Icon className="h-5 w-5 shrink-0" />}
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )
}

export function AppSidebar({ collapsed, onToggle }: SidebarProps) {
  const { data: currentStaff } = useCurrentStaffMember()

  // Get the first name from the staff member's name for a more personal touch
  const getFirstName = (fullName: string) => {
    return fullName.split(' ')[0]
  }

  // Create dynamic navigation items based on current staff
  const getDynamicNavigationItems = () => {
    const baseItems = [...navigationItems]

    if (currentStaff) {
      // Find and update the "My Workspace" item
      const myWorkspaceIndex = baseItems.findIndex(item => item.href === '/my')
      if (myWorkspaceIndex !== -1) {
        const firstName = getFirstName(currentStaff.name)
        baseItems[myWorkspaceIndex] = {
          ...baseItems[myWorkspaceIndex],
          label: `${firstName}'s World`
        }
      }
    }

    return baseItems
  }

  const dynamicNavigationItems = getDynamicNavigationItems()

  return (
    <div className={cn(
      'flex flex-col h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
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
          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <PanelLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {dynamicNavigationItems.map((item) => (
            <NavItemComponent
              key={item.href}
              item={item}
              collapsed={collapsed}
            />
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        {!collapsed && (
          <div className="mb-4">
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Search className="h-4 w-4" />
              <span>Search...</span>
              <kbd className="ml-auto text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
            </button>
          </div>
        )}
        <div className={cn('flex items-center', collapsed && 'justify-center')}>
          {collapsed ? (
            <button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          ) : (
            <UserMenu />
          )}
        </div>
      </div>
    </div>
  )
}