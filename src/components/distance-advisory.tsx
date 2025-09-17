import { AlertTriangle, MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DistanceInfo } from '@/hooks/use-distance-advisory';

interface DistanceAdvisoryProps {
  distanceInfo: DistanceInfo | null;
  isCalculating: boolean;
  error: string | null;
  entityType: 'supplier' | 'customer';
  entityName: string;
  hubName: string;
  className?: string;
}

export function DistanceAdvisory({
  distanceInfo,
  isCalculating,
  error,
  entityType,
  entityName,
  hubName,
  className
}: DistanceAdvisoryProps) {
  // Loading state
  if (isCalculating) {
    return (
      <div className={cn(
        "flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg",
        className
      )}>
        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
        <span className="text-sm text-gray-600">Calculating distance...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn(
        "flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg",
        className
      )}>
        <AlertTriangle className="h-4 w-4 text-red-500" />
        <div className="text-sm">
          <span className="font-medium text-red-800">Distance calculation failed</span>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  // No distance info
  if (!distanceInfo) {
    return null;
  }

  // Warning state (>150km)
  if (distanceInfo.warning) {
    return (
      <div className={cn(
        "flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg",
        className
      )}>
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <div className="text-sm">
          <span className="font-medium text-amber-800">
            Long Distance Warning: {distanceInfo.distance}km
          </span>
          <p className="text-amber-700">
            {entityName} is {distanceInfo.distance}km from {hubName}.
            Consider a closer hub if available.
          </p>
        </div>
      </div>
    );
  }

  // Normal state (<150km)
  return (
    <div className={cn(
      "flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg",
      className
    )}>
      <MapPin className="h-4 w-4 text-green-600" />
      <span className="text-sm text-green-800">
        Distance to {hubName}: <span className="font-medium">{distanceInfo.distance}km</span>
      </span>
    </div>
  );
}

// Compact version for inline usage
interface DistanceAdvisoryInlineProps {
  distance: number;
  warning: boolean;
  className?: string;
}

export function DistanceAdvisoryInline({
  distance,
  warning,
  className
}: DistanceAdvisoryInlineProps) {
  if (warning) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full",
        className
      )}>
        <AlertTriangle className="h-3 w-3" />
        {distance}km
      </span>
    );
  }

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full",
      className
    )}>
      <MapPin className="h-3 w-3" />
      {distance}km
    </span>
  );
}