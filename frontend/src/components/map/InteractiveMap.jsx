import { useEffect, useState, useMemo } from "react";
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
import { getBoundsFromPoints } from "../../utils/geoUtils";
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

function MapAutoRecenter({ bounds, center, selectedStop, isRouteSelected, recenterTrigger }) {
  const map = useMap();

  useEffect(() => {
    const lat = selectedStop?.location?.latitude ?? selectedStop?.latitude;
    const lng = selectedStop?.location?.longitude ?? selectedStop?.longitude;
    if (selectedStop && lat && lng) {
      // Shift stop center upward into the visible top 50% of screen
      const zoom = 16;
      const targetPoint = map.project([lat, lng], zoom);
      const offsetY = window.innerHeight * 0.20; // Shift focus point up
      const offsetPoint = L.point(targetPoint.x, targetPoint.y + offsetY);
      const targetLatLng = map.unproject(offsetPoint, zoom);

      map.flyTo(targetLatLng, zoom, {
        animate: true,
        duration: 1.2,
      });
    } else if (bounds) {
      // Reserve the bottom ~50% for the RouteDrawer bottom sheet immediately
      const bottomSheetPadding = Math.min(window.innerHeight * 0.48, 400);
      map.fitBounds(bounds, {
        paddingTopLeft: [40, 90],
        paddingBottomRight: [40, bottomSheetPadding + 20],
        maxZoom: 16,
        animate: true,
      });
    } else if (isRouteSelected && center) {
      // If a route is selected but bounds aren't ready yet, shift map center upward into top 50% immediately!
      const bottomSheetPadding = Math.min(window.innerHeight * 0.48, 400);
      const zoom = map.getZoom() || 14;
      const targetPoint = map.project(center, zoom);
      const offsetY = bottomSheetPadding * 0.4;
      const offsetPoint = L.point(targetPoint.x, targetPoint.y + offsetY);
      const targetLatLng = map.unproject(offsetPoint, zoom);

      map.panTo(targetLatLng, { animate: true });
    } else if (center) {
      // Cuando no hay recorrido de ruta seleccionado, el card de rutas ocupa la mitad inferior de la pantalla.
      // Centramos el marcador de ubicación del usuario en el medio de la mitad superior visible (offset Y = 25% de la altura de la pantalla).
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
  }, [map, bounds, center, selectedStop, isRouteSelected, recenterTrigger]);

  return null;
}


/* MapClickHandler captures click events on the map canvas background */
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      if (onMapClick) {
        onMapClick(e);
      }
    },
  });
  return null;
}

const createUserLocationIcon = (showLabel = true) =>
  L.divIcon({
    className: "custom-user-pin !bg-transparent !border-none",
    html: `
      <div class="flex flex-col items-center pointer-events-auto">
        ${
          showLabel
            ? `
          <div class="px-2 py-0.5 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-md whitespace-nowrap mb-1 border border-blue-400/50 backdrop-blur-md">
          Tu ubicación actual
          </div>
        `
            : ""
        }
        <div class="relative flex items-center justify-center w-7 h-7">
          <div class="absolute w-7 h-7 rounded-full bg-blue-500/30 user-location-pulse"></div>
          <div class="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md"></div>
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

const createStopIcon = (stopName, isSelected, showLabel = false) =>
  L.divIcon({
    className: "custom-stop-pin",
    html: `
      <div class="flex flex-col items-center group cursor-pointer pointer-events-auto">
        ${
          showLabel
            ? `
          <div class="px-2 py-0.5 rounded-lg bg-slate-900/90 text-white text-xs font-bold shadow-lg whitespace-nowrap mb-1 border border-slate-700/80 backdrop-blur-md flex items-center gap-1 transition-transform group-hover:scale-105">
            <span>${stopName}</span>
          </div>
        `
            : ""
        }
        <div class="flex items-center justify-center p-1.5 rounded-xl shadow-md border transition-all ${
          isSelected
            ? "bg-amber-500 text-white border-amber-600 scale-125 z-50 ring-4 ring-amber-500/30 shadow-lg"
            : "bg-white text-slate-800 border-slate-200 group-hover:scale-110"
        }">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: showLabel ? [140, 52] : [70, 46],
    iconAnchor: showLabel ? [70, 46] : [35, 35],
  });

export function InteractiveMap({
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
}) {
  const [snappedDirectionMap, setSnappedDirectionMap] = useState({});


  // Fetch street-polylines (OSRM snapping) ONLY for the selected route detail directions in parallel
  useEffect(() => {
    let isMounted = true;
    async function fetchSelectedRouteStreets() {
      if (!selectedRoute?.directions?.length) return;

      const newDirMap = {};
      const promises = selectedRoute.directions.map(async (dir) => {
        const points = dir.routePoints;
        if (points && points.length >= 2) {
          const snapped = await routingService.getRoadPolyline(points);
          newDirMap[`${selectedRoute.id}:${dir.direction || dir.id}`] = snapped;
        }
      });

      await Promise.all(promises);

      if (isMounted) {
        setSnappedDirectionMap((prev) => ({ ...prev, ...newDirMap }));
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
    const dir =
      dirs.find((d) => d.direction === activeDirection) || dirs[0];
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

  // Extract all stops from selected route or all routes
  const allStops = useMemo(() => {
    if (selectedRoute) {
      return activeDirectionMeta?.stops || selectedRoute.stops || [];
    }
    // For summaries without stops, try to get from directions
    return routes
      .flatMap((r) => r.stops || [])
      .filter(
        (stop, idx, arr) => arr.findIndex((s) => s.id === stop.id) === idx,
      );
  }, [selectedRoute, activeDirectionMeta, routes]);

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
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution={TILE_ATTRIBUTION}
          url={TILE_URL}
          subdomains={TILE_SUBDOMAINS}
          maxZoom={TILE_MAX_ZOOM}
        />

        <MapClickHandler onMapClick={handleMapBackgroundClick} />

        <MapAutoRecenter
          bounds={activeBounds}
          center={selectedRoute ? null : currentCenter}
          selectedStop={selectedStop}
          isRouteSelected={Boolean(selectedRoute)}
          recenterTrigger={recenterTrigger}
        />


        {userLocation &&
          userLocation.lat != null &&
          userLocation.lng != null && (
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={createUserLocationIcon()}
            >
              <Popup>
                <div className="text-xs font-semibold text-slate-800">
                  📍 Tu ubicación actual
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
            : selectedRoute.points &&
              selectedRoute.points.length >= 2 && (
                <Polyline
                  key={`${selectedRoute.id}-flat`}
                  positions={selectedRoute.points}
                  pathOptions={{
                    color: selectedRoute.color || BRAND_PRIMARY,
                    weight: 6,
                    opacity: 0.95,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                  eventHandlers={{
                    click: (e) => {
                      L.DomEvent.stopPropagation(e);
                      if (onSelectRoute) onSelectRoute(selectedRoute);
                    },
                  }}
                />
              ))}

        {allStops.map((stop, idx) => {
          const isSelected = selectedStop?.id === stop.id;
          const lat = stop.location?.latitude ?? stop.latitude;
          const lng = stop.location?.longitude ?? stop.longitude;
          if (lat == null || lng == null) return null;

          return (
            <Marker
              key={`${stop.id}-${idx}`}
              position={[lat, lng]}
              icon={createStopIcon(
                stop.name,
                isSelected,
                Boolean(selectedRoute),
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
                  <div className="text-xs uppercase font-bold text-blue-600">
                    Punto frecuente
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    {stop.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {stop.address || stop.reference}
                  </div>
                  {stop.accessible != null && stop.accessible && (
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
    </div>
  );
}
