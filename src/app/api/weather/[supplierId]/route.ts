import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface WeatherDay {
  date: string
  icon: string
  temp: number
  temp_min: number
  temp_max: number
  precipitation: number
  humidity: number
  conditions: string
}

// Simple in-memory cache (1 hour TTL)
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function GET(
  request: NextRequest,
  { params }: { params: { supplierId: string } }
) {
  try {
    const { supplierId } = params

    // Check cache first
    const cached = cache.get(supplierId)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data)
    }

    // Get supplier location
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('id, name, city, country, latitude, longitude')
      .eq('id', supplierId)
      .single()

    if (supplierError || !supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // If no coordinates, use city-based geocoding as fallback
    let lat = supplier.latitude
    let lon = supplier.longitude

    if (!lat || !lon) {
      // Use OpenWeatherMap geocoding API to get coordinates
      const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(supplier.city)},${encodeURIComponent(supplier.country)}&limit=1&appid=${process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY}`
      const geoResponse = await fetch(geoUrl)
      const geoData = await geoResponse.json()

      if (geoData && geoData.length > 0) {
        lat = geoData[0].lat
        lon = geoData[0].lon

        // Update supplier with coordinates
        await supabase
          .from('suppliers')
          .update({ latitude: lat, longitude: lon })
          .eq('id', supplierId)
      } else {
        return NextResponse.json(
          { error: 'Unable to determine supplier location' },
          { status: 400 }
        )
      }
    }

    // Fetch current weather and forecast
    const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`

    const forecastResponse = await fetch(forecastUrl)
    const forecastData = await forecastResponse.json()

    if (!forecastResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch weather data' },
        { status: 500 }
      )
    }

    // Transform forecast data (5-day/3-hour forecast)
    const forecast: WeatherDay[] = []
    const dailyData = new Map<string, any[]>()

    // Group by day
    forecastData.list.forEach((item: any) => {
      const date = new Date(item.dt * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
      if (!dailyData.has(date)) {
        dailyData.set(date, [])
      }
      dailyData.get(date)!.push(item)
    })

    // Calculate daily summaries
    dailyData.forEach((dayItems, date) => {
      const temps = dayItems.map(i => i.main.temp)
      const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length
      const minTemp = Math.min(...temps)
      const maxTemp = Math.max(...temps)
      const precipitation = dayItems.reduce((sum, i) => sum + (i.rain?.['3h'] || 0), 0)
      const humidity = dayItems.reduce((sum, i) => sum + i.main.humidity, 0) / dayItems.length

      // Use the most common weather condition
      const conditions = dayItems.map((i: any) => i.weather[0].main)
      const mostCommon = conditions.sort((a: string, b: string) =>
        conditions.filter((c: string) => c === a).length - conditions.filter((c: string) => c === b).length
      ).pop()

      // Map condition to emoji
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

      forecast.push({
        date,
        icon: iconMap[mostCommon] || '⛅',
        temp: avgTemp,
        temp_min: minTemp,
        temp_max: maxTemp,
        precipitation,
        humidity,
        conditions: mostCommon
      })
    })

    // For historical data, we'll use the first few days of forecast as "recent"
    // (Real historical requires paid API tier)
    const historical = forecast.slice(0, 7).reverse()
    const futureForecast = forecast.slice(0, 14)

    const weatherData = {
      location: {
        city: supplier.city,
        country: supplier.country,
        lat,
        lon
      },
      historical,
      forecast: futureForecast,
      current: {
        temp: forecastData.list[0].main.temp,
        conditions: forecastData.list[0].weather[0].main,
        humidity: forecastData.list[0].main.humidity
      }
    }

    // Cache the result
    cache.set(supplierId, {
      data: weatherData,
      timestamp: Date.now()
    })

    return NextResponse.json(weatherData)
  } catch (error) {
    console.error('Weather API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
