import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  Calendar,
  RotateCw,
  Info,
  Route as RouteIcon,
  Heart,
  MessageSquare,
  AlertTriangle,
  ArrowRight,
  Plus,
  Share2,
  Bus,
} from "lucide-react";
import { useRoutes } from "../../contexts/RouteContext";
import { useFavorites } from "../../hooks/useFavorites";
import {
  communityService,
  getCategoryMeta,
} from "../../services/communityService";
import { formatDistance } from "../../utils/geoUtils";
import { formatRelativeTime } from "../../utils/dateUtils";
import { RouteShareModal } from "./RouteShareModal";
import { shareRoute } from "../../utils/shareUtils";

export function RouteDrawerSkeleton({ route }) {
  const code = route?.code || "Ruta";
  const color = route?.color || "var(--color-brand-primary)";
  const fare = route?.fare || "—";
  const categoryLabel =
    (route?.category || "MICRO").toUpperCase() === "COMBI" ? "Combi" : "Micro";

  return (
    <div className="bg-white/98 backdrop-blur-xl rounded-2xl border border-slate-100/90 shadow-overlay p-4 sm:p-5 flex flex-col space-y-3.5 max-h-[46vh] overflow-y-auto hide-scrollbar animate-slide-in-bottom pb-8">
      {/* Sheet grab indicator (visual sheet chrome only — dismissal is in the top header) */}
      <div className="w-12 h-1.5 bg-slate-200/90 rounded-full mx-auto shrink-0 mb-1" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div
          className="min-w-14 h-9 px-3 text-white font-bold text-xs rounded-xl flex justify-center items-center shrink-0 uppercase tracking-wider shadow-2xs"
          style={{ backgroundColor: color }}
        >
          {code}
        </div>

        <div className="flex items-center gap-2">
          <div className="h-9 px-3 rounded-xl flex items-center justify-center text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
            {categoryLabel}
          </div>
          <div className="h-9 px-3 rounded-xl flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
            <span className="font-bold text-xs sm:text-sm">{fare}</span>
            <span className="text-[11px] font-medium text-emerald-600/80">tarifa</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-slate-100 animate-pulse" />
          <div className="w-9 h-9 rounded-xl bg-slate-100 animate-pulse" />
        </div>
      </div>

      {/* 2 Grid Boxes Skeleton (Horario & Frecuencia) */}
      <div className="grid grid-cols-2 gap-3 animate-pulse">
        <div className="bg-slate-100/70 p-3.5 rounded-2xl border border-slate-200/50 space-y-1.5">
          <div className="h-3 bg-slate-300/60 rounded w-14" />
          <div className="h-4 bg-slate-200 rounded w-24" />
        </div>
        <div className="bg-slate-100/70 p-3.5 rounded-2xl border border-slate-200/50 space-y-1.5">
          <div className="h-3 bg-slate-300/60 rounded w-16" />
          <div className="h-4 bg-slate-200 rounded w-20" />
        </div>
      </div>

      {/* Segmented Control Tabs Skeleton (Ida / Vuelta) */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center justify-between text-xs font-semibold gap-2 animate-pulse">
        <div className="flex-1 h-9 bg-white rounded-xl shadow-2xs" />
        <div className="flex-1 h-9 bg-slate-200/60 rounded-xl" />
      </div>

      {/* Main Timeline Card Skeleton */}
      <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-2xs space-y-3.5 animate-pulse">
        <div className="relative pl-6 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-blue-400 bg-white shrink-0 -ml-6" />
            <div className="h-4 bg-slate-200 rounded-md w-2/3" />
          </div>

          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400 shrink-0 -ml-6" />
            <div className="h-4 bg-slate-200 rounded-md w-1/2" />
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* Stats Row Skeleton */}
        <div className="grid grid-cols-2 divide-x divide-slate-100 text-center">
          <div className="flex justify-center items-center">
            <div className="h-4 bg-slate-200 rounded-md w-14" />
          </div>
          <div className="flex justify-center items-center">
            <div className="h-4 bg-slate-200 rounded-md w-14" />
          </div>
        </div>

        {/* Operating Company Skeleton */}
        <div className="pt-2.5 border-t border-slate-100 flex justify-center">
          <div className="h-3 bg-slate-100 rounded w-36" />
        </div>
      </div>

      {/* Puntos Frecuentes Skeleton */}
      <div className="pt-2 space-y-3 animate-pulse pb-6">
        <div className="h-4 bg-slate-300/80 rounded w-32" />
        <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between p-2">
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 bg-slate-200 rounded w-2/3" />
                <div className="h-2.5 bg-slate-100 rounded w-1/3" />
              </div>
              <div className="h-3.5 bg-slate-200 rounded w-10 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RouteDrawer() {
  const navigate = useNavigate();
  const {
    selectedRoute,
    focusedStop,
    selectStop,
    focusStop,
    activeDirection,
    setActiveDirection,
    loadingRouteDetail,
  } = useRoutes();

  const { isFavorite, toggleFavorite } = useFavorites();
  const [communitySummary, setCommunitySummary] = useState(null);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const handleShare = async () => {
    if (!selectedRoute) return;
    const result = await shareRoute(selectedRoute);
    if (result.fallback) {
      setIsShareOpen(true);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (!selectedRoute?.id) {
      return;
    }
    communityService
      .getRouteSummary(selectedRoute.id)
      .then((data) => {
        if (isMounted) setCommunitySummary(data);
      })
      .catch(() => {
        if (isMounted) setCommunitySummary(null);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedRoute?.id]);

  if (!selectedRoute) return null;

  // Directions come from the route detail (already normalized in routeService)
  const directions = selectedRoute.directions || [];
  const loading = Boolean(loadingRouteDetail);

  const outbound =
    directions.find((d) => d.direction === "OUTBOUND") || directions[0];
  const inbound = directions.find((d) => d.direction === "INBOUND");
  const hasVuelta = Boolean(inbound);

  const activeDir =
    activeDirection === "INBOUND" && inbound ? inbound : outbound;

  const stops = [...(activeDir?.stops || [])].sort(
    (a, b) => (a.stopOrder ?? 0) - (b.stopOrder ?? 0),
  );

  const fallbackOrigin = selectedRoute.keyStops?.[0]?.name;
  const fallbackDestination =
    selectedRoute.keyStops?.[selectedRoute.keyStops.length - 1]?.name;

  const origin =
    activeDir?.originName ||
    stops[0]?.name ||
    fallbackOrigin ||
    (loading ? null : "Origen");
  const destination =
    activeDir?.destinationName ||
    stops[stops.length - 1]?.name ||
    fallbackDestination ||
    (loading ? null : "Destino");

  const estimatedMinutes = activeDir?.estimatedMinutes;
  const totalDistanceKm = activeDir?.totalDistanceKm;

  const code = selectedRoute.code || "Ruta";
  const color = selectedRoute.color || "var(--color-brand-primary)";
  const transportLine =
    selectedRoute.transportLine?.name || selectedRoute.transportLineName || "";
  const scheduleHours =
    selectedRoute.schedule?.hours || selectedRoute.schedule || "";
  const frequency =
    selectedRoute.schedule?.frequency || selectedRoute.frequency || "";
  const fare = selectedRoute.fare || "—";
  const categoryLabel =
    (selectedRoute.category || "MICRO").toUpperCase() === "COMBI"
      ? "Combi"
      : "Micro";

  const handleDirectionChange = (dir) => {
    if (dir === "INBOUND" && !inbound) return;
    setActiveDirection(dir);
    selectStop(null); // Clear selected stop when changing direction
    focusStop(null);
  };

  const handleStopClick = (stop) => {
    if (focusedStop?.id === stop.id) {
      focusStop(null);
    } else {
      focusStop(stop);
    }
  };

  return (
    <div className="bg-white/98 backdrop-blur-xl rounded-2xl border border-slate-100/90 shadow-overlay p-4 sm:p-5 flex flex-col space-y-3.5 max-h-[46vh] overflow-y-auto hide-scrollbar animate-slide-in-bottom pb-8">
      {/* Sheet grab indicator (visual sheet chrome only — dismissal is the X in the header) */}
      <div className="w-12 h-1.5 bg-slate-300/80 rounded-full mx-auto shrink-0 mb-1" />

      {/* ── Route Header: Code Badge (Left) | Category & Fare (Center) | Share & Favorite (Right) ─ */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: Route Code Badge */}
        <div
          className="min-w-14 h-9 px-3 text-white font-bold text-xs rounded-xl flex justify-center items-center shrink-0 uppercase tracking-wider shadow-2xs"
          style={{ backgroundColor: color }}
        >
          {code}
        </div>

        {/* Center: Category & Fare */}
        <div className="flex items-center gap-2">
          <div className="h-9 px-3 rounded-xl flex items-center justify-center text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
            {categoryLabel}
          </div>
          <div className="h-9 px-3 rounded-xl flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
            <span className="font-bold text-xs sm:text-sm">{fare}</span>
            <span className="text-[11px] font-medium text-emerald-600/80">tarifa</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleShare}
            className="w-9 h-9 rounded-xl text-slate-500 hover:text-slate-700 bg-slate-100/80 hover:bg-slate-200/70 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            title="Compartir ruta"
            aria-label="Compartir ruta"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => toggleFavorite(selectedRoute)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
              isFavorite(selectedRoute.id)
                ? "text-red-500 bg-red-50 hover:bg-red-100 border border-red-100"
                : "text-slate-500 hover:text-slate-700 bg-slate-100/80 hover:bg-slate-200/70"
            }`}
            title={
              isFavorite(selectedRoute.id)
                ? "Quitar de favoritos"
                : "Guardar en favoritos"
            }
            aria-label={
              isFavorite(selectedRoute.id)
                ? "Quitar de favoritos"
                : "Guardar en favoritos"
            }
          >
            <Heart
              className="w-4 h-4"
              fill={isFavorite(selectedRoute.id) ? "currentColor" : "none"}
            />
          </button>
        </div>
      </div>

      {/* ── Informative Reference Note ────────────────────────────────────── */}
      <div className="flex items-start gap-2.5 bg-slate-100/80 border border-slate-200/80 rounded-2xl p-3 text-xs text-slate-700 shadow-2xs">
        <Info className="w-4 h-4 text-brand-primary-green shrink-0 mt-0.5" />
        <p className="leading-relaxed font-medium">
          <strong className="font-bold text-slate-900">
            Nota informativa:
          </strong>{" "}
          Los puntos y el trayecto mostrados son{" "}
          <span className="underline decoration-slate-400 font-bold">
            referenciales
          </span>
          . No existen paraderos fijos u obligatorios; puedes solicitar subir o
          bajar en cualquier tramo del recorrido.
        </p>
      </div>

      {/* ── 2 Grid Boxes: General Route Info (Horario & Frecuencia) ───────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-100/70 p-3.5 rounded-2xl border border-slate-200/50">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Horario</span>
          </div>
          {scheduleHours ? (
            <p className="font-bold text-slate-900 text-sm mt-1">
              {scheduleHours}
            </p>
          ) : loading ? (
            <div className="h-4 bg-slate-200/70 rounded w-24 animate-pulse mt-1" />
          ) : (
            <p className="font-bold text-slate-900 text-sm mt-1">—</p>
          )}
        </div>

        <div className="bg-slate-100/70 p-3.5 rounded-2xl border border-slate-200/50">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
            <RotateCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Frecuencia</span>
          </div>
          {frequency ? (
            <p className="font-bold text-slate-900 text-sm mt-1">{frequency}</p>
          ) : loading ? (
            <div className="h-4 bg-slate-200/70 rounded w-20 animate-pulse mt-1" />
          ) : (
            <p className="font-bold text-slate-900 text-sm mt-1">—</p>
          )}
        </div>
      </div>

      {/* ── Segmented Control Tabs (Ida / Vuelta) ─────────────────────────── */}
      {loading ? (
        <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center justify-between text-xs font-semibold gap-2 animate-pulse">
          <div className="flex-1 h-9 bg-white rounded-xl shadow-2xs" />
          <div className="flex-1 h-9 bg-slate-200/60 rounded-xl" />
        </div>
      ) : (
        <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center justify-between text-xs font-semibold">
          <button
            type="button"
            onClick={() => handleDirectionChange("OUTBOUND")}
            className={`flex-1 py-2.5 rounded-xl transition-all duration-200 text-center ${
              activeDirection === "OUTBOUND"
                ? "bg-slate-900 text-white font-bold shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Ida
          </button>
          <button
            type="button"
            onClick={() => handleDirectionChange("INBOUND")}
            disabled={!hasVuelta}
            className={`flex-1 py-2.5 rounded-xl transition-all duration-200 text-center ${
              activeDirection === "INBOUND"
                ? "bg-slate-900 text-white font-bold shadow-sm"
                : "text-slate-500"
            } ${!hasVuelta ? "opacity-40 cursor-not-allowed" : "hover:text-slate-800"}`}
          >
            Vuelta
          </button>
        </div>
      )}

      {/* ── Main Card: Origin-Destination & Quick Stats ───────────────────── */}
      <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-2xs space-y-3.5">
        {/* Origin / Destination timeline */}
        <div className="relative pl-6 space-y-2.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          <div className="relative flex items-center gap-2 text-xs">
            <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-slate-900 bg-brand-lime shrink-0" />
            {origin ? (
              <span className="font-bold text-slate-900 text-sm truncate">
                {origin}
              </span>
            ) : (
              <div className="h-4 bg-slate-200 rounded-md w-2/3 animate-pulse" />
            )}
          </div>

          <div className="relative flex items-center gap-2 text-xs">
            <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500 shrink-0" />
            {destination ? (
              <span className="font-bold text-slate-900 text-sm truncate">
                {destination}
              </span>
            ) : (
              <div className="h-4 bg-slate-200 rounded-md w-1/2 animate-pulse" />
            )}
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* Stats Row (Time, Distance, Puntos frecuentes) */}
        {loading ? (
          <div className="grid grid-cols-2 divide-x divide-slate-100 text-center animate-pulse">
            <div className="flex justify-center items-center py-0.5">
              <div className="h-4 bg-slate-200 rounded-md w-14" />
            </div>
            <div className="flex justify-center items-center py-0.5">
              <div className="h-4 bg-slate-200 rounded-md w-14" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 divide-x divide-slate-100 text-center text-xs pt-0.5">
            <div className="flex flex-col items-center justify-center gap-1 px-1">
              <div className="flex items-center gap-1 text-slate-500">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-medium">
                  {estimatedMinutes != null ? `~${estimatedMinutes} min` : "—"}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-1 px-1">
              <div className="flex items-center gap-1 text-slate-500">
                <RouteIcon className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-medium">
                  {totalDistanceKm != null
                    ? formatDistance(totalDistanceKm)
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Operating Company / Empresa */}
        {transportLine ? (
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <Bus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">
              Operado por{" "}
              <strong className="font-semibold text-slate-700">
                {transportLine}
              </strong>
            </span>
          </div>
        ) : null}
      </div>

      {/* ── Puntos Frecuentes Section ──────────────────────────────────────── */}
      <div className="pt-2 space-y-3 pb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            Puntos frecuentes
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Lugares concurridos
          </span>
        </div>

        {loading ? (
          <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-2">
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 bg-slate-200 rounded w-2/3" />
                  <div className="h-2.5 bg-slate-100 rounded w-1/3" />
                </div>
                <div className="h-3.5 bg-slate-200 rounded w-10 shrink-0" />
              </div>
            ))}
          </div>
        ) : stops.length === 0 ? (
          <div className="py-4 text-center text-slate-400 text-xs font-medium">
            No hay paraderos registrados para este recorrido.
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2.5 before:bottom-2.5 before:w-0.5 before:bg-slate-200">
            {stops.map((stop, idx) => {
              const isFocused = focusedStop?.id === stop.id;
              const isFirst = idx === 0;
              const isLast = idx === stops.length - 1;
              const distance = stop.distanceFromStart;

              return (
                <div
                  key={`${stop.id}-${idx}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleStopClick(stop)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleStopClick(stop);
                    }
                  }}
                  aria-label={`Paradero ${stop.name}`}
                  className={`relative cursor-pointer group transition-all rounded-xl p-2 -ml-2 border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                    isFocused
                      ? "bg-amber-50/90 border-amber-300 shadow-xs"
                      : "border-transparent hover:bg-slate-50"
                  }`}
                >
                  {/* Dot */}
                  <div
                    className={`absolute -left-4 top-3.5 w-3 h-3 rounded-full border-2 transition-transform ${
                      isFocused
                        ? "bg-amber-500 border-white scale-125 shadow-sm"
                        : isFirst
                          ? "bg-white border-brand-primary"
                          : isLast
                            ? "bg-red-500 border-red-500"
                            : "bg-white border-slate-300 group-hover:border-blue-500"
                    }`}
                  />

                  {/* Info */}
                  <div className="flex items-start justify-between gap-2 pl-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-slate-900 text-sm leading-tight flex items-center gap-1.5">
                        <span className="truncate">{stop.name}</span>
                        {stop.stopOrder != null && (
                          <span className="text-xs bg-slate-100 text-slate-500 font-bold px-1.5 py-0.2 rounded-full shrink-0">
                            #{stop.stopOrder}
                          </span>
                        )}
                        {isFocused && (
                          <span className="text-xs bg-amber-500 text-white font-bold px-1.5 py-0.2 rounded-full shrink-0">
                            Enfocado
                          </span>
                        )}
                      </h4>
                      {(stop.reference || stop.address) && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          Ref: {stop.reference || stop.address}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {distance != null && (
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
                          {formatDistance(distance)}
                        </span>
                      )}
                      {stop.accessible && (
                        <span className="text-xs text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          ♿
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Community Reports & Alerts Box (final) ───────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-2.5 mb-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare className="w-4 h-4 text-brand-primary shrink-0" />
            <span className="text-xs font-bold text-slate-900">
              Comunidad en esta ruta
            </span>
            {communitySummary?.totalPostsCount > 0 && (
              <span className="text-[11px] font-bold bg-blue-100 text-brand-primary px-2 py-0.5 rounded-full">
                {communitySummary.totalPostsCount}
              </span>
            )}
            {communitySummary?.activeAlertsCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                {communitySummary.activeAlertsCount}{" "}
                {communitySummary.activeAlertsCount === 1
                  ? "alerta"
                  : "alertas"}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(`/comunidad?routeId=${selectedRoute.id}&compose=1`)
            }
            className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-primary-green hover:text-slate-900 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Reportar</span>
          </button>
        </div>

        {communitySummary?.latestPost ? (
          <div className="bg-white rounded-xl p-2.5 border border-slate-200/70 space-y-1">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className={`font-bold px-1.5 py-0.2 rounded border text-[10px] ${
                    getCategoryMeta(communitySummary.latestPost.category)
                      .badgeClass
                  }`}
                >
                  {
                    getCategoryMeta(communitySummary.latestPost.category)
                      .shortLabel
                  }
                </span>
                <span className="font-semibold text-slate-700 truncate">
                  {communitySummary.latestPost.authorAlias}
                </span>
              </div>
              <span className="text-slate-400 shrink-0">
                {formatRelativeTime(communitySummary.latestPost.createdAt)}
              </span>
            </div>
            <p className="text-xs text-slate-700 line-clamp-2">
              {communitySummary.latestPost.content}
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            Sin reportes recientes. ¿Estás viajando en esta ruta? Comparte el
            estado con otros pasajeros.
          </p>
        )}

        <button
          type="button"
          onClick={() => navigate(`/comunidad?routeId=${selectedRoute.id}`)}
          className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-50 py-2.5 px-3 rounded-xl border border-slate-200/90 transition-colors shadow-2xs"
        >
          <span>
            {communitySummary?.totalPostsCount > 0
              ? `Ver las ${communitySummary.totalPostsCount} publicaciones de esta ruta`
              : "Abrir foro de esta ruta"}
          </span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <RouteShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        route={selectedRoute}
      />
    </div>
  );
}
