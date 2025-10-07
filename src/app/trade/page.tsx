'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Euro,
  TrendingUp,
  Plus,
  BarChart3,
  Package,
  Building2,
  ArrowRight,
  Target,
  Network,
  Zap
} from 'lucide-react'

export default function TradePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-terminal-dark p-4 space-y-4">
      {/* Header with Admin Dashboard Toggle */}
      <div className="flex items-center justify-between border-b border-terminal-border pb-4">
        <div className="flex items-center gap-4">
          <BarChart3 className="h-8 w-8 text-terminal-accent" />
          <div>
            <h1 className="text-2xl font-mono font-bold text-terminal-text tracking-wider">
              TRADE DASHBOARD
            </h1>
            <p className="text-terminal-muted font-mono text-sm">
              Manage pricing, analyze market trends, and track trade operations
            </p>
          </div>
        </div>
        <Button
          onClick={() => router.push('/admin-dashboard')}
          className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono"
        >
          <Building2 className="mr-2 h-4 w-4" />
          Admin Dashboard
        </Button>
      </div>

      {/* Main Navigation Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Input Prices */}
        <Link href="/trade/prices" className="group">
          <Card className="h-full bg-terminal-panel border-2 border-terminal-border hover:border-terminal-accent transition-all">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-lg bg-terminal-dark border border-terminal-border group-hover:border-terminal-accent transition-all">
                  <Euro className="h-6 w-6 text-green-400" />
                </div>
                <ArrowRight className="h-5 w-5 text-terminal-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <CardTitle className="font-mono text-terminal-text">INPUT PRICES</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="font-mono text-terminal-muted">
                Manage supplier pricing and market data
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        {/* Trade Opportunities */}
        <Link href="/trade/opportunity" className="group">
          <Card className="h-full bg-terminal-panel border-2 border-terminal-border hover:border-terminal-accent transition-all">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-lg bg-terminal-dark border border-terminal-border group-hover:border-terminal-accent transition-all">
                  <Target className="h-6 w-6 text-purple-400" />
                </div>
                <ArrowRight className="h-5 w-5 text-terminal-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <CardTitle className="font-mono text-terminal-text">TRADE OPPORTUNITIES</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="font-mono text-terminal-muted">
                Discover customer-supplier matching opportunities
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        {/* Trade Potential */}
        <Link href="/trade/potential" className="group">
          <Card className="h-full bg-terminal-panel border-2 border-terminal-border hover:border-terminal-accent transition-all">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-lg bg-terminal-dark border border-terminal-border group-hover:border-terminal-accent transition-all">
                  <Network className="h-6 w-6 text-orange-400" />
                </div>
                <ArrowRight className="h-5 w-5 text-terminal-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <CardTitle className="font-mono text-terminal-text">TRADE POTENTIAL</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="font-mono text-terminal-muted">
                View all possible connections and missing links
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        {/* Trade Trader */}
        <Link href="/trade/trader" className="group">
          <Card className="h-full bg-terminal-panel border-2 border-terminal-border hover:border-terminal-accent transition-all">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-lg bg-terminal-dark border border-terminal-border group-hover:border-terminal-accent transition-all">
                  <TrendingUp className="h-6 w-6 text-blue-400" />
                </div>
                <ArrowRight className="h-5 w-5 text-terminal-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <CardTitle className="font-mono text-terminal-text">ACTIVE OPPORTUNITIES</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="font-mono text-terminal-muted">
                Manage active opportunities and track quotes
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-terminal-panel border-terminal-border border-l-4 border-l-terminal-success">
          <CardHeader className="pb-3 border-b border-terminal-border">
            <CardTitle className="text-sm font-mono text-terminal-text flex items-center gap-2">
              <Zap className="h-4 w-4 text-terminal-success" />
              ACTIVE SYSTEMS
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-terminal-muted">Price Management</span>
                <span className="text-sm font-mono font-medium text-terminal-success">✓ Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-terminal-muted">Trade Opportunities</span>
                <span className="text-sm font-mono font-medium text-terminal-success">✓ Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-terminal-muted">Trade Potential</span>
                <span className="text-sm font-mono font-medium text-terminal-success">✓ Active</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-terminal-panel border-terminal-border border-l-4 border-l-blue-500">
          <CardHeader className="pb-3 border-b border-terminal-border">
            <CardTitle className="text-sm font-mono text-terminal-text flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-400" />
              TRADE FEATURES
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-terminal-muted">Supplier Pricing</span>
                <span className="text-sm font-mono font-medium text-blue-400">Real-time</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-terminal-muted">Logistics Matching</span>
                <span className="text-sm font-mono font-medium text-blue-400">Automated</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-terminal-muted">Customer Filtering</span>
                <span className="text-sm font-mono font-medium text-blue-400">Advanced</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}