'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useHubs } from '@/hooks/use-products'
import { useTransporterRoutes } from '@/hooks/use-transporters'
import { Map, Route, Building2, MapPin } from 'lucide-react'

// Dynamic import to avoid SSR issues with Leaflet
const LeafletMap = dynamic(() => import('./leaflet-map-wrapper'), { ssr: false })

// Enhanced city geocoding for major European cities
const getCityCoordinates = (cityName?: string, countryCode?: string): [number, number] | null => {
  if (!cityName) return null
  
  // Normalize city name for better matching
  const normalizedCity = cityName.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[áàâä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòôö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
  
  const normalizedCountry = countryCode?.toLowerCase()
  const locationKey = `${normalizedCity}_${normalizedCountry}`
  
  const coordinates: Record<string, [number, number]> = {
    // Netherlands
    'amsterdam_nl': [52.3676, 4.9041],
    'rotterdam_nl': [51.9225, 4.4792],
    'thehague_nl': [52.0705, 4.3007],
    'utrecht_nl': [52.0907, 5.1214],
    'eindhoven_nl': [51.4416, 5.4697],
    
    // Germany
    'berlin_de': [52.5200, 13.4050],
    'hamburg_de': [53.5511, 9.9937],
    'munich_de': [48.1351, 11.5820],
    'cologne_de': [50.9375, 6.9603],
    'frankfurt_de': [50.1109, 8.6821],
    'dusseldorf_de': [51.2277, 6.7735],
    
    // France
    'paris_fr': [48.8566, 2.3522],
    'lyon_fr': [45.7640, 4.8357],
    'marseille_fr': [43.2965, 5.3698],
    'toulouse_fr': [43.6047, 1.4442],
    'nice_fr': [43.7102, 7.2620],
    'strasbourg_fr': [48.5734, 7.7521],
    
    // Spain
    'madrid_es': [40.4168, -3.7038],
    'barcelona_es': [41.3851, 2.1734],
    'valencia_es': [39.4699, -0.3763],
    'seville_es': [37.3891, -5.9845],
    'bilbao_es': [43.2627, -2.9253],
    
    // Italy
    'rome_it': [41.9028, 12.4964],
    'milan_it': [45.4642, 9.1900],
    'naples_it': [40.8518, 14.2681],
    'turin_it': [45.0703, 7.6869],
    'florence_it': [43.7696, 11.2558],
    'bologna_it': [44.4949, 11.3426],
    'salerno_it': [40.6824, 14.7681],
    'bari_it': [41.1171, 16.8719],
    'palermo_it': [38.1157, 13.3613],
    'catania_it': [37.5079, 15.0830],
    'venice_it': [45.4408, 12.3155],
    'genoa_it': [44.4056, 8.9463],
    
    // United Kingdom
    'london_gb': [51.5074, -0.1278],
    'london_uk': [51.5074, -0.1278],
    'manchester_gb': [53.4808, -2.2426],
    'manchester_uk': [53.4808, -2.2426],
    'birmingham_gb': [52.4862, -1.8904],
    'liverpool_gb': [53.4084, -2.9916],
    'edinburgh_gb': [55.9533, -3.1883],
    
    // Belgium
    'brussels_be': [50.8476, 4.3572],
    'antwerp_be': [51.2194, 4.4025],
    'ghent_be': [51.0543, 3.7174],
    'liege_be': [50.6326, 5.5797],
    
    // Switzerland
    'zurich_ch': [47.3769, 8.5417],
    'geneva_ch': [46.2044, 6.1432],
    'basel_ch': [47.5596, 7.5886],
    'bern_ch': [46.9480, 7.4474],
    
    // Austria
    'vienna_at': [48.2082, 16.3738],
    'salzburg_at': [47.8095, 13.0550],
    'innsbruck_at': [47.2692, 11.4041],
    
    // Poland
    'warsaw_pl': [52.2297, 21.0122],
    'krakow_pl': [50.0647, 19.9450],
    'gdansk_pl': [54.3520, 18.6466],
    
    // Czech Republic
    'prague_cz': [50.0755, 14.4378],
    'brno_cz': [49.1951, 16.6068],
    
    // Portugal
    'lisbon_pt': [38.7223, -9.1393],
    'porto_pt': [41.1579, -8.6291],
    
    // Denmark
    'copenhagen_dk': [55.6761, 12.5683],
    'aarhus_dk': [56.1629, 10.2039],
    
    // Sweden
    'stockholm_se': [59.3293, 18.0686],
    'gothenburg_se': [57.7089, 11.9746],
    'malmo_se': [55.6050, 13.0038],
    
    // Norway
    'oslo_no': [59.9139, 10.7522],
    'bergen_no': [60.3913, 5.3221],
    
    // Greece
    'athens_gr': [37.9755, 23.7348],
    'thessaloniki_gr': [40.6401, 22.9444],
    'patras_gr': [38.2466, 21.7346],
    'heraklion_gr': [35.3387, 25.1442],
    
    // Turkey
    'istanbul_tr': [41.0082, 28.9784],
    'ankara_tr': [39.9334, 32.8597],
    'izmir_tr': [38.4192, 27.1287],
    
    // Bulgaria
    'sofia_bg': [42.6977, 23.3219],
    'plovdiv_bg': [42.1354, 24.7453],
    'varna_bg': [43.2141, 27.9147],
    
    // Romania
    'bucharest_ro': [44.4268, 26.1025],
    'cluj_ro': [46.7712, 23.6236],
    
    // Hungary
    'budapest_hu': [47.4979, 19.0402],
    'debrecen_hu': [47.5316, 21.6273],
    
    // Slovakia
    'bratislava_sk': [48.1486, 17.1077],
    'kosice_sk': [48.7164, 21.2611],
    
    // Slovenia
    'ljubljana_si': [46.0569, 14.5058],
    'maribor_si': [46.5547, 15.6467],
    
    // Croatia
    'zagreb_hr': [45.8150, 15.9819],
    'split_hr': [43.5081, 16.4402],
    'rijeka_hr': [45.3271, 14.4422],
    
    // Serbia
    'belgrade_rs': [44.7866, 20.4489],
    'novi_sad_rs': [45.2671, 19.8335],
    
    // Finland
    'helsinki_fi': [60.1699, 24.9384],
    'tampere_fi': [61.4991, 23.7871],
    
    // Baltic States
    'tallinn_ee': [59.4370, 24.7536],
    'riga_lv': [56.9496, 24.1052],
    'vilnius_lt': [54.6872, 25.2797],
  }

  // Try exact match first
  let coords = coordinates[locationKey]
  if (coords) return coords
  
  // Try without country code
  const cityOnlyKeys = Object.keys(coordinates).filter(key => key.startsWith(normalizedCity + '_'))
  if (cityOnlyKeys.length > 0) {
    return coordinates[cityOnlyKeys[0]]
  }
  
  // Try partial matching for common variations
  for (const [key, value] of Object.entries(coordinates)) {
    if (key.includes(normalizedCity) || normalizedCity.includes(key.split('_')[0])) {
      return value
    }
  }

  return null
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
  type: 'transporter' | 'supplier'
}

export function TransportMap() {
  const [selectedHub, setSelectedHub] = useState<HubWithCoordinates | null>(null)
  const [routeConnections, setRouteConnections] = useState<RouteConnection[]>([])
  const [hubsWithCoords, setHubsWithCoords] = useState<HubWithCoordinates[]>([])

  const { hubs, isLoading: hubsLoading } = useHubs()
  const { data: transporterRoutes, isLoading: routesLoading } = useTransporterRoutes()

  // Process hubs and add coordinates
  useEffect(() => {
    if (hubs) {
      console.log('📍 All hubs from database:', hubs.length, hubs)
      
      const processed = hubs.map(hub => {
        const coordinates = getCityCoordinates(hub.city_name, hub.country_code)
        console.log(`🔍 Geocoding ${hub.name} (${hub.city_name}, ${hub.country_code}):`, coordinates ? 'Found' : 'Not found')
        return {
          ...hub,
          coordinates
        }
      }).filter(hub => hub.coordinates !== null) as HubWithCoordinates[]
      
      console.log('✅ Hubs with coordinates:', processed.length, processed.map(h => ({ name: h.name, city: h.city_name, country: h.country_code })))
      setHubsWithCoords(processed)
    }
  }, [hubs])

  // Process routes when data is available
  useEffect(() => {
    if (transporterRoutes && hubsWithCoords.length > 0) {
      const connections: RouteConnection[] = []

      // Add transporter routes
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
            is_active: route.is_active,
            type: 'transporter'
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

  if (hubsLoading || routesLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p>No hubs with location data found.</p>
            <p className="text-sm mt-2">Add city names to your hubs to see them on the map.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate map center based on all hubs
  const centerLat = hubsWithCoords.reduce((sum, hub) => sum + hub.coordinates![0], 0) / hubsWithCoords.length
  const centerLng = hubsWithCoords.reduce((sum, hub) => sum + hub.coordinates![1], 0) / hubsWithCoords.length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-6 w-6 text-blue-600" />
            Transport Network Map
          </CardTitle>
          <CardDescription>
            Interactive map showing hub locations and transportation routes. Hover over hubs to see connections.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 w-full rounded-lg overflow-hidden border">
            <LeafletMap
              center={[centerLat, centerLng]}
              zoom={5}
              hubs={hubsWithCoords}
              routes={routeConnections}
              selectedHub={selectedHub}
              onHubSelect={setSelectedHub}
            />
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-8 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 border border-green-600"></div>
              <span>Active Hubs (pulsating)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-300 border border-green-400"></div>
              <span>Inactive Hubs</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-px bg-green-500 border-t-2 border-dashed border-green-500"></div>
              <span>Route Connections (moving)</span>
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
                <p className="text-2xl font-bold">{hubsWithCoords.length}</p>
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
                  {new Set([
                    ...routeConnections.map(r => r.transporter)
                  ]).size}
                </p>
                <p className="text-sm text-muted-foreground">Transporters</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedHub && (
        <Card>
          <CardHeader>
            <CardTitle>Hub Connections: {selectedHub.name}</CardTitle>
            <CardDescription>
              All routes connected to this hub
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
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