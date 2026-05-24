/**
 * OSRM (Open Source Routing Machine) utility
 * Uses the free public demo server — no API key required.
 * Returns real road-based shortest-path waypoints.
 */

export interface RouteResult {
  /** Array of [lat, lng] waypoints along the road */
  waypoints: [number, number][];
  /** Total distance in meters */
  distanceMeters: number;
  /** Total duration in seconds */
  durationSeconds: number;
}

/**
 * Fetches the shortest driving route between two points using OSRM.
 * Falls back to a straight line if the API fails.
 */
export async function fetchRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<RouteResult> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      throw new Error("OSRM returned no routes");
    }

    const route = data.routes[0];
    // GeoJSON coordinates are [lng, lat] — we need to flip to [lat, lng]
    const waypoints: [number, number][] = route.geometry.coordinates.map(
      (coord: [number, number]) => [coord[1], coord[0]]
    );

    return {
      waypoints,
      distanceMeters: route.distance,
      durationSeconds: route.duration,
    };
  } catch (error) {
    console.warn("[OSRM] Failed to fetch route, falling back to straight line:", error);
    // Fallback: generate a straight-line path with interpolated points
    const steps = 30;
    const waypoints: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      waypoints.push([
        startLat + t * (endLat - startLat),
        startLng + t * (endLng - startLng),
      ]);
    }
    return {
      waypoints,
      distanceMeters: 0,
      durationSeconds: 0,
    };
  }
}

/**
 * Searches for addresses using OpenStreetMap Nominatim.
 * Free, no API key required.
 */
export interface NominatimResult {
  display_name: string;
  lat: number;
  lng: number;
}

export async function searchAddress(query: string): Promise<NominatimResult[]> {
  if (!query || query.length < 3) return [];

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "Accept-Language": "en" },
    });
    const data = await res.json();

    return data.map((item: { display_name: string; lat: string; lon: string }) => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
  } catch (error) {
    console.warn("[Nominatim] Address search failed:", error);
    return [];
  }
}
