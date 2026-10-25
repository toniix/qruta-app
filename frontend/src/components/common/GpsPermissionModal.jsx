import { useState } from "react";
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
import { useRoutes } from "../../contexts/RouteContext";

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
  } = useRoutes();
  const [isRequesting, setIsRequesting] = useState(false);

  // The modal is only visible if explicitly requested via showGpsModal and not yet granted
  const visible = Boolean(showGpsModal) && gpsPermissionState !== "granted";

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
    // Backdrop
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gps-modal-title"
      className="fixed inset-0 z-[9000] flex items-end sm:items-center justify-center p-4 sm:p-0"
      style={{
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        animation: "modal-fade-in 0.25s ease-out",
      }}
      onClick={(e) => e.target === e.currentTarget && handleDismiss()}
    >
      <style>{`
        @keyframes modal-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modal-slide-up {
          from { transform: translateY(24px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .gps-modal-card {
          animation: modal-slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .gps-modal-card {
            animation: modal-fade-in 0.15s ease-out;
          }
        }
      `}</style>

      <div
        className="gps-modal-card w-full sm:max-w-sm bg-white rounded-2xl shadow-overlay overflow-hidden"
        style={{ border: "1px solid rgba(226,232,240,0.9)" }}
      >
        {/* Header band */}
        <div
          className="relative px-5 pt-6 pb-5"
          style={{
            background: "var(--color-brand-primary)",
          }}
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/15 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon */}
          <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center mb-3">
            {gpsPermissionState === "denied" ? (
              <AlertTriangle className="w-6 h-6 text-amber-300" />
            ) : gpsPermissionState === "unsupported" ? (
              <WifiOff className="w-6 h-6 text-white" />
            ) : (
              <Navigation className="w-6 h-6 text-white" />
            )}
          </div>

          <h2
            id="gps-modal-title"
            className="text-white font-bold text-lg leading-tight"
            style={{ letterSpacing: "-0.01em" }}
          >
            {gpsPermissionState === "denied"
              ? "Ubicación bloqueada"
              : gpsPermissionState === "unsupported"
                ? "GPS no disponible"
                : "¿Activo tu ubicación?"}
          </h2>
          <p className="text-blue-100 text-xs mt-1 leading-relaxed">
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
            <ul className="space-y-3 mb-5">
              {[
                {
                  icon: <Route className="w-4 h-4 text-brand-primary" />,
                  bg: "bg-blue-50",
                  title: "Rutas más cercanas",
                  desc: "Filtra automáticamente las rutas a menos de 1.5 km de ti.",
                },
                {
                  icon: <MapPin className="w-4 h-4 text-emerald-600" />,
                  bg: "bg-emerald-50",
                  title: "Tu posición en el mapa",
                  desc: "Siempre verás dónde estás y a qué distancia está cada parada.",
                },
                {
                  icon: <Zap className="w-4 h-4 text-amber-600" />,
                  bg: "bg-amber-50",
                  title: "Acceso rápido",
                  desc: 'El botón "Ruta Más Cercana" te llevará directo a la opción ideal.',
                },
              ].map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-500 leading-snug mt-0.5">
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
              <p className="text-xs text-slate-600 leading-relaxed">
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
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center flex-shrink-0 text-xs">
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
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              Puedes seguir usando QRuta sin GPS. Busca rutas por nombre o
              explora el mapa manualmente.
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {gpsPermissionState === "prompt" && (
              <button
                onClick={handleAllow}
                disabled={isRequesting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.98]"
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
                      className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white inline-block"
                      style={{ animation: "spin 0.8s linear infinite" }}
                    />
                    Ubicando...
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" />
                    Activar mi ubicación
                  </>
                )}
              </button>
            )}

            {gpsPermissionState === "denied" && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleRetryPermission}
                  disabled={isRequesting}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.98]"
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
                        className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white inline-block animate-spin"
                      />
                      Verificando permiso...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4" />
                      Ya lo activé, verificar GPS
                    </>
                  )}
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl font-semibold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Recargar página
                </button>
              </div>
            )}

            <button
              onClick={handleDismiss}
              className="w-full py-2.5 rounded-2xl font-semibold text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {gpsPermissionState === "prompt"
                ? "Ahora no, explorar igual"
                : "Continuar sin GPS"}
            </button>
          </div>
        </div>

        {/* Privacy note */}
        <div className="px-5 pb-4">
          <p className="text-xs text-slate-500 text-center leading-relaxed">
            🔒 Tu ubicación solo se usa localmente para mostrar rutas cercanas.
            No se almacena ni se comparte.
          </p>
        </div>
      </div>
    </div>
  );
}
