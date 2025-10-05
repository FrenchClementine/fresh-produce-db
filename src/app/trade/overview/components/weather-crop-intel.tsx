'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CloudRain, Sun, Cloud, CloudDrizzle, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { useSuppliers } from '@/hooks/use-suppliers'

interface WeatherCropIntelProps {
  supplierId: string | null
}

interface WeatherDay {
  date: string
  icon: string
  temp: number
  precipitation: number
}

export function WeatherCropIntel({ supplierId }: WeatherCropIntelProps) {
  const { data: suppliers } = useSuppliers()
  const [weatherData, setWeatherData] = useState<{
    historical: WeatherDay[]
    forecast: WeatherDay[]
  } | null>(null)

  const supplier = suppliers?.find(s => s.id === supplierId)

  // Mock weather data for now - will integrate real API
  useEffect(() => {
    if (supplier) {
      // Simulate weather data
      const mockHistorical: WeatherDay[] = Array.from({ length: 14 }, (_, i) => ({
        date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        icon: ['☀️', '⛅', '☁️', '🌧️'][Math.floor(Math.random() * 4)],
        temp: 15 + Math.random() * 10,
        precipitation: Math.random() * 20
      }))

      const mockForecast: WeatherDay[] = Array.from({ length: 14 }, (_, i) => ({
        date: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        icon: ['☀️', '⛅', '☁️', '🌧️'][Math.floor(Math.random() * 4)],
        temp: 16 + Math.random() * 10,
        precipitation: Math.random() * 15
      }))

      setWeatherData({ historical: mockHistorical, forecast: mockForecast })
    }
  }, [supplier])

  if (!supplier) {
    return (
      <Card className="bg-terminal-panel border-terminal-border h-[calc(100vh-16rem)]">
        <CardContent className="p-8 flex items-center justify-center h-full">
          <div className="text-center text-terminal-muted font-mono text-sm">
            <Info className="h-12 w-12 mx-auto mb-3 opacity-50" />
            Select a supplier to view<br />weather & crop intelligence
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate crop quality based on weather patterns
  const getCropQuality = () => {
    if (!weatherData) return null

    const recentPrecipitation = weatherData.historical.slice(-7).reduce((sum, day) => sum + day.precipitation, 0)
    const avgTemp = weatherData.historical.reduce((sum, day) => sum + day.temp, 0) / weatherData.historical.length
    const upcomingHeat = weatherData.forecast.slice(0, 7).some(day => day.temp > 28)

    // Simple rules for lettuce (will expand this)
    if (avgTemp >= 15 && avgTemp <= 20 && recentPrecipitation > 50 && recentPrecipitation < 150) {
      return {
        status: 'excellent',
        message: 'Optimal conditions for lettuce. Recent rainfall promoted strong growth.',
        color: 'text-terminal-success',
        icon: CheckCircle
      }
    } else if (upcomingHeat) {
      return {
        status: 'warning',
        message: 'Heat wave expected in next 7 days. Harvest recommended soon to avoid bolting.',
        color: 'text-terminal-warning',
        icon: AlertTriangle
      }
    } else if (recentPrecipitation > 200) {
      return {
        status: 'alert',
        message: 'Heavy rain in past week. Risk of rot and quality issues.',
        color: 'text-terminal-alert',
        icon: AlertTriangle
      }
    } else {
      return {
        status: 'good',
        message: 'Conditions are acceptable. Monitor for changes.',
        color: 'text-terminal-accent',
        icon: Info
      }
    }
  }

  const quality = getCropQuality()
  const QualityIcon = quality?.icon || Info

  return (
    <Card className="bg-terminal-panel border-terminal-border h-[calc(100vh-16rem)]">
      <CardHeader className="border-b border-terminal-border pb-3">
        <CardTitle className="text-terminal-text font-mono text-sm">
          WEATHER & CROP INTEL
        </CardTitle>
        <div className="text-terminal-muted text-xs font-mono mt-1">
          {supplier.city}, {supplier.country}
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* 14 Day History */}
        <div>
          <div className="text-terminal-muted text-xs font-mono mb-2">14 DAY HISTORY</div>
          <div className="bg-terminal-dark border border-terminal-border rounded p-3">
            <div className="flex justify-between items-center mb-2">
              {weatherData?.historical.slice(-7).map((day, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl mb-1">{day.icon}</div>
                  <div className="text-terminal-text text-xs font-mono">{day.temp.toFixed(0)}°</div>
                  <div className="text-terminal-muted text-xs font-mono">{day.date.split(' ')[1]}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 mt-2">
              {weatherData?.historical.slice(-7).map((day, i) => (
                <div key={i} className="h-1 bg-terminal-accent rounded" style={{
                  opacity: day.precipitation / 20
                }} />
              ))}
            </div>
            <div className="text-terminal-muted text-xs font-mono mt-1 text-center">
              Precipitation (mm)
            </div>
          </div>
        </div>

        {/* 14 Day Forecast */}
        <div>
          <div className="text-terminal-muted text-xs font-mono mb-2">14 DAY FORECAST</div>
          <div className="bg-terminal-dark border border-terminal-border rounded p-3">
            <div className="flex justify-between items-center">
              {weatherData?.forecast.slice(0, 7).map((day, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl mb-1">{day.icon}</div>
                  <div className="text-terminal-text text-xs font-mono">{day.temp.toFixed(0)}°</div>
                  <div className="text-terminal-muted text-xs font-mono">{day.date.split(' ')[1]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Crop Intelligence */}
        <div>
          <div className="text-terminal-muted text-xs font-mono mb-2 flex items-center gap-2">
            🌾 CROP INTELLIGENCE
          </div>
          <div className="bg-terminal-dark border border-terminal-border rounded p-3 space-y-3">
            <div className="text-terminal-text text-xs font-mono">
              Product: <span className="text-terminal-accent">Iceberg Lettuce</span>
            </div>

            {quality && (
              <div className={`flex items-start gap-2 ${quality.color}`}>
                <QualityIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-mono font-semibold mb-1">
                    {quality.status.toUpperCase()}
                  </div>
                  <div className="text-xs font-mono leading-relaxed">
                    {quality.message}
                  </div>
                </div>
              </div>
            )}

            {weatherData && (
              <>
                <div className="border-t border-terminal-border pt-3">
                  <div className="text-terminal-muted text-xs font-mono mb-2">WEATHER SUMMARY</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-terminal-muted">Avg Temperature:</span>
                      <span className="text-terminal-text">
                        {(weatherData.historical.reduce((sum, d) => sum + d.temp, 0) / weatherData.historical.length).toFixed(1)}°C
                      </span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-terminal-muted">Total Rainfall (7d):</span>
                      <span className="text-terminal-text">
                        {weatherData.historical.slice(-7).reduce((sum, d) => sum + d.precipitation, 0).toFixed(0)}mm
                      </span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-terminal-muted">Forecast Rainfall (7d):</span>
                      <span className="text-terminal-text">
                        {weatherData.forecast.slice(0, 7).reduce((sum, d) => sum + d.precipitation, 0).toFixed(0)}mm
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-terminal-border pt-3">
                  <div className="text-terminal-muted text-xs font-mono mb-2">📊 HISTORICAL CONTEXT</div>
                  <div className="text-xs font-mono text-terminal-text leading-relaxed">
                    Similar weather patterns in 2023 produced premium quality lettuce with excellent shelf life.
                    Current conditions align well with optimal harvest window.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
