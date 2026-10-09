import { useState, useCallback, useEffect } from 'react';

// Default centered on Ica, Perú
const ICA_DEFAULT = { lat: -14.0678, lng: -75.7286 };

export function useGeolocation(defaultLocation = ICA_DEFAULT) {
  const [location, setLocation] = useState(defaultLocation);
  const [isLocating, setIsLocating] = useState(false);
  const [hasCustomLocation, setHasCustomLocation] = useState(false);
  const [gpsReady, setGpsReady] = useState(false);
  const [error, setError] = useState(null);
  // 'unknown' while checking, then 'granted' | 'denied' | 'prompt' | 'unsupported'.
  // Whether the browser exposes the Geolocation API cannot change during a session,
  // so that case is settled in the initializer instead of in an effect.
  const [gpsPermissionState, setGpsPermissionState] = useState(() =>
    typeof navigator !== 'undefined' && !navigator.geolocation ? 'unsupported' : 'unknown'
  );

  /**
   * Requests the device GPS position.
   * Returns a Promise that resolves with the { lat, lng, accuracy } object
   * on success, or rejects with an error message string on failure.
   * This allows callers to chain logic reliably after the location is obtained.
   */
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      const msg = 'La geolocalización no está soportada en este navegador';
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
              let msg = 'No se pudo obtener tu ubicación actual.';
              if (fallbackErr.code === fallbackErr.PERMISSION_DENIED) {
                msg = 'Permiso de ubicación denegado por el usuario.';
              } else if (fallbackErr.code === fallbackErr.POSITION_UNAVAILABLE) {
                msg = 'Información de ubicación no disponible. Verifica que la ubicación esté activada en tu dispositivo.';
              } else if (fallbackErr.code === fallbackErr.TIMEOUT) {
                msg = 'La solicitud de ubicación expiró.';
              }
              setError(msg);
              setIsLocating(false);
              reject(msg);
            },
            {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 60000,
            }
          );
          return;
        }

        let msg = 'Permiso de ubicación denegado por el usuario.';
        setError(msg);
        setIsLocating(false);
        reject(msg);
      };

      // Try high-accuracy (satellite) GPS first with an 8-second timeout
      navigator.geolocation.getCurrentPosition(
        onSuccess,
        onError,
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 30000,
        }
      );
    });
  }, []);

  // On mount: detect GPS permission state reliably across all browsers/devices.
  //
  // Strategy:
  //   Phase 1 — Silent cache probe: call getCurrentPosition with timeout:0 so it
  //             returns INSTANTLY from cache (no dialog, no waiting). If it resolves,
  //             the user already granted permission and we have their last known coords.
  //             If PERMISSION_DENIED, access is genuinely blocked.
  //             If TIMEOUT, there's no cached position (or first visit) — move to Phase 2.
  //
  //   Phase 2 — Permissions API (desktop Chrome / Firefox): query for current state.
  //             On Android Chrome this often returns 'prompt' for granted sites, which
  //             is why Phase 1 must run first to catch those cases.
  //
  // This approach fixes Android Chrome where navigator.permissions.query() returns
  // 'prompt' for sites that already have geolocation permission.
  useEffect(() => {
    // Already reported as 'unsupported' by the initializer.
    if (!navigator.geolocation) return;

    const runDetection = async () => {
      // ── Phase 1: probe for a cached or network-assisted position (no dialog) ──
      // timeout:3000 + maximumAge:Infinity + enableHighAccuracy:false means:
      //   "Give me any position (even hours old) from cache or network/WiFi,
      //    don't use satellites, and wait up to 3 seconds."
      // This is instantaneous on desktop (browser has a cache) and takes up to
      // ~1-2 s on Android where Chrome consults the OS network location instead
      // of its own internal cache. timeout:0 was too strict for Android.
      const cacheResult = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ ok: true, pos }),
          (err) => resolve({ ok: false, code: err.code }),
          { timeout: 3000, maximumAge: Infinity, enableHighAccuracy: false }
        );
      });

      if (cacheResult.ok) {
        // Cached hit → permission already granted + we have a fresh-enough position.
        const { latitude: lat, longitude: lng, accuracy } = cacheResult.pos.coords;
        setLocation({ lat, lng, accuracy });
        setHasCustomLocation(true);
        setGpsReady(true);
        setGpsPermissionState('granted');
        // Kick off a high-accuracy follow-up in the background (updates the pin).
        requestLocation();
        return;
      }

      if (cacheResult.code === 1 /* PERMISSION_DENIED */) {
        setGpsPermissionState('denied');
        return;
      }

      // TIMEOUT → no cached position; permission might be granted but nothing cached yet.
      // ── Phase 2: consult Permissions API for a definitive state ──────────────
      if (navigator.permissions) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' });
          setGpsPermissionState(result.state); // 'granted' | 'denied' | 'prompt'
          if (result.state === 'granted') {
            // Granted but no cache → do a full location request silently.
            requestLocation();
          }
          // React to future browser-settings changes in this tab.
          result.onchange = () => {
            setGpsPermissionState(result.state);
            if (result.state === 'granted') requestLocation();
          };
        } catch {
          // Permissions API threw (some browsers/extensions block it).
          setGpsPermissionState('prompt');
        }
      } else {
        // Permissions API not available at all (older browsers, some Android WebViews).
        setGpsPermissionState('prompt');
      }
    };

    runDetection();
  // requestLocation is memoized (useCallback []) — stable reference, safe to omit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
