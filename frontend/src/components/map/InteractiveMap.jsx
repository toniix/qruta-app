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
import { routingService } from "../../services/routingService";

// Lighten (positive) or darken (negative) a hex color by a percentage (0..100).
function shadeColor(color, percent) {
  const clean = (color || "#2563eb").replace("#", "");
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

function MapAutoRecenter({ bounds, center, selectedStop, isRouteSelected }) {
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
      map.flyTo(center, 15, { animate: true });
    }
  }, [map, bounds, center, selectedStop, isRouteSelected]);

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
          <div class="px-2 py-0.5 rounded-lg bg-blue-600 text-white text-[10px] font-extrabold shadow-md whitespace-nowrap mb-1 border border-blue-400/50 backdrop-blur-md">
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
      <div class="flex items-center justify-center p-2 rounded-xl bg-purple-600 text-white border-2 border-white shadow-xl animate-bounce">
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
          <div class="px-2 py-0.5 rounded-lg bg-slate-900/90 text-white text-[10px] font-extrabold shadow-lg whitespace-nowrap mb-1 border border-slate-700/80 backdrop-blur-md flex items-center gap-1 transition-transform group-hover:scale-105">
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
}) {
  const [snappedPointsMap, setSnappedPointsMap] = useState({});
  const [snappedDirectionMap, setSnappedDirectionMap] = useState({});

  // Fetch street-polylines (OSRM snapping) for the active route directions
  // and for the summary routes that expose points.
  useEffect(() => {
    let isMounted = true;
    async function fetchStreetRoutes() {
      const newMap = {};
      const newDirMap = {};
      const routesToSnap = selectedRoute ? [selectedRoute] : routes;

      for (const route of routesToSnap) {
        if (route.id === selectedRoute?.id) {
          // Selected route (detail): snap each direction's route points
          for (const dir of route.directions || []) {
            const points = dir.routePoints;
            if (points && points.length >= 2) {
              const snapped = await routingService.getRoadPolyline(points);
              newDirMap[`${route.id}:${dir.direction || dir.id}`] = snapped;
            }
          }
        } else if (route.points && route.points.length >= 2) {
          // Summary routes: snap their direct points
          const snapped = await routingService.getRoadPolyline(route.points);
          newMap[route.id] = snapped;
        }
      }

      if (isMounted) {
        setSnappedPointsMap((prev) => ({ ...prev, ...newMap }));
        setSnappedDirectionMap((prev) => ({ ...prev, ...newDirMap }));
      }
    }

    fetchStreetRoutes();
    return () => {
      isMounted = false;
    };
  }, [routes, selectedRoute]);

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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />

        <MapClickHandler onMapClick={handleMapBackgroundClick} />

        <MapAutoRecenter
          bounds={activeBounds}
          center={selectedRoute ? null : currentCenter}
          selectedStop={selectedStop}
          isRouteSelected={Boolean(selectedRoute)}
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
                  <div className="text-[11px] text-slate-500">
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
            const positions = snappedPointsMap[route.id] || route.points;
            if (!positions || positions.length < 2) return null;

            return (
              <Polyline
                key={route.id}
                positions={positions}
                pathOptions={{
                  color: route.color || "#2563eb",
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
                const baseColor = selectedRoute.color || "#2563eb";

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
                  positions={
                    snappedPointsMap[selectedRoute.id] ||
                    selectedRoute.points
                  }
                  pathOptions={{
                    color: selectedRoute.color || "#2563eb",
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
                  <div className="text-[10px] uppercase font-bold text-blue-600">
                    Punto frecuente
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    {stop.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {stop.address || stop.reference}
                  </div>
                  {stop.accessible != null && stop.accessible && (
                    <span className="inline-block mt-1 text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 font-medium">
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
