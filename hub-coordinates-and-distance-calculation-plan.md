# Hub Coordinates and Distance Calculation Implementation Plan

## Overview
Implement automatic coordinate resolution and distance calculation to show how far suppliers and customers are from hubs, improving logistics planning and hub selection.

## Current State Analysis

### Existing Data Structure
- **Hubs**: Have `city_name` and `country_code` but no coordinates
- **Suppliers**: Have `city` and `country` but no coordinates
- **Customers**: Have `city` and `country` but no coordinates
- **Distance Calculation**: Currently not available

## Implementation Plan

### Phase 1: Database Schema Updates

#### 1.1 Add Coordinates to Hubs Table
```sql
-- Add latitude and longitude to hubs
ALTER TABLE hubs
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8),
ADD COLUMN coordinates_last_updated TIMESTAMPTZ,
ADD COLUMN coordinates_source TEXT DEFAULT 'geocoding_api';

-- Add index for coordinate-based queries
CREATE INDEX idx_hubs_coordinates ON hubs(latitude, longitude);
```

#### 1.2 Add Coordinates to Suppliers and Customers Tables
```sql
-- Add coordinates to suppliers
ALTER TABLE suppliers
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8),
ADD COLUMN coordinates_last_updated TIMESTAMPTZ,
ADD COLUMN coordinates_source TEXT DEFAULT 'geocoding_api';

-- Add coordinates to customers
ALTER TABLE customers
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8),
ADD COLUMN coordinates_last_updated TIMESTAMPTZ,
ADD COLUMN coordinates_source TEXT DEFAULT 'geocoding_api';

-- Add indexes
CREATE INDEX idx_suppliers_coordinates ON suppliers(latitude, longitude);
CREATE INDEX idx_customers_coordinates ON customers(latitude, longitude);
```

#### 1.3 Create Distance Calculation Function
```sql
-- PostgreSQL function to calculate distance between coordinates using Haversine formula
CREATE OR REPLACE FUNCTION calculate_distance_km(
    lat1 DECIMAL(10,8),
    lon1 DECIMAL(11,8),
    lat2 DECIMAL(10,8),
    lon2 DECIMAL(11,8)
) RETURNS DECIMAL(8,2) AS $$
DECLARE
    earth_radius DECIMAL := 6371; -- Earth's radius in kilometers
    dlat DECIMAL;
    dlon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    -- Convert to radians
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);

    -- Haversine formula
    a := sin(dlat/2) * sin(dlat/2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(dlon/2) * sin(dlon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));

    RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### Phase 2: Geocoding Service Integration

#### 2.1 Geocoding API Options
**Primary Choice: OpenStreetMap Nominatim (Free)**
- Pros: Free, no API key required, good European coverage
- Cons: Rate limited (1 req/sec), less reliable than paid services
- URL: `https://nominatim.openstreetmap.org/search`

**Backup Choice: OpenCage Geocoding API**
- Pros: 2,500 free requests/day, reliable
- Cons: Requires API key, paid after limit
- URL: `https://api.opencagedata.com/geocode/v1/json`

#### 2.2 Geocoding Service Implementation
```typescript
// /src/lib/geocoding.ts
export interface Coordinates {
  latitude: number;
  longitude: number;
  source: string;
  confidence: number;
}

export async function geocodeLocation(city: string, country: string): Promise<Coordinates | null> {
  try {
    // Try OpenStreetMap Nominatim first
    const nominatimResult = await geocodeWithNominatim(city, country);
    if (nominatimResult) return nominatimResult;

    // Fallback to OpenCage if available
    if (process.env.OPENCAGE_API_KEY) {
      return await geocodeWithOpenCage(city, country);
    }

    return null;
  } catch (error) {
    console.error('Geocoding failed:', error);
    return null;
  }
}

async function geocodeWithNominatim(city: string, country: string): Promise<Coordinates | null> {
  const query = `${city}, ${country}`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'ProductFinderApp/1.0' }
  });

  const data = await response.json();
  if (data.length > 0) {
    const result = data[0];
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      source: 'nominatim',
      confidence: parseFloat(result.importance || '0.5')
    };
  }

  return null;
}
```

### Phase 3: Coordinate Resolution Automation

