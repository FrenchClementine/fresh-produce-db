'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MapPin,
  Plus,
  AlertTriangle,
  Loader2,
  Search
} from 'lucide-react'
import { useHubs } from '@/hooks/use-products'

interface LocationHubSelectorOptimizedProps {
  value: string
  onChange: (hubId: string) => void
  placeholder: string
  label: string
  onCreateHub?: (location: string, coordinates: { latitude: number; longitude: number }) => void
}

interface NearestHub {
  id: string
  name: string
  hub_code: string
  city_name?: string
  country_code?: string
  distance: number
  isRoadDistance: boolean
}

// Simple straight-line distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function LocationHubSelectorOptimized({
  value,
  onChange,
  placeholder,
  label,
  onCreateHub
}: LocationHubSelectorOptimizedProps) {
  const [inputMode, setInputMode] = useState<'select' | 'location'>('select')
  const [locationInput, setLocationInput] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [nearestHubs, setNearestHubs] = useState<NearestHub[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)
  const [foundCoordinates, setFoundCoordinates] = useState<{ latitude: number; longitude: number } | null>(null)

  const { hubs, isLoading: hubsLoading } = useHubs()
  const selectedHub = hubs?.find(h => h.id === value)

  const searchNearestHubs = useCallback(async (location: string) => {
    if (!location.trim() || !hubs) return

    setIsSearching(true)
    setSearchError(null)

    try {
      const normalizedQuery = location.trim().toLowerCase()

      // Get approximate coordinates for the location
      let entityLat: number | null = null
      let entityLon: number | null = null

      // Check if we can find a hub in the same city as a proxy
      const activeHubs = hubs.filter((h: any) =>
        h.is_active &&
        h.latitude !== null &&
        h.longitude !== null
      )

      if (activeHubs.length === 0) {
        setSearchError('No hubs with coordinates found')
        return
      }

      // Try to find a hub in the same city as a proxy for coordinates
      const sameCityHub: any = activeHubs.find((h: any) =>
        h.city_name?.toLowerCase().includes(normalizedQuery) ||
        h.name?.toLowerCase().includes(normalizedQuery) ||
        normalizedQuery.includes(h.city_name?.toLowerCase() || '') ||
        normalizedQuery.includes(h.country_code?.toLowerCase() || '')
      )

      if (sameCityHub && sameCityHub.latitude && sameCityHub.longitude) {
        entityLat = Number(sameCityHub.latitude)
        entityLon = Number(sameCityHub.longitude)
      }

      // If no same-city hub found, use country center as fallback
      if (!entityLat || !entityLon) {
        const countryCoordinates: { [key: string]: [number, number] } = {
          'uk': [51.5074, -0.1278],
          'united kingdom': [51.5074, -0.1278],
          'gb': [51.5074, -0.1278],
          'spain': [40.4168, -3.7038],
          'es': [40.4168, -3.7038],
          'france': [48.8566, 2.3522],
          'fr': [48.8566, 2.3522],
          'italy': [41.9028, 12.4964],
          'it': [41.9028, 12.4964],
          'germany': [52.5200, 13.4050],
          'de': [52.5200, 13.4050],
          'netherlands': [52.3676, 4.9041],
          'nl': [52.3676, 4.9041],
          'belgium': [50.8503, 4.3517],
          'be': [50.8503, 4.3517],
          'poland': [52.2297, 21.0122],
          'pl': [52.2297, 21.0122],
          'portugal': [39.3999, -8.2245],
          'pt': [39.3999, -8.2245],
        }

        // Check if location contains a country name/code
        for (const [country, coords] of Object.entries(countryCoordinates)) {
          if (normalizedQuery.includes(country)) {
            entityLat = coords[0]
            entityLon = coords[1]
            break
          }
        }
      }

      if (!entityLat || !entityLon) {
        setSearchError(`Could not determine location for "${location}". Try being more specific with city and country.`)
        return
      }

      setFoundCoordinates({ latitude: entityLat, longitude: entityLon })

      // Calculate distances to all active hubs
      const hubsWithDistances = activeHubs
        .map((hub: any) => {
          const distance = calculateDistance(
            entityLat!,
            entityLon!,
            Number(hub.latitude),
            Number(hub.longitude)
          )
          return {
            ...hub,
            distance: Math.round(distance * 1.3) // Estimate road distance as 1.3x straight line
          }
        })
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5) // Get top 5 nearest

      // Transform to NearestHub format
      const nearestHubsList: NearestHub[] = hubsWithDistances.map(hub => ({
        id: hub.id,
        name: hub.name,
        hub_code: hub.hub_code || '',
        city_name: hub.city_name || '',
        country_code: hub.country_code || '',
        distance: hub.distance,
        isRoadDistance: false // These are estimates
      }))

      setNearestHubs(nearestHubsList)

    } catch (error) {
      console.error('Location search error:', error)
      setSearchError(error instanceof Error ? error.message : 'Failed to search location')
    } finally {
      setIsSearching(false)
    }
  }, [hubs])

  const handleLocationSearch = useCallback(() => {
    if (!isSearching) {
      searchNearestHubs(locationInput)
    }
  }, [isSearching, locationInput, searchNearestHubs])

  const handleHubSelect = (hubId: string) => {
    onChange(hubId)
    setInputMode('select')
    setLocationInput('')
    setNearestHubs([])
    setFoundCoordinates(null)
  }

  const handleCreateHub = () => {
    if (foundCoordinates && onCreateHub) {
      onCreateHub(locationInput, foundCoordinates)
    }
  }

  return (
    <div className="space-y-3">
      {inputMode === 'select' ? (
        <div className="space-y-2">
          <Select
            value={value}
            onValueChange={(selectedValue) => {
              if (selectedValue === 'use-location') {
                setInputMode('location')
              } else {
                onChange(selectedValue)
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="create-new" className="text-primary">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create New Hub
                </div>
              </SelectItem>
              <SelectItem
                value="use-location"
                className="text-blue-600"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Find by Location
                </div>
              </SelectItem>
              {(hubs?.length ?? 0) > 0 && <div className="border-t my-1" />}
              {hubs?.filter(h => h.is_active).map((hub) => (
                <SelectItem key={hub.id} value={hub.id}>
                  {hub.name} ({hub.hub_code}) - {hub.country_code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {value === 'use-location' && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setInputMode('location')}
              className="w-full"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Enter Location to Find Nearest Hub
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Kapellen, BE or Amsterdam, Netherlands"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleLocationSearch()
                }
              }}
            />
            <Button
              type="button"
              onClick={handleLocationSearch}
              disabled={isSearching || !locationInput.trim()}
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setInputMode('select')
                setLocationInput('')
                setNearestHubs([])
                setSearchError(null)
                setFoundCoordinates(null)
              }}
            >
              Back to Hub List
            </Button>
          </div>

          {searchError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{searchError}</span>
            </div>
          )}

          {nearestHubs.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">
                Nearest Hubs to "{locationInput}":
              </h4>
              {nearestHubs.map((hub, index) => (
                <div
                  key={hub.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        #{index + 1}: {hub.name}
                      </span>
                      <Badge variant={hub.distance > 150 ? "destructive" : "secondary"}>
                        {hub.distance}km (estimated)
                      </Badge>
                      {hub.distance > 150 && (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {hub.hub_code} • {hub.city_name}, {hub.country_code}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleHubSelect(hub.id)}
                  >
                    Select
                  </Button>
                </div>
              ))}

              {nearestHubs.every(hub => hub.distance > 150) && onCreateHub && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-800">
                        All nearest hubs are over 150km away
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        Consider creating a new hub closer to "{locationInput}" for better logistics efficiency.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        className="mt-2"
                        onClick={handleCreateHub}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Create New Hub in {locationInput}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {selectedHub && inputMode === 'select' && (
        <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
          <strong>Selected:</strong> {selectedHub.name} ({selectedHub.hub_code}) - {selectedHub.country_code}
        </div>
      )}
    </div>
  )
}