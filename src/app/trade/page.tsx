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
  ArrowRight
} from 'lucide-react'

export default function TradePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trade</h1>
        <p className="text-muted-foreground">
          Manage pricing, analyze market trends, and track trade operations
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Prices Management */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5 text-green-600" />
              Price Management
            </CardTitle>
            <CardDescription>
              Input and manage supplier pricing across all products
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Link href="/trade/prices">
                <Button className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Input Prices
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Market Analysis */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Market Analysis
            </CardTitle>
            <CardDescription>
              Analyze pricing trends and market conditions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="w-full justify-between" disabled>
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Price Analytics
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </div>
          </CardContent>
        </Card>

        {/* Trade Operations */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-600" />
              Trade Operations
            </CardTitle>
            <CardDescription>
              Manage trade flows and logistics operations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="w-full justify-between" disabled>
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Trade Flows
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity or Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Trade Overview</CardTitle>
          <CardDescription>
            Quick overview of current trade operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">Active</div>
              <p className="text-sm text-muted-foreground">Price Management</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400">Planned</div>
              <p className="text-sm text-muted-foreground">Market Analysis</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400">Planned</div>
              <p className="text-sm text-muted-foreground">Trade Operations</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}