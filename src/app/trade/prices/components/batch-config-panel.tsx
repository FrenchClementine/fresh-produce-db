'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Building2, MapPin, Truck, Calendar, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface BatchConfigPanelProps {
  config: {
    supplier_id: string
    default_hub_id: string
    default_delivery_mode: string
    default_valid_from: string
    default_valid_until: string
    currency: string
  }
  suppliers: any[]
  hubs: any[]
  deliveryModes: string[]
  onChange: (field: string, value: string) => void
  onQuickValidity: (days: number) => void
}

export function BatchConfigPanel({
  config,
  suppliers,
  hubs,
  deliveryModes,
  onChange,
  onQuickValidity
}: BatchConfigPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📋 Batch Configuration
        </CardTitle>
        <CardDescription>
          Set default values that will apply to all price entries below
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Supplier */}
          <div className="space-y-2">
            <Label>Supplier *</Label>
            <Select value={config.supplier_id} onValueChange={(value) => onChange('supplier_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map(supplier => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {supplier.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Default Hub */}
          <div className="space-y-2">
            <Label>Default Hub</Label>
            <Select
              value={config.default_hub_id}
              onValueChange={(value) => onChange('default_hub_id', value)}
              disabled={!config.supplier_id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select default hub" />
              </SelectTrigger>
              <SelectContent>
                {hubs.map(hub => (
                  <SelectItem key={hub.id} value={hub.id}>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {hub.name} ({hub.hub_code})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Delivery Mode */}
          <div className="space-y-2">
            <Label>Default Delivery Mode</Label>
            <Select
              value={config.default_delivery_mode}
              onValueChange={(value) => onChange('default_delivery_mode', value)}
              disabled={!config.supplier_id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select delivery mode" />
              </SelectTrigger>
              <SelectContent>
                {deliveryModes.map(mode => (
                  <SelectItem key={mode} value={mode}>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      {mode}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={config.currency} onValueChange={(value) => onChange('currency', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="GBP">GBP (£)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Validity Period */}
        <div className="space-y-2">
          <Label>Default Validity Period</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Valid From</Label>
              <Input
                type="date"
                value={config.default_valid_from}
                onChange={(e) => onChange('default_valid_from', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Valid Until *</Label>
              <Input
                type="date"
                value={config.default_valid_until}
                onChange={(e) => onChange('default_valid_until', e.target.value)}
              />
            </div>
          </div>

          {/* Quick Validity Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onQuickValidity(1)}
            >
              <Clock className="mr-1 h-3 w-3" />
              +1 Day
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onQuickValidity(3)}
            >
              <Clock className="mr-1 h-3 w-3" />
              +3 Days
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onQuickValidity(7)}
            >
              <Clock className="mr-1 h-3 w-3" />
              +1 Week
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onQuickValidity(14)}
            >
              <Clock className="mr-1 h-3 w-3" />
              +2 Weeks
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onQuickValidity(30)}
            >
              <Clock className="mr-1 h-3 w-3" />
              +1 Month
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
