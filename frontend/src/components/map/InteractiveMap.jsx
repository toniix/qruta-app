import { useEffect, useState, useMemo, useRef, memo } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { Flag } from "lucide-react";
import { getBoundsFromPoints, calculateDistanceKm } from "../../utils/geoUtils";
import { BRAND_PRIMARY } from "../../constants/brand";
import { routingService } from "../../services/routingService";

// CARTO basemap. CARTO exige API key en sus tiles raster desde el 25/09/2026:
// sin key el servidor responde con un PNG en blanco rotulado "API KEY REQUIRED".
// La key se lee de VITE_CARTO_KEY (ver frontend/.env.example).
const CARTO_KEY = import.meta.env.VITE_CARTO_KEY;
const CARTO_STYLE = import.meta.env.VITE_CARTO_STYLE || "light_all";
const TILE_URL = `https://{s}.basemaps.cartocdn.com/${CARTO_STYLE}/{z}/{x}/{y}{r}.png${
  CARTO_KEY ? `?key=${CARTO_KEY}` : ""
}`;
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
const TILE_MAX_ZOOM = Number(import.meta.env.VITE_CARTO_MAX_ZOOM) || 19;
const TILE_SUBDOMAINS = "abcd";

// Máximo (km) para trazar GPS → paradero. Si el usuario está en otra ciudad
// (ej. Cusco) y ve rutas de Ica por fallback, la distancia supera este umbral
// y el trazado se omite: solo se muestra el detalle del paradero.
const MAX_TRACE_DISTANCE_KM = 10;

if (import.meta.env.DEV && !CARTO_KEY) {
  console.warn(
    "[mapa] VITE_CARTO_KEY no está definida: CARTO devolverá tiles con la marca de agua 'API KEY REQUIRED'. Copia tu key en .env.local y reinicia Vite.",
  );
}

