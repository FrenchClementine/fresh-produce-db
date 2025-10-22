# Weather API Setup for Trade Overview Terminal

## Overview
The Trade Overview Terminal includes weather-based crop intelligence. Currently using mock data, but can be connected to OpenWeatherMap API for real weather data.

## Getting Started with OpenWeatherMap (Free Tier)

### 1. Sign Up for Free API Key
1. Go to [OpenWeatherMap](https://openweathermap.org/api)
2. Click "Sign Up" (top right)
3. Create a free account
4. Verify your email
5. Go to [API Keys](https://home.openweathermap.org/api_keys)
6. Copy your API key

### 2. Free Tier Limits
- **1,000 API calls per day** (plenty for our use case)
- **Current weather data**
- **5-day/3-hour forecast**
- **16-day daily forecast** (requires paid plan, but we can work with 5-day)

### 3. Add API Key to Environment

Add to `.env.local`:
```bash
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_api_key_here
```

## API Endpoints We'll Use

### Historical Weather (via One Call API 3.0)
```
GET https://api.openweathermap.org/data/3.0/onecall/timemachine?lat={lat}&lon={lon}&dt={timestamp}&appid={API_KEY}
```

### 5-Day Forecast
```
GET https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={API_KEY}&units=metric
```

### Current Weather
```
GET https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={API_KEY}&units=metric
```

## Implementation Plan

### Phase 1: Current Implementation (✅ Done)
- Mock weather data for demonstration
- Crop intelligence rules engine
- Bloomberg terminal UI

### Phase 2: Real Weather Integration (Next)
1. Create API route handler at `/api/weather/[supplierId]`
2. Fetch supplier coordinates from database
3. Call OpenWeatherMap API
4. Cache results (1 hour TTL to save API calls)
5. Return formatted weather datat

### Phase 3: Enhanced Features
- Historical data aggregation
- Weather pattern recognition
- Seasonal crop quality predictions
- Alert notifications for critical weather events

## Sample API Route Implementation

```typescript
// /src/app/api/weather/[supplierId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { supplierId: string } }
) {
  const { supplierId } = params

  // Get supplier location
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('city, country, latitude, longitude')
    .eq('id', supplierId)
    .single()

  if (!supplier?.latitude || !supplier?.longitude) {
    return NextResponse.json({ error: 'Supplier location not found' }, { status: 404 })
  }

  // Fetch weather from OpenWeatherMap
  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${supplier.latitude}&lon=${supplier.longitude}&appid=${apiKey}&units=metric`

  const response = await fetch(forecastUrl)
  const weatherData = await response.json()

  // Transform and return
  return NextResponse.json({
    location: {
      city: supplier.city,
      country: supplier.country,
      lat: supplier.latitude,
      lon: supplier.longitude
    },
    forecast: weatherData.list.map((item: any) => ({
      date: item.dt_txt,
      temp: item.main.temp,
      precipitation: item.rain?.['3h'] || 0,
      humidity: item.main.humidity,
      conditions: item.weather[0].main
    }))
  })
}
```

## Cost Estimation

**Free Tier:**
- 1,000 calls/day
- If we cache for 1 hour and have 50 suppliers viewed per day
- ~50 API calls/day (well within limit)

**Paid Tier (if needed):**
- $0.0015 per call
- ~1,500 calls/month = $2.25/month
- Historical data access included

## Database Updates Needed

Add coordinates to suppliers table:
```sql
ALTER TABLE suppliers ADD COLUMN latitude DECIMAL(10, 8);
ALTER TABLE suppliers ADD COLUMN longitude DECIMAL(11, 8);
```

Can populate using geocoding API or manual entry for key suppliers.

## Next Steps

1. ✅ Get OpenWeatherMap API key
2. ✅ Add to environment variables
3. ⏳ Add latitude/longitude to suppliers table
4. ⏳ Create `/api/weather/[supplierId]` route
5. ⏳ Update `WeatherCropIntel` component to fetch real data
6. ⏳ Implement caching layer
7. ⏳ Add error handling and fallback to mock data
