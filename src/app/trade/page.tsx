'use client'

import React from 'react'
import Link from 'next/link'
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
  return (
    <div className="space-y-6 page-transition">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trade</h1>
        <p className="text-muted-foreground">
          Manage pricing, analyze market trends, and track trade operations
        </p>
      </div>

      {/* Main Navigation Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Trade Overview */}
        <Link href="/trade" className="group">
          <Card className="h-full nav-card border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 hover:border-blue-300">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-blue-500 text-white group-hover:bg-blue-600 transition-colors">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <ArrowRight className="h-5 w-5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <CardTitle className="text-blue-900">Trade Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-blue-700">
                Dashboard for trade operations and pricing.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        {/* Input Prices */}
        <Link href="/trade/prices" className="group">
          <Card className="h-full nav-card border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100 hover:border-green-300">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-green-500 text-white group-hover:bg-green-600 transition-colors">
                  <Euro className="h-6 w-6" />
                </div>
                <ArrowRight className="h-5 w-5 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <CardTitle className="text-green-900">Input Prices</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-green-700">
                Manage supplier pricing and market data.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        {/* Trade Opportunities */}
        <Link href="/trade/opportunity" className="group">
          <Card className="h-full nav-card border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 hover:border-purple-300">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-purple-500 text-white group-hover:bg-purple-600 transition-colors">
                  <Target className="h-6 w-6" />
                </div>
                <ArrowRight className="h-5 w-5 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <CardTitle className="text-purple-900">Trade Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-purple-700">
                Discover customer-supplier matching opportunities.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        {/* Trade Potential */}
        <Link href="/trade/potential" className="group">
          <Card className="h-full nav-card border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 hover:border-orange-300">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-orange-500 text-white group-hover:bg-orange-600 transition-colors">
                  <Network className="h-6 w-6" />
                </div>
                <ArrowRight className="h-5 w-5 text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <CardTitle className="text-orange-900">Trade Potential</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-orange-700">
                View all possible connections and missing links.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-500" />
              Active Systems
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Price Management</span>
                <span className="text-sm font-medium text-green-600">✓ Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Trade Opportunities</span>
                <span className="text-sm font-medium text-green-600">✓ Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Trade Potential</span>
                <span className="text-sm font-medium text-green-600">✓ Active</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Trade Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Supplier Pricing</span>
                <span className="text-sm font-medium text-blue-600">Real-time</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Logistics Matching</span>
                <span className="text-sm font-medium text-blue-600">Automated</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Customer Filtering</span>
                <span className="text-sm font-medium text-blue-600">Advanced</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}