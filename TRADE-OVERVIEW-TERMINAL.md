# Trade Overview Terminal - Bloomberg Style UI

## Overview
Transform the Trade Overview page into a Bloomberg-terminal style dashboard with real-time data, quick actions, and weather-based crop intelligence.

## Core Features

### 1. Layout Structure (Bloomberg Terminal Style)
```
┌─────────────────────────────────────────────────────────────────┐
│ TRADE OVERVIEW TERMINAL                        [LIVE] [ALERTS]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│ │ OPPORTUNITIES│ │ PRICE ALERTS │ │ EXPIRING     │             │
│ │      24      │ │      3       │ │      8       │             │
│ └──────────────┘ └──────────────┘ └──────────────┘             │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ┌─ QUICK QUOTE ────────────────┐ ┌─ WEATHER & CROP INTEL ─────┐│
│ │ Customer: [Dropdown]          │ │ Supplier: [Dropdown]        ││
│ │ Product:  [Dropdown]          │ │ Location: Spain, Valencia   ││
│ │ Price:    €2.50/kg           │ │                             ││
│ │ Margin:   15%                 │ │ ┌─ 14 DAY HISTORY ────┐   ││
│ │ [SEND QUOTE]                  │ │ │ ☀️☀️🌧️⛅☀️☀️☁️    │   ││
│ │                               │ │ │ 18° 22° 15° 19° 21°  │   ││
│ │ Recent Feedback:              │ │ └──────────────────────┘   ││
│ │ [Feedback Form]               │ │                             ││
│ └───────────────────────────────┘ │ ┌─ 14 DAY FORECAST ───┐   ││
│                                   │ │ ☀️⛅☁️🌧️☀️☀️☀️    │   ││
│                                   │ │ 23° 20° 18° 16° 22°  │   ││
│ ┌─ ACTIVE OPPORTUNITIES ────────┐ │ └──────────────────────┘   ││
│ │ [Grid/Table View]             │ │                             ││
│ │ - Customer → Supplier → Price │ │ 🌾 CROP INTELLIGENCE      ││
│ │ - Status | Actions            │ │ Product: Iceberg Lettuce   ││
│ │                               │ │                             ││
│ └───────────────────────────────┘ │ ✅ Quality: EXCELLENT      ││
│                                   │ Heavy rain 5 days ago      ││
│                                   │ promoted strong growth.    ││
│                                   │                             ││
│                                   │ ⚠️ ALERT: Heat wave        ││
│                                   │ expected in 3 days -       ││
│                                   │ harvest recommended soon   ││
│                                   │                             ││
│                                   │ 📊 Historical Context:     ││
│                                   │ Similar conditions in 2023 ││
│                                   │ yielded premium quality    ││
│                                   └─────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 2. Weather Integration
**Data Source:** OpenWeatherMap API (or similar)
- **Historical 14 days:** Temperature, precipitation, humidity, sunshine hours
- **Forecast 14 days:** Temperature, precipitation probability, wind
- **Location:** Based on supplier's city/coordinates

**Visual Display:**
- Weather icons (☀️🌧️⛅☁️🌨️)
- Temperature graph/chart
- Precipitation bars
- Color coding (good/warning/bad conditions)

### 3. Crop Intelligence Engine

**Rules-Based System:**

#### Lettuce (Iceberg, Romaine, etc.)
```javascript
// Ideal conditions
temperature: 15-20°C
rainfall: Moderate (10-20mm/week)
sunshine: 6-8 hours/day

// Quality impacts
- Heavy rain (>30mm/day) within 7 days of harvest: ⚠️ Risk of rot
- Temperature >25°C sustained: ⚠️ Bolting risk, bitter taste
- Temperature <5°C: ⚠️ Frost damage risk
- Optimal conditions 2 weeks before harvest: ✅ Premium quality
- Drought (no rain 14+ days): ⚠️ Small heads, tough texture

// Growth stage intelligence
- Planted 2-4 weeks ago + good rain: ✅ Strong germination
- 6-8 weeks old + cool temps: ✅ Ready for harvest
- Mature crop + heat wave forecast: 🚨 URGENT: Harvest immediately
```

#### Tomatoes
```javascript
temperature: 20-30°C
rainfall: Moderate, avoid heavy rain near harvest
sunshine: 8+ hours/day

