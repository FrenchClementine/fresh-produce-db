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
  Navigation,
  Search
} from 'lucide-react'
import { geocodeWithNominatim } from '@/lib/nominatim-geocoding'
import { useHubs } from '@/hooks/use-products'
import { calculateMultipleRouteDistances } from '@/lib/route-distance'

interface LocationHubSelectorProps {
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

export function LocationHubSelector({
  value,
  onChange,
  placeholder,
  label,
  onCreateHub
}: LocationHubSelectorProps) {
  const [inputMode, setInputMode] = useState<'select' | 'location'>('select')
  const [locationInput, setLocationInput] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [nearestHubs, setNearestHubs] = useState<NearestHub[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)
  const [foundCoordinates, setFoundCoordinates] = useState<{ latitude: number; longitude: number } | null>(null)
  const searchCacheRef = useRef<Map<string, { coordinates: { latitude: number; longitude: number }; hubs: NearestHub[] }>>(new Map())

  const { hubs, isLoading: hubsLoading } = useHubs()

  useEffect(() => {
    searchCacheRef.current.clear()
  }, [hubs])

  const selectedHub = hubs?.find(h => h.id === value)

  const haversineDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRadians = (deg: number) => (deg * Math.PI) / 180
    const R = 6371
    const dLat = toRadians(lat2 - lat1)
    const dLon = toRadians(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }, [])

  const searchNearestHubs = useCallback(async (location: string) => {
    if (!location.trim()) return

    setIsSearching(true)
    setSearchError(null)

    try {
      const normalizedQuery = location.trim().toLowerCase()

      if (searchCacheRef.current.has(normalizedQuery)) {
        const cached = searchCacheRef.current.get(normalizedQuery)!
        setFoundCoordinates(cached.coordinates)
        setNearestHubs(cached.hubs)
        setIsSearching(false)
        return
      }

      // Geocode the location
      const geoResult = await geocodeWithNominatim(location, '')

      if (!geoResult.success || !geoResult.coordinates) {
        throw new Error(`Unable to find location: ${location}`)
      }

      setFoundCoordinates(geoResult.coordinates)

      // Get all active hubs with coordinates
      const activeHubs = hubs?.filter((h: any) =>
        h.is_active &&
        h.latitude !== null &&
        h.longitude !== null
      ) || []

      if (activeHubs.length === 0) {
        setSearchError('No hubs with coordinates found')
        return
      }

      const withStraightLine = activeHubs
        .map((hub: any) => ({
          hub,
          straightDistance: haversineDistance(
            geoResult.coordinates!.latitude,
            geoResult.coordinates!.longitude,
            hub.latitude!,
            hub.longitude!
          )
        }))
        .sort((a, b) => a.straightDistance - b.straightDistance)

      const topCandidates = withStraightLine.slice(0, 10)

      const destinations = topCandidates.map(({ hub }) => ({
        lat: hub.latitude!,
        lng: hub.longitude!,
        id: hub.id
      }))

      let distanceResults: { id: string; distance: number; success: boolean }[] = []

      if (destinations.length > 0) {
        distanceResults = await calculateMultipleRouteDistances(
          geoResult.coordinates.latitude,
          geoResult.coordinates.longitude,
          destinations
        )
      }

      // Combine hub data with distance results
      const hubsWithDistances = topCandidates
        .map(({ hub, straightDistance }) => {
          const distanceData = distanceResults.find(d => d.id === hub.id)
          const distance = distanceData?.distance ?? Math.round(straightDistance)
          return {
            id: hub.id,
            name: hub.name,
            hub_code: hub.hub_code,
            city_name: hub.city_name,
            country_code: hub.country_code,
            distance,
            isRoadDistance: distanceData?.success || false
          }
        })
        .filter(hub => hub.distance <= 500) // Filter within 500km
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3) // Get top 3 nearest hubs

      setNearestHubs(hubsWithDistances)
      searchCacheRef.current.set(normalizedQuery, {
        coordinates: geoResult.coordinates,
        hubs: hubsWithDistances
      })

    } catch (error) {
      console.error('Location search error:', error)
      setSearchError(error instanceof Error ? error.message : 'Failed to search location')
    } finally {
      setIsSearching(false)
    }
  }, [hubs, haversineDistance])


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
                      <Badge variant={hub.distance > 100 ? "destructive" : "secondary"}>
                        {hub.distance}km {hub.isRoadDistance ? '🛣️' : '📏'}
                      </Badge>
                      {hub.distance > 100 && (
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

              {nearestHubs.every(hub => hub.distance > 100) && onCreateHub && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-800">
                        All nearest hubs are over 100km away
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