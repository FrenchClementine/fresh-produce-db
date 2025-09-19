'use client'

import React, { useState, useEffect } from 'react';
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
  Euro,
  Loader2,
  Info,
  Route,
  AlertCircle,
  User,
  Mail,
  Tag,
  ChevronDown,
  ChevronUp
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
  actualRouteCoordinates?: [number, number][];
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
  price_bands?: Array<{
    id: string;
    pallet_dimensions: string;
    min_pallets: number;
    max_pallets?: number;
    price_per_pallet: number;
  }>;
  agent_name?: string;
  agent_email?: string;
  agent_role?: string;
  diesel_surcharge_percentage?: number;
}

// Helper function to calculate price with diesel surcharge
const calculatePriceWithDieselSurcharge = (basePrice: number, dieselSurchargePercentage: number): number => {
  if (dieselSurchargePercentage === 0) return basePrice;
  return Math.round(basePrice * (1 + dieselSurchargePercentage / 100) * 100) / 100;
};

export default function TransportPage() {
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingTransport, setIsLoadingTransport] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [transportMatches, setTransportMatches] = useState<TransportMatch[]>([]);
  const [expandedPriceBands, setExpandedPriceBands] = useState<Set<string>>(new Set());


  // Toggle price bands dropdown
  const togglePriceBands = (transporterId: string) => {
    const newExpanded = new Set(expandedPriceBands);
    if (newExpanded.has(transporterId)) {
      newExpanded.delete(transporterId);
    } else {
      newExpanded.add(transporterId);
    }
    setExpandedPriceBands(newExpanded);
  };

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

      // Get actual route coordinates if available
      const actualRouteCoordinates = routeResult.coordinates;

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
        destinationOffsetKm: Math.round(destinationOffset),
        actualRouteCoordinates
      });

      // Search for transport matches
      setIsLoadingTransport(true);
      await searchTransportMatches(fromHub.id, toHub.id);

    } catch (error) {
      console.error('Route search error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to search route');
    } finally {
      setIsSearching(false);
      setIsLoadingTransport(false);
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
            name,
            email,
            phone_number,
            diesel_surcharge_percentage,
            agent:agent_id (
              id,
              name,
              email,
              role
            )
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

        const dieselSurcharge = route.transporters?.diesel_surcharge_percentage || 0;
        const prices = allPricing.map((p: any) =>
          calculatePriceWithDieselSurcharge(p.price_per_pallet, dieselSurcharge)
        ).filter((p: any) => p > 0);
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
          // Include all price bands with diesel surcharge
          price_bands: pricingData.map(p => ({
            id: p.id,
            pallet_dimensions: p.pallet_dimensions,
            min_pallets: p.min_pallets,
            max_pallets: p.max_pallets,
            price_per_pallet: calculatePriceWithDieselSurcharge(p.price_per_pallet, dieselSurcharge)
          })),
          // Include agent information
          agent_name: route.transporters?.agent?.name || null,
          agent_email: route.transporters?.agent?.email || route.transporters?.email || null,
          agent_role: route.transporters?.agent?.role || null,
          // Include diesel surcharge information
          diesel_surcharge_percentage: route.transporters?.diesel_surcharge_percentage || 0
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
        setRouteInfo(prev => prev ? ({ ...prev, suggestedTransporter: undefined }) : prev);
        console.log('No direct routes found, searching for alternatives...');
        await searchAlternativeRoutes(fromHubId, toHubId);
      }

    } catch (error) {
      console.error('Error searching transport matches:', error);
    } finally {
      setIsLoadingTransport(false);
    }
  };

  const searchAlternativeRoutes = async (requestedFromHubId: string, requestedToHubId: string) => {
    try {
      // Set a timeout for alternative route search to prevent long waits
      const timeoutId = setTimeout(() => {
        toast.info('Alternative route search is taking longer than expected');
      }, 10000); // 10 second warning
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
            name,
            email,
            phone_number,
            diesel_surcharge_percentage,
            agent:agent_id (
              id,
              name,
              email,
              role
            )
          )
        `)
        .eq('is_active', true);

      if (routesError) {
        console.error('Error fetching alternative routes:', routesError);
        return;
      }

      // Calculate distances and find closest alternatives
      const routesWithDistances = [];

      // Process routes in batches to avoid API rate limits - limit to 5 for faster response
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

      // Pre-filter routes by straight-line distance and country to improve performance
      const routesWithBasicDistance = validRoutes
        .filter(route =>
          route.origin_hub?.country_code === requestedFromHub.country_code && // Filter by departure country
          route.destination_hub?.country_code === requestedToHub.country_code  // Filter by arrival country
        )
        .map(route => {
          const straightLineDistance = calculateDistance(
            requestedFromHub.latitude,
            requestedFromHub.longitude,
            route.origin_hub.latitude,
            route.origin_hub.longitude
          ) + calculateDistance(
            route.destination_hub.latitude,
            route.destination_hub.longitude,
            requestedToHub.latitude,
            requestedToHub.longitude
          );
          return { ...route, basicDistance: straightLineDistance };
        })
        .sort((a, b) => a.basicDistance - b.basicDistance)
        .slice(0, 3); // Reduce to top 3 for speed

      // Use straight-line distance approximation instead of API calls for faster results
      for (const route of routesWithBasicDistance) {
        try {
          // Use straight-line distances with road factors for speed
          const originStraightLine = calculateDistance(
            requestedFromHub.latitude,
            requestedFromHub.longitude,
            route.origin_hub.latitude,
            route.origin_hub.longitude
          );
          const destinationStraightLine = calculateDistance(
            route.destination_hub.latitude,
            route.destination_hub.longitude,
            requestedToHub.latitude,
            requestedToHub.longitude
          );
          const routeStraightLine = calculateDistance(
            route.origin_hub.latitude,
            route.origin_hub.longitude,
            route.destination_hub.latitude,
            route.destination_hub.longitude
          );

          // Apply road factors for estimation (1.3x for approximation)
          const originDistance = Math.round(originStraightLine * 1.3);
          const destinationDistance = Math.round(destinationStraightLine * 1.3);
          const routeDistance = Math.round(routeStraightLine * 1.3);
          const totalDeviation = originDistance + destinationDistance;

          routesWithDistances.push({
            ...route,
            originDistance,
            destinationDistance,
            routeDistance,
            requestedDistance: Math.round(requestedDistance),
            totalDeviation,
            similarity: Math.max(0, 100 - (totalDeviation / requestedDistance) * 100)
          });
        } catch (error) {
          console.warn(`Failed to calculate distances for route ${route.id}:`, error);
        }
      }

      // Sort by similarity (closest alternatives first)
      const sortedAlternatives = routesWithDistances
        .sort((a, b) => a.totalDeviation - b.totalDeviation)
        .slice(0, 3); // Show top 3 alternatives for speed

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

          const dieselSurcharge = route.transporters?.diesel_surcharge_percentage || 0;
          const prices = allPricing.map((p: any) =>
            calculatePriceWithDieselSurcharge(p.price_per_pallet, dieselSurcharge)
          ).filter((p: any) => p > 0);
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
            // Include all price bands with diesel surcharge
            price_bands: pricingData.map(p => ({
              id: p.id,
              pallet_dimensions: p.pallet_dimensions,
              min_pallets: p.min_pallets,
              max_pallets: p.max_pallets,
              price_per_pallet: calculatePriceWithDieselSurcharge(p.price_per_pallet, dieselSurcharge)
            })),
            // Include agent information
            agent_name: route.transporters?.agent?.name || null,
            agent_email: route.transporters?.agent?.email || route.transporters?.email || null,
            agent_role: route.transporters?.agent?.role || null,
            // Include diesel surcharge information
            diesel_surcharge_percentage: route.transporters?.diesel_surcharge_percentage || 0,
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

      clearTimeout(timeoutId);
    } catch (error) {
      console.error('Error searching alternative routes:', error);
      clearTimeout(timeoutId);
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

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Search Section */}
        <div>
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
                  onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    searchRoute();
                  }
                }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="to">To Location</Label>
                <Input
                  id="to"
                  placeholder="e.g., Madrid, Spain"
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                  onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    searchRoute();
                  }
                }}
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


        </div>

        {/* Route Details and Transport Results */}
        {routeInfo && (
          <div className="space-y-6">
            {/* Compact Route Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 border space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-600" />
                    <span className="font-medium">{routeInfo.fromHub?.name}</span>
                    <span className="text-sm text-gray-500">({routeInfo.fromHub?.city_name})</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-red-600" />
                    <span className="font-medium">{routeInfo.toHub?.name}</span>
                    <span className="text-sm text-gray-500">({routeInfo.toHub?.city_name})</span>
                  </div>
                </div>
                <Badge variant="secondary" className="ml-auto">
                  {routeInfo.distance} km
                </Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 text-sm text-gray-600">
                {typeof routeInfo.originOffsetKm === 'number' && routeInfo.fromLocation && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-700">Nearest origin hub</p>
                      <p>
                        {routeInfo.fromHub?.name} is about {routeInfo.originOffsetKm} km from
                        {' '}<span className="font-medium text-gray-800">{routeInfo.fromLocation}</span>.
                      </p>
                    </div>
                  </div>
                )}
                {typeof routeInfo.destinationOffsetKm === 'number' && routeInfo.toLocation && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-700">Nearest destination hub</p>
                      <p>
                        {routeInfo.toHub?.name} is about {routeInfo.destinationOffsetKm} km from
                        {' '}<span className="font-medium text-gray-800">{routeInfo.toLocation}</span>.
                      </p>
                    </div>
                  </div>
                )}
                {routeInfo.suggestedTransporter && (
                  <div className="flex items-start gap-3 md:col-span-2">
                    <Truck className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-700">Suggested transporter contact</p>
                      <p>
                        {routeInfo.suggestedTransporter.name}
                        {routeInfo.suggestedTransporter.agentName ? (
                          <> · speak with <span className="font-medium">{routeInfo.suggestedTransporter.agentName}</span></>
                        ) : (
                          <span className="text-gray-500"> · contact their logistics team</span>
                        )}
                        {routeInfo.suggestedTransporter.contactEmail && (
                          <> · <a
                            className="text-blue-600 underline"
                            href={`mailto:${routeInfo.suggestedTransporter.contactEmail}`}
                          >
                            {routeInfo.suggestedTransporter.contactEmail}
                          </a></>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Map Section */}
            <Card className="h-[500px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="h-5 w-5" />
                  Route Map
                </CardTitle>
                <CardDescription>
                  Visual representation of your transport route
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 h-[400px]">
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

            {/* Transport Options */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    <CardTitle>Available Transport Options</CardTitle>
                  </div>
                  <Badge variant="outline">
                    {transportMatches.length} route{transportMatches.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoadingTransport ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                        <p className="text-gray-500">Searching for transport routes...</p>
                        <p className="text-sm text-gray-400">This may take a few moments</p>
                      </div>
                    </div>
                  ) : transportMatches.length > 0 ? (
                    transportMatches.map((match) => (
                      <div
                        key={match.id}
                        className={`p-6 border rounded-lg hover:shadow-md transition-all duration-200 ${
                          match.isAlternative ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white hover:border-blue-200'
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold">{match.transporter_name}</h3>
                              {match.isAlternative && (
                                <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-300">
                                  Alternative Route
                                </Badge>
                              )}
                            </div>

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
                          <Badge variant="outline" className="ml-auto">
                            {match.frequency}
                          </Badge>
                        </div>

                        {/* Key Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <Clock className="h-5 w-5 text-blue-600" />
                            <div>
                              <p className="text-sm text-gray-500">Transit Time</p>
                              <p className="font-medium">{match.transit_days} days</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <Euro className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="text-sm text-gray-500">Price Range</p>
                              <p className="font-medium">
                                {match.base_rate_per_pallet > 0
                                  ? `${match.price_range.replace(/€/g, '')}/pallet`
                                  : 'Price on request'
                                }
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <Truck className="h-5 w-5 text-purple-600" />
                            <div>
                              <p className="text-sm text-gray-500">Frequency</p>
                              <p className="font-medium">{match.frequency}</p>
                            </div>
                          </div>
                        </div>

                        {/* Additional Details */}
                        <div className="space-y-4">
                          {/* Agent Information */}
                          {match.agent_name && (
                            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <User className="h-5 w-5 text-blue-600" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{match.agent_name}</p>
                                <div className="flex items-center gap-2">
                                  {match.agent_role && (
                                    <Badge variant="outline" className="text-xs">
                                      {match.agent_role}
                                    </Badge>
                                  )}
                                  {match.agent_email && (
                                    <div className="flex items-center gap-1 text-xs text-gray-600">
                                      <Mail className="h-3 w-3" />
                                      <span>Contact available</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Price Bands Dropdown */}
                          {match.price_bands && match.price_bands.length > 0 && (
                            <div className="space-y-2">
                              <button
                                onClick={() => togglePriceBands(match.id)}
                                className="flex items-center justify-between w-full p-3 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <Tag className="h-4 w-4 text-green-600" />
                                  <span className="font-medium text-gray-900">
                                    View Price Bands ({match.price_bands.length})
                                  </span>
                                </div>
                                {expandedPriceBands.has(match.id) ? (
                                  <ChevronUp className="h-4 w-4 text-gray-600" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-600" />
                                )}
                              </button>

                              {expandedPriceBands.has(match.id) && (
                                <div className="grid gap-2 mt-2">
                                  {match.price_bands.map((band, index) => (
                                    <div key={band.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                                      <div>
                                        <p className="font-medium text-gray-900">{band.pallet_dimensions}cm pallets</p>
                                        <p className="text-sm text-gray-600">
                                          {band.min_pallets}{band.max_pallets ? `-${band.max_pallets}` : '+'} pallets
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-bold text-green-700">€{band.price_per_pallet}</p>
                                        <p className="text-xs text-gray-500">per pallet</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Diesel Surcharge Information */}
                          {match.diesel_surcharge_percentage && match.diesel_surcharge_percentage > 0 && (
                            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                              <span className="text-lg">⛽</span>
                              <div>
                                <p className="text-sm font-medium text-amber-800">Diesel Surcharge Included</p>
                                <p className="text-xs text-amber-600">Prices include {match.diesel_surcharge_percentage}% diesel surcharge</p>
                              </div>
                            </div>
                          )}

                          {/* Show route distance comparison for alternatives */}
                          {match.isAlternative && (
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <h5 className="font-medium text-gray-900 mb-2">Route Comparison</h5>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-500">Route Distance</p>
                                  <p className="font-medium">{match.routeDistance}km</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">vs Requested</p>
                                  <p className="font-medium">
                                    {match.routeDistance && match.requestedDistance && match.routeDistance > match.requestedDistance
                                      ? `+${match.routeDistance - match.requestedDistance}km longer`
                                      : match.routeDistance && match.requestedDistance
                                      ? `${match.requestedDistance - match.routeDistance}km shorter`
                                      : 'N/A'
                                    }
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Similarity</p>
                                  <p className="font-medium">{match.similarity}%</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Total Deviation</p>
                                  <p className="font-medium">{match.totalDeviation}km</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
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
          </div>
        )}
      </div>
    </div>
  );
}