// Quality impacts
- Heavy rain near harvest: ⚠️ Split fruit, reduced shelf life
- Cool nights (<15°C): ⚠️ Slow ripening
- Heat wave (>35°C): ⚠️ Sunscald, reduced fruit set
- Optimal sun + warmth: ✅ Excellent sugar content
```

#### Cabbage (Chinese, Regular)
```javascript
temperature: 15-20°C
rainfall: Moderate to high
sunshine: 6-8 hours/day

// Quality impacts
- Frost (<0°C): ⚠️ Damaged outer leaves
- Heat (>28°C): ⚠️ Premature bolting
- Heavy rain during head formation: ⚠️ Split heads
- Cool + moist: ✅ Crisp, solid heads
```

### 4. Quick Quote Panel
**Features:**
- Customer selector (autocomplete)
- Product selector with specs
- Auto-populated pricing from supplier prices
- Editable margin %
- Transport cost calculator
- Send quote button → Creates opportunity with "offered" status
- Stores quote sent date

### 5. Quick Feedback Panel
**Features:**
- Select opportunity from recent quotes
- Feedback status dropdown (Interested, Not Interested, Price Too High, etc.)
- Notes textarea
- Timestamp tracking
- Updates opportunity feedback status

### 6. Real-Time Updates
- WebSocket or polling for live data
- Flash updates when new opportunities created
- Alert notifications for price changes
- Expiring soon warnings

### 7. Color Scheme (Bloomberg Style)
```css
Background: #0A0E27 (dark navy)
Primary panels: #141B2D (slightly lighter navy)
Borders: #1E2942 (muted blue)
Text primary: #FFFFFF
Text secondary: #8B93A7
Success/Green: #00C853 (bright green)
Warning/Yellow: #FFB300 (amber)
Alert/Red: #FF3B3B (bright red)
Accent/Blue: #2196F3 (bright blue)
```

### 8. Data Requirements

#### Weather API Integration
```typescript
interface WeatherData {
  location: {
    city: string
    country: string
    lat: number
    lon: number
  }
  historical: WeatherDay[]  // 14 days
  forecast: WeatherDay[]    // 14 days
}

interface WeatherDay {
  date: string
  temp_avg: number
  temp_min: number
  temp_max: number
  precipitation: number
  humidity: number
  sunshine_hours: number
  wind_speed: number
  conditions: string // 'sunny' | 'cloudy' | 'rain' | 'storm'
}
```

#### Crop Intelligence Rules
```typescript
interface CropRule {
  product_category: string
  ideal_conditions: {
    temp_min: number
    temp_max: number
    rainfall_weekly: { min: number, max: number }
    sunshine_min: number
  }
  quality_alerts: CropAlert[]
  growth_insights: GrowthInsight[]
}

interface CropAlert {
  condition: string // e.g., "heavy_rain_before_harvest"
  severity: 'warning' | 'alert' | 'critical'
  message: string
  timeframe: number // days
}
```

### 9. Implementation Phases

**Phase 1: UI Framework**
- Create Bloomberg-style layout
- Dark theme styling
- Panel components
- Responsive grid

**Phase 2: Quick Actions**
- Quick Quote panel with form
- Quick Feedback panel
- Integration with opportunities API

**Phase 3: Weather Integration**
- OpenWeatherMap API setup
- Historical data fetch
- Forecast data fetch
- Visual weather displays (charts/icons)

**Phase 4: Crop Intelligence**
- Rules engine for common products
- Weather condition analysis
- Quality predictions
- Alert generation

**Phase 5: Real-Time Features**
- Live updates
- Notifications
- Auto-refresh

### 10. API Endpoints Needed

```typescript
// Weather
GET /api/weather/supplier/:supplierId
  → Returns weather data for supplier location

// Quick Quote
POST /api/opportunities/quick-quote
  {
    customer_id, product_spec_id, offer_price,
    supplier_id, supplier_price_id
  }
  → Creates opportunity with "offered" status

// Quick Feedback
POST /api/opportunities/:id/feedback
  {
    feedback_status, notes
  }
  → Updates opportunity feedback

// Crop Intelligence
GET /api/crop-intelligence/:supplierId/:productCategory
  → Returns crop quality analysis based on weather
```

### 11. Benefits
- **Speed:** Quick quote and feedback without navigation
- **Intelligence:** Weather-driven quality insights
- **Proactive:** Alerts for harvest timing, quality risks
- **Professional:** Bloomberg-style terminal commands attention
- **Efficiency:** All critical info in one view

## Next Steps
1. Set up weather API integration (OpenWeatherMap free tier)
2. Create terminal layout components
3. Build crop intelligence rules engine
4. Implement quick action panels
5. Add real-time updates
