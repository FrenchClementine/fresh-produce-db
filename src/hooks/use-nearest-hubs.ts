import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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

// Cache for all hubs - loaded once on app start
let allHubsCache: any[] | null = null;
let cacheLoadPromise: Promise<void> | null = null;

// Simple straight-line distance calculation for quick filtering
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

// Load all hubs once
async function ensureHubsLoaded() {
  if (allHubsCache) return;

  if (!cacheLoadPromise) {
    cacheLoadPromise = (async () => {
      console.log('Loading hubs into cache...');
      const { data } = await supabase
        .from('hubs')
        .select('*')
        .eq('is_active', true);

      if (data) {
        allHubsCache = data;
        console.log(`Loaded ${data.length} hubs into cache`);
      }
    })();
  }

  await cacheLoadPromise;
}

export function useNearestHubs(): NearestHubsResult {
  const [nearestHubs, setNearestHubs] = useState<NearestHub[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string>('');

  // Pre-load hubs on component mount
  useEffect(() => {
    ensureHubsLoaded();
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
      // Ensure hubs are loaded
      await ensureHubsLoaded();

      if (!allHubsCache || allHubsCache.length === 0) {
        setError('No hubs available');
        return;
      }

      // Get approximate coordinates for the entity location
      // Using a simple city-to-coordinates mapping for common locations
      // This avoids slow geocoding API calls
      let entityLat: number | null = null;
      let entityLon: number | null = null;

      // Check if we already have coordinates in the database
      const tableName = entityType === 'supplier' ? 'suppliers' : 'customers';
      const { data: entities } = await supabase
        .from(tableName)
        .select('latitude, longitude')
        .eq('city', entityCity)
        .eq('country', entityCountry)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(1);

      if (entities && entities.length > 0) {
        entityLat = entities[0].latitude;
        entityLon = entities[0].longitude;
      }

      // If no coordinates found, try to find a hub in the same city as a proxy
      if (!entityLat || !entityLon) {
        const sameCityHub = allHubsCache.find(h =>
          h.city_name?.toLowerCase() === entityCity.toLowerCase() ||
          h.name?.toLowerCase().includes(entityCity.toLowerCase())
        );

        if (sameCityHub && sameCityHub.latitude && sameCityHub.longitude) {
          entityLat = sameCityHub.latitude;
          entityLon = sameCityHub.longitude;
        }
      }

      // If still no coordinates, use country center as fallback
      if (!entityLat || !entityLon) {
        const countryCoordinates: { [key: string]: [number, number] } = {
          'UK': [51.5074, -0.1278],
          'United Kingdom': [51.5074, -0.1278],
          'Spain': [40.4168, -3.7038],
          'ES': [40.4168, -3.7038],
          'France': [48.8566, 2.3522],
          'FR': [48.8566, 2.3522],
          'Italy': [41.9028, 12.4964],
          'IT': [41.9028, 12.4964],
          'Germany': [52.5200, 13.4050],
          'DE': [52.5200, 13.4050],
          'Netherlands': [52.3676, 4.9041],
          'NL': [52.3676, 4.9041],
        };

        const coords = countryCoordinates[entityCountry];
        if (coords) {
          entityLat = coords[0];
          entityLon = coords[1];
        }
      }

      if (!entityLat || !entityLon) {
        setError(`Could not determine location for ${entityCity}, ${entityCountry}`);
        return;
      }

      // Calculate distances to all hubs with coordinates
      const hubsWithDistances = allHubsCache
        .filter(hub => hub.latitude && hub.longitude)
        .map(hub => {
          const distance = calculateDistance(
            entityLat!,
            entityLon!,
            hub.latitude,
            hub.longitude
          );
          return {
            ...hub,
            distance: Math.round(distance * 1.3) // Estimate road distance as 1.3x straight line
          };
        })
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 2); // Get top 2 nearest

      // Transform to NearestHub format
      const hubs: NearestHub[] = hubsWithDistances.map(hub => ({
        hubId: hub.id,
        hubName: hub.name,
        hubCode: hub.hub_code || '',
        hubCity: hub.city_name || '',
        hubCountry: hub.country_code || '',
        distance: hub.distance,
        warning: hub.distance > 150,
        isRoadDistance: false // These are estimates
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