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
