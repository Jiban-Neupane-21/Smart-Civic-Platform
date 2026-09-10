/**
 * Smart Civic Platform - Geospatial Boundary & Jurisdiction Engine
 * Implements Algorithm 6: Point-in-Polygon (Ray-Casting / Jordan Curve Theorem)
 * Reference: docs/SYSTEM_AUTOMATION_ALGORITHMS.md
 */

export interface MunicipalityBoundary {
  name: string; // e.g. "Tokha", "Bharatpur", "Paiyun"
  aliases: string[];
  district: string;
  province: string;
  center: [number, number]; // [lat, lng]
  zoom: number;
  boundingBox: [number, number, number, number]; // [minLat, minLng, maxLat, maxLng]
  // Polygon coordinates: Array of [lat, lng] pairs forming a closed polygon
  polygon: [number, number][];
}

/**
 * Predefined boundary polygons for active & partner municipalities.
 * Coordinate order: [latitude, longitude]
 */
export const ACTIVE_MUNICIPALITY_BOUNDARIES: Record<string, MunicipalityBoundary> = {
  tokha: {
    name: "Tokha",
    aliases: ["tokha", "tokha municipality", "tokha nagarpalika"],
    district: "Kathmandu",
    province: "Bagmati",
    center: [27.756, 85.325],
    zoom: 14,
    boundingBox: [27.730, 85.295, 27.795, 85.360],
    polygon: [
      [27.792, 85.315],
      [27.788, 85.345],
      [27.770, 85.358],
      [27.748, 85.352],
      [27.732, 85.338],
      [27.730, 85.312],
      [27.742, 85.295],
      [27.765, 85.300],
      [27.785, 85.308],
      [27.792, 85.315], // closed
    ],
  },
  bharatpur: {
    name: "Bharatpur",
    aliases: ["bharatpur", "bharatpur metropolitan city", "bharatpur mahanagarpalika"],
    district: "Chitwan",
    province: "Bagmati",
    center: [27.683, 84.433],
    zoom: 13,
    boundingBox: [27.560, 84.280, 27.770, 84.550],
    polygon: [
      [27.765, 84.380],
      [27.755, 84.460],
      [27.710, 84.545],
      [27.635, 84.530],
      [27.565, 84.470],
      [27.575, 84.360],
      [27.620, 84.285],
      [27.700, 84.320],
      [27.765, 84.380], // closed
    ],
  },
  paiyun: {
    name: "Paiyun",
    aliases: ["paiyun", "paiyun rural municipality", "paiyun gaunpalika"],
    district: "Parbat",
    province: "Gandaki",
    center: [28.050, 83.650],
    zoom: 13,
    boundingBox: [28.000, 83.580, 28.120, 83.720],
    polygon: [
      [28.115, 83.640],
      [28.095, 83.715],
      [28.040, 83.710],
      [28.005, 83.665],
      [28.010, 83.590],
      [28.065, 83.585],
      [28.115, 83.640], // closed
    ],
  },
  kathmandu: {
    name: "Kathmandu",
    aliases: ["kathmandu", "kathmandu metropolitan city", "kmc"],
    district: "Kathmandu",
    province: "Bagmati",
    center: [27.717, 85.324],
    zoom: 13,
    boundingBox: [27.670, 85.280, 27.760, 85.370],
    polygon: [
      [27.755, 85.320],
      [27.745, 85.360],
      [27.705, 85.368],
      [27.675, 85.335],
      [27.680, 85.290],
      [27.720, 85.282],
      [27.755, 85.320],
    ],
  },
  lalitpur: {
    name: "Lalitpur",
    aliases: ["lalitpur", "lalitpur metropolitan city", "patana"],
    district: "Lalitpur",
    province: "Bagmati",
    center: [27.667, 85.320],
    zoom: 13,
    boundingBox: [27.610, 85.270, 27.695, 85.360],
    polygon: [
      [27.690, 85.315],
      [27.685, 85.350],
      [27.640, 85.355],
      [27.615, 85.320],
      [27.630, 85.280],
      [27.675, 85.290],
      [27.690, 85.315],
    ],
  },
  pokhara: {
    name: "Pokhara",
    aliases: ["pokhara", "pokhara metropolitan city"],
    district: "Kaski",
    province: "Gandaki",
    center: [28.209, 83.985],
    zoom: 13,
    boundingBox: [28.140, 83.880, 28.280, 84.080],
    polygon: [
      [28.275, 83.960],
      [28.260, 84.060],
      [28.190, 84.070],
      [28.145, 84.010],
      [28.155, 83.900],
      [28.220, 83.890],
      [28.275, 83.960],
    ],
  },
};

