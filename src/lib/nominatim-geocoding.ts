// Nominatim geocoding service with automatic coordinate resolution
// Respects rate limits and handles failures gracefully

export interface Coordinates {
  latitude: number;
  longitude: number;
  source: string;
  confidence: number;
}

export interface GeocodeResult {
  success: boolean;
  coordinates?: Coordinates;
  error?: string;
  rateLimited?: boolean;
}

// Rate limiting: Nominatim allows 1 request per second
class RateLimiter {
  private lastRequest = 0;
  private readonly minInterval = 1100; // 1.1 seconds to be safe

  async waitForNextSlot(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;

    if (timeSinceLastRequest < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequest = Date.now();
  }
}

const rateLimiter = new RateLimiter();

// Common city name corrections for better geocoding success
const CITY_CORRECTIONS: Record<string, string> = {
  'BARCALONA': 'BARCELONA',
  'MADIRD': 'MADRID',
  'LONDO': 'LONDON',
  'PARIZ': 'PARIS',
  'AMSTERDM': 'AMSTERDAM',
  'MILA': 'MILAN',
  'ROME': 'ROMA'
};

function correctCityName(city: string): string {
  const upperCity = city.toUpperCase();
  return CITY_CORRECTIONS[upperCity] || city;
}

/**
 * Geocode a location using OpenStreetMap Nominatim service
 */
export async function geocodeWithNominatim(
  city: string,
  country: string
): Promise<GeocodeResult> {
  try {
    // Rate limiting
    await rateLimiter.waitForNextSlot();

    // Apply common corrections
    const correctedCity = correctCityName(city);
    const query = `${correctedCity}, ${country}`;

    const url = `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}&` +
      `format=json&` +
      `limit=1&` +
      `addressdetails=1&` +
      `extratags=1`;

    console.log(`Geocoding: ${query}${correctedCity !== city ? ` (corrected from: ${city})` : ''}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ProductFinderApp/1.0 (contact@example.com)', // Required by Nominatim
        'Accept': 'application/json'
      }
    });

    if (response.status === 429) {
      console.warn('Nominatim rate limit exceeded');
      return {
        success: false,
        error: 'Rate limit exceeded',
        rateLimited: true
      };
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      console.warn(`No results found for: ${query}`);
      return {
        success: false,
        error: 'Location not found'
      };
    }

    const result = data[0];
    const coordinates: Coordinates = {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      source: 'nominatim',
      confidence: parseFloat(result.importance || '0.5')
    };

    // Validate coordinates are reasonable
    if (isNaN(coordinates.latitude) || isNaN(coordinates.longitude)) {
      throw new Error('Invalid coordinates received');
    }

    if (Math.abs(coordinates.latitude) > 90 || Math.abs(coordinates.longitude) > 180) {
      throw new Error('Coordinates out of valid range');
    }

    console.log(`Geocoded ${query} -> ${coordinates.latitude}, ${coordinates.longitude}`);

    return {
      success: true,
      coordinates
    };

  } catch (error) {
    console.error(`Geocoding failed for ${city}, ${country}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Geocode and update entity coordinates in database
 */
export async function geocodeAndUpdateEntity(
  entityType: 'hubs' | 'suppliers' | 'customers',
  entityId: string,
  city: string,
  country: string
): Promise<boolean> {
  try {
    const result = await geocodeWithNominatim(city, country);

    if (!result.success) {
      console.warn(`Failed to geocode ${city}, ${country} for ${entityType} ${entityId}`);
      return false;
    }

    // Update with successful coordinates - only the essential fields
    const { error: updateError } = await supabase
      .from(entityType)
      .update({
        latitude: result.coordinates!.latitude,
        longitude: result.coordinates!.longitude
      })
      .eq('id', entityId);

    if (updateError) {
      console.error(`Failed to update coordinates:`, updateError);
      return false;
    }

    console.log(`Updated coordinates for ${entityType} ${entityId}: ${city}, ${country} -> ${result.coordinates!.latitude}, ${result.coordinates!.longitude}`);
    return true;

  } catch (error) {
    console.error(`Error updating coordinates for ${entityType} ${entityId}:`, error);
    return false;
  }
}

/**
 * Batch geocode entities that need coordinates
 */
export async function batchGeocodeEntities(
  entityType: 'hubs' | 'suppliers' | 'customers',
  limit: number = 10
): Promise<{
  processed: number;
  successful: number;
  failed: number;
}> {
  const stats = { processed: 0, successful: 0, failed: 0 };

  try {
    // Get entities that need geocoding
    const cityField = entityType === 'hubs' ? 'city_name' : 'city';
    const countryField = entityType === 'hubs' ? 'country_code' : 'country';

    // Simple query - just get entities without coordinates
    const { data: entities, error } = await supabase
      .from(entityType)
      .select(`id, ${cityField}, ${countryField}`)
      .is('latitude', null)
      .not(cityField, 'is', null)
      .not(countryField, 'is', null)
      .limit(limit);

    if (error) {
      console.error(`Error fetching entities for geocoding:`, error);
      return stats;
    }

    if (!entities || entities.length === 0) {
      console.log(`No ${entityType} need geocoding`);
      return stats;
    }

    console.log(`Geocoding ${entities.length} ${entityType}...`);

    for (const entity of entities) {
      const city = (entity as any)[cityField];
      const country = (entity as any)[countryField];

      if (!city || !country) {
        continue;
      }

      stats.processed++;
      const success = await geocodeAndUpdateEntity(entityType, entity.id, city, country);

      if (success) {
        stats.successful++;
      } else {
        stats.failed++;
      }

      // Small delay between entities for politeness
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Batch geocoding completed: ${stats.successful} successful, ${stats.failed} failed`);
    return stats;

  } catch (error) {
    console.error(`Batch geocoding error:`, error);
    return stats;
  }
}

// Import supabase - this will be available from the lib
import { supabase } from '@/lib/supabase';