// Lighten (positive) or darken (negative) a hex color by a percentage (0..100).
function shadeColor(color, percent) {
  const clean = (color || BRAND_PRIMARY).replace("#", "");
  let num = parseInt(clean, 16);
  let r = num >> 16;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  const target = percent < 0 ? 0 : 255;
  const p = Math.abs(percent) / 100;
  r = Math.round((target - r) * p + r);
  g = Math.round((target - g) * p + g);
  b = Math.round((target - b) * p + b);
  return `#${(0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function MapAutoRecenter({
  bounds,
  center,
  selectedStop,
  isRouteSelected,
  selectedRouteId,
  recenterTrigger,
  userLocation,
}) {
  const map = useMap();
  const lastActionKeyRef = useRef("");
  const lastTriggerRef = useRef(recenterTrigger);
  const lastFittedRouteIdRef = useRef(null);

  useEffect(() => {
    const isManualTrigger = recenterTrigger !== lastTriggerRef.current;
    lastTriggerRef.current = recenterTrigger;

    const stopLat = selectedStop?.latitude;
    const stopLng = selectedStop?.longitude;
    const hasStopCoords = selectedStop && stopLat != null && stopLng != null;

    // Resetear ruta previa si se deseleccionó la ruta
    if (!isRouteSelected) {
      lastFittedRouteIdRef.current = null;
    }

    // Caso 1: Hay una ruta seleccionada
    if (isRouteSelected) {
      const isNewRoute =
        String(lastFittedRouteIdRef.current) !== String(selectedRouteId);

      // Si es una ruta recién seleccionada (o aún no encuadrada) y tenemos bounds:
      // SIEMPRE encuadramos primero el recorrido completo de la ruta
      if (isNewRoute) {
        if (!bounds) return; // Esperar a que los puntos existan para encuadrarla bien

        const boundsKey = `route:${selectedRouteId}:${bounds[0][0].toFixed(4)},${bounds[0][1].toFixed(4)},${bounds[1][0].toFixed(4)},${bounds[1][1].toFixed(4)}`;
        if (!isManualTrigger && lastActionKeyRef.current === boundsKey) {
          return;
        }
        lastActionKeyRef.current = boundsKey;
        lastFittedRouteIdRef.current = selectedRouteId;

        const bottomSheetPadding = Math.min(window.innerHeight * 0.48, 400);
        map.flyToBounds(bounds, {
          paddingTopLeft: [40, 90],
          paddingBottomRight: [40, bottomSheetPadding + 20],
          maxZoom: 16,
          animate: true,
          duration: 1.1,
          easeLinearity: 0.25,
        });
        return;
      }

      // Si la ruta YA fue encuadrada inicialmente:
      // Si el usuario hace clic en un punto frecuente (paradero) dentro de la ruta:
      if (hasStopCoords) {
        const stopKey = `route-stop:${selectedRouteId}:${selectedStop.id || `${stopLat},${stopLng}`}`;
        if (!isManualTrigger && lastActionKeyRef.current === stopKey) {
          return;
        }
        lastActionKeyRef.current = stopKey;

        const zoom = 16;
        const targetPoint = map.project([stopLat, stopLng], zoom);
        // Offset vertical para que el pin quede visible arriba de RouteDrawer
        const offsetY = Math.min(window.innerHeight * 0.22, 180);
        const offsetPoint = L.point(targetPoint.x, targetPoint.y + offsetY);
        const targetLatLng = map.unproject(offsetPoint, zoom);

        map.flyTo(targetLatLng, zoom, {
          animate: true,
          duration: 0.9,
        });
        return;
      }

      // Si la ruta ya estaba encuadrada y el paradero se deseleccionó (selectedStop pasó a null):
      // Volvemos a encuadrar toda la ruta
      if (!selectedStop && bounds) {
        const boundsKey = `route:${selectedRouteId}:${bounds[0][0].toFixed(4)},${bounds[0][1].toFixed(4)},${bounds[1][0].toFixed(4)},${bounds[1][1].toFixed(4)}`;
        if (!isManualTrigger && lastActionKeyRef.current === boundsKey) {
          return;
        }
        lastActionKeyRef.current = boundsKey;

        const bottomSheetPadding = Math.min(window.innerHeight * 0.48, 400);
        map.flyToBounds(bounds, {
          paddingTopLeft: [40, 90],
          paddingBottomRight: [40, bottomSheetPadding + 20],
          maxZoom: 16,
          animate: true,
          duration: 1.1,
          easeLinearity: 0.25,
        });
        return;
      }

      return;
    }

    // Caso 2: NO hay ruta seleccionada, pero hay un paradero seleccionado (vista de solo paradero)
    if (hasStopCoords) {
      const stopKey = `standalone-stop:${selectedStop.id || `${stopLat},${stopLng}`}`;
      if (!isManualTrigger && lastActionKeyRef.current === stopKey) {
        return;
      }
      lastActionKeyRef.current = stopKey;

      // Si tenemos GPS y el paradero está a distancia razonable,
      // encuadrar ambos puntos (traza GPS → paradero)
      const userLat = userLocation?.lat;
      const userLng = userLocation?.lng;
      const traceDistanceKm =
        userLat != null && userLng != null
          ? calculateDistanceKm(userLat, userLng, stopLat, stopLng)
          : null;
      if (traceDistanceKm != null && traceDistanceKm <= MAX_TRACE_DISTANCE_KM) {
        const traceBounds = L.latLngBounds(
          [userLat, userLng],
          [stopLat, stopLng],
        );
        const bottomSheetPadding = Math.min(window.innerHeight * 0.28, 220);
        map.flyToBounds(traceBounds, {
          paddingTopLeft: [40, 90],
          paddingBottomRight: [40, bottomSheetPadding + 20],
          maxZoom: 17,
          animate: true,
          duration: 1.0,
          easeLinearity: 0.25,
        });
        return;
      }

      // Sin GPS: centrar solo en el paradero
      const zoom = 16;
      const targetPoint = map.project([stopLat, stopLng], zoom);
      const offsetY = window.innerHeight * 0.2;
      const offsetPoint = L.point(targetPoint.x, targetPoint.y + offsetY);
      const targetLatLng = map.unproject(offsetPoint, zoom);

      map.flyTo(targetLatLng, zoom, {
        animate: true,
        duration: 1.0,
      });
      return;
    }

    // Caso 3: No hay ruta ni paradero: centrar en la ubicación del usuario o centro del mapa
    // Únicamente en el montaje inicial (sin acción previa) o si fue un recenterTrigger manual del usuario
    if (center && (!lastActionKeyRef.current || isManualTrigger)) {
      const centerKey = `center:${center[0].toFixed(4)},${center[1].toFixed(4)}`;
      lastActionKeyRef.current = centerKey;

      const zoom = map.getZoom() || 15;
      const targetPoint = map.project(center, zoom);
      const offsetY = window.innerHeight * 0.25;
      const offsetPoint = L.point(targetPoint.x, targetPoint.y + offsetY);
      const targetLatLng = map.unproject(offsetPoint, zoom);

      map.flyTo(targetLatLng, zoom, {
        animate: true,
        duration: 0.8,
      });
    }
  }, [
    map,
    bounds,
    center,
    selectedStop,
    isRouteSelected,
    selectedRouteId,
    recenterTrigger,
    userLocation,
  ]);

  return null;
}

/* MapInstanceBridge exposes the Leaflet map instance to parent via callback */
function MapInstanceBridge({ onMapReady }) {
  const map = useMap();
  useEffect(() => {
    if (onMapReady) {
      onMapReady(map);
    }
  }, [map, onMapReady]);
  return null;
}

/* MapClickHandler captures click events on the map canvas background.
 * In pin mode a tap recenters the map on the tapped point (the ensuing
 * moveend drives pin resolution: single path, no duplicate resolve), and
 * map movement is exposed as onPinMoveStart/onPinMoveEnd. */
function MapClickHandler({
  onMapClick,
  pinMode,
  onPinMove,
  onPinMoveStart,
  onPinMoveEnd,
}) {
  const map = useMap();
  useMapEvents({
    click: (e) => {
      // In pin mode a tap moves the map under the fixed pin instead of
      // selecting stops.
      if (pinMode) {
        try {
          map.flyTo([e.latlng.lat, e.latlng.lng], map.getZoom(), {
            duration: 0.5,
          });
        } catch {
          // Map not ready: fall back to moving the pin directly.
          if (onPinMove) {
            onPinMove({ lat: e.latlng.lat, lng: e.latlng.lng });
          }
        }
        return;
      }
      if (onMapClick) {
        onMapClick(e);
      }
    },
    movestart: () => {
      if (pinMode && onPinMoveStart) {
        onPinMoveStart();
      }
    },
    moveend: (e) => {
      if (pinMode && onPinMoveEnd) {
        const center = e.target.getCenter();
        onPinMoveEnd({ lat: center.lat, lng: center.lng });
      }
    },
  });
  return null;
}

/* FixedPinOverlay: Uber-style fixed flag at the map center, pin mode only.
 * Plain HTML over the map (never a Leaflet marker): the map moves under it.
 * The pill shows the short street label above the pin and hides while the
 * map moves. Results mode keeps the draggable Leaflet flag marker instead. */
function FixedPinOverlay({ label = "", moving = false, resolving = false }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
      <div className="absolute left-1/2 top-1/2">
        <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 flex-col items-center">
          {!moving && (resolving ? (
            <div className="mb-1 max-w-[190px] truncate rounded-full border border-white/20 bg-slate-900/90 px-2.5 py-1 text-[11px] font-semibold text-white/70 shadow-lg animate-pulse">
              Ubicando punto…
            </div>
          ) : label ? (
            <div className="mb-1 max-w-[190px] truncate rounded-full border border-white/20 bg-slate-900/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg">
              {label}
            </div>
          ) : null)}
          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md">
            <Flag className="h-3.5 w-3.5 text-red-600" />
          </div>
          <div className="h-2 w-0.5 bg-red-500/80" />
        </div>
      </div>
    </div>
  );
}

const createUserLocationIcon = (showLabel = true) =>
  L.divIcon({
    className: "custom-user-pin !bg-transparent !border-none",
    html: `
      <div class="flex flex-col items-center pointer-events-auto">
    
        <div class="relative flex items-center justify-center w-7 h-7">
          <div class="absolute w-7 h-7 rounded-full bg-blue-500/30 user-location-pulse"></div>
          <div class="w-4 h-4 rounded-full bg-brand-primary border-2 border-white shadow-md"></div>
        </div>
      </div>
    `,
    iconSize: showLabel ? [130, 52] : [28, 28],
    iconAnchor: showLabel ? [65, 46] : [14, 14],
  });

const createSearchedLocationIcon = () =>
  L.divIcon({
    className: "custom-search-pin",
    html: `
      <div class="flex items-center justify-center p-2 rounded-xl bg-purple-600 text-white border-2 border-white shadow-overlay">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.3-4.3"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const createDestinationPinIcon = () =>
  L.divIcon({
    className: "custom-destination-pin !bg-transparent !border-none",
    html: `
      <div class="flex flex-col items-center pointer-events-auto">
        <div class="flex items-center justify-center p-2 rounded-xl bg-white text-red-600 border-2 border-red-500 shadow-overlay">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"/>
          </svg>
        </div>
        <div class="w-1.5 h-4 bg-red-500/70 rounded-b-full"></div>
      </div>
    `,
    iconSize: [40, 56],
    iconAnchor: [20, 52],
  });

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const createStopIcon = (stopName, isSelected, showLabel = false) => {
  const safeName = escapeHtml(stopName);
  return L.divIcon({
    className: "custom-stop-pin",
    html: `
      <div class="flex flex-col items-center group cursor-pointer pointer-events-auto" role="button" tabindex="0" aria-label="Paradero ${safeName}${isSelected ? ", seleccionado" : ""}">
        ${
          showLabel
            ? `
          <div class="px-2 py-0.5 rounded-lg bg-slate-900/90 text-white text-xs font-bold shadow-lg whitespace-nowrap mb-1 border border-slate-700/80 backdrop-blur-md flex items-center gap-1 transition-transform group-hover:scale-105">
            <span>${safeName}</span>
          </div>
        `
            : ""
        }
        <div class="flex items-center justify-center p-1.5 rounded-xl shadow-md border transition-all ${
          isSelected
            ? "bg-amber-500 text-white border-amber-600 scale-125 z-50 ring-4 ring-amber-500/30 shadow-lg"
            : "bg-white text-slate-800 border-slate-200 group-hover:scale-110"
        }">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: showLabel ? [140, 52] : [70, 46],
    iconAnchor: showLabel ? [70, 46] : [35, 35],
  });
};

function InteractiveMapComponent({
  routes = [],
  selectedRoute = null,
  selectedStop = null,
  searchedLocation = null,
  userLocation = null,
  onSelectRoute,
  onSelectStop,
  onMapClick,
  mapCenter = [-14.0678, -75.7286],
  mapZoom = 14,
  activeDirection = "OUTBOUND",
  recenterTrigger = 0,
  loadingRouteDetail = false,
  userAddress = null,
  nearbyStops = [],
  onTracingChange = null,
  onMapReady = null,
  zoomControl = false,
  pinMode = false,
  destinationPin = null,
  onPinMove = null,
  // Pin-mode movement callbacks: the map moves under the fixed overlay.
  onPinMoveStart = null,
  onPinMoveEnd = null,
  // Short street label shown in the fixed-pin pill while picking.
  pinLabel = "",
  // While the map moves the pill hides (it reappears with the sheet).
  pinMoving = false,
  // While the new center resolves, the pill shows a loading state instead
  // of the stale previous label.
  pinResolving = false,
  // Drag affordance for the destination flag. Kept separate from pinMode
  // (which also gates tap-to-move) so results mode can allow dragging
  // without changing tap-to-select behavior.
  canDragDestinationPin = false,
}) {
  const snappedCacheRef = useRef({});
  const [snappedDirectionMap, setSnappedDirectionMap] = useState({});

  // Check if all directions for the selected route are already snapped in snappedDirectionMap
  const hasAllSnappedDirections = useMemo(() => {
    const dirs = selectedRoute?.directions;
    if (!dirs || dirs.length === 0) return false;
    return dirs.every((dir) => {
      if (!dir.routePoints || dir.routePoints.length < 2) return true;
      const key = `${selectedRoute.id}:${dir.direction || dir.id}`;
      return Boolean(snappedDirectionMap[key]);
    });
  }, [selectedRoute, snappedDirectionMap]);

  // Unified tracing state: actively tracing while loading detail OR waiting for road snapping
  const isTracing = Boolean(
    selectedRoute && (loadingRouteDetail || !hasAllSnappedDirections),
  );

  useEffect(() => {
    if (onTracingChange) {
      onTracingChange(isTracing);
    }
  }, [isTracing, onTracingChange]);

  // GPS → selected-stop trace: straight line derived from state, road-snapped polyline set async via OSRM
  const [roadTrace, setRoadTrace] = useState(null); // { key, points } | null

  const straightTracePoints = useMemo(() => {
    if (!userLocation || selectedStop?.latitude == null || selectedStop?.longitude == null) {
      return null;
    }
    // Sin trazado si el paradero queda demasiado lejos (usuario en otra ciudad
    // que la de las rutas mostradas por fallback)
    const distanceKm = calculateDistanceKm(
      userLocation.lat,
      userLocation.lng,
      selectedStop.latitude,
      selectedStop.longitude,
    );
    if (distanceKm > MAX_TRACE_DISTANCE_KM) {
      return null;
    }
    return [
      [userLocation.lat, userLocation.lng],
      [selectedStop.latitude, selectedStop.longitude],
    ];
  }, [userLocation, selectedStop]);

  const traceKey = straightTracePoints
    ? `${straightTracePoints[0][0]},${straightTracePoints[0][1]}→${straightTracePoints[1][0]},${straightTracePoints[1][1]}`
    : null;

  useEffect(() => {
    if (!straightTracePoints || !traceKey) return;

    let cancelled = false;
    (async () => {
      try {
        const roadPoints = await routingService.getRoadPolyline(straightTracePoints);
        if (!cancelled && roadPoints.length >= 2) {
          setRoadTrace({ key: traceKey, points: roadPoints });
        }
      } catch {
        // Keep straight-line fallback
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [straightTracePoints, traceKey]);

  // Only use road points if they match the current trace; otherwise show straight line
  const displayTracePoints =
    roadTrace && roadTrace.key === traceKey ? roadTrace.points : straightTracePoints;

  // Fetch street-polylines (OSRM snapping) ONLY for the selected route detail directions in parallel
  useEffect(() => {
    let isMounted = true;
    async function fetchSelectedRouteStreets() {
      const dirs = selectedRoute?.directions;
      if (!dirs || dirs.length === 0) return;

      const newDirMap = {};
      let needsFetch = false;

      dirs.forEach((dir) => {
        const key = `${selectedRoute.id}:${dir.direction || dir.id}`;
        if (!snappedCacheRef.current[key]) {
          needsFetch = true;
        }
      });

      if (!needsFetch) return;

      try {
        const promises = dirs.map(async (dir) => {
          const dirKey = `${selectedRoute.id}:${dir.direction || dir.id}`;
          if (snappedCacheRef.current[dirKey]) {
            newDirMap[dirKey] = snappedCacheRef.current[dirKey];
            return;
          }
          const points = dir.routePoints;
          if (points && points.length >= 2) {
            try {
              const snapped = await routingService.getRoadPolyline(points);
              newDirMap[dirKey] = snapped || points;
            } catch {
              newDirMap[dirKey] = points;
            }
          }
        });

        await Promise.all(promises);

        if (isMounted) {
          snappedCacheRef.current = { ...snappedCacheRef.current, ...newDirMap };
          setSnappedDirectionMap((prev) => ({ ...prev, ...newDirMap }));
        }
      } catch (err) {
        console.warn("Error al calcular trayecto por calles:", err);
      }
    }

    fetchSelectedRouteStreets();
    return () => {
      isMounted = false;
    };
  }, [selectedRoute]);

  // Pull points/stops for the active direction of the selected route
  const activeDirectionMeta = useMemo(() => {
    if (!selectedRoute) return null;
    const dirs = selectedRoute.directions || [];
    const dir = dirs.find((d) => d.direction === activeDirection) || dirs[0];
    return dir || null;
  }, [selectedRoute, activeDirection]);

  // Extract all points for the selected route (from active direction, flat points, or stops/keyStops)
  const activePoints = useMemo(() => {
    if (!selectedRoute) return null;
    if (activeDirectionMeta?.routePoints?.length > 0) {
      return activeDirectionMeta.routePoints;
    }
    if (selectedRoute.points?.length > 0) {
      return selectedRoute.points;
    }
    // Fallback to stops or keyStops coordinates from summary route
    const rawStops = selectedRoute.stops || selectedRoute.keyStops || [];
    const extracted = rawStops
      .map((s) => {
        const lat = s.latitude ?? s.location?.latitude;
        const lng = s.longitude ?? s.location?.longitude;
        return lat != null && lng != null ? [lat, lng] : null;
      })
      .filter(Boolean);
    return extracted.length > 0 ? extracted : null;
  }, [selectedRoute, activeDirectionMeta]);

  // Extract all stops: selected route stops, or routes key stops + nearbyStops,
  // and ALWAYS guarantee selectedStop is included so it is never invisible.
  const allStops = useMemo(() => {
    let list = selectedRoute
      ? activeDirectionMeta?.stops || selectedRoute.stops || []
      : [...routes.flatMap((r) => r.stops || []), ...(nearbyStops || [])];

    // Always include selectedStop if it has coordinates and isn't in list yet
    if (
      selectedStop &&
      selectedStop.latitude != null &&
      selectedStop.longitude != null &&
      !list.some((s) => s.id === selectedStop.id)
    ) {
      list = [selectedStop, ...list];
    }

    // Filter valid coordinates and deduplicate by id
    return list
      .filter((s) => s && s.latitude != null && s.longitude != null)
      .filter(
        (stop, idx, arr) => arr.findIndex((s) => s.id === stop.id) === idx,
      );
  }, [selectedRoute, activeDirectionMeta, routes, nearbyStops, selectedStop]);

  // Get the bounds of the active route immediately
  const activeBounds = useMemo(() => {
    if (selectedRoute && activePoints?.length > 0) {
      return getBoundsFromPoints(activePoints);
    }
    return null;
  }, [selectedRoute, activePoints]);

  const currentCenter = useMemo(() => {
    if (searchedLocation)
      return [searchedLocation.latitude, searchedLocation.longitude];
    if (userLocation) return [userLocation.lat, userLocation.lng];
    return mapCenter;
  }, [searchedLocation, userLocation, mapCenter]);

  /* Handle map canvas background click */
  const handleMapBackgroundClick = (e) => {
    if (onMapClick) {
      onMapClick(e);
    } else if (onSelectStop) {
      onSelectStop(null);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[350px] overflow-hidden rounded-2xl border border-slate-200/90 shadow-inner">
      <MapContainer
        center={currentCenter}
        zoom={mapZoom}
        zoomControl={zoomControl}
        scrollWheelZoom={true}
        className="w-full h-full"
        aria-label="Mapa de rutas y paraderos"
        role="region"
      >
        <MapInstanceBridge onMapReady={onMapReady} />

        <TileLayer
          attribution={TILE_ATTRIBUTION}
          url={TILE_URL}
          subdomains={TILE_SUBDOMAINS}
          maxZoom={TILE_MAX_ZOOM}
        />

        <MapClickHandler
          onMapClick={handleMapBackgroundClick}
          pinMode={pinMode}
          onPinMove={onPinMove}
          onPinMoveStart={onPinMoveStart}
          onPinMoveEnd={onPinMoveEnd}
        />

        <MapAutoRecenter
          bounds={activeBounds}
          center={currentCenter}
          selectedStop={selectedStop}
          isRouteSelected={Boolean(selectedRoute)}
          selectedRouteId={selectedRoute?.id}
          recenterTrigger={recenterTrigger}
          userLocation={userLocation}
        />

        {userLocation &&
          userLocation.lat != null &&
          userLocation.lng != null && (
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={createUserLocationIcon()}
            >
              <Popup>
                <div className="p-1 max-w-[200px]">
                  <div className="text-xs font-bold text-brand-primary">
                    📍 Tu ubicación actual
                  </div>
                  {userAddress?.formattedAddress ? (
                    <div className="text-xs font-semibold text-slate-800 mt-0.5">
                      {userAddress.formattedAddress}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 mt-0.5">
                      Coordenadas detectadas por GPS
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

        {searchedLocation && (
          <Marker
            position={[searchedLocation.latitude, searchedLocation.longitude]}
            icon={createSearchedLocationIcon()}
          >
            <Popup>
              <div className="p-1">
                <div className="text-xs font-bold text-purple-900">
                  📍 Lugar buscado:
                </div>
                <div className="text-xs font-semibold text-slate-800">
                  {searchedLocation.name}
                </div>
                {searchedLocation.district && (
                  <div className="text-xs text-slate-500">
                    {searchedLocation.district}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination pin: Leaflet marker in results mode only (drag-to-research) */}
        {!pinMode &&
          destinationPin &&
          destinationPin.lat != null &&
          destinationPin.lng != null && (
            <Marker
              position={[destinationPin.lat, destinationPin.lng]}
              icon={createDestinationPinIcon()}
              draggable={canDragDestinationPin}
              eventHandlers={
                canDragDestinationPin && onPinMove
                  ? {
                      dragend: (e) => {
                        const moved = e.target.getLatLng();
                        onPinMove({ lat: moved.lat, lng: moved.lng });
                      },
                    }
                  : {}
              }
            />
          )}

        {/* Other routes (summaries) — single polyline */}
        {routes
          .filter((r) => r.id !== selectedRoute?.id)
          .map((route) => {
            const positions = route.points;
            if (!positions || positions.length < 2) return null;

            return (
              <Polyline
                key={route.id}
                positions={positions}
                pathOptions={{
                  color: route.color || BRAND_PRIMARY,
                  weight: 4,
                  opacity: selectedRoute ? 0.25 : 0.75,
                  lineCap: "round",
                  lineJoin: "round",
                }}
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    if (onSelectRoute) onSelectRoute(route);
                  },
                }}
              />
            );
          })}

        {/* Selected route — one polyline per direction (IDA/VUELTA) */}
        {selectedRoute &&
          (selectedRoute.directions?.length > 0
            ? selectedRoute.directions.map((dir) => {
                const dirKey = `${selectedRoute.id}:${dir.direction || dir.id}`;
                const points =
                  snappedDirectionMap[dirKey] || dir.routePoints || [];
                if (!points || points.length < 2) return null;

                const hasBoth =
                  selectedRoute.directions.some(
                    (d) => d.direction === "OUTBOUND",
                  ) &&
                  selectedRoute.directions.some(
                    (d) => d.direction === "INBOUND",
                  );
                const isOutbound =
                  dir.direction === "OUTBOUND" ||
                  (!hasBoth && dir.direction !== "INBOUND");
                const isActive =
                  dir.direction === activeDirection ||
                  (!hasBoth && dir.direction !== "INBOUND");
                const baseColor = selectedRoute.color || BRAND_PRIMARY;

                return (
                  <Polyline
                    key={dir.id || dir.direction}
                    positions={points}
                    pathOptions={{
                      color: isOutbound ? baseColor : shadeColor(baseColor, 45),
                      weight: isActive ? 6 : 4,
                      opacity: isActive ? 0.95 : 0.5,
                      dashArray: isOutbound ? undefined : "7 7",
                      lineCap: "round",
                      lineJoin: "round",
                      className: "route-active-polyline",
                    }}
                    eventHandlers={{
                      click: (e) => {
                        L.DomEvent.stopPropagation(e);
                        if (onSelectRoute) onSelectRoute(selectedRoute);
                      },
                    }}
                  />
                );
              })
            : null)}

        {/* GPS → selected-stop trace: straight while OSRM loads, road-snapped when ready */}
        {displayTracePoints && (
          <Polyline
            positions={displayTracePoints}
            pathOptions={{
              color: "#f59e0b",
              weight: 4,
              opacity: 0.75,
              dashArray: roadTrace?.key === traceKey ? null : "10, 8",
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}

        {allStops.map((stop, idx) => {
          const isSelected = selectedStop?.id === stop.id;
          const lat = stop.latitude;
          const lng = stop.longitude;
          if (lat == null || lng == null) return null;

          return (
            <Marker
              key={`${stop.id}-${idx}`}
              position={[lat, lng]}
              icon={createStopIcon(
                stop.name,
                isSelected,
                Boolean(selectedRoute) || isSelected,
              )}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  if (onSelectStop) onSelectStop(stop);
                },
              }}
            >
              <Popup>
                <div className="p-1 max-w-[200px]">
                  <div
                    className={`text-xs uppercase font-bold ${isSelected ? "text-amber-600" : "text-brand-primary"}`}
                  >
                    {isSelected
                      ? "📍 Paradero seleccionado"
                      : "Punto frecuente"}
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    {stop.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {stop.address || stop.reference}
                  </div>
                  {stop.accessible && (
                    <span className="inline-block mt-1 text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 font-medium">
                      ♿ Acceso Accesible
                    </span>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Pin mode: fixed center overlay over the map box (the map moves
          under it). Plain HTML, never a Leaflet marker. */}
      {pinMode && <FixedPinOverlay label={pinLabel} moving={pinMoving} resolving={pinResolving} />}
    </div>
  );
}

export const InteractiveMap = memo(InteractiveMapComponent);
