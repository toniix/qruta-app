import { useEffect, useId, useRef, useState } from "react";
import {
  MapPin,
  Navigation,
  Route,
  Zap,
  X,
  Settings,
  AlertTriangle,
  WifiOff,
} from "lucide-react";
import { useRouteGps } from "../../contexts/RouteContext";

/**
 * GpsPermissionModal
 *
 * Shown automatically when the app starts and the GPS permission is in 'prompt' state
 * (never been asked). Handles all three scenarios:
 *   - prompt      → Ask the user politely with clear benefits
 *   - denied      → Guide them to re-enable in browser settings
 *   - unsupported → Graceful fallback message
 *
 * Dismissed state is persisted in sessionStorage so it doesn't reappear within
 * the same session if the user clicks "Ahora no".
 */
export function GpsPermissionModal() {
  const {
    gpsPermissionState,
    requestLocation,
    showGpsModal,
    setShowGpsModal,
    checkPermissionState,
  } = useRouteGps();
  const [isRequesting, setIsRequesting] = useState(false);
  const dialogRef = useRef(null);
  const titleId = useId();

  // The modal is only visible if explicitly requested via showGpsModal and not yet granted
  const visible = Boolean(showGpsModal) && gpsPermissionState !== "granted";

  useEffect(() => {
    if (!visible) return undefined;
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    const previousActive = document.activeElement;
    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
      if (previousActive instanceof HTMLElement && previousActive.isConnected) {
        previousActive.focus();
      }
    };
  }, [visible]);

  const handleDismiss = () => {
    try {
      sessionStorage.setItem("rutasya_gps_modal_dismissed", "true");
    } catch {
      // ignore private mode storage failures
    }
    if (typeof setShowGpsModal === "function") {
      setShowGpsModal(false);
    }
  };

  const handleDialogCancel = (event) => {
    event.preventDefault();
    handleDismiss();
  };

  const handleBackdropClick = (event) => {
    if (typeof HTMLDialogElement !== "undefined" && "closedBy" in HTMLDialogElement.prototype) {
      return;
    }
    if (event.target === dialogRef.current) {
      handleDismiss();
    }
  };

  const handleAllow = async () => {
    setIsRequesting(true);
    try {
      if (typeof requestLocation === "function") {
        await requestLocation();
      }
      if (typeof setShowGpsModal === "function") {
        setShowGpsModal(false);
      }
    } catch {
      // Permission denied or dismissed by browser dialog — modal stays and guides user
      if (typeof checkPermissionState === "function") {
        await checkPermissionState();
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleRetryPermission = async () => {
    if (typeof checkPermissionState === "function") {
      const state = await checkPermissionState();
      if (state === "granted") {
        await handleAllow();
        return;
      }
    }
    // Attempt location request again in case user granted it in browser settings
    await handleAllow();
  };

  if (!visible) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      closedby="any"
      onCancel={handleDialogCancel}
      onClick={handleBackdropClick}
      className="m-auto mb-4 w-[calc(100%-2rem)] overflow-visible bg-transparent p-0 backdrop:bg-slate-900/55 backdrop:backdrop-blur-xs sm:mb-auto sm:max-w-sm"
    >
      <div
        className="gps-modal-card w-full overflow-hidden rounded-2xl bg-white shadow-overlay"
        style={{ border: "1px solid rgba(226,232,240,0.9)" }}
      >
        {/* Header band */}
        <div
          className="relative px-5 pb-5 pt-6"
          style={{
            background: "var(--color-brand-primary)",
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/15 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Icon */}
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/30 bg-white/20">
            {gpsPermissionState === "denied" ? (
              <AlertTriangle className="h-6 w-6 text-amber-300" aria-hidden="true" />
            ) : gpsPermissionState === "unsupported" ? (
              <WifiOff className="h-6 w-6 text-white" aria-hidden="true" />
            ) : (
              <Navigation className="h-6 w-6 text-white" aria-hidden="true" />
            )}
          </div>

          <h2
            id={titleId}
            className="text-lg font-bold leading-tight text-white"
            style={{ letterSpacing: "-0.01em" }}
          >
            {gpsPermissionState === "denied"
              ? "Ubicación bloqueada"
              : gpsPermissionState === "unsupported"
                ? "GPS no disponible"
                : "¿Activo tu ubicación?"}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-blue-100">
            {gpsPermissionState === "denied"
              ? "Necesitas permitir el acceso desde la configuración del navegador."
              : gpsPermissionState === "unsupported"
                ? "Tu navegador no soporta geolocalización."
                : "Encuentra rutas cerca de ti en segundos."}
          </p>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {/* — PROMPT state: Show benefits — */}
          {gpsPermissionState === "prompt" && (
            <ul className="mb-5 space-y-3">
              {[
                {
                  icon: <Route className="h-4 w-4 text-brand-primary" aria-hidden="true" />,
                  bg: "bg-blue-50",
                  title: "Rutas más cercanas",
                  desc: "Filtra automáticamente las rutas a menos de 1.5 km de ti.",
                },
                {
                  icon: <MapPin className="h-4 w-4 text-emerald-600" aria-hidden="true" />,
                  bg: "bg-emerald-50",
                  title: "Tu posición en el mapa",
                  desc: "Siempre verás dónde estás y a qué distancia está cada parada.",
                },
                {
                  icon: <Zap className="h-4 w-4 text-amber-600" aria-hidden="true" />,
                  bg: "bg-amber-50",
                  title: "Acceso rápido",
                  desc: 'El botón "Ruta Más Cercana" te llevará directo a la opción ideal.',
                },
              ].map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${item.bg}`}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-snug text-slate-500">
                      {item.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* — DENIED state: Manual instructions — */}
          {gpsPermissionState === "denied" && (
            <div className="mb-5 space-y-3">
              <p className="text-xs leading-relaxed text-slate-600">
                Para activar la ubicación, sigue estos pasos en tu navegador:
              </p>
              <ol className="space-y-2">
                {[
                  'Toca el ícono del candado 🔒 o la "i" en la barra de direcciones.',
                  'Busca "Ubicación" o "Permisos de sitio".',
                  'Cambia el permiso a "Permitir".',
                  "Recarga la página.",
                ].map((step, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-xs text-slate-700"
                  >
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* — UNSUPPORTED state — */}
          {gpsPermissionState === "unsupported" && (
            <p className="mb-5 text-xs leading-relaxed text-slate-600">
              Puedes seguir usando QRuta sin GPS. Busca rutas por nombre o
              explora el mapa manualmente.
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {gpsPermissionState === "prompt" && (
              <button
                type="button"
                onClick={handleAllow}
                disabled={isRequesting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white transition-all active:scale-[0.98]"
                style={{
                  background: isRequesting
                    ? "#93c5fd"
                    : "var(--color-brand-primary)",
                  boxShadow: isRequesting
                    ? "none"
                    : "0 4px 14px rgba(29,78,216,0.35)",
                }}
              >
                {isRequesting ? (
                  <>
                    <span
                      className="inline-block h-4 w-4 rounded-full border-2 border-white/40 border-t-white"
                      style={{ animation: "spin 0.8s linear infinite" }}
                      aria-hidden="true"
                    />
                    Ubicando...
                  </>
                ) : (
                  <>
                    <Navigation className="h-4 w-4" aria-hidden="true" />
                    Activar mi ubicación
                  </>
                )}
              </button>
            )}

            {gpsPermissionState === "denied" && (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleRetryPermission}
                  disabled={isRequesting}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white transition-all active:scale-[0.98]"
                  style={{
                    background: isRequesting
                      ? "#93c5fd"
                      : "var(--color-brand-primary)",
                    boxShadow: isRequesting
                      ? "none"
                      : "0 4px 14px rgba(29,78,216,0.35)",
                  }}
                >
                  {isRequesting ? (
                    <>
                      <span
                        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                        aria-hidden="true"
                      />
                      Verificando permiso...
                    </>
                  ) : (
                    <>
                      <Navigation className="h-4 w-4" aria-hidden="true" />
                      Ya lo activé, verificar GPS
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200"
                >
                  <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                  Recargar página
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              className="w-full rounded-2xl py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
            >
              {gpsPermissionState === "prompt"
                ? "Ahora no, explorar igual"
                : "Continuar sin GPS"}
            </button>
          </div>
        </div>

        {/* Privacy note */}
        <div className="px-5 pb-4">
          <p className="text-center text-xs leading-relaxed text-slate-500">
            🔒 Tu ubicación solo se usa localmente para mostrar rutas cercanas.
            No se almacena ni se comparte.
          </p>
        </div>
      </div>
    </dialog>
  );
}