#### 3.1 Hub Coordinate Resolution
```typescript
// /src/lib/coordinate-resolver.ts
export async function resolveHubCoordinates(hubId: string) {
  const { data: hub } = await supabase
    .from('hubs')
    .select('id, city_name, country_code, latitude, longitude')
    .eq('id', hubId)
    .single();

  if (!hub || (hub.latitude && hub.longitude)) {
    return; // Skip if coordinates already exist
  }

  if (!hub.city_name || !hub.country_code) {
    console.warn(`Hub ${hubId} missing city or country information`);
    return;
  }

  const coords = await geocodeLocation(hub.city_name, hub.country_code);
  if (coords) {
    await supabase
      .from('hubs')
      .update({
        latitude: coords.latitude,
        longitude: coords.longitude,
        coordinates_last_updated: new Date().toISOString(),
        coordinates_source: coords.source
      })
      .eq('id', hubId);

    console.log(`Updated coordinates for hub ${hub.city_name}: ${coords.latitude}, ${coords.longitude}`);
  }
}

// Batch process all hubs
export async function resolveAllHubCoordinates() {
  const { data: hubs } = await supabase
    .from('hubs')
    .select('id')
    .is('latitude', null);

  if (!hubs) return;

  for (const hub of hubs) {
    await resolveHubCoordinates(hub.id);
    // Rate limiting - wait 1.1 seconds between requests for Nominatim
    await new Promise(resolve => setTimeout(resolve, 1100));
  }
}
```

#### 3.2 Automatic Coordinate Resolution Hooks
```typescript
// /src/hooks/use-coordinate-resolver.ts
export function useCoordinateResolver() {
  const resolveEntityCoordinates = useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      city,
      country
    }: {
      entityType: 'hubs' | 'suppliers' | 'customers';
      entityId: string;
      city: string;
      country: string;
    }) => {
      const coords = await geocodeLocation(city, country);
      if (!coords) throw new Error('Geocoding failed');

      await supabase
        .from(entityType)
        .update({
          latitude: coords.latitude,
          longitude: coords.longitude,
          coordinates_last_updated: new Date().toISOString(),
          coordinates_source: coords.source
        })
        .eq('id', entityId);

      return coords;
    }
  });

  return { resolveEntityCoordinates };
}
```

### Phase 4: Distance Calculation Integration

#### 4.1 Distance Calculation Hook
```typescript
// /src/hooks/use-distance-calculator.ts
export function useDistanceCalculator() {
  const calculateDistanceToHubs = useQuery({
    queryKey: ['distance-to-hubs'],
    queryFn: async () => {
      const { data } = await supabase.rpc('calculate_distances_to_hubs', {
        entity_lat: latitude,
        entity_lng: longitude
      });
      return data;
    },
    enabled: !!(latitude && longitude)
  });

  return { calculateDistanceToHubs };
}
```

#### 4.2 Enhanced PostgreSQL Distance Functions
```sql
-- Function to get distances from entity to all hubs
CREATE OR REPLACE FUNCTION calculate_distances_to_hubs(
    entity_lat DECIMAL(10,8),
    entity_lng DECIMAL(11,8)
) RETURNS TABLE(
    hub_id UUID,
    hub_name TEXT,
    hub_city TEXT,
    hub_country TEXT,
    distance_km DECIMAL(8,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.id,
        h.name,
        h.city_name,
        h.country_code,
        calculate_distance_km(entity_lat, entity_lng, h.latitude, h.longitude) as distance_km
    FROM hubs h
    WHERE h.latitude IS NOT NULL
      AND h.longitude IS NOT NULL
      AND h.is_active = true
    ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to find nearest hubs to an entity
CREATE OR REPLACE FUNCTION find_nearest_hubs(
    entity_lat DECIMAL(10,8),
    entity_lng DECIMAL(11,8),
    max_distance_km INTEGER DEFAULT 500,
    limit_count INTEGER DEFAULT 10
) RETURNS TABLE(
    hub_id UUID,
    hub_name TEXT,
    distance_km DECIMAL(8,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.id,
        h.name,
        calculate_distance_km(entity_lat, entity_lng, h.latitude, h.longitude) as distance_km
    FROM hubs h
    WHERE h.latitude IS NOT NULL
      AND h.longitude IS NOT NULL
      AND h.is_active = true
      AND calculate_distance_km(entity_lat, entity_lng, h.latitude, h.longitude) <= max_distance_km
    ORDER BY distance_km ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
```

### Phase 5: UI Integration

#### 5.1 Form Enhancements
Update supplier/customer forms to show nearest hubs when city/country is entered:

