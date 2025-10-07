'use client'

import { useEffect, useState } from 'react'
import { useSuppliers } from '@/hooks/use-suppliers'

interface WeatherTickerData {
  city: string
  country: string
  temp: number
  icon: string
  conditions: string
}

export function WeatherTicker() {
  const { data: suppliers } = useSuppliers()
  const [weatherData, setWeatherData] = useState<WeatherTickerData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchWeatherForSuppliers = async () => {
      if (!suppliers || suppliers.length === 0) return

      // Get unique locations (city + country combinations)
      const uniqueLocations = new Map<string, string>()
      suppliers.forEach(supplier => {
        if (supplier.city && supplier.country) {
          const key = `${supplier.city}-${supplier.country}`
          if (!uniqueLocations.has(key)) {
            uniqueLocations.set(key, supplier.id)
          }
        }
      })

      // Fetch weather for up to 8 locations
      const locationIds = Array.from(uniqueLocations.values()).slice(0, 8)
      const weatherPromises = locationIds.map(async (supplierId) => {
        try {
          const response = await fetch(`/api/weather/${supplierId}`)
          if (!response.ok) return null

          const data = await response.json()
          return {
            city: data.location.city,
            country: data.location.country,
            temp: Math.round(data.current.temp),
            icon: getWeatherIcon(data.current.conditions),
            conditions: data.current.conditions
          }
        } catch (error) {
          console.error(`Failed to fetch weather for ${supplierId}:`, error)
          return null
        }
      })

      const results = await Promise.all(weatherPromises)
      const validResults = results.filter(Boolean) as WeatherTickerData[]
      setWeatherData(validResults)
      setLoading(false)
    }

    fetchWeatherForSuppliers()
  }, [suppliers])

  const getWeatherIcon = (conditions: string): string => {
    const iconMap: Record<string, string> = {
      'Clear': '☀️',
      'Clouds': '☁️',
      'Rain': '🌧️',
      'Drizzle': '🌦️',
      'Thunderstorm': '⛈️',
      'Snow': '🌨️',
      'Mist': '🌫️',
      'Fog': '🌫️'
    }
    return iconMap[conditions] || '⛅'
  }

  if (loading || weatherData.length === 0) {
    return (
      <div className="animate-scroll whitespace-nowrap text-terminal-text font-mono text-sm inline-block">
        Loading weather data... • Loading weather data... • Loading weather data...
      </div>
    )
  }

  // Create ticker content with duplicated data for seamless scrolling
  const tickerContent = weatherData.map((weather, i) => (
    <span key={i}>
      🌍 {weather.city.toUpperCase()} ({weather.country}): {weather.icon} {weather.temp}°C {weather.conditions} •{' '}
    </span>
  ))

  return (
    <div className="animate-scroll whitespace-nowrap text-terminal-text font-mono text-sm inline-block">
      {tickerContent}
      {tickerContent}
    </div>
  )
}
