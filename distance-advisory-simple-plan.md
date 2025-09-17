# Distance Advisory System - Simplified Plan

## Overview
Create a real-time distance advisory system that calculates distances on-demand when selecting hubs for suppliers and customers, without storing coordinates in the database.

## Goal
Show distance warnings/advisories when:
- Adding Ex Works logistics capability for suppliers → show distance from supplier city to selected hub
- Adding delivery logistics preference for customers → show distance from customer city to selected hub
- Alert if distances are unusually large (e.g., >150km)

## Implementation Approach

### 1. Real-time Geocoding Service
```typescript
// /src/lib/distance-advisory.ts
export async function calculateDistanceToHub(
  entityCity: string,
  entityCountry: string,
  hubCity: string,
  hubCountry: string
): Promise<{ distance: number; warning: boolean } | null> {
  try {
    // Get coordinates for both locations
    const entityCoords = await geocodeLocation(entityCity, entityCountry);
    const hubCoords = await geocodeLocation(hubCity, hubCountry);

    if (!entityCoords || !hubCoords) {
      return null;
    }

    // Calculate distance using Haversine formula
    const distance = calculateHaversineDistance(
      entityCoords.lat, entityCoords.lng,
      hubCoords.lat, hubCoords.lng
    );

    return {
      distance: Math.round(distance),
      warning: distance > 150 // Flag if over 150km
    };
  } catch (error) {
    console.error('Distance calculation failed:', error);
    return null;
  }
}

function calculateHaversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

async function geocodeLocation(city: string, country: string): Promise<{lat: number, lng: number} | null> {
  const query = `${city}, ${country}`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'ProductFinderApp/1.0' }
  });

  const data = await response.json();
  if (data.length > 0) {
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon)
    };
  }

  return null;
}
```

### 2. Distance Advisory Hook
```typescript
// /src/hooks/use-distance-advisory.ts
export function useDistanceAdvisory() {
  const [isCalculating, setIsCalculating] = useState(false);
  const [distanceInfo, setDistanceInfo] = useState<{
    distance: number;
    warning: boolean;
  } | null>(null);

  const calculateDistance = async (
    entityCity: string,
    entityCountry: string,
    hubId: string
  ) => {
    setIsCalculating(true);
    setDistanceInfo(null);

    try {
      // Get hub info from database
      const { data: hub } = await supabase
        .from('hubs')
        .select('city_name, country_code')
        .eq('id', hubId)
        .single();

      if (!hub) {
        throw new Error('Hub not found');
      }

      const result = await calculateDistanceToHub(
        entityCity,
        entityCountry,
        hub.city_name,
        hub.country_code
      );

      setDistanceInfo(result);
    } catch (error) {
      console.error('Distance calculation error:', error);
      setDistanceInfo(null);
    } finally {
      setIsCalculating(false);
    }
  };

  return {
    calculateDistance,
    distanceInfo,
    isCalculating
  };
}
```

### 3. UI Components for Distance Advisory

#### Distance Advisory Badge
```typescript
// /src/components/distance-advisory.tsx
interface DistanceAdvisoryProps {
  distance: number;
  warning: boolean;
  entityType: 'supplier' | 'customer';
  entityName: string;
  hubName: string;
}

export function DistanceAdvisory({
  distance,
  warning,
  entityType,
  entityName,
  hubName
}: DistanceAdvisoryProps) {
  if (warning) {
    return (
      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <div className="text-sm">
          <span className="font-medium text-amber-800">
            Long Distance Warning: {distance}km
          </span>
          <p className="text-amber-700">
            {entityName} is {distance}km from {hubName}. Consider a closer hub if available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
      <MapPin className="h-4 w-4 text-green-600" />
      <span className="text-sm text-green-800">
        Distance to {hubName}: <span className="font-medium">{distance}km</span>
      </span>
    </div>
  );
}
```

### 4. Form Integration

