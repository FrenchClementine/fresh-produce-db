import { useState, useCallback } from 'react';
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

export function useNearestHubs(): NearestHubsResult {
  const [nearestHubs, setNearestHubs] = useState<NearestHub[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string>('');

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

      // First check if coordinates already exist in database
      const tableName = entityType === 'supplier' ? 'suppliers' : 'customers';
      const cityField = entityType === 'supplier' ? 'city' : 'city';
      const countryField = entityType === 'supplier' ? 'country' : 'country';

      // Look for existing coordinates in database
      const { data: existingEntities, error: coordError } = await supabase
        .from(tableName)
        .select('latitude, longitude')
        .eq(cityField, entityCity)
        .eq(countryField, entityCountry)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(1);

      if (coordError) {
        console.warn('Error checking existing coordinates:', coordError);
      }

      // Use existing coordinates if found
      if (existingEntities && existingEntities.length > 0 && existingEntities[0].latitude && existingEntities[0].longitude) {
        latitude = existingEntities[0].latitude;
        longitude = existingEntities[0].longitude;
        console.log(`Using existing coordinates for ${entityCity}, ${entityCountry}: ${latitude}, ${longitude}`);
      } else {
        // Only geocode if coordinates not found in database
        console.log(`Geocoding new location: ${entityCity}, ${entityCountry}`);
        const entityGeoResult = await geocodeWithNominatim(entityCity, entityCountry);

        if (!entityGeoResult.success || !entityGeoResult.coordinates) {
          throw new Error(`Unable to find location: ${entityCity}, ${entityCountry}`);
        }

        latitude = entityGeoResult.coordinates.latitude;
        longitude = entityGeoResult.coordinates.longitude;

        // Store the new coordinates for future use
        try {
          await supabase
            .from(tableName)
            .update({
              latitude,
              longitude,
              coordinates_last_updated: new Date().toISOString()
            })
            .eq(cityField, entityCity)
            .eq(countryField, entityCountry);

          console.log(`Stored new coordinates for ${entityCity}, ${entityCountry}`);
        } catch (updateError) {
          console.warn('Failed to store coordinates:', updateError);
          // Continue anyway - we still have the coordinates for distance calculation
        }
      }

      // Get all active hubs with coordinates from database
      const { data: allHubs, error: hubsError } = await supabase
        .from('hubs')
        .select('*')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .eq('is_active', true);

      if (hubsError) {
        throw new Error(`Database error: ${hubsError.message}`);
      }

      if (!allHubs || allHubs.length === 0) {
        setNearestHubs([]);
        setError('No hubs with coordinates found');
        return;
      }

      // Calculate road distances to all hubs
      const destinations = allHubs.map(hub => ({
        lat: hub.latitude,
        lng: hub.longitude,
        id: hub.id
      }));

      const roadDistances = await calculateMultipleRouteDistances(
        latitude,
        longitude,
        destinations
      );

      // Combine hub data with road distances and sort by distance
      const hubsWithDistances = allHubs
        .map(hub => {
          const distanceData = roadDistances.find(d => d.id === hub.id);
          return {
            ...hub,
            roadDistance: distanceData?.distance || null,
            routeSuccess: distanceData?.success || false
          };
        })
        .filter(hub => hub.roadDistance !== null && hub.roadDistance <= 500) // Filter within 500km
        .sort((a, b) => (a.roadDistance || 0) - (b.roadDistance || 0))
        .slice(0, 2); // Get top 2 nearest hubs

      if (hubsWithDistances.length === 0) {
        setNearestHubs([]);
        setError('No hubs found within 500km road distance');
        return;
      }

      // Transform the results
      const hubs: NearestHub[] = hubsWithDistances.map((hub: any) => ({
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