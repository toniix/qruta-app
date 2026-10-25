/**
 * Data Normalizers / Adapters for QRuta Domain
 * Transforms heterogeneous backend payloads into consistent, predictable objects.
 */
import { DEFAULT_ROUTE_COLOR } from "../constants/brand";

/**
 * Normalizes a Stop entity
 * Consistently exposes: id, name, latitude, longitude, reference, address,
 * accessible (boolean), imageUrl (string | null)
 */
export function normalizeStop(raw) {
  if (!raw) return null;

  const lat = raw.latitude ?? raw.location?.latitude ?? null;
  const lng = raw.longitude ?? raw.location?.longitude ?? null;
  const accessible = Boolean(raw.accessible ?? raw.isAccessible);

  return {
    id: raw.id,
    name: raw.name || "Paradero sin nombre",
    latitude: lat != null ? Number(lat) : null,
    longitude: lng != null ? Number(lng) : null,
    reference: raw.reference || "",
    address: raw.address || "",
    accessible,
    imageUrl: raw.imageUrl || null,
    stopOrder: raw.stopOrder ?? raw.order ?? null,
    distanceKm: raw.distanceKm != null ? Number(raw.distanceKm) : null,
    distanceFromStart: raw.distanceFromStart != null ? Number(raw.distanceFromStart) : null,
  };
}

/**
 * Normalizes a Route Direction entity (Ida / Vuelta)
 */
export function normalizeRouteDirection(raw) {
  if (!raw) return null;

  const rawStops = Array.isArray(raw.stops) ? raw.stops : [];
  const stops = rawStops.map(normalizeStop).filter(Boolean);

  // routePoints can be [[lat, lng], ...] or [{ latitude, longitude }, ...]
  const rawPoints = Array.isArray(raw.routePoints) ? raw.routePoints : [];
  const routePoints = rawPoints
    .map((p) => {
      if (Array.isArray(p)) return p;
      if (p && p.latitude != null && p.longitude != null) {
        return [Number(p.latitude), Number(p.longitude)];
      }
      return null;
    })
    .filter(Boolean);

  return {
    id: raw.id,
    direction: raw.direction || "OUTBOUND",
    originName: raw.originName || stops[0]?.name || "Origen",
    destinationName: raw.destinationName || stops[stops.length - 1]?.name || "Destino",
    totalDistanceKm: raw.totalDistanceKm != null ? Number(raw.totalDistanceKm) : null,
    estimatedMinutes: raw.estimatedMinutes != null ? Number(raw.estimatedMinutes) : null,
    stops,
    routePoints,
  };
}

/**
 * Normalizes a Route entity (card summary or full detail)
 */
export function normalizeRoute(raw) {
  if (!raw) return null;

  const keyStops = Array.isArray(raw.keyStops)
    ? raw.keyStops.map(normalizeStop).filter(Boolean)
    : [];

  const stops = Array.isArray(raw.stops)
    ? raw.stops.map(normalizeStop).filter(Boolean)
    : keyStops;

  const directions = Array.isArray(raw.directions)
    ? raw.directions.map(normalizeRouteDirection).filter(Boolean)
    : [];

  // Flattened points if present at root
  const points = Array.isArray(raw.points)
    ? raw.points
        .map((p) => {
          if (Array.isArray(p)) return p;
          if (p && p.latitude != null && p.longitude != null) {
            return [Number(p.latitude), Number(p.longitude)];
          }
          return null;
        })
        .filter(Boolean)
    : [];

  return {
    id: raw.id,
    code: raw.code || "Ruta",
    name: raw.name || "",
    color: raw.color || DEFAULT_ROUTE_COLOR,
    fare: raw.fare || null,
    description: raw.description || "",
    status: raw.status || "ACTIVE",
    schedule: typeof raw.schedule === "string" ? raw.schedule : raw.schedule?.hours || "",
    frequency: typeof raw.frequency === "string" ? raw.frequency : raw.schedule?.frequency || "",
    transportLineId: raw.transportLineId || null,
    transportLineName: raw.transportLineName || raw.transportLine?.name || "",
    cityId: raw.cityId || null,
    cityName: raw.cityName || "",
    keyStops,
    stops,
    directions,
    points,
  };
}

