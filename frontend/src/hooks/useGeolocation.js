import { useState, useCallback, useEffect } from "react";

// Default centered on Ica, Perú
const ICA_DEFAULT = { lat: -14.0678, lng: -75.7286 };

export function useGeolocation(defaultLocation = ICA_DEFAULT) {
  const [location, setLocation] = useState(defaultLocation);
  const [isLocating, setIsLocating] = useState(false);
  const [hasCustomLocation, setHasCustomLocation] = useState(false);
  const [gpsReady, setGpsReady] = useState(false);
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
      return Promise.reject(msg);
    }

    setIsLocating(true);
    setError(null);

    return new Promise((resolve, reject) => {
      const onSuccess = (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setLocation(coords);
        setHasCustomLocation(true);
        setGpsReady(true);
        setIsLocating(false);
        resolve(coords);
      };

      const onError = (err) => {
        // If high-accuracy satellite GPS times out or fails (common indoors on Android),
        // fall back to low-accuracy network/cell/WiFi positioning.
        if (err.code !== err.PERMISSION_DENIED) {
          navigator.geolocation.getCurrentPosition(
            onSuccess,
            (fallbackErr) => {
              let msg = "No se pudo obtener tu ubicación actual.";
              if (fallbackErr.code === fallbackErr.PERMISSION_DENIED) {
                msg = "Permiso de ubicación denegado por el usuario.";
              } else if (
                fallbackErr.code === fallbackErr.POSITION_UNAVAILABLE
              ) {
                msg =
                  "Información de ubicación no disponible. Verifica que la ubicación esté activada en tu dispositivo.";
              } else if (fallbackErr.code === fallbackErr.TIMEOUT) {
                msg = "La solicitud de ubicación expiró.";
              }
              setError(msg);
              setIsLocating(false);
              reject(msg);
            },
            {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 60000,
            },
          );
          return;
        }

        let msg = "Permiso de ubicación denegado por el usuario.";
        setError(msg);
        setIsLocating(false);
        reject(msg);
      };

      // Try high-accuracy (satellite) GPS first with an 8-second timeout
      navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 30000,
      });
    });
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

  return {
    location,
    isLocating,
    hasCustomLocation,
    gpsReady,
    error,
    requestLocation,
    setLocation,
    gpsPermissionState,
  };
}
