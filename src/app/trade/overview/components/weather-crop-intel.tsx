'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CloudRain, Sun, Cloud, CloudDrizzle, AlertTriangle, CheckCircle, Info, Loader2 } from 'lucide-react'
import { useSuppliers, useSupplierProducts } from '@/hooks/use-suppliers'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface WeatherCropIntelProps {
  supplierId: string | null
  onSupplierChange: (supplierId: string) => void
}

interface WeatherDay {
  date: string
  icon: string
  temp: number
  temp_min?: number
  temp_max?: number
  precipitation: number
  humidity?: number
  conditions?: string
}

export function WeatherCropIntel({ supplierId, onSupplierChange }: WeatherCropIntelProps) {
  const { data: suppliers } = useSuppliers()
  const [weatherData, setWeatherData] = useState<{
    location?: { city: string; country: string; lat: number; lon: number }
    historical: WeatherDay[]
    forecast: WeatherDay[]
    current?: { temp: number; conditions: string; humidity: number }
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(supplierId)

  const supplier = suppliers?.find(s => s.id === (selectedSupplierId || supplierId))
  const { data: supplierProducts } = useSupplierProducts(selectedSupplierId || supplierId || '')

  // Update local state when prop changes
  useEffect(() => {
    if (supplierId) {
      setSelectedSupplierId(supplierId)
    }
  }, [supplierId])

  // Fetch real weather data from our API
  useEffect(() => {
    const currentSupplierId = selectedSupplierId || supplierId
    if (!currentSupplierId) {
      setWeatherData(null)
      return
    }

    const fetchWeather = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/weather/${currentSupplierId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch weather data')
        }

        const data = await response.json()
        setWeatherData(data)
      } catch (err) {
        console.error('Weather fetch error:', err)
        setError('Unable to load weather data')
        setWeatherData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchWeather()
  }, [selectedSupplierId, supplierId])

  if (!supplier && !selectedSupplierId) {
    return (
      <Card className="bg-terminal-panel border-terminal-border h-[calc(100vh-16rem)]">
        <CardHeader className="border-b border-terminal-border pb-3">
          <CardTitle className="text-terminal-text font-mono text-sm">
            WEATHER & CROP INTEL
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="mb-4">
            <Select
              value={selectedSupplierId || ''}
              onValueChange={(value) => {
                setSelectedSupplierId(value)
                onSupplierChange(value)
              }}
            >
              <SelectTrigger className="w-full bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                <SelectValue placeholder="Select a supplier..." />
              </SelectTrigger>
              <SelectContent className="bg-terminal-dark border-terminal-border">
                {suppliers?.map(s => (
                  <SelectItem key={s.id} value={s.id} className="font-mono text-terminal-text">
                    {s.name} - {s.city}, {s.country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-center text-terminal-muted font-mono text-sm mt-8">
            <Info className="h-12 w-12 mx-auto mb-3 opacity-50" />
            Select a supplier or click an opportunity<br />to view weather & crop intelligence
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
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
        <CardContent className="p-8 flex items-center justify-center h-full">
          <div className="text-center text-terminal-accent font-mono text-sm">
            <Loader2 className="h-12 w-12 mx-auto mb-3 animate-spin" />
            Loading weather data...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
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
        <CardContent className="p-8 flex items-center justify-center h-full">
          <div className="text-center text-terminal-alert font-mono text-sm">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3" />
            {error}
            <div className="text-xs text-terminal-muted mt-2">
              (Using geocoding to find location)
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Get primary product category from supplier's products
  const getPrimaryProduct = () => {
    if (!supplierProducts || supplierProducts.length === 0) return null
    // Get the first product (or you could add logic to select most common)
    return supplierProducts[0]?.product_packaging_specs?.products
  }

  // Calculate crop quality based on weather patterns and product type
  const getCropQuality = () => {
    if (!weatherData) return null

    const product = getPrimaryProduct()
    const productName = product?.name || 'Crop'
    const category = product?.category?.toLowerCase() || ''

    const recentPrecipitation = weatherData.historical.slice(-7).reduce((sum, day) => sum + day.precipitation, 0)
    const avgTemp = weatherData.historical.reduce((sum, day) => sum + day.temp, 0) / weatherData.historical.length
    const upcomingHeat = weatherData.forecast.slice(0, 7).some(day => day.temp > 30)
    const upcomingCold = weatherData.forecast.slice(0, 7).some(day => day.temp < 5)
    const heavyRainForecast = weatherData.forecast.slice(0, 7).reduce((sum, day) => sum + day.precipitation, 0) > 100

    // LEAFY GREENS (Lettuce, Spinach, Kale, Arugula)
    if (category.includes('leafy') || productName.toLowerCase().includes('lettuce') ||
        productName.toLowerCase().includes('spinach') || productName.toLowerCase().includes('kale')) {

      if (avgTemp >= 15 && avgTemp <= 22 && recentPrecipitation > 40 && recentPrecipitation < 150) {
        return {
          status: 'excellent',
          product: productName,
          message: 'Optimal growing conditions. Cool temperatures and moderate rainfall producing crisp, high-quality leaves with excellent shelf life.',
          color: 'text-terminal-success',
          icon: CheckCircle
        }
      } else if (upcomingHeat) {
        return {
          status: 'warning',
          product: productName,
          message: 'Heat stress alert. Temperatures above 30°C will cause bolting and bitter taste. Recommend early harvest within 48-72 hours.',
          color: 'text-terminal-warning',
          icon: AlertTriangle
        }
      } else if (recentPrecipitation > 200) {
        return {
          status: 'alert',
          product: productName,
          message: 'Excessive rainfall detected. High risk of leaf rot, mildew, and shortened shelf life. Quality degradation likely.',
          color: 'text-terminal-alert',
          icon: AlertTriangle
        }
      }
    }

    // TOMATOES
    if (category.includes('tomato') || productName.toLowerCase().includes('tomato')) {
      if (avgTemp >= 18 && avgTemp <= 27 && recentPrecipitation > 30 && recentPrecipitation < 100) {
        return {
          status: 'excellent',
          product: productName,
          message: 'Perfect ripening conditions. Warm days with moderate moisture producing optimal sugar development and firm texture.',
          color: 'text-terminal-success',
          icon: CheckCircle
        }
      } else if (recentPrecipitation > 150) {
        return {
          status: 'alert',
          product: productName,
          message: 'Heavy rainfall causing fruit splitting and water damage. Expect reduced Brix levels and shorter shelf life.',
          color: 'text-terminal-alert',
          icon: AlertTriangle
        }
      } else if (upcomingHeat) {
        return {
          status: 'warning',
          product: productName,
          message: 'High heat forecast will accelerate ripening. Harvest timing critical to avoid overripening during transport.',
          color: 'text-terminal-warning',
          icon: AlertTriangle
        }
      }
    }

    // PEPPERS (Bell, Chili, Sweet)
    if (category.includes('pepper') || productName.toLowerCase().includes('pepper')) {
      if (avgTemp >= 20 && avgTemp <= 30 && recentPrecipitation > 20 && recentPrecipitation < 80) {
        return {
          status: 'excellent',
          product: productName,
          message: 'Ideal conditions for color development. Warm, sunny weather producing vibrant colors and thick flesh with high vitamin C.',
          color: 'text-terminal-success',
          icon: CheckCircle
        }
      } else if (avgTemp < 15) {
        return {
          status: 'warning',
          product: productName,
          message: 'Cool temperatures slowing growth and color development. Extended maturity period expected, may impact supply timing.',
          color: 'text-terminal-warning',
          icon: AlertTriangle
        }
      } else if (recentPrecipitation < 20) {
        return {
          status: 'alert',
          product: productName,
          message: 'Drought stress detected. Risk of blossom end rot and reduced fruit size. Yield may be compromised.',
          color: 'text-terminal-alert',
          icon: AlertTriangle
        }
      }
    }

    // CUCUMBERS & ZUCCHINI
    if (category.includes('cucumber') || category.includes('zucchini') || category.includes('courgette') ||
        productName.toLowerCase().includes('cucumber') || productName.toLowerCase().includes('zucchini')) {

      if (avgTemp >= 18 && avgTemp <= 28 && recentPrecipitation > 50 && recentPrecipitation < 120) {
        return {
          status: 'excellent',
          product: productName,
          message: 'Premium growing weather. Consistent moisture and warmth producing straight, firm fruits with excellent crunch and minimal bitterness.',
          color: 'text-terminal-success',
          icon: CheckCircle
        }
      } else if (avgTemp > 32) {
        return {
          status: 'warning',
          product: productName,
          message: 'Extreme heat causing rapid growth and potential bitterness. Monitor for quality degradation and hollow fruits.',
          color: 'text-terminal-warning',
          icon: AlertTriangle
        }
      } else if (recentPrecipitation < 30) {
        return {
          status: 'alert',
          product: productName,
          message: 'Water stress evident. Fruits may be misshapen, bitter, and have poor texture. Yield reduction expected.',
          color: 'text-terminal-alert',
          icon: AlertTriangle
        }
      }
    }

    // CITRUS (Oranges, Lemons, Mandarins)
    if (category.includes('citrus') || productName.toLowerCase().includes('orange') ||
        productName.toLowerCase().includes('lemon') || productName.toLowerCase().includes('mandarin')) {

      if (avgTemp >= 15 && avgTemp <= 25 && recentPrecipitation > 30 && recentPrecipitation < 100) {
        return {
          status: 'excellent',
          product: productName,
          message: 'Optimal conditions for sugar accumulation. Cool nights and warm days enhancing flavor profile and juice content.',
          color: 'text-terminal-success',
          icon: CheckCircle
        }
      } else if (upcomingCold) {
        return {
          status: 'alert',
          product: productName,
          message: 'Frost risk detected. Temperatures below 5°C will damage fruit quality and cause rind damage. Harvest urgently if possible.',
          color: 'text-terminal-alert',
          icon: AlertTriangle
        }
      } else if (heavyRainForecast) {
        return {
          status: 'warning',
          product: productName,
          message: 'Heavy rain expected. Risk of fruit splitting and diluted juice content. Quality may be affected.',
          color: 'text-terminal-warning',
          icon: AlertTriangle
        }
      }
    }

    // STONE FRUIT (Peaches, Nectarines, Plums)
    if (category.includes('stone') || productName.toLowerCase().includes('peach') ||
        productName.toLowerCase().includes('nectarine') || productName.toLowerCase().includes('plum')) {

      if (avgTemp >= 20 && avgTemp <= 28 && recentPrecipitation > 20 && recentPrecipitation < 80) {
        return {
          status: 'excellent',
          product: productName,
          message: 'Perfect ripening window. Warm weather developing excellent Brix levels and aromatic compounds. Peak harvest quality.',
          color: 'text-terminal-success',
          icon: CheckCircle
        }
      } else if (recentPrecipitation > 100) {
        return {
          status: 'alert',
          product: productName,
          message: 'Heavy rainfall causing fruit cracking and accelerated ripening. Shelf life significantly reduced. Move inventory quickly.',
          color: 'text-terminal-alert',
          icon: AlertTriangle
        }
      } else if (upcomingHeat) {
        return {
          status: 'warning',
          product: productName,
          message: 'Heat spike incoming. Rapid ripening will compress harvest window. Coordinate logistics for immediate movement.',
          color: 'text-terminal-warning',
          icon: AlertTriangle
        }
      }
    }

    // BERRIES (Strawberries, Blueberries, Raspberries)
    if (category.includes('berr') || productName.toLowerCase().includes('berr')) {
      if (avgTemp >= 15 && avgTemp <= 25 && recentPrecipitation > 30 && recentPrecipitation < 80) {
        return {
          status: 'excellent',
          product: productName,
          message: 'Ideal berry conditions. Cool mornings and moderate sun producing firm fruit with excellent color and sugar balance.',
          color: 'text-terminal-success',
          icon: CheckCircle
        }
      } else if (recentPrecipitation > 120) {
        return {
          status: 'alert',
          product: productName,
          message: 'Critical: Excessive moisture causing gray mold (Botrytis) and soft fruit. Expect high reject rates and minimal shelf life.',
          color: 'text-terminal-alert',
          icon: AlertTriangle
        }
      } else if (upcomingHeat) {
        return {
          status: 'warning',
          product: productName,
          message: 'Heat stress alert. Delicate berries will soften rapidly. Cold chain critical. Reduce transit times if possible.',
          color: 'text-terminal-warning',
          icon: AlertTriangle
        }
      }
    }

    // BRASSICAS (Broccoli, Cauliflower, Cabbage)
    if (category.includes('brassica') || productName.toLowerCase().includes('broccoli') ||
        productName.toLowerCase().includes('cauliflower') || productName.toLowerCase().includes('cabbage')) {

      if (avgTemp >= 10 && avgTemp <= 20 && recentPrecipitation > 40 && recentPrecipitation < 120) {
        return {
          status: 'excellent',
          product: productName,
          message: 'Optimal cool-season conditions. Producing tight heads with excellent texture and minimal yellowing. Premium quality window.',
          color: 'text-terminal-success',
          icon: CheckCircle
        }
      } else if (avgTemp > 25) {
        return {
          status: 'warning',
          product: productName,
          message: 'Heat causing loose heads and premature flowering. Quality degradation and bitter flavor development likely.',
          color: 'text-terminal-warning',
          icon: AlertTriangle
        }
      } else if (upcomingCold && avgTemp < 5) {
        return {
          status: 'alert',
          product: productName,
          message: 'Frost damage risk. May cause browning and texture breakdown. Harvest before cold front if possible.',
          color: 'text-terminal-alert',
          icon: AlertTriangle
        }
      }
    }

    // ROOT VEGETABLES (Carrots, Potatoes, Onions)
    if (category.includes('root') || productName.toLowerCase().includes('carrot') ||
        productName.toLowerCase().includes('potato') || productName.toLowerCase().includes('onion')) {

      if (avgTemp >= 12 && avgTemp <= 24 && recentPrecipitation > 30 && recentPrecipitation < 100) {
        return {
          status: 'excellent',
          product: productName,
          message: 'Favorable growing conditions. Consistent moisture producing uniform size, good storage quality, and minimal splitting.',
          color: 'text-terminal-success',
          icon: CheckCircle
        }
      } else if (recentPrecipitation > 150) {
        return {
          status: 'alert',
          product: productName,
          message: 'Waterlogged soil conditions. Risk of rot, splitting, and poor storage characteristics. Quality concerns for long-term contracts.',
          color: 'text-terminal-alert',
          icon: AlertTriangle
        }
      }
    }

    // DEFAULT for unknown products
    return {
      status: 'good',
      product: productName,
      message: `Current weather conditions are within normal range for ${productName}. Continue monitoring for changes.`,
      color: 'text-terminal-accent',
      icon: Info
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
        <div className="mt-2">
          <Select
            value={selectedSupplierId || ''}
            onValueChange={(value) => {
              setSelectedSupplierId(value)
              onSupplierChange(value)
            }}
          >
            <SelectTrigger className="w-full bg-terminal-dark border-terminal-border text-terminal-text font-mono text-xs">
              <SelectValue placeholder="Select supplier..." />
            </SelectTrigger>
            <SelectContent className="bg-terminal-dark border-terminal-border">
              {suppliers?.map(s => (
                <SelectItem key={s.id} value={s.id} className="font-mono text-terminal-text text-xs">
                  {s.name} - {s.city}, {s.country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              Product: <span className="text-terminal-accent">{quality?.product || 'Iceberg Lettuce'}</span>
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
                  <div className="text-terminal-muted text-xs font-mono mb-2">📊 WEATHER OUTLOOK</div>
                  <div className="text-xs font-mono text-terminal-text leading-relaxed">
                    {(() => {
                      const past7Days = weatherData.historical.slice(-7)
                      const next7Days = weatherData.forecast.slice(0, 7)

                      const pastAvgTemp = past7Days.reduce((sum, d) => sum + d.temp, 0) / 7
                      const pastTotalRain = past7Days.reduce((sum, d) => sum + d.precipitation, 0)
                      const futureAvgTemp = next7Days.reduce((sum, d) => sum + d.temp, 0) / 7
                      const futureTotalRain = next7Days.reduce((sum, d) => sum + d.precipitation, 0)

                      // Past conditions
                      let pastDesc = ''
                      if (pastAvgTemp < 10) pastDesc = 'Cold'
                      else if (pastAvgTemp < 15) pastDesc = 'Cool'
                      else if (pastAvgTemp < 22) pastDesc = 'Mild'
                      else if (pastAvgTemp < 28) pastDesc = 'Warm'
                      else pastDesc = 'Hot'

                      let pastRainDesc = ''
                      if (pastTotalRain < 10) pastRainDesc = 'dry'
                      else if (pastTotalRain < 50) pastRainDesc = 'light rainfall'
                      else if (pastTotalRain < 100) pastRainDesc = 'moderate rainfall'
                      else if (pastTotalRain < 150) pastRainDesc = 'heavy rainfall'
                      else pastRainDesc = 'very heavy rainfall'

                      // Forecast
                      let futureDesc = ''
                      if (futureAvgTemp < 10) futureDesc = 'cold'
                      else if (futureAvgTemp < 15) futureDesc = 'cool'
                      else if (futureAvgTemp < 22) futureDesc = 'mild'
                      else if (futureAvgTemp < 28) futureDesc = 'warm'
                      else futureDesc = 'hot'

                      let futureRainDesc = ''
                      if (futureTotalRain < 10) futureRainDesc = 'dry conditions'
                      else if (futureTotalRain < 50) futureRainDesc = 'light showers'
                      else if (futureTotalRain < 100) futureRainDesc = 'moderate rain'
                      else if (futureTotalRain < 150) futureRainDesc = 'heavy rain'
                      else futureRainDesc = 'very heavy rain'

                      // Temperature trend
                      const tempChange = futureAvgTemp - pastAvgTemp
                      let trend = ''
                      if (Math.abs(tempChange) < 2) trend = 'stable temperatures'
                      else if (tempChange > 0) trend = `warming trend (+${tempChange.toFixed(1)}°C)`
                      else trend = `cooling trend (${tempChange.toFixed(1)}°C)`

                      return `${pastDesc} and ${pastRainDesc} over the past week (avg ${pastAvgTemp.toFixed(1)}°C, ${pastTotalRain.toFixed(0)}mm). Forecast shows ${futureDesc} conditions with ${futureRainDesc}, ${trend}.`
                    })()}
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
