'use client'

// Calculate estimated road distance using improved heuristics
export async function calculateRouteDistance(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<{ distance: number; duration: number; success: boolean }> {
  try {
    // Due to CORS restrictions, we'll use an improved estimation approach
    // that provides more accurate road distance estimates

    // Calculate straight-line distance using Haversine formula
    const straightDistance = calculateStraightLineDistance(startLat, startLng, endLat, endLng);

    // Use distance-based road factor for more accurate estimation
    // Short distances: 1.2x (urban areas, direct roads)
    // Medium distances: 1.4x (some detours, highway connections)
    // Long distances: 1.5x (multiple route segments, border crossings)
    let roadFactor = 1.3; // default

    if (straightDistance < 50) {
      roadFactor = 1.2; // Short distance, likely more direct
    } else if (straightDistance < 200) {
      roadFactor = 1.4; // Medium distance
    } else {
      roadFactor = 1.5; // Long distance, more complex routing
    }

    // Add geographic complexity factor (mountains, water bodies affect routing)
    // This is a simplified heuristic - in practice you'd use elevation/geographic data
    const latDiff = Math.abs(endLat - startLat);
    const lngDiff = Math.abs(endLng - startLng);
    const geographicComplexity = Math.min(latDiff + lngDiff, 10) * 0.02; // Small adjustment

    const estimatedRoadDistance = Math.round(straightDistance * (roadFactor + geographicComplexity));

    // Estimate duration based on distance and assumed speeds
    // Short distances: 60km/h (city/regional roads)
    // Medium distances: 90km/h (highways and major roads)
    // Long distances: 100km/h (mostly highways)
    let averageSpeed = 80; // default

    if (straightDistance < 50) {
      averageSpeed = 60;
    } else if (straightDistance < 200) {
      averageSpeed = 90;
    } else {
      averageSpeed = 100;
    }

    const estimatedDuration = Math.round(estimatedRoadDistance / averageSpeed);

    return {
      distance: estimatedRoadDistance,
      duration: estimatedDuration,
      success: false // Indicates this is an estimate, not actual routing
    };
  } catch (error) {
    console.warn('Distance calculation failed:', error);

    // Fallback to simple estimation
    const straightDistance = calculateStraightLineDistance(startLat, startLng, endLat, endLng);
    const estimatedRoadDistance = Math.round(straightDistance * 1.3);

    return {
      distance: estimatedRoadDistance,
      duration: Math.round(estimatedRoadDistance / 80),
      success: false
    };
  }
}

// Haversine formula for straight-line distance (fallback)
function calculateStraightLineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
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

// Batch route calculation for multiple destinations
export async function calculateMultipleRouteDistances(
  startLat: number,
  startLng: number,
  destinations: Array<{ lat: number; lng: number; id: string }>
): Promise<Array<{ id: string; distance: number; duration: number; success: boolean }>> {
  const results = [];

  // Calculate routes in parallel (optimized batch processing)
  const batchSize = 10; // Increased since we're not hitting external APIs
  for (let i = 0; i < destinations.length; i += batchSize) {
    const batch = destinations.slice(i, i + batchSize);

    const batchPromises = batch.map(async (dest) => {
      const result = await calculateRouteDistance(startLat, startLng, dest.lat, dest.lng);
      return {
        id: dest.id,
        ...result
      };
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Small delay between batches for smooth processing
    if (i + batchSize < destinations.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  return results;
}