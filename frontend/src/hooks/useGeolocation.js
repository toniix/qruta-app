import { useState, useCallback, useEffect } from "react";

export function useGeolocation() {
  const [location, setLocation] = useState(null);
  // Single stored GPS state: 'idle' | 'locating' | 'ready' | 'error'.
  // gpsReady / isLocating are derived so no two flags can drift apart.
  const [gpsStatus, setGpsStatus] = useState("idle");
  const [error, setError] = useState(null);

  // 'unsupported' | 'prompt' while checking, then 'granted' | 'denied'
  const [gpsPermissionState, setGpsPermissionState] = useState(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return "unsupported";
    }
    if (!navigator.permissions || !navigator.permissions.query) {
      return "prompt";
    }
    return "unknown";
  });

  /**
   * Requests the device GPS position.
   * Returns a Promise that resolves with the { lat, lng, accuracy } object
   * on success, or rejects with an error message string on failure.
   * This allows callers to chain logic reliably after the location is obtained.
   */
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      const msg = "La geolocalización no está soportada en este navegador";
      setError(msg);
      setGpsStatus("error");
      return Promise.reject(msg);
    }

    setGpsStatus("locating");
    setError(null);

    return new Promise((resolve, reject) => {
      const onSuccess = (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setLocation(coords);
        setGpsStatus("ready");
        resolve(coords);
      };

      const onError = (err) => {
        // PERMISSION_DENIED (code 1)
        if (err.code === err.PERMISSION_DENIED) {
          const msg = "Permiso de ubicación denegado por el usuario.";
          setGpsPermissionState("denied");
          setError(msg);
          setGpsStatus("error");
          reject(msg);
          return;
        }

        // POSITION_UNAVAILABLE (code 2) or TIMEOUT (code 3):
        // If high-accuracy satellite GPS timed out or failed (common indoors on Android/iOS),
        // try fallback to low-accuracy network/cell/WiFi positioning.
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          (fallbackErr) => {
            let msg = "No se pudo obtener tu ubicación actual.";
            if (fallbackErr.code === fallbackErr.PERMISSION_DENIED) {
              msg = "Permiso de ubicación denegado por el usuario.";
              setGpsPermissionState("denied");
            } else if (fallbackErr.code === fallbackErr.POSITION_UNAVAILABLE) {
              msg =
                "Información de ubicación no disponible. Verifica que el GPS de tu celular esté encendido.";
            } else if (fallbackErr.code === fallbackErr.TIMEOUT) {
              msg = "La solicitud de ubicación tardó demasiado tiempo.";
            }
            setError(msg);
            setGpsStatus("error");
            reject(msg);
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 60000,
          },
        );
      };

      // Try high-accuracy (satellite) GPS first with a 7-second timeout
      navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy: true,
        timeout: 7000,
        maximumAge: 30000,
      });
    });
  }, []);

  // Helper to re-query permissions API at any time
  const checkPermissionState = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.geolocation
    ) {
      setGpsPermissionState("unsupported");
      return "unsupported";
    }
    if (!navigator.permissions || !navigator.permissions.query) {
      return "prompt";
    }
    try {
      const result = await navigator.permissions.query({ name: "geolocation" });
      setGpsPermissionState(result.state);
      return result.state;
    } catch {
      return "prompt";
    }
  }, []);

  // On mount: check permission state via Permissions API if available, without forcing prompt
  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      !navigator.geolocation ||
      !navigator.permissions ||
      !navigator.permissions.query
    ) {
      return;
    }

    let permissionObj = null;

    navigator.permissions
      .query({ name: "geolocation" })
      .then((result) => {
        permissionObj = result;
        setGpsPermissionState(result.state);
        if (result.state === "granted") {
          // Already permitted in browser, retrieve coordinates silently
          requestLocation().catch(() => {});
        }
        result.onchange = () => {
          setGpsPermissionState(result.state);
          if (result.state === "granted") {
            requestLocation().catch(() => {});
          }
        };
      })
      .catch(() => {
        setGpsPermissionState("prompt");
      });

    return () => {
      if (permissionObj) {
        permissionObj.onchange = null;
      }
    };
  }, [requestLocation]);

  const gpsReady = gpsStatus === "ready";
  const isLocating = gpsStatus === "locating";

  return {
    location,
    gpsStatus,
    gpsReady,
    isLocating,
    error,
    requestLocation,
    setLocation,
    gpsPermissionState,
    setGpsPermissionState,
    checkPermissionState,
  };
}
