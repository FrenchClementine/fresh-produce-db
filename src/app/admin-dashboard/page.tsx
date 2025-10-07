'use client'

import { useRouter } from 'next/navigation'
import {
  Truck,
  Users,
  Package,
  Settings,
  Calendar,
  Search,
  MapPin,
  Building2,
  UserCircle,
  LayoutDashboard
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function AdminDashboardPage() {
  const router = useRouter()

  const quickLinks = [
    {
      title: 'Suppliers',
      description: 'Manage supplier database',
      icon: Truck,
      href: '/suppliers',
      color: 'text-blue-400'
    },
    {
      title: 'Customers',
      description: 'Manage customer database',
      icon: Users,
      href: '/customers',
      color: 'text-green-400'
    },
    {
      title: 'Products',
      description: 'Manage product catalog',
      icon: Package,
      href: '/products',
      color: 'text-purple-400'
    }
  ]

  const toolLinks = [
    {
      title: 'Availability Calendar',
      description: 'View product seasonality',
      icon: Calendar,
      href: '/product-sourcing/calendar',
      color: 'text-yellow-400'
    },
    {
      title: 'Product Finder',
      description: 'Search product catalog',
      icon: Search,
      href: '/product-sourcing',
      color: 'text-orange-400'
    },
    {
      title: 'Transport Planning',
      description: 'Plan logistics routes',
      icon: MapPin,
      href: '/transport-planning',
      color: 'text-cyan-400'
    }
  ]

  return (
    <div className="min-h-screen bg-terminal-dark p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-terminal-border pb-4">
        <div className="flex items-center gap-4">
          <Building2 className="h-8 w-8 text-terminal-accent" />
          <div>
            <h1 className="text-2xl font-mono font-bold text-terminal-text tracking-wider">
              ADMIN DASHBOARD
            </h1>
            <p className="text-terminal-muted font-mono text-sm">
              Quick access to system administration
            </p>
          </div>
        </div>
        <Button
          onClick={() => router.push('/dashboard')}
          className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono"
        >
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Trade Dashboard
        </Button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Data Management Section */}
        <Card className="bg-terminal-panel border-terminal-border">
          <CardHeader className="border-b border-terminal-border">
            <CardTitle className="font-mono text-sm text-terminal-text flex items-center gap-2">
              <Building2 className="h-4 w-4 text-terminal-accent" />
              DATA MANAGEMENT
            </CardTitle>
            <CardDescription className="font-mono text-xs text-terminal-muted">
              Manage core business data
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {quickLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => router.push(link.href)}
                className="w-full p-4 bg-terminal-dark border-2 border-terminal-border hover:border-terminal-accent rounded-lg transition-all group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-terminal-panel rounded-lg border border-terminal-border group-hover:border-terminal-accent transition-all">
                    <link.icon className={`h-6 w-6 ${link.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="font-mono font-semibold text-terminal-text group-hover:text-terminal-accent transition-colors">
                      {link.title}
                    </div>
                    <div className="text-sm text-terminal-muted font-mono">
                      {link.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Tools Section */}
        <Card className="bg-terminal-panel border-terminal-border">
          <CardHeader className="border-b border-terminal-border">
            <CardTitle className="font-mono text-sm text-terminal-text flex items-center gap-2">
              <Search className="h-4 w-4 text-terminal-accent" />
              PLANNING TOOLS
            </CardTitle>
            <CardDescription className="font-mono text-xs text-terminal-muted">
              Access planning and sourcing tools
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {toolLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => router.push(link.href)}
                className="w-full p-4 bg-terminal-dark border-2 border-terminal-border hover:border-terminal-accent rounded-lg transition-all group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-terminal-panel rounded-lg border border-terminal-border group-hover:border-terminal-accent transition-all">
                    <link.icon className={`h-6 w-6 ${link.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="font-mono font-semibold text-terminal-text group-hover:text-terminal-accent transition-colors">
                      {link.title}
                    </div>
                    <div className="text-sm text-terminal-muted font-mono">
                      {link.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Settings Section */}
      <Card className="bg-terminal-panel border-terminal-border">
        <CardHeader className="border-b border-terminal-border">
          <CardTitle className="font-mono text-sm text-terminal-text flex items-center gap-2">
            <Settings className="h-4 w-4 text-terminal-accent" />
            SYSTEM SETTINGS
          </CardTitle>
          <CardDescription className="font-mono text-xs text-terminal-muted">
            Configure system preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <button
            onClick={() => router.push('/settings')}
            className="w-full p-4 bg-terminal-dark border-2 border-terminal-border hover:border-terminal-accent rounded-lg transition-all group text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-terminal-panel rounded-lg border border-terminal-border group-hover:border-terminal-accent transition-all">
                <Settings className="h-6 w-6 text-terminal-accent" />
              </div>
              <div className="flex-1">
                <div className="font-mono font-semibold text-terminal-text group-hover:text-terminal-accent transition-colors">
                  System Settings
                </div>
                <div className="text-sm text-terminal-muted font-mono">
                  Configure users, permissions, and preferences
                </div>
              </div>
            </div>
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
