#!/bin/bash

# Create all necessary files for the Fresh Produce Finder app

cat > src/app/suppliers/page.tsx << 'EOF'
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  Plus, 
  Filter, 
  MapPin, 
  Mail, 
  Phone, 
  Globe,
  CheckCircle
} from 'lucide-react'
import { useSuppliers } from '@/hooks/use-suppliers'

export default function SuppliersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const { suppliers, isLoading } = useSuppliers()

  const filteredSuppliers = suppliers?.filter(supplier => 
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.country.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground">
            Manage your international produce suppliers
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p>Loading suppliers...</p>
        ) : filteredSuppliers?.map((supplier) => (
          <Card key={supplier.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{supplier.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {supplier.city}, {supplier.country}
                  </CardDescription>
                </div>
                <Badge variant={supplier.active ? "default" : "secondary"}>
                  {supplier.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {supplier.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{supplier.email}</span>
                </div>
              )}
              {supplier.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{supplier.phone}</span>
                </div>
              )}
              <Button size="sm" variant="outline" className="w-full">
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
EOF

cat > src/app/products/page.tsx << 'EOF'
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Filter, Package, Leaf, MapPin } from 'lucide-react'
import { useProducts } from '@/hooks/use-products'

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const { products, isLoading } = useProducts()

  const filteredProducts = products?.filter(product => 
    product.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.variety_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.country?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Browse and manage product specifications
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p>Loading products...</p>
        ) : filteredProducts?.map((product) => (
          <Card key={product.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {product.product_name}
                  </CardTitle>
                  {product.variety_name && (
                    <CardDescription>{product.variety_name}</CardDescription>
                  )}
                </div>
                {product.organic && (
                  <Badge variant="outline" className="text-green-600">
                    <Leaf className="mr-1 h-3 w-3" />
                    Organic
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{product.country} - {product.grower_name}</span>
              </div>
              {product.size_code && (
                <div className="flex gap-2">
                  <Badge variant="secondary">Size: {product.size_code}</Badge>
                  {product.quality_class && (
                    <Badge variant="secondary">{product.quality_class}</Badge>
                  )}
                </div>
              )}
              {product.packaging_name && (
                <p className="text-sm text-muted-foreground">
                  Packaging: {product.packaging_name}
                </p>
              )}
              <Button size="sm" variant="outline" className="w-full">
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
EOF

cat > src/app/calendar/page.tsx << 'EOF'
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Package } from 'lucide-react'
import { useCalendar } from '@/hooks/use-calendar'

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function CalendarPage() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const { calendarData, isLoading } = useCalendar()

  const countries = [...new Set(calendarData?.map(item => item.country) || [])]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Seasonal Calendar</h1>
        <p className="text-muted-foreground">
          View product availability throughout the year
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedCountry === null ? "default" : "outline"}
          onClick={() => setSelectedCountry(null)}
        >
          All Countries
        </Button>
        {countries.map((country) => (
          <Button
            key={country}
            variant={selectedCountry === country ? "default" : "outline"}
            onClick={() => setSelectedCountry(country)}
          >
            {country}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Availability</CardTitle>
          <CardDescription>
            Seasonal availability by product and country
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-2">Product</th>
                  <th className="text-left p-2">Country</th>
                  {months.map((month) => (
                    <th key={month} className="text-center p-1 text-xs">
                      {month}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={14} className="text-center p-4">Loading calendar...</td>
                  </tr>
                ) : calendarData
                  ?.filter(item => !selectedCountry || item.country === selectedCountry)
                  .map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{item.product_name}</p>
                            {item.variety_name && (
                              <p className="text-xs text-muted-foreground">{item.variety_name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.country}
                        </div>
                      </td>
                      {months.map((_, monthIndex) => {
                        const startMonth = new Date(item.start_date).getMonth()
                        const endMonth = new Date(item.end_date).getMonth()
                        const isAvailable = 
                          (startMonth <= endMonth && monthIndex >= startMonth && monthIndex <= endMonth) ||
                          (startMonth > endMonth && (monthIndex >= startMonth || monthIndex <= endMonth))
                        
                        return (
                          <td key={monthIndex} className="p-1">
                            <div className={`h-6 w-full rounded ${
                              isAvailable ? 'bg-green-500' : 'bg-gray-100'
                            }`} />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
EOF

# Create hooks
cat > src/hooks/use-suppliers.ts << 'EOF'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useSuppliers() {
  const { data: suppliers, isLoading, error } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('growers')
        .select('*')
        .order('name')
      
      if (error) throw error
      return data
    },
  })

  return { suppliers, isLoading, error }
}
EOF

cat > src/hooks/use-products.ts << 'EOF'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useProducts() {
  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_product_specs_complete')
        .select('*')
        .order('product_name')
      
      if (error) throw error
      return data
    },
  })

  return { products, isLoading, error }
}
EOF

cat > src/hooks/use-calendar.ts << 'EOF'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useCalendar() {
  const { data: calendarData, isLoading, error } = useQuery({
    queryKey: ['calendar'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_seasonal_calendar')
        .select('*')
        .order('start_date')
      
      if (error) throw error
      return data
    },
  })

  return { calendarData, isLoading, error }
}
EOF

echo "App setup complete!"