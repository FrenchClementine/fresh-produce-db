import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { geocodeWithNominatim } from '@/lib/nominatim-geocoding';
import { calculateMultipleRouteDistances } from '@/lib/route-distance';

export interface NearestHub {
  hubId: string;
  hubName: string;
  hubCode: string;
  hubCity: string;
  hubCountry: string;
  distance: number;
  warning: boolean; // true if >150km
  isRoadDistance?: boolean; // true if actual road distance, false if estimated
}

export interface NearestHubsResult {
  nearestHubs: NearestHub[];
  isLoading: boolean;
  error: string | null;
  findNearestHubs: (
    entityCity: string,
    entityCountry: string,
    entityType: 'supplier' | 'customer'
  ) => Promise<void>;
  clearHubs: () => void;
}

// Cache for hub data
let hubsCache: any[] | null = null;
let hubsCacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache for geocoding results
const geocodeCache = new Map<string, { latitude: number; longitude: number; timestamp: number }>();
const GEOCODE_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Calculate straight-line distance using Haversine formula (for initial filtering)
function calculateStraightLineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function useNearestHubsOptimized(): NearestHubsResult {
  const [nearestHubs, setNearestHubs] = useState<NearestHub[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string>('');

  // Pre-load hubs on mount
  useEffect(() => {
    const preloadHubs = async () => {
      if (!hubsCache || Date.now() - hubsCacheTimestamp > CACHE_DURATION) {
        const { data: allHubs, error: hubsError } = await supabase
          .from('hubs')
          .select('*')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .eq('is_active', true);

        if (!hubsError && allHubs) {
          hubsCache = allHubs;
          hubsCacheTimestamp = Date.now();
          console.log(`Pre-loaded ${allHubs.length} hubs into cache`);
        }
      }
    };
    preloadHubs();
  }, []);

  const findNearestHubs = useCallback(async (
    entityCity: string,
    entityCountry: string,
    entityType: 'supplier' | 'customer'
  ) => {
    if (!entityCity || !entityCountry) {
      setNearestHubs([]);
      return;
    }

    const queryKey = `${entityCity}|${entityCountry}|${entityType}`;
    if (queryKey === lastQuery) {
      return; // Skip duplicate queries
    }

    setIsLoading(true);
    setError(null);
    setNearestHubs([]);
    setLastQuery(queryKey);

    try {
      let latitude: number;
      let longitude: number;

      // Check geocode cache first
      const geocodeCacheKey = `${entityCity}|${entityCountry}`;
      const cachedGeocode = geocodeCache.get(geocodeCacheKey);

      if (cachedGeocode && Date.now() - cachedGeocode.timestamp < GEOCODE_CACHE_DURATION) {
        latitude = cachedGeocode.latitude;
        longitude = cachedGeocode.longitude;
        console.log(`Using cached coordinates for ${entityCity}, ${entityCountry}`);
      } else {
        // Check database for existing coordinates
        const tableName = entityType === 'supplier' ? 'suppliers' : 'customers';

        const { data: existingEntities } = await supabase
          .from(tableName)
          .select('latitude, longitude')
          .eq('city', entityCity)
          .eq('country', entityCountry)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .limit(1);

        if (existingEntities && existingEntities.length > 0 && existingEntities[0].latitude && existingEntities[0].longitude) {
          latitude = existingEntities[0].latitude;
          longitude = existingEntities[0].longitude;
          console.log(`Using existing coordinates for ${entityCity}, ${entityCountry}`);
        } else {
          // Geocode if not found
          console.log(`Geocoding new location: ${entityCity}, ${entityCountry}`);
          const entityGeoResult = await geocodeWithNominatim(entityCity, entityCountry);

          if (!entityGeoResult.success || !entityGeoResult.coordinates) {
            throw new Error(`Unable to find location: ${entityCity}, ${entityCountry}`);
          }

          latitude = entityGeoResult.coordinates.latitude;
          longitude = entityGeoResult.coordinates.longitude;
        }

        // Cache the geocode result
        geocodeCache.set(geocodeCacheKey, {
          latitude,
          longitude,
          timestamp: Date.now()
        });
      }

      // Get hubs from cache or database
      let allHubs = hubsCache;

      if (!allHubs || Date.now() - hubsCacheTimestamp > CACHE_DURATION) {
        const { data, error: hubsError } = await supabase
          .from('hubs')
          .select('*')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .eq('is_active', true);

        if (hubsError) {
          throw new Error(`Database error: ${hubsError.message}`);
        }

        allHubs = data || [];
        hubsCache = allHubs;
        hubsCacheTimestamp = Date.now();
      }

      if (!allHubs || allHubs.length === 0) {
        setNearestHubs([]);
        setError('No hubs with coordinates found');
        return;
      }

      // OPTIMIZATION 1: Calculate straight-line distances first for ALL hubs
      const hubsWithStraightDistance = allHubs.map(hub => ({
        ...hub,
        straightDistance: calculateStraightLineDistance(
          latitude,
          longitude,
          hub.latitude,
          hub.longitude
        )
      }));

      // OPTIMIZATION 2: Sort by straight-line distance and take top 5 candidates
      // (Road distance is typically 1.2-1.5x straight-line distance)
      const topCandidates = hubsWithStraightDistance
        .sort((a, b) => a.straightDistance - b.straightDistance)
        .slice(0, 5)
        .filter(hub => hub.straightDistance <= 400); // Filter out obviously too-far hubs

      if (topCandidates.length === 0) {
        // If no candidates within reasonable distance, just return closest 2 with estimated distance
        const closest = hubsWithStraightDistance
          .sort((a, b) => a.straightDistance - b.straightDistance)
          .slice(0, 2);

        const hubs: NearestHub[] = closest.map(hub => ({
          hubId: hub.id,
          hubName: hub.name,
          hubCode: hub.hub_code,
          hubCity: hub.city_name,
          hubCountry: hub.country_code,
          distance: Math.round(hub.straightDistance * 1.3), // Estimate road distance as 1.3x straight line
          warning: hub.straightDistance * 1.3 > 150,
          isRoadDistance: false
        }));

        setNearestHubs(hubs);
        return;
      }

      // OPTIMIZATION 3: Only calculate road distances for top candidates
      const destinations = topCandidates.map(hub => ({
        lat: hub.latitude,
        lng: hub.longitude,
        id: hub.id
      }));

      // Calculate road distances with timeout
      let roadDistances;
      try {
        roadDistances = await Promise.race([
          calculateMultipleRouteDistances(latitude, longitude, destinations),
          new Promise<any[]>((_, reject) =>
            setTimeout(() => reject(new Error('Routing timeout')), 3000)
          )
        ]);
      } catch (routeError) {
        console.warn('Road distance calculation failed or timed out, using estimates');
        // Fall back to estimated distances
        const hubs: NearestHub[] = topCandidates
          .slice(0, 2)
          .map(hub => ({
            hubId: hub.id,
            hubName: hub.name,
            hubCode: hub.hub_code,
            hubCity: hub.city_name,
            hubCountry: hub.country_code,
            distance: Math.round(hub.straightDistance * 1.3),
            warning: hub.straightDistance * 1.3 > 150,
            isRoadDistance: false
          }));

        setNearestHubs(hubs);
        return;
      }

      // Combine results and get top 2
      const hubsWithDistances = topCandidates
        .map(hub => {
          const distanceData = roadDistances.find(d => d.id === hub.id);
          return {
            ...hub,
            roadDistance: distanceData?.distance || hub.straightDistance * 1.3,
            routeSuccess: distanceData?.success || false
          };
        })
        .sort((a, b) => a.roadDistance - b.roadDistance)
        .slice(0, 2);

      // Transform the results
      const hubs: NearestHub[] = hubsWithDistances.map(hub => ({
        hubId: hub.id,
        hubName: hub.name,
        hubCode: hub.hub_code,
        hubCity: hub.city_name,
        hubCountry: hub.country_code,
        distance: Math.round(hub.roadDistance),
        warning: hub.roadDistance > 150,
        isRoadDistance: hub.routeSuccess
      }));

      setNearestHubs(hubs);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to find nearest hubs';
      setError(errorMessage);
      console.error('Error finding nearest hubs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [lastQuery]);

  const clearHubs = useCallback(() => {
    setNearestHubs([]);
    setError(null);
    setLastQuery('');
  }, []);

  return {
    nearestHubs,
    isLoading,
    error,
    findNearestHubs,
    clearHubs
  };
}