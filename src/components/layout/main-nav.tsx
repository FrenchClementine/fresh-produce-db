'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from '@/components/ui/navigation-menu'
import { Building, Package, Users, Search, Menu, Truck, Settings, TrendingUp, Euro, BarChart3, Network } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { UserMenu } from '@/components/auth/user-menu'
import { useState } from 'react'

const adminRoutes = [
  {
    href: '/products',
    label: 'Products',
    description: 'Manage catalog products and specifications.',
    icon: Package,
  },
  {
    href: '/suppliers',
    label: 'Suppliers',
    description: 'Maintain supplier records and capabilities.',
    icon: Users,
  },
  {
    href: '/customers',
    label: 'Customers',
    description: 'Oversee customer requirements and availability.',
    icon: Users,
  },
]

const tradeRoutes = [
  {
    href: '/trade',
    label: 'Trade Overview',
    description: 'Dashboard for trade operations and pricing.',
    icon: TrendingUp,
  },
  {
    href: '/trade/prices',
    label: 'Input Prices',
    description: 'Manage supplier pricing and market data.',
    icon: Euro,
  },
  {
    href: '/trade/trader',
    label: 'Trade Opportunities',
    description: 'Discover customer-supplier matching opportunities.',
    icon: BarChart3,
  },
  {
    href: '/trade/potential',
    label: 'Trade Potential',
    description: 'View all possible connections and missing links.',
    icon: Network,
  },
]

const primaryRoutes = [
  {
    href: '/',
    label: 'Dashboard',
    icon: Building,
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

const productSourcingRoutes = [
  {
    href: '/product-sourcing/finder',
    label: 'Product Finder',
  },
  {
    href: '/product-sourcing/calendar',
    label: 'Availability Calendar',
  },
  {
    href: '/transport',
    label: 'Transport',
  },
]

export function MainNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const isAdminActive = adminRoutes.some((route) => pathname?.startsWith(route.href))
  const isProductSourcingActive = productSourcingRoutes.some((route) => pathname?.startsWith(route.href))
  const isTradeActive = pathname?.startsWith('/trade')

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center">
            <Image
              src="/Produce-Services-Europe-Logo-RGB (1).jpg"
              alt="Produce Services Europe"
              width={150}
              height={36}
              className="h-9 w-auto"
            />
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {primaryRoutes
              .filter((route) => route.href === '/')
              .map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  className={cn(
                    'transition-colors hover:text-foreground/80',
                    pathname === route.href ? 'text-foreground' : 'text-foreground/60'
                  )}
                >
                  {route.label}
                </Link>
              ))}

            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className={cn(
                    isProductSourcingActive ? 'bg-accent/50 text-accent-foreground' : 'text-foreground/70'
                  )}>
                    Product Sourcing
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid gap-3 p-4 w-[240px]">
                      {productSourcingRoutes.map((route) => (
                        <li key={route.href}>
                          <NavigationMenuLink
                            asChild
                            className="block rounded-md p-3 hover:bg-accent hover:text-accent-foreground transition-colors"
                          >
                            <Link href={route.href}>{route.label}</Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className={cn(
                    isTradeActive ? 'bg-accent/50 text-accent-foreground' : 'text-foreground/70'
                  )}>
                    Trade
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="p-4 w-[280px]">
                      <div className="mb-4 text-center">
                        <div className="text-lg font-bold text-orange-600 tracking-wide">
                          UNDER DEVELOPMENT
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Features are being actively developed
                        </div>
                      </div>
                      <ul className="grid gap-3">
                        {tradeRoutes.map((route) => {
                          const Icon = route.icon
                          return (
                            <li key={route.href}>
                              <NavigationMenuLink asChild className="block rounded-md p-3 hover:bg-accent hover:text-accent-foreground transition-colors">
                                <Link href={route.href}>
                                  <div className="flex items-center gap-3">
                                    <Icon className="h-5 w-5" />
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium">{route.label}</span>
                                      <span className="text-xs text-muted-foreground">{route.description}</span>
                                    </div>
                                  </div>
                                </Link>
                              </NavigationMenuLink>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className={cn(
                    isAdminActive ? 'bg-accent/50 text-accent-foreground' : 'text-foreground/70'
                  )}>
                    Admin
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid gap-3 p-4 w-[260px]">
                      {adminRoutes.map((route) => {
                        const Icon = route.icon
                        return (
                          <li key={route.href}>
                            <NavigationMenuLink asChild className="block rounded-md p-3 hover:bg-accent hover:text-accent-foreground transition-colors">
                              <Link href={route.href}>
                                <div className="flex items-center gap-3">
                                  <Icon className="h-5 w-5" />
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">{route.label}</span>
                                    <span className="text-xs text-muted-foreground">{route.description}</span>
                                  </div>
                                </div>
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        )
                      })}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            {primaryRoutes
              .filter((route) => route.href !== '/')
              .map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  className={cn(
                    'transition-colors hover:text-foreground/80',
                    pathname === route.href ? 'text-foreground' : 'text-foreground/60'
                  )}
                >
                  {route.label}
                </Link>
              ))}
          </nav>
        </div>
        
        {/* Mobile navigation */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <div className="flex flex-col space-y-4 mt-8">
              <Link href="/" className="flex items-center mb-4">
                <Image
                  src="/Produce-Services-Europe-Logo-RGB (1).jpg"
                  alt="Produce Services Europe"
                  width={130}
                  height={32}
                  className="h-8 w-auto"
                />
              </Link>
              {primaryRoutes.map((route) => {
                const Icon = route.icon
                return (
                  <Link
                    key={route.href}
                    href={route.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center space-x-3 transition-colors hover:text-foreground/80',
                      pathname === route.href ? 'text-foreground' : 'text-foreground/60'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{route.label}</span>
                  </Link>
                )
              })}

              <div className="pt-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Product Sourcing</p>
                <div className="space-y-2">
                  {productSourcingRoutes.map((route) => (
                    <Link
                      key={route.href}
                      href={route.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center justify-between rounded-md px-2 py-2 transition-colors hover:bg-accent hover:text-accent-foreground',
                        pathname?.startsWith(route.href) ? 'bg-accent/40 text-foreground' : 'text-foreground/60'
                      )}
                    >
                      <span>{route.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Trade</p>
                <div className="space-y-2">
                  {tradeRoutes.map((route) => {
                    const Icon = route.icon
                    return (
                      <Link
                        key={route.href}
                        href={route.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'flex items-center space-x-3 rounded-md px-2 py-2 transition-colors hover:bg-accent hover:text-accent-foreground',
                          pathname?.startsWith(route.href) ? 'bg-accent/40 text-foreground' : 'text-foreground/60'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{route.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Admin</p>
                <div className="space-y-2">
                  {adminRoutes.map((route) => {
                    const Icon = route.icon
                    return (
                      <Link
                        key={route.href}
                        href={route.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'flex items-center space-x-3 rounded-md px-2 py-2 transition-colors hover:bg-accent hover:text-accent-foreground',
                          pathname?.startsWith(route.href) ? 'bg-accent/40 text-foreground' : 'text-foreground/60'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{route.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <Button variant="outline" className="relative h-9 w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64">
              <Search className="mr-2 h-4 w-4" />
              <span className="hidden lg:inline-flex">Search CRM...</span>
              <span className="inline-flex lg:hidden">Search...</span>
              <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </div>
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
