import { useEffect, useState, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { MOCK_CITY } from "../../services/mockData";
import { getBoundsFromPoints } from "../../utils/geoUtils";
import { routingService } from "../../services/routingService";

// Helper component to auto-recenter map when selected stop, selected route, searched location or user location changes
function MapAutoRecenter({ bounds, center, selectedStop }) {
  const map = useMap();

  useEffect(() => {
    if (selectedStop && selectedStop.latitude && selectedStop.longitude) {
      // Smooth flyTo to the exact stop coordinate with zoom 16
      map.flyTo([selectedStop.latitude, selectedStop.longitude], 16, {
        animate: true,
        duration: 1.2,
      });
    } else if (bounds) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, animate: true });
    } else if (center) {
      map.flyTo(center, 15, { animate: true });
    }
  }, [map, bounds, center, selectedStop]);

  return null;
}

// Custom Leaflet Icons using SVG divIcon
const createUserLocationIcon = () =>
  L.divIcon({
    className: "custom-user-pin",
    html: `
      <div class="relative flex items-center justify-center w-7 h-7">
        <div class="absolute w-7 h-7 rounded-full bg-blue-500/30 user-location-pulse"></div>
        <div class="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md"></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
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

// Custom pin with conditional permanent text label above the marker pin (Only shown when selectedRoute is active)
const createStopIcon = (stopName, isSelected, showLabel = false) =>
  L.divIcon({
    className: "custom-stop-pin",
    html: `
      <div class="flex flex-col items-center group cursor-pointer pointer-events-auto">
        ${
          showLabel
            ? `
          <!-- Floating Label Badge displaying stop name -->
          <div class="px-2 py-0.5 rounded-lg bg-slate-900/90 text-white text-[10px] font-extrabold shadow-lg whitespace-nowrap mb-1 border border-slate-700/80 backdrop-blur-md flex items-center gap-1 transition-transform group-hover:scale-105">
            <span>${stopName}</span>
          </div>
        `
            : ""
        }
        <!-- Pin Icon -->
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
    iconSize: showLabel ? [140, 52] : [28, 28],
    iconAnchor: showLabel ? [70, 46] : [14, 14],
  });

export function InteractiveMap({
  routes = [],
  selectedRoute = null,
  selectedStop = null,
  searchedLocation = null,
  userLocation = null,
  onSelectRoute,
  onSelectStop,
}) {
  const [snappedPointsMap, setSnappedPointsMap] = useState({});

  // Compute OSRM street-snapped polylines for selected or visible routes
  useEffect(() => {
    let isMounted = true;
    async function fetchStreetRoutes() {
      const newMap = {};
      const routesToSnap = selectedRoute ? [selectedRoute] : routes;

      for (const route of routesToSnap) {
        if (route.points && route.points.length >= 2) {
          const snapped = await routingService.getRoadPolyline(route.points);
          newMap[route.id] = snapped;
        }
      }

      if (isMounted) {
        setSnappedPointsMap((prev) => ({ ...prev, ...newMap }));
      }
    }

    fetchStreetRoutes();

    return () => {
      isMounted = false;
    };
  }, [routes, selectedRoute]);

  // Determine map bounds based on selected route points or active routes
  const activeBounds = useMemo(() => {
    if (selectedRoute && selectedRoute.points?.length > 0) {
      const poly = snappedPointsMap[selectedRoute.id] || selectedRoute.points;
      return getBoundsFromPoints(poly);
    }
    return null;
  }, [selectedRoute, snappedPointsMap]);

  // Center coordinate fallback (Ica, Perú)
  const mapCenter = useMemo(() => {
    if (searchedLocation)
      return [searchedLocation.latitude, searchedLocation.longitude];
    if (userLocation) return [userLocation.lat, userLocation.lng];
    return MOCK_CITY.center;
  }, [searchedLocation, userLocation]);

  return (
    <div className="relative w-full h-full min-h-[350px] overflow-hidden rounded-2xl border border-slate-200/90 shadow-inner">
      <MapContainer
        center={mapCenter}
        zoom={MOCK_CITY.zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        {/* CartoDB Positron Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />

        <MapAutoRecenter
          bounds={activeBounds}
          center={selectedRoute ? null : mapCenter}
          selectedStop={selectedStop}
        />

        {/* User GPS location marker */}
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={createUserLocationIcon()}
          >
            <Popup>
              <div className="text-xs font-semibold text-slate-800">
                📍 Tu ubicación actual en Ica
              </div>
            </Popup>
          </Marker>
        )}

        {/* Searched Location Marker */}
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

        {/* Render Routes Polylines with OSRM street snapping */}
        {routes.map((route) => {
          const isSelected = selectedRoute?.id === route.id;
          const strokeColor = route.lineColor || "#2563eb";
          const positions = snappedPointsMap[route.id] || route.points;

          return (
            <Polyline
              key={route.id}
              positions={positions}
              pathOptions={{
                color: strokeColor,
                weight: isSelected ? 6 : 4,
                opacity: selectedRoute ? (isSelected ? 0.95 : 0.25) : 0.75,
                lineCap: "round",
                lineJoin: "round",
              }}
              eventHandlers={{
                click: () => onSelectRoute && onSelectRoute(route),
              }}
            />
          );
        })}

        {/* Render Stops of Selected Route OR All Stops if no route is selected */}
        {(selectedRoute
          ? selectedRoute.stops
          : routes.flatMap((r) => r.stops)
        ).map((stop, idx) => {
          const isSelected = selectedStop?.id === stop.id;

          return (
            <Marker
              key={`${stop.id}-${idx}`}
              position={[stop.latitude, stop.longitude]}
              icon={createStopIcon(
                stop.name,
                isSelected,
                Boolean(selectedRoute),
              )}
              eventHandlers={{
                click: () => onSelectStop && onSelectStop(stop),
              }}
            >
              <Popup>
                <div className="p-1 max-w-[200px]">
                  <div className="text-[10px] uppercase font-bold text-blue-600">
                    Punto Clave
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    {stop.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {stop.address}
                  </div>
                  {stop.isAccessible && (
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
