import { useState, useCallback } from 'react';
import { geocodeWithNominatim } from '@/lib/nominatim-geocoding';
import { supabase } from '@/lib/supabase';

export interface DistanceInfo {
  distance: number;
  warning: boolean; // true if distance > 150km
  entityCoordinates: { latitude: number; longitude: number };
  hubCoordinates: { latitude: number; longitude: number };
}

export interface NearestHubSuggestion {
  hubId: string;
  hubName: string;
  hubCode: string;
  distance: number;
  warning: boolean;
}

export interface DistanceAdvisoryHookReturn {
  distanceInfo: DistanceInfo | null;
  isCalculating: boolean;
  error: string | null;
  calculateDistance: (
    entityCity: string,
    entityCountry: string,
    hubId: string
  ) => Promise<void>;
  clearDistance: () => void;
  // New nearest hub functionality
  nearestHubSuggestion: NearestHubSuggestion | null;
  isCalculatingNearest: boolean;
  findNearestHub: (
    entityCity: string,
    entityCountry: string,
    availableHubs: Array<{id: string, name: string, hub_code: string, city_name?: string, country_code?: string}>
  ) => Promise<void>;
  clearNearestHub: () => void;
}

// Haversine distance calculation
function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function useDistanceAdvisory(): DistanceAdvisoryHookReturn {
  const [distanceInfo, setDistanceInfo] = useState<DistanceInfo | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string>('');

  // Nearest hub suggestion state
  const [nearestHubSuggestion, setNearestHubSuggestion] = useState<NearestHubSuggestion | null>(null);
  const [isCalculatingNearest, setIsCalculatingNearest] = useState(false);
  const [lastNearestQuery, setLastNearestQuery] = useState<string>('');

  const calculateDistance = useCallback(async (
    entityCity: string,
    entityCountry: string,
    hubId: string
  ) => {
    if (!entityCity || !entityCountry || !hubId) {
      setDistanceInfo(null);
      setLastQuery('');
      return;
    }

    // Create a unique query identifier to prevent duplicate calculations
    const queryKey = `${entityCity}|${entityCountry}|${hubId}`;
    if (queryKey === lastQuery && !error) {
      // Same query as last time and no error - skip calculation
      return;
    }

    setIsCalculating(true);
    setError(null);
    setDistanceInfo(null);
    setLastQuery(queryKey);

    try {
      // Get hub coordinates from database first (may already be geocoded)
      const { data: hub, error: hubError } = await supabase
        .from('hubs')
        .select('city_name, country_code, latitude, longitude')
        .eq('id', hubId)
        .single();

      if (hubError) {
        throw new Error(`Hub not found: ${hubError.message}`);
      }

      if (!hub) {
        throw new Error('Hub not found');
      }

      // Get hub coordinates (geocode if needed)
      let hubCoordinates: { latitude: number; longitude: number };

      if (hub.latitude && hub.longitude) {
        // Use existing coordinates
        hubCoordinates = {
          latitude: parseFloat(hub.latitude.toString()),
          longitude: parseFloat(hub.longitude.toString())
        };
      } else {
        // Geocode hub location
        const hubGeoResult = await geocodeWithNominatim(
          hub.city_name || '',
          hub.country_code || ''
        );

        if (!hubGeoResult.success || !hubGeoResult.coordinates) {
          if (hubGeoResult.rateLimited) {
            throw new Error(`Geocoding rate limited. Please try again in a moment.`);
          }
          throw new Error(`Unable to find hub location: ${hub.city_name}, ${hub.country_code}. Please check the hub's city and country data.`);
        }

        hubCoordinates = {
          latitude: hubGeoResult.coordinates.latitude,
          longitude: hubGeoResult.coordinates.longitude
        };
      }

      // Get entity coordinates (check database first)
      let entityCoordinates: { latitude: number; longitude: number };

      // Check if we have existing coordinates for this location in database
      const { data: existingEntities, error: coordError } = await supabase
        .from('suppliers')
        .select('latitude, longitude')
        .eq('city', entityCity)
        .eq('country', entityCountry)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(1);

      // Also check customers table if no suppliers found
      let existingCustomers = null;
      if (!existingEntities || existingEntities.length === 0) {
        const { data: customers } = await supabase
          .from('customers')
          .select('latitude, longitude')
          .eq('city', entityCity)
          .eq('country', entityCountry)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .limit(1);
        existingCustomers = customers;
      }

      const existingCoords = existingEntities?.[0] || existingCustomers?.[0];

      if (existingCoords && existingCoords.latitude && existingCoords.longitude) {
        // Use existing coordinates
        entityCoordinates = {
          latitude: parseFloat(existingCoords.latitude.toString()),
          longitude: parseFloat(existingCoords.longitude.toString())
        };
        console.log(`Using existing coordinates for ${entityCity}, ${entityCountry}: ${entityCoordinates.latitude}, ${entityCoordinates.longitude}`);
      } else {
        // Only geocode if coordinates not found in database
        console.log(`Geocoding new entity location: ${entityCity}, ${entityCountry}`);
        const entityGeoResult = await geocodeWithNominatim(entityCity, entityCountry);

        if (!entityGeoResult.success || !entityGeoResult.coordinates) {
          if (entityGeoResult.rateLimited) {
            throw new Error(`Geocoding rate limited. Please try again in a moment.`);
          }
          throw new Error(`Unable to find location: ${entityCity}, ${entityCountry}. Please check the city and country spelling.`);
        }

        entityCoordinates = {
          latitude: entityGeoResult.coordinates.latitude,
          longitude: entityGeoResult.coordinates.longitude
        };
      }

      // Calculate distance
      const distance = calculateHaversineDistance(
        entityCoordinates.latitude,
        entityCoordinates.longitude,
        hubCoordinates.latitude,
        hubCoordinates.longitude
      );

      setDistanceInfo({
        distance: Math.round(distance),
        warning: distance > 150, // Warning for distances over 150km
        entityCoordinates,
        hubCoordinates
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Distance calculation failed';
      setError(errorMessage);
      console.error('Distance calculation error:', err);
    } finally {
      setIsCalculating(false);
    }
  }, []);

  const clearDistance = useCallback(() => {
    setDistanceInfo(null);
    setError(null);
    setLastQuery('');
  }, []);

  const findNearestHub = useCallback(async (
    entityCity: string,
    entityCountry: string,
    availableHubs: Array<{id: string, name: string, hub_code: string, city_name?: string, country_code?: string}>
  ) => {
    if (!entityCity || !entityCountry || availableHubs.length === 0) {
      setNearestHubSuggestion(null);
      return;
    }

    const nearestQuery = `${entityCity}|${entityCountry}|${availableHubs.map(h => h.id).join(',')}`;
    if (nearestQuery === lastNearestQuery) {
      return; // Skip if same query
    }

    setIsCalculatingNearest(true);
    setNearestHubSuggestion(null);
    setLastNearestQuery(nearestQuery);

    try {
      // Get entity coordinates (check database first)
      let entityCoords: { latitude: number; longitude: number };

      // Check existing coordinates in database first
      const { data: existingSuppliers } = await supabase
        .from('suppliers')
        .select('latitude, longitude')
        .eq('city', entityCity)
        .eq('country', entityCountry)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(1);

      const { data: existingCustomers } = await supabase
        .from('customers')
        .select('latitude, longitude')
        .eq('city', entityCity)
        .eq('country', entityCountry)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(1);

      const existingCoords = existingSuppliers?.[0] || existingCustomers?.[0];

      if (existingCoords && existingCoords.latitude && existingCoords.longitude) {
        entityCoords = {
          latitude: parseFloat(existingCoords.latitude.toString()),
          longitude: parseFloat(existingCoords.longitude.toString())
        };
        console.log(`Using existing coordinates for nearest hub search: ${entityCity}, ${entityCountry}`);
      } else {
        // Only geocode if not found in database
        console.log(`Geocoding entity location for nearest hub: ${entityCity}, ${entityCountry}`);
        const entityGeoResult = await geocodeWithNominatim(entityCity, entityCountry);

        if (!entityGeoResult.success || !entityGeoResult.coordinates) {
          console.log(`Unable to geocode entity location for nearest hub: ${entityCity}, ${entityCountry}`);
          return;
        }

        entityCoords = entityGeoResult.coordinates;
      }
      let nearestHub = null;
      let shortestDistance = Infinity;

      // Calculate distances to all hubs
      for (const hub of availableHubs) {
        try {
          let hubCoords = null;

          // First check if hub already has coordinates stored in database
          const { data: hubData } = await supabase
            .from('hubs')
            .select('latitude, longitude, city_name, country_code')
            .eq('id', hub.id)
            .single();

          if (hubData && hubData.latitude && hubData.longitude) {
            // Use stored coordinates
            hubCoords = {
              latitude: parseFloat(hubData.latitude.toString()),
              longitude: parseFloat(hubData.longitude.toString())
            };
            console.log(`Using stored coordinates for hub: ${hub.name}`);
          } else if (hubData && hubData.city_name && hubData.country_code) {
            // Only geocode if coordinates not stored
            console.log(`Geocoding hub: ${hub.name} (${hubData.city_name}, ${hubData.country_code})`);
            const hubGeoResult = await geocodeWithNominatim(hubData.city_name, hubData.country_code);
            if (hubGeoResult.success && hubGeoResult.coordinates) {
              hubCoords = hubGeoResult.coordinates;
            }
          }

          if (!hubCoords) {
            console.log(`Unable to get coordinates for hub: ${hub.name}`);
            continue;
          }

          // Calculate distance
          const distance = calculateHaversineDistance(
            entityCoords.latitude,
            entityCoords.longitude,
            hubCoords.latitude,
            hubCoords.longitude
          );

          if (distance < shortestDistance) {
            shortestDistance = distance;
            nearestHub = {
              hubId: hub.id,
              hubName: hub.name,
              hubCode: hub.hub_code,
              distance: Math.round(distance),
              warning: distance > 150
            };
          }
        } catch (error) {
          console.log(`Error calculating distance to hub ${hub.name}:`, error);
          continue;
        }
      }

      if (nearestHub) {
        setNearestHubSuggestion(nearestHub);
      }

    } catch (error) {
      console.error('Error finding nearest hub:', error);
    } finally {
      setIsCalculatingNearest(false);
    }
  }, []);

  const clearNearestHub = useCallback(() => {
    setNearestHubSuggestion(null);
    setLastNearestQuery('');
  }, []);

  return {
    distanceInfo,
    isCalculating,
    error,
    calculateDistance,
    clearDistance,
    nearestHubSuggestion,
    isCalculatingNearest,
    findNearestHub,
    clearNearestHub
  };
}