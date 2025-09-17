'use client'

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, MapPin, AlertTriangle, RefreshCw, Play } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCoordinateResolution } from '@/hooks/use-coordinate-resolution';
import { toast } from 'sonner';

interface CoordinateStatus {
  entityType: string;
  total: number;
  withCoordinates: number;
  withoutCoordinates: number;
  failed: number;
  percentage: number;
}

export default function CoordinatesAdminPage() {
  const [status, setStatus] = useState<CoordinateStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const coordinateResolution = useCoordinateResolution();

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const entityTypes = [
        { table: 'hubs', name: 'Hubs', cityField: 'city_name', countryField: 'country_code' },
        { table: 'suppliers', name: 'Suppliers', cityField: 'city', countryField: 'country' },
        { table: 'customers', name: 'Customers', cityField: 'city', countryField: 'country' }
      ];

      const statusData = [];

      for (const entityType of entityTypes) {
        const { data, error } = await supabase
          .from(entityType.table)
          .select(`
            id,
            ${entityType.cityField},
            ${entityType.countryField},
            latitude,
            longitude,
            geocoding_failed,
            geocoding_attempts,
            coordinates_last_updated
          `);

        if (error) {
          console.error(`Error fetching ${entityType.name}:`, error);
          continue;
        }

        const total = data?.length || 0;
        const withCoordinates = data?.filter((item: any) => item.latitude && item.longitude).length || 0;
        const failed = data?.filter((item: any) => item.geocoding_failed).length || 0;
        const withoutCoordinates = total - withCoordinates;
        const percentage = total > 0 ? Math.round((withCoordinates / total) * 100) : 0;

        statusData.push({
          entityType: entityType.name,
          total,
          withCoordinates,
          withoutCoordinates,
          failed,
          percentage
        });
      }

      setStatus(statusData);
    } catch (error) {
      console.error('Error loading coordinate status:', error);
      toast.error('Failed to load coordinate status');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const runBatchGeocoding = async (entityType: string) => {
    const tableMap: Record<string, 'hubs' | 'suppliers' | 'customers'> = {
      'Hubs': 'hubs',
      'Suppliers': 'suppliers',
      'Customers': 'customers'
    };

    const table = tableMap[entityType];
    if (!table) return;

    try {
      await coordinateResolution.resolveEntityCoordinates(table, 10);
      toast.success(`Started geocoding ${entityType}`);

      // Reload status after a short delay
      setTimeout(loadStatus, 2000);
    } catch (error) {
      toast.error(`Failed to start geocoding ${entityType}`);
    }
  };

  const runAllGeocoding = async () => {
    try {
      await coordinateResolution.resolveAllCoordinates();
      toast.success('Started geocoding all entities');

      // Reload status after a short delay
      setTimeout(loadStatus, 3000);
    } catch (error) {
      toast.error('Failed to start batch geocoding');
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Coordinate Management</h1>
        <p className="text-gray-600">
          Manage automatic geocoding and coordinate storage for hubs, suppliers, and customers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mr-3" />
            <span>Loading coordinate status...</span>
          </div>
        ) : (
          status.map((item) => (
            <Card key={item.entityType}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {item.entityType}
                </CardTitle>
                <CardDescription>
                  Coordinate status for {item.total} {item.entityType.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Coverage</span>
                      <span>{item.percentage}%</span>
                    </div>
                    <Progress value={item.percentage} className="h-2" />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        ✅ {item.withCoordinates}
                      </Badge>
                      <span className="text-xs">With coords</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                        ⏳ {item.withoutCoordinates}
                      </Badge>
                      <span className="text-xs">Missing</span>
                    </div>
                    {item.failed > 0 && (
                      <div className="col-span-2 flex items-center gap-1">
                        <Badge variant="destructive" className="bg-red-100 text-red-800">
                          ❌ {item.failed}
                        </Badge>
                        <span className="text-xs">Failed geocoding</span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  {item.withoutCoordinates > 0 && (
                    <Button
                      size="sm"
                      onClick={() => runBatchGeocoding(item.entityType)}
                      disabled={coordinateResolution.isBatchProcessing}
                      className="w-full"
                    >
                      {coordinateResolution.isBatchProcessing ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 mr-1" />
                          Geocode {item.entityType}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Global Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Batch Operations
          </CardTitle>
          <CardDescription>
            Run geocoding operations across all entity types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              onClick={runAllGeocoding}
              disabled={coordinateResolution.isResolving}
            >
              {coordinateResolution.isResolving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Geocoding All...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Geocode All Missing
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={loadStatus}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>
          </div>

          {coordinateResolution.progress && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium mb-1">
                Processing {coordinateResolution.progress.entityType}...
              </div>
              <div className="text-xs text-gray-600">
                Processed: {coordinateResolution.progress.stats.processed} |
                Success: {coordinateResolution.progress.stats.successful} |
                Failed: {coordinateResolution.progress.stats.failed}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warning if no coordinates */}
      {!isLoading && status.some(s => s.withoutCoordinates > 0) && (
        <Card className="mt-6 border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-800 mb-1">
                  Missing Coordinates Detected
                </p>
                <p className="text-amber-700 text-sm">
                  Some entities are missing coordinates. The fast hub suggestion feature
                  requires all hubs to have coordinates stored in the database.
                  Click the geocoding buttons above to populate missing coordinates.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}