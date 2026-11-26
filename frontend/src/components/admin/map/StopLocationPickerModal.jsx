import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, X, Check, Search, Loader2 } from 'lucide-react';
import { geocodingService } from '../../../services/geocodingService';

const DEFAULT_CENTER = [-14.0678, -75.7286]; // Ica, Peru

function supportsClosedBy() {
  return typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype;
}

function isPointerOutsideDialog(event, dialog) {
  const rect = dialog.getBoundingClientRect();
  return (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  );
}

function createPinIcon() {
  return L.divIcon({
    className: '!bg-transparent !border-none',
    html: `
      <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-full">
        <div class="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg border-2 border-white ring-2 ring-blue-500/30">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div class="absolute -bottom-1 h-2 w-2 rotate-45 bg-blue-600 border-r border-b border-white"></div>
      </div>
    `,
    iconSize: [36, 42],
    iconAnchor: [0, 0],
  });
}

function MapClickHandler({ onLocationChange }) {
  useMapEvents({
    click: (e) => {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapCenterController({ center }) {
  const map = useMap();
  const centerLat = center?.[0];
  const centerLng = center?.[1];

  useEffect(() => {
    if (
      centerLat != null &&
      centerLng != null &&
      !Number.isNaN(centerLat) &&
      !Number.isNaN(centerLng)
    ) {
      map.setView([centerLat, centerLng], map.getZoom());
    }
  }, [centerLat, centerLng, map]);

  return null;
}

function MapResizeController() {
  const map = useMap();

  useEffect(() => {
    let frameId = null;

    const scheduleInvalidate = () => {
      if (frameId != null) {
        cancelAnimationFrame(frameId);
      }
      frameId = requestAnimationFrame(() => {
        frameId = null;
        map.invalidateSize();
      });
    };

    scheduleInvalidate();

    const container = typeof map.getContainer === 'function' ? map.getContainer() : null;
    let observer = null;

    if (container && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        scheduleInvalidate();
      });
      observer.observe(container);
    }

    return () => {
      if (frameId != null) {
        cancelAnimationFrame(frameId);
      }
      if (observer) {
        observer.disconnect();
      }
    };
  }, [map]);

  return null;
}

function getInitialPosition(initialCoords, cityCoords) {
  const initialLat = initialCoords?.latitude;
  const initialLng = initialCoords?.longitude;

  if (initialLat != null && initialLng != null && !isNaN(Number(initialLat)) && !isNaN(Number(initialLng))) {
    const parsedLat = Number(initialLat);
    const parsedLng = Number(initialLng);
    return {
      lat: parsedLat.toFixed(6),
      lng: parsedLng.toFixed(6),
      center: [parsedLat, parsedLng],
    };
  }
  if (cityCoords?.latitude != null && cityCoords?.longitude != null) {
    const cLat = Number(cityCoords.latitude);
    const cLng = Number(cityCoords.longitude);
    return {
      lat: cLat.toFixed(6),
      lng: cLng.toFixed(6),
      center: [cLat, cLng],
    };
  }
  return {
    lat: DEFAULT_CENTER[0].toFixed(6),
    lng: DEFAULT_CENTER[1].toFixed(6),
    center: DEFAULT_CENTER,
  };
}

function StopLocationPickerModalDialog({
  onClose,
  initialCoords,
  cityCoords,
  onSelectLocation,
}) {
  const dialogRef = useRef(null);
  const closingFromCleanupRef = useRef(false);
  const pressedOutsideRef = useRef(false);
  const titleId = useId();

  const initialPos = useMemo(
    () => getInitialPosition(initialCoords, cityCoords),
    [initialCoords, cityCoords]
  );

  const [lat, setLat] = useState(initialPos.lat);
  const [lng, setLng] = useState(initialPos.lng);
  const [suggestedAddress, setSuggestedAddress] = useState('');
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [mapCenter, setMapCenter] = useState(initialPos.center);
  const markerRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    closingFromCleanupRef.current = false;
    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      closingFromCleanupRef.current = true;
      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  const handleDialogCancel = (event) => {
    event.preventDefault();
    onClose();
  };

  const handleDialogClose = () => {
    if (closingFromCleanupRef.current || dialogRef.current?.open) {
      return;
    }
    onClose();
  };

  const handlePointerDown = (event) => {
    if (supportsClosedBy()) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    pressedOutsideRef.current = isPointerOutsideDialog(event, dialog);
  };

  const handlePointerUp = (event) => {
    if (supportsClosedBy()) return;
    const wasPressedOutside = pressedOutsideRef.current;
    pressedOutsideRef.current = false;
    const dialog = dialogRef.current;
    if (!dialog || !dialog.open) return;
    if (wasPressedOutside && isPointerOutsideDialog(event, dialog)) {
      dialog.close();
    }
  };

  const handlePointerCancel = () => {
    pressedOutsideRef.current = false;
  };

  const handleLocationChange = (newLat, newLng) => {
    setLat(Number(newLat).toFixed(6));
    setLng(Number(newLng).toFixed(6));
  };

  const handleMarkerDragEnd = () => {
    const marker = markerRef.current;
    if (marker != null) {
      const pos = marker.getLatLng();
      handleLocationChange(pos.lat, pos.lng);
    }
  };

  const handleReverseGeocode = async () => {
    if (!lat || !lng) return;
    setResolvingAddress(true);
    try {
      const res = await geocodingService.reverseGeocode(Number(lat), Number(lng));
      if (res?.formattedAddress) {
        setSuggestedAddress(res.formattedAddress);
      }
    } catch (err) {
      console.warn('Error resolviendo dirección:', err);
    } finally {
      setResolvingAddress(false);
    }
  };

  const handleConfirm = () => {
    if (!lat || !lng) return;
    onSelectLocation({
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      address: suggestedAddress || undefined,
    });
    onClose();
  };

  const pinIcon = useMemo(() => createPinIcon(), []);
  const currentCoords = [Number(lat) || DEFAULT_CENTER[0], Number(lng) || DEFAULT_CENTER[1]];

  const dialogNode = (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      closedby="any"
      onCancel={handleDialogCancel}
      onClose={handleDialogClose}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className="m-auto p-0 border-0 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2.5rem)] max-w-4xl h-[90dvh] max-h-[820px] bg-white rounded-3xl shadow-2xl overflow-hidden backdrop:bg-slate-950/50 backdrop:backdrop-blur-xs open:flex open:flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3.5 bg-slate-50/60">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id={titleId} className="text-sm font-bold text-slate-900">
              Seleccionar Ubicación del Paradero
            </h2>
            <p className="text-[11px] text-slate-500">
              Haz clic en el mapa o arrastra el marcador para fijar las coordenadas exactas
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar mapa"
          className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Map Body */}
      <div className="relative flex-1 min-h-0 w-full">
        <MapContainer
          center={mapCenter}
          zoom={15}
          scrollWheelZoom={true}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <MapClickHandler onLocationChange={handleLocationChange} />
          <MapCenterController center={mapCenter} />
          <MapResizeController />

          <Marker
            position={currentCoords}
            icon={pinIcon}
            draggable={true}
            eventHandlers={{
              dragend: handleMarkerDragEnd,
            }}
            ref={markerRef}
          />
        </MapContainer>

        {/* Floating Coordinate Overlay */}
        <div className="absolute top-4 left-4 z-[1000] flex flex-wrap items-center gap-2 rounded-xl bg-white/95 px-3.5 py-2.5 shadow-raised border border-slate-200/80 backdrop-blur-md">
          <label className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500">Lat:</span>
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => {
                setLat(e.target.value);
                const parsed = parseFloat(e.target.value);
                if (!isNaN(parsed)) setMapCenter([parsed, Number(lng) || DEFAULT_CENTER[1]]);
              }}
              className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-xs font-mono font-bold text-slate-800"
            />
          </label>

          <label className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500">Lng:</span>
            <input
              type="number"
              step="any"
              value={lng}
              onChange={(e) => {
                setLng(e.target.value);
                const parsed = parseFloat(e.target.value);
                if (!isNaN(parsed)) setMapCenter([Number(lat) || DEFAULT_CENTER[0], parsed]);
              }}
              className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-xs font-mono font-bold text-slate-800"
            />
          </label>

          <button
            type="button"
            onClick={handleReverseGeocode}
            disabled={resolvingAddress}
            title="Obtener dirección sugerida a partir de las coordenadas"
            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition"
          >
            {resolvingAddress ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            )}
            <span>Obtener dirección</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200/80 bg-slate-50/70 px-5 py-3.5">
        <div className="min-w-0 text-xs text-slate-600 truncate w-full sm:w-auto">
          {suggestedAddress ? (
            <p className="truncate">
              <span className="font-bold text-slate-800">Dirección sugerida:</span> {suggestedAddress}
            </p>
          ) : (
            <span className="text-slate-400">
              Arrastra el marcador para ajustar la posición precisa del paradero.
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0 ml-auto">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-card transition hover:bg-blue-700 active:scale-[0.98]"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            <span>Confirmar Ubicación</span>
          </button>
        </div>
      </div>
    </dialog>
  );

  return typeof document !== 'undefined' ? createPortal(dialogNode, document.body) : null;
}

export function StopLocationPickerModal({ open, ...props }) {
  if (!open) return null;
  return <StopLocationPickerModalDialog {...props} />;
}
