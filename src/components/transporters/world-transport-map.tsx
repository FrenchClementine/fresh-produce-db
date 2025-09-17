'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useHubs } from '@/hooks/use-products'
import { useTransporterRoutes } from '@/hooks/use-transporters'
import { MapIcon, RouteIcon, Building2Icon } from 'lucide-react'

// Simple coordinate conversion for world map (rough approximation)
const latLngToPixel = (lat: number, lng: number, mapWidth: number, mapHeight: number) => {
  // Convert latitude/longitude to pixel coordinates for a basic world map
  const x = ((lng + 180) / 360) * mapWidth
  const y = ((90 - lat) / 180) * mapHeight
  return [x, y]
}

// Geocoding cache to avoid repeated API calls
const geocodingCache = new Map<string, [number, number] | null>()

// Automatic geocoding using Nominatim (free OpenStreetMap service)
const geocodeCity = async (cityName?: string, countryCode?: string): Promise<[number, number] | null> => {
  if (!cityName) return null
  
  const cacheKey = `${cityName}_${countryCode}`.toLowerCase()
  
  // Check cache first
  if (geocodingCache.has(cacheKey)) {
    return geocodingCache.get(cacheKey) || null
  }
  
  try {
    // Build search query
    let query = cityName
    if (countryCode) {
      query += `, ${countryCode}`
    }
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`
    )
    
    if (!response.ok) {
      geocodingCache.set(cacheKey, null)
      return null
    }
    
    const data = await response.json()
    
    if (data && data.length > 0) {
      const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)]
      geocodingCache.set(cacheKey, coords)
      console.log(`🗺️ Geocoded ${cityName}, ${countryCode}:`, coords)
      return coords
    }
    
    geocodingCache.set(cacheKey, null)
    return null
  } catch (error) {
    console.error(`❌ Geocoding failed for ${cityName}:`, error)
    geocodingCache.set(cacheKey, null)
    return null
  }
}

interface HubWithCoordinates {
  id: string
  name: string
  hub_code: string
  country_code?: string
  city_name?: string
  region?: string
  is_active: boolean
  coordinates: [number, number] | null
  pixelCoords?: [number, number]
}

interface RouteConnection {
  id: string
  origin: HubWithCoordinates
  destination: HubWithCoordinates
  transporter: string
  duration_days: number
  is_active: boolean
}

export function WorldTransportMap() {
  const [selectedHub, setSelectedHub] = useState<HubWithCoordinates | null>(null)
  const [hubsWithCoords, setHubsWithCoords] = useState<HubWithCoordinates[]>([])
  const [routeConnections, setRouteConnections] = useState<RouteConnection[]>([])
  const [geocodingInProgress, setGeocodingInProgress] = useState(false)

  const { hubs, isLoading: hubsLoading } = useHubs()
  const { data: transporterRoutes, isLoading: routesLoading } = useTransporterRoutes()

  // Process hubs and geocode them automatically
  useEffect(() => {
    const geocodeHubs = async () => {
      if (!hubs || hubs.length === 0) return
      
      console.log('🌍 Starting geocoding for', hubs.length, 'hubs...')
      setGeocodingInProgress(true)
      
      const geocodedHubs: HubWithCoordinates[] = []
      const mapWidth = 800
      const mapHeight = 400
      
      for (const hub of hubs) {
        const coordinates = await geocodeCity(hub.city_name, hub.country_code)
        
        let pixelCoords: [number, number] | undefined
        if (coordinates) {
          pixelCoords = latLngToPixel(coordinates[0], coordinates[1], mapWidth, mapHeight)
        }
        
        geocodedHubs.push({
          ...hub,
          coordinates,
          pixelCoords
        })
        
        // Small delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      const validHubs = geocodedHubs.filter(hub => hub.coordinates !== null)
      console.log(`✅ Successfully geocoded ${validHubs.length} out of ${hubs.length} hubs`)
      
      setHubsWithCoords(validHubs)
      setGeocodingInProgress(false)
    }
    
    geocodeHubs()
  }, [hubs])

  // Process routes when data is available
  useEffect(() => {
    if (transporterRoutes && hubsWithCoords.length > 0) {
      const connections: RouteConnection[] = []

      transporterRoutes.forEach(route => {
        const origin = hubsWithCoords.find(h => h.id === route.origin_hub_id)
        const destination = hubsWithCoords.find(h => h.id === route.destination_hub_id)
        
        if (origin && destination) {
          connections.push({
            id: route.id,
            origin,
            destination,
            transporter: route.transporters.name,
            duration_days: route.transport_duration_days,
            is_active: route.is_active
          })
        }
      })

      setRouteConnections(connections)
    }
  }, [transporterRoutes, hubsWithCoords])

  // Get routes for selected hub
  const getHubRoutes = (hubId: string) => {
    return routeConnections.filter(route => 
      route.origin.id === hubId || route.destination.id === hubId
    )
  }

  if (hubsLoading || routesLoading || geocodingInProgress) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">
              {geocodingInProgress ? 'Geocoding hub locations...' : 'Loading transport network...'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (hubsWithCoords.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapIcon className="h-6 w-6 text-blue-600" />
            Transport Network Map
          </CardTitle>
          <CardDescription>
            Interactive map showing hub locations and transportation routes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Building2Icon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p>No hubs could be located on the map.</p>
            <p className="text-sm mt-2">Make sure your hubs have valid city names and country codes.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapIcon className="h-6 w-6 text-blue-600" />
            Transport Network Map
          </CardTitle>
          <CardDescription>
            Interactive map showing hub locations and transportation routes. Click on hubs to see connections.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full h-96 rounded-lg overflow-hidden border bg-gray-100">
            {/* Simple world map background */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400" style={{ background: '#f3f4f6' }}>
              {/* Simplified world continents */}
              <g fill="#e5e7eb" stroke="#d1d5db" strokeWidth="1">
                {/* North America */}
                <path d="M 120 80 Q 140 60 180 70 L 220 80 Q 240 100 230 140 L 200 160 Q 170 150 140 130 Z" />
                <path d="M 80 120 Q 100 110 120 120 L 140 140 Q 120 160 100 150 L 80 140 Z" />
                
                {/* South America */}
                <path d="M 180 200 Q 200 180 220 200 L 230 280 Q 210 300 190 290 L 180 220 Z" />
                
                {/* Europe */}
                <path d="M 380 80 Q 420 70 450 80 L 460 120 Q 440 130 400 120 L 380 100 Z" />
                
                {/* Africa */}
                <path d="M 420 140 Q 460 130 480 150 L 490 240 Q 470 260 440 250 L 420 180 Z" />
                
                {/* Asia */}
                <path d="M 480 60 Q 580 50 640 80 L 680 120 Q 660 160 620 150 L 580 140 Q 540 120 480 100 Z" />
                <path d="M 520 160 Q 580 150 620 180 L 640 220 Q 600 240 560 230 L 520 200 Z" />
                
                {/* Australia */}
                <path d="M 620 260 Q 680 250 720 270 L 730 300 Q 700 310 650 300 L 620 280 Z" />
              </g>
              
              {/* Grid lines for reference */}
              <g stroke="#d1d5db" strokeWidth="0.5" opacity="0.3">
                <line x1="0" y1="200" x2="800" y2="200" /> {/* Equator */}
                <line x1="400" y1="0" x2="400" y2="400" /> {/* Prime Meridian */}
              </g>
            </svg>

            {/* Route lines - show when hub is selected */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {selectedHub && getHubRoutes(selectedHub.id).map((route) => {
                if (!route.origin.pixelCoords || !route.destination.pixelCoords) return null
                
                const [x1, y1] = route.origin.pixelCoords
                const [x2, y2] = route.destination.pixelCoords
                
                return (
                  <line
                    key={route.id}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#22c55e"
                    strokeWidth={3}
                    strokeDasharray="8,4"
                    opacity={0.8}
                    className="animate-pulse"
                  />
                )
              })}
            </svg>

            {/* Hub markers */}
            {hubsWithCoords.map((hub) => {
              if (!hub.pixelCoords) return null
              
              const [x, y] = hub.pixelCoords
              const isSelected = selectedHub?.id === hub.id
              
              return (
                <div
                  key={hub.id}
                  className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2"
                  style={{ left: x, top: y }}
                  onClick={() => setSelectedHub(isSelected ? null : hub)}
                >
                  <div
                    className={`
                      w-3 h-3 rounded-full border-2 border-white shadow-lg
                      ${hub.is_active ? 'bg-green-500 animate-pulse' : 'bg-green-300'}
                      ${isSelected ? 'w-4 h-4' : ''}
                      transition-all duration-200 hover:scale-125
                    `}
                  />
                  {isSelected && (
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded shadow-lg text-xs font-medium whitespace-nowrap z-10">
                      {hub.hub_code}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-8 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 border border-white animate-pulse"></div>
              <span>Active Hubs</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-300 border border-white"></div>
              <span>Inactive Hubs</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-px bg-green-500 border-t-3 border-dashed"></div>
              <span>Route Connections</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hub Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Building2Icon className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{hubsWithCoords.filter(h => h.is_active).length}</p>
                <p className="text-sm text-muted-foreground">Active Hubs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <RouteIcon className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{routeConnections.filter(r => r.is_active).length}</p>
                <p className="text-sm text-muted-foreground">Active Routes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <MapIcon className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">
                  {new Set(routeConnections.map(r => r.transporter)).size}
                </p>
                <p className="text-sm text-muted-foreground">Transporters</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Hub Details */}
      {selectedHub && (
        <Card>
          <CardHeader>
            <CardTitle>Hub Details: {selectedHub.name}</CardTitle>
            <CardDescription>
              {selectedHub.city_name}, {selectedHub.country_code} • {selectedHub.hub_code}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h4 className="font-medium mb-3">Connected Routes ({getHubRoutes(selectedHub.id).length})</h4>
              {getHubRoutes(selectedHub.id).map((route) => (
                <div key={route.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <RouteIcon className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-medium">
                        {route.origin.id === selectedHub.id 
                          ? `To ${route.destination.name}` 
                          : `From ${route.origin.name}`
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">
                        via {route.transporter} • {route.duration_days} days
                      </p>
                    </div>
                  </div>
                  <Badge variant={route.is_active ? "default" : "secondary"}>
                    {route.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              ))}
              {getHubRoutes(selectedHub.id).length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No routes connected to this hub
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}