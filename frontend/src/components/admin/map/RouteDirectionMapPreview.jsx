import { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import {
  DEFAULT_CENTER,
  createGeometryPointIcon,
  createNumberedStopIcon,
  formatCoord,
} from "./routeGeometryUtils";

function MapClickHandler({ enabled, onClick }) {
  useMapEvents({
    click(event) {
      if (!enabled) return;
      onClick({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
}

function MapBoundsController({ points, fitKey }) {
  const map = useMap();
  const lastFittedKeyRef = useRef(null);

  useEffect(() => {
    if (!points || points.length === 0) return;
    if (lastFittedKeyRef.current === fitKey) return;
    lastFittedKeyRef.current = fitKey;

    if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else {
      map.setView(points[0], 15);
    }
  }, [points, fitKey, map]);

  return null;
}

export function RouteDirectionMapPreview({
  routeColor,
  fitKey,
  activePolylinePoints,
  routePoints,
  stops,
  editingGeometry,
  usingStopFallback,
  onAddPoint,
  onDragPoint,
}) {
  return (
    <div className="relative flex-1 min-h-[300px] lg:min-h-0 w-full bg-slate-100">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={13}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <MapBoundsController points={activePolylinePoints} fitKey={fitKey} />
        <MapClickHandler enabled={editingGeometry} onClick={onAddPoint} />

        {activePolylinePoints.length > 1 && (
          <Polyline
            positions={activePolylinePoints}
            pathOptions={{
              color: routeColor || "#2563eb",
              weight: 5,
              opacity: 0.85,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}

        {routePoints.map((point, pIdx) => {
          if (point.latitude == null || point.longitude == null) return null;
          return (
            <Marker
              key={`geometry-${point.pointOrder ?? pIdx}-${pIdx}`}
              position={[Number(point.latitude), Number(point.longitude)]}
              icon={createGeometryPointIcon(point.pointOrder ?? pIdx + 1)}
              draggable={editingGeometry}
              zIndexOffset={editingGeometry ? 500 : 0}
              eventHandlers={{
                dragend: (event) => onDragPoint(pIdx, event),
              }}
            >
              <Popup>
                <div className="text-xs">
                  <strong className="block text-slate-900 font-bold">
                    Punto #{point.pointOrder ?? pIdx + 1}
                  </strong>
                  <span className="text-slate-500 font-mono">
                    {formatCoord(point.latitude, 5)},{" "}
                    {formatCoord(point.longitude, 5)}
                  </span>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {stops.map((stop, sIdx) => {
          if (stop.latitude == null || stop.longitude == null) return null;
          const icon = createNumberedStopIcon(sIdx + 1, stop.name);
          return (
            <Marker
              key={`${stop.stopId}`}
              position={[Number(stop.latitude), Number(stop.longitude)]}
              icon={icon}
              interactive={!editingGeometry}
            >
              <Popup>
                <div className="text-xs">
                  <strong className="block text-slate-900 font-bold">
                    #{sIdx + 1} {stop.name}
                  </strong>
                  <span className="text-slate-500 font-mono">
                    {formatCoord(stop.latitude, 5)},{" "}
                    {formatCoord(stop.longitude, 5)}
                  </span>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="absolute top-3 right-3 z-[1000] rounded-xl bg-white/95 px-3 py-1.5 shadow-md border border-slate-200 text-xs font-semibold text-slate-700 backdrop-blur-md">
        <span>
          {routePoints.length} puntos de trazado
          {usingStopFallback ? " · (fallback de paraderos)" : ""}
          {editingGeometry ? " · clic para agregar" : ""}
        </span>
      </div>
    </div>
  );
}
