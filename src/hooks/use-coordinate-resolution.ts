import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { batchGeocodeEntities, geocodeAndUpdateEntity } from '@/lib/nominatim-geocoding';
import { toast } from 'sonner';

export interface CoordinateResolutionStats {
  processed: number;
  successful: number;
  failed: number;
}

export function useCoordinateResolution() {
  const [isResolving, setIsResolving] = useState(false);
  const [progress, setProgress] = useState<{
    entityType: string;
    stats: CoordinateResolutionStats;
  } | null>(null);

  const queryClient = useQueryClient();

  const batchGeocodeMutation = useMutation({
    mutationFn: async (params: {
      entityType: 'hubs' | 'suppliers' | 'customers';
      limit?: number;
    }) => {
      const { entityType, limit = 10 } = params;
      return await batchGeocodeEntities(entityType, limit);
    },
    onSuccess: (stats, { entityType }) => {
      setProgress({ entityType, stats });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [entityType] });

      if (stats.successful > 0) {
        toast.success(
          `Geocoded ${stats.successful} ${entityType} successfully`,
          {
            description: stats.failed > 0 ? `${stats.failed} failed` : undefined
          }
        );
      }

      if (stats.failed > 0 && stats.successful === 0) {
        toast.error(
          `Failed to geocode ${stats.failed} ${entityType}`,
          {
            description: 'Check network connection or location data'
          }
        );
      }
    },
    onError: (error) => {
      console.error('Batch geocoding error:', error);
      toast.error('Geocoding failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const singleGeocodeMutation = useMutation({
    mutationFn: async (params: {
      entityType: 'hubs' | 'suppliers' | 'customers';
      entityId: string;
      city: string;
      country: string;
    }) => {
      const { entityType, entityId, city, country } = params;
      return await geocodeAndUpdateEntity(entityType, entityId, city, country);
    },
    onSuccess: (success, { entityType, entityId }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [entityType] });
      queryClient.invalidateQueries({ queryKey: [entityType, entityId] });

      if (success) {
        toast.success('Location geocoded successfully');
      } else {
        toast.error('Failed to geocode location');
      }
    },
    onError: (error) => {
      console.error('Single geocoding error:', error);
      toast.error('Geocoding failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const resolveAllCoordinates = async () => {
    setIsResolving(true);
    setProgress(null);

    try {
      // Process each entity type sequentially to respect rate limits
      const entityTypes: Array<'hubs' | 'suppliers' | 'customers'> = ['hubs', 'suppliers', 'customers'];

      for (const entityType of entityTypes) {
        if (!isResolving) break; // Allow cancellation

        const stats = await batchGeocodeMutation.mutateAsync({
          entityType,
          limit: 50 // Process more entities at once
        });

        // If there are more entities to process, continue in smaller batches
        if (stats.processed > 0) {
          let hasMore = true;
          while (hasMore && isResolving) {
            const moreStats = await batchGeocodeMutation.mutateAsync({
              entityType,
              limit: 10
            });
            hasMore = moreStats.processed > 0;
          }
        }
      }

      toast.success('Coordinate resolution completed', {
        description: 'All locations have been processed'
      });

    } catch (error) {
      console.error('Error resolving coordinates:', error);
      toast.error('Coordinate resolution failed');
    } finally {
      setIsResolving(false);
      setProgress(null);
    }
  };

  const resolveEntityCoordinates = async (
    entityType: 'hubs' | 'suppliers' | 'customers',
    limit: number = 10
  ) => {
    return batchGeocodeMutation.mutateAsync({ entityType, limit });
  };

  const resolveSingleEntity = async (
    entityType: 'hubs' | 'suppliers' | 'customers',
    entityId: string,
    city: string,
    country: string
  ) => {
    return singleGeocodeMutation.mutateAsync({
      entityType,
      entityId,
      city,
      country
    });
  };

  const stopResolution = () => {
    setIsResolving(false);
    setProgress(null);
  };

  return {
    // State
    isResolving,
    progress,
    isBatchProcessing: batchGeocodeMutation.isPending,
    isSingleProcessing: singleGeocodeMutation.isPending,

    // Actions
    resolveAllCoordinates,
    resolveEntityCoordinates,
    resolveSingleEntity,
    stopResolution,

    // Individual mutations for advanced usage
    batchGeocodeMutation,
    singleGeocodeMutation
  };
}