/**
 * Approximate boundary generator for any municipality without an explicit polygon.
 * Generates an 8-sided regular polygon around the center coordinates with a ~5.5km service radius.
 */
export function generateSyntheticBoundary(name: string, centerLat: number, centerLng: number): MunicipalityBoundary {
  const radiusKm = 5.5; // ~5.5 km municipal radius
  const latDelta = radiusKm / 110.574;
  const lngDelta = radiusKm / (111.320 * Math.cos((centerLat * Math.PI) / 180));

  const steps = 8;
  const polygon: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i * 2 * Math.PI) / steps;
    polygon.push([
      centerLat + latDelta * Math.sin(angle),
      centerLng + lngDelta * Math.cos(angle),
    ]);
  }

  return {
    name,
    aliases: [name.toLowerCase()],
    district: "",
    province: "",
    center: [centerLat, centerLng],
    zoom: 13,
    boundingBox: [
      centerLat - latDelta,
      centerLng - lngDelta,
      centerLat + latDelta,
      centerLng + lngDelta,
    ],
    polygon,
  };
}

/**
 * Algorithm 6: Point-in-Polygon (Jordan Curve Theorem / Ray-Casting)
 * Evaluates whether a point P(lat, lng) is strictly inside a closed polygon.
 *
 * Mathematical condition for ray intersection:
 * ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
 *
 * @param point [latitude, longitude]
 * @param polygon Array of [latitude, longitude] vertices
 */
export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [lat, lng] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [lati, lngi] = polygon[i];
    const [latj, lngj] = polygon[j];

    const intersect =
      lngi > lng !== lngj > lng &&
      lat < ((latj - lati) * (lng - lngi)) / (lngj - lngi) + lati;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Calculates Great-Circle Haversine distance in kilometers between two points.
 */
export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface JurisdictionCheckResult {
  isInside: boolean;
  matchedBoundary: MunicipalityBoundary | null;
  nearestBoundary: MunicipalityBoundary | null;
  distanceToNearestKm: number;
}

/**
 * Evaluates whether a coordinate (lat, lng) falls within any registered active municipality boundary.
 */
export function resolveActiveJurisdiction(
  lat: number,
  lng: number,
  activeList?: { id: string; official_name: string }[]
): JurisdictionCheckResult {
  // Candidate boundaries to evaluate
  const candidates: MunicipalityBoundary[] = [];

  if (activeList && activeList.length > 0) {
    activeList.forEach((active) => {
      const key = active.official_name.trim().toLowerCase();
      const existing =
        ACTIVE_MUNICIPALITY_BOUNDARIES[key] ||
        Object.values(ACTIVE_MUNICIPALITY_BOUNDARIES).find((b) =>
          b.aliases.some((alias) => key.includes(alias) || alias.includes(key))
        );
      if (existing) {
        candidates.push(existing);
      }
    });
  }

  // Fallback to all predefined active partner municipalities if none matched
  if (candidates.length === 0) {
    candidates.push(...Object.values(ACTIVE_MUNICIPALITY_BOUNDARIES));
  }

  // 1. Check if point is inside any candidate boundary polygon using Algorithm 6 (Ray-Casting)
  for (const boundary of candidates) {
    if (isPointInPolygon([lat, lng], boundary.polygon)) {
      return {
        isInside: true,
        matchedBoundary: boundary,
        nearestBoundary: boundary,
        distanceToNearestKm: 0,
      };
    }
  }

  // 2. Point is OUTSIDE: find nearest boundary for user guidance
  let nearest: MunicipalityBoundary | null = null;
  let minDistance = Infinity;

  for (const boundary of candidates) {
    const dist = calculateDistanceKm(lat, lng, boundary.center[0], boundary.center[1]);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = boundary;
    }
  }

  return {
    isInside: false,
    matchedBoundary: null,
    nearestBoundary: nearest,
    distanceToNearestKm: Math.round(minDistance * 10) / 10,
  };
}
