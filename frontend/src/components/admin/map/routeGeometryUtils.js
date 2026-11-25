import L from "leaflet";

export const DEFAULT_CENTER = [-14.0678, -75.7286]; // Ica

const COORD_EPSILON = 1e-6;

export const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const formatCoord = (value, decimals = 5) =>
  value != null && Number.isFinite(Number(value))
    ? Number(value).toFixed(decimals)
    : "—";

export function createNumberedStopIcon(order, name) {
  const safeName = escapeHtml(name);
  return L.divIcon({
    className: "!bg-transparent !border-none",
    html: `
      <div class="flex flex-col items-center -translate-x-1/2 -translate-y-1/2 group pointer-events-auto">
        <div class="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white font-extrabold text-[11px] shadow-md border-2 border-white ring-2 ring-blue-500/20">
          ${order}
        </div>
        <div class="mt-0.5 max-w-[100px] truncate rounded bg-slate-900/80 px-1 py-0.2 text-[9px] font-semibold text-white shadow-xs">
          ${safeName}
        </div>
      </div>
    `,
    iconSize: [30, 40],
    iconAnchor: [0, 0],
  });
}

export function createGeometryPointIcon(order) {
  return L.divIcon({
    className: "!bg-transparent !border-none",
    html: `
      <div class="flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
        <div class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white font-extrabold text-[10px] shadow-md border-2 border-white ring-2 ring-emerald-500/20">
          ${order}
        </div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [0, 0],
  });
}

/**
 * Links a stored point to the stop it was generated from. The API stores plain
 * coordinates, so the link is reconstructed by matching coordinates when the
 * editor loads. Custom points placed by hand do not match any stop.
 */
export function findStopIdForPoint(point, stops) {
  const latitude = Array.isArray(point) ? point[0] : point?.latitude;
  const longitude = Array.isArray(point) ? point[1] : point?.longitude;
  if (latitude == null || longitude == null) return null;

  const match = (stops || []).find(
    (stop) =>
      stop.latitude != null &&
      stop.longitude != null &&
      Math.abs(Number(stop.latitude) - Number(latitude)) < COORD_EPSILON &&
      Math.abs(Number(stop.longitude) - Number(longitude)) < COORD_EPSILON,
  );
  return match?.stopId ?? null;
}

/**
 * Keeps a stop-derived geometry consistent when a new stop is added: if the
 * direction already has points linked to stops, the new stop gets its point.
 * Freely traced geometries are left untouched.
 */
export function appendPointForStop(routePoints, stop) {
  const points = routePoints || [];
  if (!points.some((point) => point.stopId)) return points;
  if (stop.latitude == null || stop.longitude == null) return points;
  return [
    ...points,
    {
      pointOrder: points.length + 1,
      latitude: Number(stop.latitude),
      longitude: Number(stop.longitude),
      stopId: stop.stopId,
    },
  ];
}
