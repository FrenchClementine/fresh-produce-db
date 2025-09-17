import { MapPin, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { NearestHubSuggestion } from '@/hooks/use-distance-advisory';

interface NearestHubSuggestionProps {
  suggestion: NearestHubSuggestion | null;
  isCalculating: boolean;
  entityName: string;
  onSelectHub: (hubId: string) => void;
  className?: string;
}

export function NearestHubSuggestionComponent({
  suggestion,
  isCalculating,
  entityName,
  onSelectHub,
  className
}: NearestHubSuggestionProps) {
  // Loading state
  if (isCalculating) {
    return (
      <div className={cn(
        "flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg",
        className
      )}>
        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        <span className="text-sm text-blue-700">Finding nearest hub...</span>
      </div>
    );
  }

  // No suggestion
  if (!suggestion) {
    return null;
  }

  // Warning state (>150km)
  if (suggestion.warning) {
    return (
      <div className={cn(
        "p-4 bg-amber-50 border border-amber-200 rounded-lg",
        className
      )}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm">
              <p className="font-medium text-amber-800 mb-1">
                Nearest Hub is Far Away ({suggestion.distance}km)
              </p>
              <p className="text-amber-700 text-xs mb-3">
                The closest hub to {entityName} is <strong>{suggestion.hubName} ({suggestion.hubCode})</strong>
                at {suggestion.distance}km away. Consider if this distance is acceptable for Ex Works pickup.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSelectHub(suggestion.hubId)}
                className="bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200 text-xs px-2 py-1 h-auto"
              >
                <MapPin className="h-3 w-3 mr-1" />
                Select This Hub
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Good suggestion (<150km)
  return (
    <div className={cn(
      "p-4 bg-green-50 border border-green-200 rounded-lg",
      className
    )}>
      <div className="flex items-start gap-3">
        <MapPin className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm">
            <p className="font-medium text-green-800 mb-1">
              Nearest Hub: {suggestion.hubName} ({suggestion.distance}km)
            </p>
            <p className="text-green-700 text-xs mb-3">
              <strong>{suggestion.hubName} ({suggestion.hubCode})</strong> is the closest hub to {entityName},
              only {suggestion.distance}km away. Great for Ex Works pickup!
            </p>
            <Button
              size="sm"
              onClick={() => onSelectHub(suggestion.hubId)}
              className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 h-auto"
            >
              <MapPin className="h-3 w-3 mr-1" />
              Select This Hub
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}