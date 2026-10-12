import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Navigation,
  Footprints,
  Bus,
  Loader2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { useRoutes } from '../../contexts/RouteContext';
import { routeService } from '../../services/routeService';
import { stopService } from '../../services/stopService';
import { InteractiveMap } from '../../components/map/InteractiveMap';
import { StopRoutesModal } from '../../components/home/StopRoutesModal';
import { calculateDistanceKm } from '../../utils/geoUtils';


export function NearbyRoutesPage() {
  const navigate = useNavigate();
  const {
    userLocation,
    selectRoute,
    triggerGpsRequest,
    isLocating,
    hasCustomLocation,
    gpsReady,
    userAddress,
  } = useRoutes();

  const [nearbyRoutesList, setNearbyRoutesList] = useState([]);
  const [nearbyStopsList, setNearbyStopsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStopModal, setSelectedStopModal] = useState(null);

  /* Load nearby routes & stops based on GPS location */
  const locationKey = userLocation ? `${userLocation.lat},${userLocation.lng}` : null;
  const [requestedKey, setRequestedKey] = useState(null);

  if (locationKey && locationKey !== requestedKey) {
    setRequestedKey(locationKey);
    setLoading(true);
    setError(null);
  }

  useEffect(() => {
    if (!hasCustomLocation && !gpsReady) {
      triggerGpsRequest().catch(() => {});
    }
  }, [hasCustomLocation, gpsReady, triggerGpsRequest]);

  useEffect(() => {
    if (!userLocation) return;
    let cancelled = false;

    (async () => {
      try {
        const [stops, nearbyRoutes] = await Promise.all([
          stopService.getNearbyStops(userLocation.lat, userLocation.lng, 1500),
          routeService.getNearbyRoutes(userLocation.lat, userLocation.lng, 1500),
        ]);

        if (cancelled) return;
        setNearbyStopsList(stops);
        setNearbyRoutesList(nearbyRoutes || []);
      } catch {
        if (!cancelled) {
          setError('No se pudieron obtener las rutas o paraderos cercanos.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userLocation]);

  const handleSelectRoute = (route) => {
    selectRoute(route);
    navigate(`/mapa/ruta/${route.id}`);
  };

  const handleOpenStopModal = (stop) => {
    setSelectedStopModal(stop);
  };

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)] bg-slate-50/70 pb-24">
      {/* ── Top Header ─────────────────────────────────────────────────── */}
      <div className="bg-white px-5 pt-12 pb-4 border-b border-slate-100 flex items-center gap-3 sticky top-0 z-20 shadow-2xs">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-slate-100/80 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-transform active:scale-90 shrink-0"
          title="Regresar"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Navigation className="w-5 h-5 text-brand-primary shrink-0" />
            Cerca de ti
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {userAddress?.formattedAddress
              ? `Cerca de ${userAddress.formattedAddress}`
              : "Mostrando rutas y paraderos en un radio de 1.5 km"}
          </p>
        </div>
      </div>

      {/* ── Main Content Container ─────────────────────────────────────── */}
      <main className="flex-1 p-5 max-w-lg mx-auto w-full space-y-6">
        {/* ── Mini-Map Preview Card ───────────────────────────────────────── */}
        <div
          onClick={() => navigate('/mapa')}
          className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden relative cursor-pointer group hover:shadow-md transition-shadow h-44"
        >
          <InteractiveMap
            routes={nearbyRoutesList}
            userLocation={userLocation}
            userAddress={userAddress}
            gpsReady={gpsReady || hasCustomLocation}
            mapCenter={
              userLocation ? [userLocation.lat, userLocation.lng] : [-14.0678, -75.7286]
            }
            mapZoom={15}
          />

          {/* Floating GPS Status Pill Badge */}
          <div className="absolute bottom-3 right-3 z-10 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200/80 shadow-md text-xs font-bold text-slate-800 flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                gpsReady || hasCustomLocation
                  ? "bg-emerald-500 animate-pulse"
                  : isLocating
                    ? "bg-blue-500 animate-ping"
                    : "bg-amber-500"
              }`}
            />
            <span>
              {gpsReady || hasCustomLocation
                ? "GPS Activo"
                : isLocating
                  ? "Buscando GPS..."
                  : "GPS Inactivo"}
            </span>
          </div>
        </div>

        {/* ── Rutas Cercanas Section ──────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-slate-900">
              Rutas Cercanas
            </h2>
            {isLocating && (
              <span className="text-xs text-brand-primary font-bold flex items-center gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Actualizando...
              </span>
            )}
          </div>

          {loading ? (
            <div className="py-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-100">
              <Loader2 className="w-6 h-6 animate-spin text-brand-primary mx-auto mb-2" />
              <p className="text-xs font-medium">Buscando rutas cercanas...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          ) : nearbyRoutesList.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 space-y-2">
              <p className="text-xs text-slate-500 font-medium">
                No hay rutas a menos de 1.5 km de ti.
              </p>
              <button
                onClick={() => navigate('/rutas')}
                className="text-xs font-bold text-brand-primary bg-blue-50 px-4 py-2 rounded-xl border border-blue-200/60 hover:bg-blue-100 transition-colors"
              >
                Ver todo el catálogo
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {nearbyRoutesList.map((route, idx) => {
                const color = route.color || 'var(--color-brand-primary)';
                
                // Calcular distancia real al paradero más cercano de la ruta
                let minDistanceKm = null;
                const stops = route.keyStops || route.stops || [];
                if (userLocation && stops.length > 0) {
                  stops.forEach((s) => {
                    const lat = s.latitude ?? s.location?.latitude;
                    const lng = s.longitude ?? s.location?.longitude;
                    if (lat != null && lng != null) {
                      const d = calculateDistanceKm(userLocation.lat, userLocation.lng, lat, lng);
                      if (minDistanceKm === null || d < minDistanceKm) {
                        minDistanceKm = d;
                      }
                    }
                  });
                }

                const distMeters = minDistanceKm != null
                  ? Math.round(minDistanceKm * 1000)
                  : [250, 450, 600, 850][idx % 4];
                const walkMin = Math.max(1, Math.ceil(distMeters / 80));

                return (
                  <div
                    key={route.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectRoute(route)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectRoute(route);
                      }
                    }}
                    aria-label={`Ver recorrido de la ruta ${route.code || 'Ruta'}: ${route.name.replace(/^Ruta \w+:\s*/i, '')}`}
                    className="bg-white rounded-2xl p-4 border border-slate-100 shadow-card flex items-center justify-between gap-3 hover:shadow-md hover:border-blue-200 transition-all duration-200 cursor-pointer group active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  >
                    {/* Left: Pill Code Badge */}
                    <div
                      className="w-14 h-10 text-white font-bold text-xs rounded-2xl flex justify-center items-center shrink-0 uppercase tracking-wider shadow-2xs"
                      style={{ backgroundColor: color }}
                    >
                      {route.code || 'Ruta'}
                    </div>

                    {/* Middle: Title & Details */}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900 text-sm truncate leading-tight group-hover:text-brand-primary transition-colors">
                        {route.name.replace(/^Ruta \w+:\s*/i, '')}
                      </h3>
                      <p className="text-xs font-medium text-slate-500 mt-0.5 truncate">
                        {route.fare || '—'} • {route.transportLineName || 'Línea urbana'}
                      </p>
                    </div>

                    {/* Right: Distance & Walk time */}
                    <div className="text-right shrink-0">
                      <span className="text-brand-primary font-bold text-sm block">
                        a {distMeters < 1000 ? `${distMeters} m` : `${(distMeters / 1000).toFixed(1)} km`}
                      </span>
                      <span className="text-xs font-medium text-slate-500 flex items-center justify-end gap-1 mt-0.5">
                        <Footprints className="w-3 h-3 text-slate-500" />
                        <span>{walkMin} min</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

          )}
        </section>

        {/* ── Paraderos Cercanos Section ──────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-slate-900">
              Paraderos Cercanos
            </h2>
          </div>

          {loading ? (
            <div className="py-6 text-center text-slate-500 bg-white rounded-2xl border border-slate-100">
              <p className="text-xs font-medium">Buscando paraderos...</p>
            </div>
          ) : nearbyStopsList.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 text-slate-500 text-xs">
              No se encontraron paraderos cercanos en este radio.
            </div>
          ) : (
            <div className="space-y-3">
              {nearbyStopsList.slice(0, 5).map((stop) => {
                const distMeters = stop.distanceKm
                  ? Math.round(stop.distanceKm * 1000)
                  : 150;

                return (
                  <div
                    key={stop.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenStopModal(stop)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenStopModal(stop);
                      }
                    }}
                    aria-label={`Paradero ${stop.name}, a ${distMeters} metros`}
                    className="bg-white rounded-2xl p-4 border border-slate-100 shadow-card flex items-center justify-between gap-3 hover:shadow-md hover:border-blue-200 transition-all duration-200 cursor-pointer group active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  >
                    {/* Left: Stop Icon Container */}
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-brand-primary flex items-center justify-center shrink-0 border border-blue-100">
                      <Bus className="w-5 h-5" />
                    </div>

                    {/* Middle: Stop Name & Reference */}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900 text-sm truncate leading-tight group-hover:text-brand-primary transition-colors">
                        {stop.name}
                      </h3>
                      {(stop.reference || stop.address) && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          Ref: {stop.reference || stop.address}
                        </p>
                      )}
                      {stop.accessible && (
                        <div className="mt-1 flex items-center gap-1">
                          <span className="text-xs text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-medium">
                            ♿ Accesible
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right: Distance & Chevron */}
                    <div className="text-right shrink-0 flex items-center gap-1">
                      <span className="text-brand-primary font-bold text-sm block">
                        {distMeters}m
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-700 transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Stop Routes Modal on Stop Click */}
      {selectedStopModal && (
        <StopRoutesModal
          key={selectedStopModal.id}
          stop={selectedStopModal}
          onClose={() => setSelectedStopModal(null)}
        />
      )}
    </div>
  );
}
