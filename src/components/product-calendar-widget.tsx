'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Search, Calendar, MapPin, Filter, X } from 'lucide-react'
import { 
  useProductCalendar, 
  useRandomProducts, 
  useProductCategories,
  useSizeOptions as useCalendarSizeOptions,
  useActiveCertifications,
  type ProductCalendarData,
  type CalendarFilters 
} from '@/hooks/use-product-calendar'
import { cn } from '@/lib/utils'

const MONTHS = [
  { short: 'J', full: 'January', value: 'january' },
  { short: 'F', full: 'February', value: 'february' },
  { short: 'M', full: 'March', value: 'march' },
  { short: 'A', full: 'April', value: 'april' },
  { short: 'M', full: 'May', value: 'may' },
  { short: 'J', full: 'June', value: 'june' },
  { short: 'J', full: 'July', value: 'july' },
  { short: 'A', full: 'August', value: 'august' },
  { short: 'S', full: 'September', value: 'september' },
  { short: 'O', full: 'October', value: 'october' },
  { short: 'N', full: 'November', value: 'november' },
  { short: 'D', full: 'December', value: 'december' },
]

interface CountryRowProps {
  data: ProductCalendarData
  onCountryClick: (data: ProductCalendarData) => void
}

function CountryRow({ data, onCountryClick }: CountryRowProps) {
  return (
    <div 
      className="flex items-center gap-4 p-4 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
      onClick={() => onCountryClick(data)}
    >
      <div className="flex items-center gap-2 min-w-[200px]">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{data.country}</span>
        <Badge variant="secondary" className="text-xs">
          {data.suppliers.length} supplier{data.suppliers.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      
      <div className="flex gap-2">
        {MONTHS.map((month) => {
          const isAvailable = data.available_months.includes(month.value)
          return (
            <div
              key={month.value}
              className={cn(
                "w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-medium transition-colors",
                isAvailable
                  ? "bg-green-100 border-green-300 text-green-700"
                  : "bg-gray-50 border-gray-200 text-gray-400"
              )}
              title={`${month.full}${isAvailable ? ' - Available' : ' - Not available'}`}
            >
              {month.short}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface ProductSectionProps {
  productName: string
  countries: ProductCalendarData[]
  onCountryClick: (data: ProductCalendarData) => void
}

function ProductSection({ productName, countries, onCountryClick }: ProductSectionProps) {
  // Get intended use from the first country's data (should be same for all)
  const intendedUse = countries[0]?.intended_use
  
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-green-600" />
          {productName}{intendedUse ? ` (${intendedUse})` : ''}
        </CardTitle>
        <CardDescription>
          Available in {countries.length} countr{countries.length !== 1 ? 'ies' : 'y'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {countries.map((country) => (
          <CountryRow
            key={`${country.product_id}-${country.country}`}
            data={country}
            onCountryClick={onCountryClick}
          />
        ))}
      </CardContent>
    </Card>
  )
}

interface SupplierDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: ProductCalendarData | null
}

function SupplierDetailsModal({ open, onOpenChange, data }: SupplierDetailsModalProps) {
  if (!data) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {data.product_name} in {data.country}
          </DialogTitle>
          <DialogDescription>
            Available suppliers and their product specifications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Available months:</span>
            <div className="flex gap-1">
              {MONTHS.filter(m => data.available_months.includes(m.value)).map(month => (
                <Badge key={month.value} variant="secondary" className="text-xs">
                  {month.full}
                </Badge>
              ))}
            </div>
          </div>

          {data.suppliers.map((supplier) => (
            <Card key={supplier.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{supplier.name}</CardTitle>
                <CardDescription>
                  {(() => {
                    // Count unique size/availability combinations
                    const uniqueSpecs = new Set()
                    supplier.specs.forEach(spec => {
                      const availabilityKey = spec.available_months.sort().join(',')
                      const key = `${spec.size_name}-${availabilityKey}`
                      uniqueSpecs.add(key)
                    })
                    const count = uniqueSpecs.size
                    return `${count} specification${count !== 1 ? 's' : ''} available`
                  })()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {(() => {
                    // Group specs by size and availability
                    const grouped = supplier.specs.reduce((acc, spec) => {
                      const availabilityKey = spec.available_months.sort().join(',')
                      const key = `${spec.size_name}-${availabilityKey}`
                      
                      if (!acc[key]) {
                        acc[key] = {
                          size_name: spec.size_name,
                          available_months: spec.available_months,
                          packaging_options: []
                        }
                      }
                      
                      acc[key].packaging_options.push(spec.packaging_label)
                      return acc
                    }, {} as Record<string, {
                      size_name: string
                      available_months: string[]
                      packaging_options: string[]
                    }>)

                    return Object.values(grouped).map((group, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">
                            {group.packaging_options.join('/')} - {group.size_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Available: {group.available_months.map(m => 
                              MONTHS.find(month => month.value === m)?.full
                            ).join(', ')}
                          </div>
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function ProductCalendarWidget() {
  const [searchTerm, setSearchTerm] = useState('')
  const [displaySearch, setDisplaySearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all-categories')
  const [selectedSize, setSelectedSize] = useState('all-sizes')
  const [selectedCertification, setSelectedCertification] = useState('all-certifications')
  const [selectedCountry, setSelectedCountry] = useState<ProductCalendarData | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const { data: randomProducts } = useRandomProducts()
  const { data: categories } = useProductCategories()
  const { data: sizeOptions } = useCalendarSizeOptions()
  const { data: certifications, isLoading: certificationsLoading, error: certificationsError } = useActiveCertifications()
  
  // Debug logging
  console.log('Active certifications data:', { certifications, certificationsLoading, certificationsError })
  
  // Build filters object
  const filters: CalendarFilters = {
    searchTerm,
    category: selectedCategory && selectedCategory !== 'all-categories' ? selectedCategory : undefined,
    sizeOption: selectedSize && selectedSize !== 'all-sizes' ? selectedSize : undefined,
    certificationId: selectedCertification && selectedCertification !== 'all-certifications' ? selectedCertification : undefined,
  }
  
  const { data: calendarData, isLoading, error } = useProductCalendar(filters)

  // For default view, show data for random products when no filters are applied
  const hasFilters = searchTerm || (selectedCategory && selectedCategory !== 'all-categories') || (selectedSize && selectedSize !== 'all-sizes') || (selectedCertification && selectedCertification !== 'all-certifications')
  const displayData = hasFilters ? calendarData : 
    calendarData?.filter(item => randomProducts?.includes(item.product_name))

  // Group data by product
  const groupedData = displayData?.reduce((acc, item) => {
    if (!acc[item.product_name]) {
      acc[item.product_name] = []
    }
    acc[item.product_name].push(item)
    return acc
  }, {} as Record<string, ProductCalendarData[]>) || {}

  const handleSearch = () => {
    setSearchTerm(displaySearch)
  }

  const handleCountryClick = (data: ProductCalendarData) => {
    setSelectedCountry(data)
    setShowDetails(true)
  }

  const clearFilters = () => {
    setDisplaySearch('')
    setSearchTerm('')
    setSelectedCategory('all-categories')
    setSelectedSize('all-sizes')
    setSelectedCertification('all-certifications')
  }

  // Helper to format category names for display
  const formatCategory = (category: string) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-green-600" />
            Product Availability Calendar
          </CardTitle>
          <CardDescription>
            View seasonal availability of products by country
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="space-y-4 mb-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for products (e.g. Iceberg Lettuce)..."
                  value={displaySearch}
                  onChange={(e) => setDisplaySearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch}>Search</Button>
              {hasFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            
            {/* Filter Row */}
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              
              <div className="flex gap-3">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-categories">All Categories</SelectItem>
                    {categories?.map((category) => (
                      <SelectItem key={category} value={category}>
                        {formatCategory(category)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedSize} onValueChange={setSelectedSize}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-sizes">All Sizes</SelectItem>
                    {sizeOptions?.map((size) => (
                      <SelectItem key={size.id} value={size.id}>
                        {size.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedCertification} onValueChange={setSelectedCertification}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Certification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-certifications">All Certifications</SelectItem>
                    {certifications?.map((certification) => (
                      <SelectItem key={certification.id} value={certification.id}>
                        {certification.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {hasFilters && (
                <div className="flex gap-1 ml-4">
                  {searchTerm && (
                    <Badge variant="secondary" className="text-xs">
                      Search: {searchTerm}
                    </Badge>
                  )}
                  {selectedCategory && selectedCategory !== 'all-categories' && (
                    <Badge variant="secondary" className="text-xs">
                      {formatCategory(selectedCategory)}
                    </Badge>
                  )}
                  {selectedSize && selectedSize !== 'all-sizes' && (
                    <Badge variant="secondary" className="text-xs">
                      {sizeOptions?.find(s => s.id === selectedSize)?.name}
                    </Badge>
                  )}
                  {selectedCertification && selectedCertification !== 'all-certifications' && (
                    <Badge variant="secondary" className="text-xs">
                      {certifications?.find(c => c.id === selectedCertification)?.name}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Month Legend */}
          <div className="flex items-center gap-2 mb-6 text-xs text-muted-foreground">
            <span>Months:</span>
            {MONTHS.map((month) => (
              <div key={month.value} className="flex flex-col items-center gap-1">
                <div className="w-6 h-6 rounded-full border flex items-center justify-center text-xs">
                  {month.short}
                </div>
              </div>
            ))}
          </div>

          {/* Results */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading calendar data...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-red-600">
              <p>Error loading calendar data. Please try again.</p>
            </div>
          )}

          {!isLoading && !error && Object.keys(groupedData).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                {hasFilters 
                  ? "No products found matching your filters. Try adjusting your search or filters."
                  : "No products available. Try searching for a specific product or use the filters above."}
              </p>
            </div>
          )}

          {!isLoading && !error && Object.keys(groupedData).length > 0 && (
            <div className="space-y-6">
              {!hasFilters && (
                <div className="text-sm text-muted-foreground mb-4">
                  Showing sample products. Use search or filters to find specific items.
                </div>
              )}
              
              {Object.entries(groupedData).map(([productName, countries]) => (
                <ProductSection
                  key={productName}
                  productName={productName}
                  countries={countries}
                  onCountryClick={handleCountryClick}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SupplierDetailsModal
        open={showDetails}
        onOpenChange={setShowDetails}
        data={selectedCountry}
      />
    </>
  )
}