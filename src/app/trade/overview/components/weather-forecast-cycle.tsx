'use client'

import { useEffect, useState } from 'react'
import { useSuppliers } from '@/hooks/use-suppliers'

interface ForecastDay {
  date: string
  icon: string
  temp: number
  temp_min: number
  temp_max: number
  conditions: string
  precipitation: number
}

interface LocationForecast {
  city: string
  country: string
  forecast: ForecastDay[]
  description: string
  daysCount: number
}

export function WeatherForecastCycle() {
  const { data: suppliers } = useSuppliers()
  const [forecasts, setForecasts] = useState<LocationForecast[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [fadeIn, setFadeIn] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchForecastsForLocations = async () => {
      if (!suppliers || suppliers.length === 0) return

      // Get unique locations
      const uniqueLocations = new Map<string, string>()
      suppliers.forEach(supplier => {
        if (supplier.city && supplier.country) {
          const key = `${supplier.city}-${supplier.country}`
          if (!uniqueLocations.has(key)) {
            uniqueLocations.set(key, supplier.id)
          }
        }
      })

      // Fetch weather for up to 6 locations
      const locationIds = Array.from(uniqueLocations.values()).slice(0, 6)
      const forecastPromises = locationIds.map(async (supplierId) => {
        try {
          const response = await fetch(`/api/weather/${supplierId}`)
          if (!response.ok) return null

          const data = await response.json()

          // Get all available forecast days (API provides 5-6 days)
          const availableForecast = data.forecast

          // Generate weather description
          const description = generateWeatherDescription(availableForecast)

          return {
            city: data.location.city,
            country: data.location.country,
            forecast: availableForecast,
            description,
            daysCount: availableForecast.length
          }
        } catch (error) {
          console.error(`Failed to fetch forecast for ${supplierId}:`, error)
          return null
        }
      })

      const results = await Promise.all(forecastPromises)
      const validResults = results.filter(Boolean) as LocationForecast[]
      setForecasts(validResults)
      setLoading(false)
    }

    fetchForecastsForLocations()
  }, [suppliers])

  // Generate descriptive text about weather conditions
  const generateWeatherDescription = (forecast: ForecastDay[]): string => {
    if (!forecast || forecast.length === 0) return ''

    const avgTemp = forecast.reduce((sum, day) => sum + day.temp, 0) / forecast.length
    const conditions = forecast.map(day => day.conditions)
    const hasPrecipitation = forecast.some(day => day.precipitation > 0)

    // Count condition types
    const conditionCounts: Record<string, number> = {}
    conditions.forEach(c => {
      conditionCounts[c] = (conditionCounts[c] || 0) + 1
    })

    const dominantCondition = Object.entries(conditionCounts)
      .sort(([, a], [, b]) => b - a)[0][0]

    let line1 = `${Math.round(avgTemp)}°C avg`

    if (dominantCondition === 'Clear') {
      line1 += ', mostly sunny'
    } else if (dominantCondition === 'Clouds') {
      line1 += ', mostly cloudy'
    } else if (dominantCondition === 'Rain' || dominantCondition === 'Drizzle') {
      line1 += ', rain expected'
    }

    let line2 = ''
    if (hasPrecipitation) {
      const rainyDays = forecast.filter(day => day.precipitation > 0).length
      line2 = `${rainyDays} day${rainyDays !== 1 ? 's' : ''} with rain`
    } else {
      line2 = 'No precipitation expected'
    }

    return `${line1}. ${line2}.`
  }

  // Cycle through forecasts every 10 seconds
  useEffect(() => {
    if (forecasts.length === 0) return

    const interval = setInterval(() => {
      setFadeIn(false)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % forecasts.length)
        setFadeIn(true)
      }, 300)
    }, 10000)

    return () => clearInterval(interval)
  }, [forecasts.length])

  if (loading || forecasts.length === 0) {
    return (
      <div className="text-terminal-muted font-mono text-xs">
        Loading weather forecasts...
      </div>
    )
  }

  const current = forecasts[currentIndex]

  return (
    <div
      className="transition-opacity duration-300 flex items-center gap-1.5 w-full overflow-hidden"
      style={{ opacity: fadeIn ? 1 : 0 }}
    >
      {/* Location and Forecast Label */}
      <div className="flex flex-col gap-0 flex-shrink-0">
        <span className="text-terminal-text font-mono font-bold text-[10px] whitespace-nowrap leading-tight">
          {current.city.toUpperCase()} ({current.country})
        </span>
        <span className="text-terminal-muted font-mono text-[8px] whitespace-nowrap leading-tight">
          {current.daysCount}-DAY FORECAST
        </span>
      </div>

      {/* Forecast Row */}
      <div className="flex gap-1.5 flex-1 justify-end">
        {current.forecast.map((day, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="text-terminal-muted font-mono text-[7px] leading-tight">
              {day.date}
            </div>
            <div className="text-sm leading-tight">
              {day.icon}
            </div>
            <div className="text-terminal-text font-mono text-[10px] font-bold leading-tight">
              {Math.round(day.temp_max)}°
            </div>
            <div className="text-terminal-muted font-mono text-[8px] leading-tight">
              {Math.round(day.temp_min)}°
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
