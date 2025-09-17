'use client'

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  MapPin,
  Truck,
  Navigation,
  Search,
  ArrowRight,
  Package,
  Clock,
  DollarSign,
  Loader2,
  Info,
  Route,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { geocodeWithNominatim } from '@/lib/nominatim-geocoding';
import { calculateRouteDistance } from '@/lib/route-distance';
import { toast } from 'sonner';

// Dynamically import map component to avoid SSR issues
const TransportMap = dynamic(
  () => import('@/components/transport-map'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }
);

interface Hub {
  id: string;
  name: string;
  hub_code: string;
  city_name: string;
  country_code: string;
  latitude: number;
  longitude: number;
  can_transship: boolean;
}

interface RouteInfo {
  fromLocation: string;
  toLocation: string;
  fromHub: Hub | null;
  toHub: Hub | null;
  distance: number;
  routeCoordinates: [number, number][];
  isRoadDistance?: boolean;
  estimatedDuration?: number;
  originOffsetKm?: number;
  destinationOffsetKm?: number;
  suggestedTransporter?: {
    name: string;
    contactEmail?: string;
    agentName?: string;
  };
}

interface TransportMatch {
  id: string;
  transporter_name: string;
  route_name: string;
  from_hub_id: string;
  to_hub_id: string;
  transit_days: number;
  base_rate_per_pallet: number;
  currency: string;
  frequency: string;
  is_active: boolean;
  isAlternative?: boolean;
  originHub?: Hub;
  destinationHub?: Hub;
  originDistance?: number;
  destinationDistance?: number;
  routeDistance?: number;
  requestedDistance?: number;
  price_range?: string;
  similarity?: number;
  totalDeviation?: number;
}