#### Supplier Logistics Capability Form
```typescript
// In AddSupplierLogisticsForm
export function AddSupplierLogisticsForm({ supplier, open, onOpenChange }) {
  const [selectedHubId, setSelectedHubId] = useState('');
  const { calculateDistance, distanceInfo, isCalculating } = useDistanceAdvisory();

  // Calculate distance when hub is selected
  useEffect(() => {
    if (selectedHubId && supplier.city && supplier.country) {
      calculateDistance(supplier.city, supplier.country, selectedHubId);
    }
  }, [selectedHubId, supplier.city, supplier.country]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form>
          {/* Origin Hub Selection */}
          <FormField
            name="origin_hub_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Origin Hub *</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    setSelectedHubId(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select origin hub" />
                  </SelectTrigger>
                  <SelectContent>
                    {hubs?.map((hub) => (
                      <SelectItem key={hub.id} value={hub.id}>
                        {hub.name} ({hub.city_name}, {hub.country_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          {/* Distance Advisory */}
          {isCalculating && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-gray-600">Calculating distance...</span>
            </div>
          )}

          {distanceInfo && (
            <DistanceAdvisory
              distance={distanceInfo.distance}
              warning={distanceInfo.warning}
              entityType="supplier"
              entityName={supplier.name}
              hubName={selectedHub?.name || 'Selected Hub'}
            />
          )}

          {/* Rest of form fields... */}
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

#### Customer Logistics Preference Form
```typescript
// In AddCustomerLogisticsForm
export function AddCustomerLogisticsForm({ customer, open, onOpenChange }) {
  const [selectedHubId, setSelectedHubId] = useState('');
  const { calculateDistance, distanceInfo, isCalculating } = useDistanceAdvisory();

  // Calculate distance when hub is selected
  useEffect(() => {
    if (selectedHubId && customer.city && customer.country) {
      calculateDistance(customer.city, customer.country, selectedHubId);
    }
  }, [selectedHubId, customer.city, customer.country]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form>
          {/* Hub Selection */}
          <FormField
            name="hub_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Our Hub (Origin)</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    setSelectedHubId(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select hub" />
                  </SelectTrigger>
                  <SelectContent>
                    {hubs?.map((hub) => (
                      <SelectItem key={hub.id} value={hub.id}>
                        {hub.name} ({hub.city_name}, {hub.country_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          {/* Distance Advisory */}
          {isCalculating && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-gray-600">Calculating distance...</span>
            </div>
          )}

          {distanceInfo && (
            <DistanceAdvisory
              distance={distanceInfo.distance}
              warning={distanceInfo.warning}
              entityType="customer"
              entityName={customer.name}
              hubName={selectedHub?.name || 'Selected Hub'}
            />
          )}

          {/* Rest of form fields... */}
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

## Benefits of This Approach

### ✅ Pros:
- **No database changes** - Pure frontend solution
- **Real-time calculations** - Always up-to-date distances
- **Simple implementation** - Just 3 files to add
- **Advisory focused** - Shows warnings for long distances
- **No storage costs** - No persistent coordinate data

### ⚠️ Considerations:
- **API rate limits** - Nominatim allows 1 req/sec (need caching)
- **Network dependency** - Requires internet for geocoding
- **Repeated calculations** - Same city/hub pairs calculated multiple times

## Implementation Steps

### 1. Create Utility Functions (30 min)
- [x] Distance calculation utilities
- [x] Geocoding service integration
- [x] Distance advisory hook

### 2. Create UI Components (30 min)
- [x] Distance advisory badge component
- [x] Loading state indicators
- [x] Warning and success states

### 3. Integrate with Forms (1 hour)
- [ ] Update supplier logistics capability form
- [ ] Update customer logistics preference form
- [ ] Add distance calculations on hub selection

### 4. Add Caching (30 min)
- [ ] Cache geocoding results in memory
- [ ] Avoid repeated API calls for same locations

## Success Criteria
- ✅ Shows distance when selecting hubs in forms
- ✅ Displays warning for distances >500km
- ✅ Works without storing any data in database
- ✅ Provides immediate feedback to users

This simplified approach gives you the distance advisory functionality you want without any database complexity - just real-time calculations when users are selecting hubs!