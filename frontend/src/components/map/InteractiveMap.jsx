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
import { getBoundsFromPoints } from "../../utils/geoUtils";
import { routingService } from "../../services/routingService";

function MapAutoRecenter({ bounds, center, selectedStop }) {
  const map = useMap();

  useEffect(() => {
    if (selectedStop && selectedStop.latitude && selectedStop.longitude) {
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

// Creates the user-location pin: a pulsing dot with a "MI UBICACIÓN" chip above it.
const createUserLocationIcon = () =>
  L.divIcon({
    className: 'custom-user-pin',
    html: `
      <div class="flex flex-col items-center gap-0.5" style="pointer-events:none;">
        <div style="
          display:flex;
          align-items:center;
          gap:4px;
          background: #1d4ed8;
          color: #ffffff;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 99px;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(29,78,216,0.45);
          border: 1.5px solid rgba(255,255,255,0.9);
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          MI UBICACIÓN
        </div>
        <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #1d4ed8;margin-top:-1px;"></div>
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:28px;height:28px;">
          <div class="user-location-pulse" style="position:absolute;width:28px;height:28px;border-radius:50%;background:rgba(59,130,246,0.30);"></div>
          <div style="width:14px;height:14px;border-radius:50%;background:#2563eb;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(37,99,235,0.5);"></div>
        </div>
      </div>
    `,
    iconSize: [90, 68],
    iconAnchor: [45, 68],
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
    iconSize: showLabel ? [140, 52] : [28, 28],
    iconAnchor: showLabel ? [70, 46] : [14, 14],
  });

export function InteractiveMap({
  routes = [],
  selectedRoute = null,
  selectedStop = null,
  searchedLocation = null,
  userLocation = null,
  gpsReady = false,
  isLocating = false,
  onSelectRoute,
  onSelectStop,
  mapCenter = [-14.0678, -75.7286],
  mapZoom = 14,
}) {
  const [snappedPointsMap, setSnappedPointsMap] = useState({});

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
    return () => { isMounted = false; };
  }, [routes, selectedRoute]);

  const activeBounds = useMemo(() => {
    if (selectedRoute && selectedRoute.points?.length > 0) {
      const poly = snappedPointsMap[selectedRoute.id] || selectedRoute.points;
      return getBoundsFromPoints(poly);
    }
    return null;
  }, [selectedRoute, snappedPointsMap]);

  const currentCenter = useMemo(() => {
    if (searchedLocation)
      return [searchedLocation.latitude, searchedLocation.longitude];
    if (userLocation) return [userLocation.lat, userLocation.lng];
    return mapCenter;
  }, [searchedLocation, userLocation, mapCenter]);

  return (
    <div className="relative w-full h-full min-h-[350px] overflow-hidden rounded-2xl border border-slate-200/90 shadow-inner">
      {/* Locating overlay — shown while GPS is resolving */}
      {isLocating && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(15, 23, 42, 0.82)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: '#f1f5f9',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.03em',
            padding: '6px 14px',
            borderRadius: 99,
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {/* Pulsing GPS dot */}
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#60a5fa',
              animation: 'locating-pulse 1.2s ease-in-out infinite',
            }}
          />
          Ubicándote...
        </div>
      )}

      <style>{`
        @keyframes locating-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
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

        <MapAutoRecenter
          bounds={activeBounds}
          center={selectedRoute ? null : currentCenter}
          selectedStop={selectedStop}
        />

        {/* Only show the user pin when we have a real GPS fix, not the Ica default */}
        {userLocation && gpsReady && (
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

        {routes.map((route) => {
          const isSelected = selectedRoute?.id === route.id;
          const strokeColor = route.color || "#2563eb";
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
                    {stop.address || stop.reference}
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
