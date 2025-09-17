import { MapPin, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { NearestHub } from '@/hooks/use-nearest-hubs';

interface NearestHubsSuggestionProps {
  hubs: NearestHub[];
  isLoading: boolean;
  error: string | null;
  entityName: string;
  onSelectHub: (hubId: string) => void;
  className?: string;
}

export function NearestHubsSuggestion({
  hubs,
  isLoading,
  error,
  entityName,
  onSelectHub,
  className
}: NearestHubsSuggestionProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className={cn(
        "flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg",
        className
      )}>
        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        <span className="text-sm text-blue-700">Finding nearest hubs...</span>
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
          <span className="font-medium text-red-800">Unable to find nearest hubs</span>
          <p className="text-red-700 text-xs">{error}</p>
        </div>
      </div>
    );
  }

  // No hubs found
  if (!hubs || hubs.length === 0) {
    return null;
  }

  // Determine overall warning state
  const allHubsHaveWarning = hubs.every(hub => hub.warning);
  const someHubsHaveWarning = hubs.some(hub => hub.warning);

  return (
    <div className={cn(
      "p-4 rounded-lg border",
      allHubsHaveWarning
        ? "bg-amber-50 border-amber-200"
        : someHubsHaveWarning
        ? "bg-yellow-50 border-yellow-200"
        : "bg-green-50 border-green-200",
      className
    )}>
      <div className="flex items-start gap-3">
        {allHubsHaveWarning ? (
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
        ) : (
          <MapPin className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="text-sm">
            {allHubsHaveWarning ? (
              <p className="font-medium text-amber-800 mb-2">
                Nearest Hubs are Far Away
              </p>
            ) : (
              <p className="font-medium text-green-800 mb-2">
                {hubs.length === 1 ? 'Nearest Hub' : `${hubs.length} Nearest Hubs`} for {entityName}
              </p>
            )}

            <div className="space-y-3">
              {hubs.map((hub, index) => (
                <div
                  key={hub.hubId}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    hub.warning
                      ? "bg-amber-100 border-amber-200"
                      : "bg-white border-gray-200"
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-medium",
                        hub.warning ? "text-amber-800" : "text-gray-900"
                      )}>
                        #{index + 1}: {hub.hubName}
                      </span>
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-full font-medium",
                        hub.warning
                          ? "bg-amber-200 text-amber-800"
                          : "bg-green-200 text-green-800"
                      )}>
                        {hub.distance}km {hub.isRoadDistance ? '🛣️' : '📏'}
                      </span>
                      {hub.warning && (
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                      )}
                    </div>
                    <p className={cn(
                      "text-xs mt-1",
                      hub.warning ? "text-amber-700" : "text-gray-600"
                    )}>
                      {hub.hubCode} • {hub.hubCity}, {hub.hubCountry}
                      {hub.isRoadDistance ? " • Road distance" : " • Estimated road distance"}
                      {hub.warning && " • Consider if this distance is acceptable"}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectHub(hub.hubId)}
                    className={cn(
                      "text-xs px-3 py-1 h-auto ml-3 flex-shrink-0",
                      hub.warning
                        ? "bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200"
                        : "bg-green-100 border-green-300 text-green-800 hover:bg-green-200"
                    )}
                  >
                    Select
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              ))}
            </div>

            {allHubsHaveWarning && (
              <p className="text-amber-700 text-xs mt-3">
                All nearest hubs are over 150km away. Consider if Ex Works pickup is practical for {entityName}.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}