export default function TransportPage() {
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [transportMatches, setTransportMatches] = useState<TransportMatch[]>([]);

  // Load all hubs with coordinates
  useEffect(() => {
    loadHubs();
  }, []);

  const loadHubs = async () => {
    try {
      const { data, error } = await supabase
        .from('hubs')
        .select('*')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .eq('is_active', true);

      if (error) throw error;

      setHubs(data || []);
    } catch (error) {
      console.error('Error loading hubs:', error);
      toast.error('Failed to load hubs');
    }
  };

  const findNearestHub = (latitude: number, longitude: number, excludeHub?: Hub): Hub | null => {
    if (hubs.length === 0) return null;

    let nearestHub: Hub | null = null;
    let shortestDistance = Infinity;

    for (const hub of hubs) {
      if (excludeHub && hub.id === excludeHub.id) continue;

      const distance = calculateDistance(
        latitude,
        longitude,
        hub.latitude,
        hub.longitude
      );

      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestHub = hub;
      }
    }

    return nearestHub;
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRadians = (degrees: number): number => {
    return degrees * (Math.PI / 180);
  };

  const searchRoute = async () => {
    if (!fromLocation || !toLocation) {
      toast.error('Please enter both origin and destination');
      return;
    }

    setIsSearching(true);
    setRouteInfo(null);
    setTransportMatches([]);

    try {
      // Geocode origin location
      const fromGeoResult = await geocodeWithNominatim(fromLocation, '');

      if (!fromGeoResult.success || !fromGeoResult.coordinates) {
        throw new Error(`Unable to find location: ${fromLocation}`);
      }

      // Geocode destination location
      const toGeoResult = await geocodeWithNominatim(toLocation, '');

      if (!toGeoResult.success || !toGeoResult.coordinates) {
        throw new Error(`Unable to find location: ${toLocation}`);
      }

      // Find nearest hubs
      const fromHub = findNearestHub(
        fromGeoResult.coordinates.latitude,
        fromGeoResult.coordinates.longitude
      );

      const toHub = findNearestHub(
        toGeoResult.coordinates.latitude,
        toGeoResult.coordinates.longitude,
        fromHub || undefined
      );

      if (!fromHub || !toHub) {
        throw new Error('No hubs found near the specified locations');
      }

      // Calculate actual road route distance
      const routeResult = await calculateRouteDistance(
        fromHub.latitude,
        fromHub.longitude,
        toHub.latitude,
        toHub.longitude
      );

      const distance = routeResult.distance;

      // Create route coordinates for visualization
      const routeCoordinates: [number, number][] = [
        [fromHub.latitude, fromHub.longitude],
        [toHub.latitude, toHub.longitude]
      ];

      const originOffset = calculateDistance(
        fromGeoResult.coordinates.latitude,
        fromGeoResult.coordinates.longitude,
        fromHub.latitude,
        fromHub.longitude
      );

      const destinationOffset = calculateDistance(
        toGeoResult.coordinates.latitude,
        toGeoResult.coordinates.longitude,
        toHub.latitude,
        toHub.longitude
      );

      setRouteInfo({
        fromLocation,
        toLocation,
        fromHub,
        toHub,
        distance: Math.round(distance),
        routeCoordinates,
        isRoadDistance: routeResult.success,
        estimatedDuration: routeResult.duration,
        originOffsetKm: Math.round(originOffset),
        destinationOffsetKm: Math.round(destinationOffset)
      });

      // Search for transport matches
      await searchTransportMatches(fromHub.id, toHub.id);

    } catch (error) {
      console.error('Route search error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to search route');
    } finally {
      setIsSearching(false);
    }
  };

  const searchTransportMatches = async (fromHubId: string, toHubId: string) => {
    try {
      // First try direct routes
      const { data: directRoutes, error: directError } = await supabase
        .from('transporter_routes')
        .select(`
          *,
          transporters:transporter_id (
            id,
            name
          )
        `)
        .eq('origin_hub_id', fromHubId)
        .eq('destination_hub_id', toHubId)
        .eq('is_active', true);

      if (directError) {
        console.error('Error fetching transport routes:', directError);
        throw directError;
      }

      // Get pricing for routes
      let routePricing = [];
      if (directRoutes && directRoutes.length > 0) {
        console.log('Sample transport route data:', directRoutes[0]);

        const routeIds = directRoutes.map(r => r.id);
        const { data: pricingData, error: pricingError } = await supabase
          .from('transporter_route_price_bands')
          .select('*')
          .in('transporter_route_id', routeIds)
          .order('min_pallets', { ascending: true });

        if (pricingError) {
          console.warn('Error fetching pricing data:', pricingError);
        } else {
          routePricing = pricingData || [];
        }
      }

      // Group routes by transporter and destination to avoid showing duplicate lines for each price band
      const routeGroups = new Map();

      (directRoutes || []).forEach(route => {
        const groupKey = `${route.transporters?.name || 'Unknown'}-${route.origin_hub_id}-${route.destination_hub_id}`;

        if (!routeGroups.has(groupKey)) {
          routeGroups.set(groupKey, {
            route,
            pricingData: []
          });
        }

        // Add all pricing data for this route
        const pricing = routePricing.filter(p => p.transporter_route_id === route.id);
        routeGroups.get(groupKey).pricingData.push(...pricing);
      });

      // Transform grouped data into display format
      const matches = Array.from(routeGroups.values()).map(({ route, pricingData }) => {
        // Get price range from all price bands
        const standardPricing = pricingData.filter((p: any) => p.pallet_dimensions === '120x80');
        const allPricing = standardPricing.length > 0 ? standardPricing : pricingData;

        const prices = allPricing.map((p: any) => p.price_per_pallet).filter((p: any) => p > 0);
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

        // Get min/max pallet ranges
        const minPallets = allPricing.length > 0 ? Math.min(...allPricing.map((p: any) => p.min_pallets || 1)) : 1;
        const maxPallets = allPricing.length > 0 ? Math.max(...allPricing.map((p: any) => p.max_pallets || 999)) : null;

        return {
          id: route.id,
          transporter_name: route.transporters?.name || 'Unknown',
          route_name: `${route.transporters?.name || 'Transport'} Route`,
          from_hub_id: route.origin_hub_id,
          to_hub_id: route.destination_hub_id,
          transit_days: route.transport_duration_days || 1,
          base_rate_per_pallet: minPrice,
          max_rate_per_pallet: maxPrice,
          price_range: minPrice === maxPrice ? `€${minPrice}` : `€${minPrice} - €${maxPrice}`,
          currency: 'EUR',
          frequency: route.fixed_departure_days?.length > 0
            ? `${route.fixed_departure_days.length} days/week`
            : 'On demand',
          is_active: route.is_active,
          min_pallets: minPallets,
          max_pallets: maxPallets === 999 ? null : maxPallets,
          pallet_dimensions: allPricing[0]?.pallet_dimensions || '120x80',
          agent_name: route.contact_person || null,
          agent_email: route.contact_email || null
        };
      });

      setTransportMatches(matches);

      // Suggest transporter contact if available
      if (matches.length > 0) {
        const first = matches[0];
        setRouteInfo(prev => prev ? ({
          ...prev,
          suggestedTransporter: {
            name: first.transporter_name,
            agentName: first.agent_name || undefined,
            contactEmail: first.agent_email || undefined
          }
        }) : prev);
      }

      // If no direct routes found, look for alternative routes
      if (matches.length === 0) {
        console.log('No direct routes found, searching for alternatives...');
        await searchAlternativeRoutes(fromHubId, toHubId);
      }

    } catch (error) {
      console.error('Error searching transport matches:', error);
    }
  };

  const searchAlternativeRoutes = async (requestedFromHubId: string, requestedToHubId: string) => {
    try {
      const requestedFromHub = hubs.find(h => h.id === requestedFromHubId);
      const requestedToHub = hubs.find(h => h.id === requestedToHubId);

      if (!requestedFromHub || !requestedToHub) {
        toast.info('No alternative routes found');
        return;
      }

      // Get all available routes
      const { data: allRoutes, error: routesError } = await supabase
        .from('transporter_routes')
        .select(`
          *,
          origin_hub:hubs!origin_hub_id(
            id,
            name,
            city_name,
            country_code,
            latitude,
            longitude
          ),
          destination_hub:hubs!destination_hub_id(
            id,
            name,
            city_name,
            country_code,
            latitude,
            longitude
          ),
          transporters:transporter_id (
            id,
            name
          )
        `)
        .eq('is_active', true);

      if (routesError) {
        console.error('Error fetching alternative routes:', routesError);
        return;
      }

      // Calculate distances and find closest alternatives
      const routesWithDistances = [];

      // Process routes in batches to avoid API rate limits
      const validRoutes = (allRoutes || []).filter(route =>
        route.origin_hub?.latitude && route.destination_hub?.latitude
      );

      // Calculate requested route distance once
      const requestedDistanceResult = await calculateRouteDistance(
        requestedFromHub.latitude,
        requestedFromHub.longitude,
        requestedToHub.latitude,
        requestedToHub.longitude
      );
      const requestedDistance = requestedDistanceResult.distance;

      for (const route of validRoutes.slice(0, 10)) { // Limit to first 10 routes to avoid too many API calls
        try {
          // Calculate distances with small delays to respect API limits
          const [originResult, destinationResult, routeResult] = await Promise.all([
            calculateRouteDistance(
              requestedFromHub.latitude,
              requestedFromHub.longitude,
              route.origin_hub.latitude,
              route.origin_hub.longitude
            ),
            calculateRouteDistance(
              route.destination_hub.latitude,
              route.destination_hub.longitude,
              requestedToHub.latitude,
              requestedToHub.longitude
            ),
            calculateRouteDistance(
              route.origin_hub.latitude,
              route.origin_hub.longitude,
              route.destination_hub.latitude,
              route.destination_hub.longitude
            )
          ]);

          const originDistance = originResult.distance;
          const destinationDistance = destinationResult.distance;
          const routeDistance = routeResult.distance;
          const totalDeviation = originDistance + destinationDistance;

          routesWithDistances.push({
            ...route,
            originDistance: Math.round(originDistance),
            destinationDistance: Math.round(destinationDistance),
            routeDistance: Math.round(routeDistance),
            requestedDistance: Math.round(requestedDistance),
            totalDeviation: Math.round(totalDeviation),
            similarity: Math.max(0, 100 - (totalDeviation / requestedDistance) * 100)
          });

          // Small delay between API calls
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.warn(`Failed to calculate distances for route ${route.id}:`, error);
        }
      }

      // Sort by similarity (closest alternatives first)
      const sortedAlternatives = routesWithDistances
        .sort((a, b) => a.totalDeviation - b.totalDeviation)
        .slice(0, 5); // Show top 5 alternatives

      if (sortedAlternatives.length > 0) {
        // Get pricing for alternative routes
        const routeIds = sortedAlternatives.map(r => r.id);
        const { data: pricingData } = await supabase
          .from('transporter_route_price_bands')
          .select('*')
          .in('transporter_route_id', routeIds)
          .order('min_pallets', { ascending: true });

        const routePricing = pricingData || [];

        // Group alternative routes by transporter and destination
        const altRouteGroups = new Map();

        sortedAlternatives.forEach(route => {
          const groupKey = `${route.transporters?.name || 'Unknown'}-${route.origin_hub_id}-${route.destination_hub_id}`;

          if (!altRouteGroups.has(groupKey)) {
            altRouteGroups.set(groupKey, {
              route,
              pricingData: []
            });
          }

          // Add all pricing data for this route
          const pricing = routePricing.filter(p => p.transporter_route_id === route.id);
          altRouteGroups.get(groupKey).pricingData.push(...pricing);
        });

        // Transform grouped alternatives into display format
        const alternatives = Array.from(altRouteGroups.values()).map(({ route, pricingData }) => {
          // Get price range from all price bands
          const standardPricing = pricingData.filter((p: any) => p.pallet_dimensions === '120x80');
          const allPricing = standardPricing.length > 0 ? standardPricing : pricingData;

          const prices = allPricing.map((p: any) => p.price_per_pallet).filter((p: any) => p > 0);
          const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
          const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

          return {
            id: route.id,
            transporter_name: route.transporters?.name || 'Unknown',
            route_name: `${route.transporters?.name || 'Transport'} Route (Alternative)`,
            from_hub_id: route.origin_hub_id,
            to_hub_id: route.destination_hub_id,
            transit_days: route.transport_duration_days || 1,
            base_rate_per_pallet: minPrice,
            max_rate_per_pallet: maxPrice,
            price_range: minPrice === maxPrice ? `€${minPrice}` : `€${minPrice} - €${maxPrice}`,
            currency: 'EUR',
            frequency: route.fixed_departure_days?.length > 0
              ? `${route.fixed_departure_days.length} days/week`
              : 'On demand',
            is_active: route.is_active,
            // Alternative route specific data
            isAlternative: true,
            originHub: route.origin_hub,
            destinationHub: route.destination_hub,
            originDistance: route.originDistance,
            destinationDistance: route.destinationDistance,
            totalDeviation: route.totalDeviation,
            similarity: Math.round(route.similarity),
            routeDistance: route.routeDistance,
            requestedDistance: route.requestedDistance
          };
        });

        setTransportMatches(alternatives);
        toast.info(`Found ${alternatives.length} alternative routes`);
      } else {
        toast.info('No alternative routes found');
      }

    } catch (error) {
      console.error('Error searching alternative routes:', error);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Transport Planning</h1>
        <p className="text-gray-600">
          Search for transport routes between locations and find the best logistics options
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Search and Results */}
        <div className="lg:col-span-1 space-y-6">
          {/* Search Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Route Search
              </CardTitle>
              <CardDescription>
                Enter origin and destination locations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="from">From Location</Label>
                <Input
                  id="from"
                  placeholder="e.g., Amsterdam, Netherlands"
                  value={fromLocation}
                  onChange={(e) => setFromLocation(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchRoute()}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="to">To Location</Label>
                <Input
                  id="to"
                  placeholder="e.g., Madrid, Spain"
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchRoute()}
                />
              </div>

              <Button
                className="w-full"
                onClick={searchRoute}
                disabled={isSearching || !fromLocation || !toLocation}
              >
                {isSearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Navigation className="mr-2 h-4 w-4" />
                    Find Route
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Route Information */}
          {routeInfo && (
            <Card>
              <CardHeader>
                <CardTitle>Route Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Origin Hub</p>
                      <p className="font-medium">{routeInfo.fromHub?.name}</p>
                      <p className="text-xs text-gray-500">
                        {routeInfo.fromHub?.city_name}, {routeInfo.fromHub?.country_code}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Destination Hub</p>
                      <p className="font-medium">{routeInfo.toHub?.name}</p>
                      <p className="text-xs text-gray-500">
                        {routeInfo.toHub?.city_name}, {routeInfo.toHub?.country_code}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Distance</span>
                  <Badge variant="secondary">
                    {routeInfo.distance} km
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transport Matches */}
          {routeInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Available Transport
                </CardTitle>
                <CardDescription>
                  {transportMatches.length} route{transportMatches.length !== 1 ? 's' : ''} found
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] overflow-y-auto">
                  {transportMatches.length > 0 ? (
                    <div className="space-y-3">
                      {transportMatches.map((match) => (
                        <div
                          key={match.id}
                          className={`p-3 border rounded-lg hover:bg-gray-50 transition-colors ${
                            match.isAlternative ? 'border-orange-200 bg-orange-50' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium">{match.transporter_name}</p>
                                {match.isAlternative && (
                                  <Badge variant="secondary" className="text-xs">
                                    Alternative
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">{match.route_name}</p>

                              {/* Show hub details for alternatives */}
                              {match.isAlternative && match.originHub && match.destinationHub && (
                                <div className="text-xs text-gray-600 mt-1 space-y-1">
                                  <div className="flex items-center gap-1">
                                    <Route className="h-3 w-3" />
                                    <span>
                                      {match.originHub.name} → {match.destinationHub.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3 text-orange-500" />
                                    <span>
                                      +{match.originDistance}km to origin, +{match.destinationDistance}km from destination
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                            <Badge variant="outline" className="ml-2">
                              {match.frequency}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <span>{match.transit_days} days</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3 text-gray-400" />
                              <span className="font-medium">
                                {match.base_rate_per_pallet > 0
                                  ? `${match.price_range}/pallet`
                                  : 'Price on request'
                                }
                              </span>
                            </div>
                          </div>

                          {/* Show route distance comparison for alternatives */}
                          {match.isAlternative && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <div className="flex justify-between text-xs text-gray-600">
                                <span>Route distance: {match.routeDistance}km</span>
                                <span>
                                  {match.routeDistance && match.requestedDistance && match.routeDistance > match.requestedDistance
                                    ? `+${match.routeDistance - match.requestedDistance}km vs requested`
                                    : match.routeDistance && match.requestedDistance
                                    ? `${match.requestedDistance - match.routeDistance}km shorter`
                                    : 'Distance comparison unavailable'
                                  }
                                </span>
                              </div>
                              <div className="flex justify-between text-xs text-gray-600 mt-1">
                                <span>Similarity: {match.similarity}%</span>
                                <span>Total deviation: {match.totalDeviation}km</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Truck className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No direct transport routes available</p>
                      <p className="text-sm mt-2">
                        Consider transshipment options or contact transporters
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel - Map */}
        <div className="lg:col-span-2">
          <Card className="h-[800px]">
            <CardContent className="p-0 h-full">
              <TransportMap
                key={`map-${hubs.length}-${routeInfo?.distance || 0}`}
                hubs={hubs}
                routeInfo={routeInfo}
                onHubClick={(hub) => {
                  console.log('Hub clicked:', hub);
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