```typescript
// In supplier/customer forms
const { data: nearestHubs } = useQuery({
  queryKey: ['nearest-hubs', coordinates],
  queryFn: () => supabase.rpc('find_nearest_hubs', {
    entity_lat: coordinates.latitude,
    entity_lng: coordinates.longitude,
    max_distance_km: 500,
    limit_count: 5
  }),
  enabled: !!(coordinates?.latitude && coordinates?.longitude)
});

// Display in form
{nearestHubs && nearestHubs.length > 0 && (
  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
    <h4 className="text-sm font-medium text-blue-900 mb-2">
      Nearest Hubs ({nearestHubs.length})
    </h4>
    <div className="space-y-1">
      {nearestHubs.map(hub => (
        <div key={hub.hub_id} className="flex justify-between text-sm">
          <span className="text-blue-800">{hub.hub_name}</span>
          <span className="text-blue-600 font-medium">{hub.distance_km} km</span>
        </div>
      ))}
    </div>
  </div>
)}
```

#### 5.2 Logistics Capability Forms
Show distances when selecting hubs for supplier/customer logistics:

```typescript
// Enhanced hub selection with distances
const HubSelectWithDistance = ({ entity, onSelect }) => {
  const { data: hubsWithDistance } = useQuery({
    queryKey: ['hubs-with-distance', entity.latitude, entity.longitude],
    queryFn: () => supabase.rpc('calculate_distances_to_hubs', {
      entity_lat: entity.latitude,
      entity_lng: entity.longitude
    }),
    enabled: !!(entity.latitude && entity.longitude)
  });

  return (
    <Select onValueChange={onSelect}>
      <SelectContent>
        {hubsWithDistance?.map(hub => (
          <SelectItem key={hub.hub_id} value={hub.hub_id}>
            <div className="flex justify-between w-full">
              <span>{hub.hub_name} ({hub.hub_city})</span>
              <span className="text-muted-foreground ml-4">
                {hub.distance_km ? `${hub.distance_km} km` : 'Distance unknown'}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
```

### Phase 6: Background Processing

#### 6.1 Coordinate Resolution Queue
```typescript
// /src/lib/coordinate-queue.ts
export class CoordinateResolutionQueue {
  private queue: Array<{
    entityType: 'hubs' | 'suppliers' | 'customers';
    entityId: string;
    city: string;
    country: string;
  }> = [];

  private processing = false;

  async addToQueue(entityType: string, entityId: string, city: string, country: string) {
    this.queue.push({ entityType, entityId, city, country });
    if (!this.processing) {
      this.processQueue();
    }
  }

  private async processQueue() {
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) {
        await this.resolveCoordinates(item);
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1100));
      }
    }

    this.processing = false;
  }

  private async resolveCoordinates(item: any) {
    const coords = await geocodeLocation(item.city, item.country);
    if (coords) {
      await supabase
        .from(item.entityType)
        .update({
          latitude: coords.latitude,
          longitude: coords.longitude,
          coordinates_last_updated: new Date().toISOString(),
          coordinates_source: coords.source
        })
        .eq('id', item.entityId);
    }
  }
}
```

## Implementation Timeline

### Week 1: Database & Core Functions
- [ ] Run database migration to add coordinate columns
- [ ] Implement PostgreSQL distance calculation functions
- [ ] Set up geocoding service integration
- [ ] Create coordinate resolution utilities

### Week 2: Automation & Background Processing
- [ ] Implement coordinate resolution for existing hubs
- [ ] Set up automatic coordinate resolution for new entries
- [ ] Create background processing queue
- [ ] Add coordinate resolution hooks

### Week 3: UI Integration
- [ ] Update supplier forms to show nearest hubs
- [ ] Update customer forms to show nearest hubs
- [ ] Enhance logistics capability forms with distances
- [ ] Add distance display to supplier/customer detail pages

### Week 4: Testing & Optimization
- [ ] Test distance calculations accuracy
- [ ] Optimize database queries with proper indexing
- [ ] Add error handling and fallback mechanisms
- [ ] Performance testing and optimization

## Success Metrics
- ✅ All hubs have accurate coordinates
- ✅ Suppliers/customers show nearest hub distances
- ✅ Logistics forms display meaningful distance information
- ✅ Distance calculations are accurate within 1km margin
- ✅ System handles geocoding failures gracefully

## Technical Considerations

### Rate Limiting
- Nominatim: 1 request per second maximum
- Implement queue system for batch processing
- Cache coordinates to avoid re-geocoding

### Data Quality
- Validate coordinates are reasonable for given country
- Handle partial/incomplete addresses gracefully
- Allow manual coordinate override for problematic locations

### Performance
- Index coordinate columns for fast spatial queries
- Use appropriate decimal precision (8,8 for lat, 11,8 for lng)
- Consider PostGIS extension for advanced spatial operations

### Error Handling
- Graceful degradation when coordinates unavailable
- Retry logic for geocoding failures
- Fallback to manual coordinate entry

This implementation will provide valuable logistics insights by showing real distances between entities and hubs, enabling better decision-making for routing and logistics planning.