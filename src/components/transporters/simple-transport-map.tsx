'use client'

import { useState, useEffect } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker
} from 'react-simple-maps'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useHubs } from '@/hooks/use-products'
import { useTransporterRoutes } from '@/hooks/use-transporters'
import { Map, Route, Building2 } from 'lucide-react'

// World map topology URL
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@3/countries-50m.json"

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
}

interface RouteConnection {
  id: string
  origin: HubWithCoordinates
  destination: HubWithCoordinates
  transporter: string
  duration_days: number
  is_active: boolean
}

export function SimpleTransportMap() {
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
      
      for (const hub of hubs) {
        const coordinates = await geocodeCity(hub.city_name, hub.country_code)
        
        geocodedHubs.push({
          ...hub,
          coordinates
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
            <Map className="h-6 w-6 text-blue-600" />
            Transport Network Map
          </CardTitle>
          <CardDescription>
            Interactive map showing hub locations and transportation routes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
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
            <Map className="h-6 w-6 text-blue-600" />
            Transport Network Map
          </CardTitle>
          <CardDescription>
            Interactive map showing hub locations and transportation routes. Click on hubs to see connections.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-96 rounded-lg overflow-hidden border bg-slate-50">
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{
                scale: 140,
                center: [10, 50] // Centered on Europe
              }}
              width={800}
              height={400}
              style={{ width: '100%', height: '100%' }}
            >
              {/* World map background */}
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#e5e7eb"
                      stroke="#d1d5db"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none' },
                        hover: { outline: 'none', fill: '#d1d5db' },
                        pressed: { outline: 'none' }
                      }}
                    />
                  ))
                }
              </Geographies>

              {/* Route lines - show when hub is selected */}
              {selectedHub && getHubRoutes(selectedHub.id).map((route) => {
                const [fromLat, fromLng] = route.origin.coordinates!
                const [toLat, toLng] = route.destination.coordinates!
                
                return (
                  <g key={route.id}>
                    <line
                      x1={fromLng}
                      y1={fromLat}
                      x2={toLng}
                      y2={toLat}
                      stroke="#22c55e"
                      strokeWidth={2}
                      strokeDasharray="5,5"
                      opacity={0.8}
                    />
                  </g>
                )
              })}

              {/* Hub markers */}
              {hubsWithCoords.map((hub) => (
                <Marker
                  key={hub.id}
                  coordinates={hub.coordinates!}
                  onClick={() => setSelectedHub(selectedHub?.id === hub.id ? null : hub)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    r={selectedHub?.id === hub.id ? 8 : 6}
                    fill={hub.is_active ? '#22c55e' : '#86efac'}
                    stroke="#ffffff"
                    strokeWidth={2}
                    className={hub.is_active ? 'animate-pulse' : ''}
                  />
                  <text
                    textAnchor="middle"
                    y={-12}
                    fontSize={10}
                    fill="#374151"
                    fontWeight="500"
                  >
                    {hub.hub_code}
                  </text>
                </Marker>
              ))}
            </ComposableMap>
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
              <div className="w-6 h-px bg-green-500 border-t-2 border-dashed border-green-500"></div>
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
              <Building2 className="h-5 w-5 text-blue-600" />
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
              <Route className="h-5 w-5 text-green-600" />
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
              <Map className="h-5 w-5 text-purple-600" />
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
                    <Route className="h-4 w-4 text-blue-600" />
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