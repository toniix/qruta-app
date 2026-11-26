import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";

import { stopService } from "../services/stopService";
import { geocodingService } from "../services/geocodingService";
import { useGeolocation } from "../hooks/useGeolocation";
import { calculateDistanceKm } from "../utils/geoUtils";
import { scheduleNonCriticalTask } from "../utils/scheduler";
import { isAbortError } from "../utils/abortUtils";

// eslint-disable-next-line react-refresh/only-export-components
export const RouteGpsContext = createContext(null);

export function RouteGpsProvider({ children }) {
  const [nearbyStops, setNearbyStops] = useState([]);
  const [loadingStops, setLoadingStops] = useState(false);
  const [stopsError, setStopsError] = useState(null);
  const [showGpsModal, setShowGpsModal] = useState(false);
  const [userAddress, setUserAddress] = useState(null);
  const [rawAddressStatus, setRawAddressStatus] = useState("idle");

  const {
    location: userLocation,
    gpsStatus,
    isLocating,
    requestLocation,
    gpsReady,
    gpsPermissionState,
    setGpsPermissionState,
    checkPermissionState,
  } = useGeolocation();

  // Unified function to request GPS or open guide modal if blocked
  const triggerGpsRequest = useCallback(async () => {
    // If browser permission is explicitly denied, immediately show the helper modal
    if (gpsPermissionState === "denied") {
      setShowGpsModal(true);
      return false;
    }

    try {
      const coords = await requestLocation();
      return Boolean(coords);
    } catch {
      // If user dismissed browser dialog or denied, open modal to offer manual guidance
      setShowGpsModal(true);
      return false;
    }
  }, [gpsPermissionState, requestLocation]);

  // Fetch nearby stops once user location is known, avoiding re-fetches on tiny GPS jitter
  const lastCoordsRef = useRef(null);
  const nearbyStopsControllerRef = useRef(null);

  const loadNearbyStops = useCallback(async () => {
    if (!gpsReady || !userLocation?.lat || !userLocation?.lng) return;

    if (lastCoordsRef.current) {
      const d = calculateDistanceKm(
        lastCoordsRef.current.lat,
        lastCoordsRef.current.lng,
        userLocation.lat,
        userLocation.lng,
      );
      if (d < 0.05) return; // Ignore movements under 50 meters
    }

    nearbyStopsControllerRef.current?.abort();
    const controller = new AbortController();
    nearbyStopsControllerRef.current = controller;

    lastCoordsRef.current = { lat: userLocation.lat, lng: userLocation.lng };
    setLoadingStops(true);
    setStopsError(null);
    try {
      const fetched = await stopService.getNearbyStops(
        userLocation.lat,
        userLocation.lng,
        1200,
        { signal: controller.signal },
      );
      if (
        nearbyStopsControllerRef.current === controller &&
        !controller.signal.aborted
      ) {
        setNearbyStops(fetched);
      }
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) return;
      console.error("Error al cargar paraderos cercanos:", err);
      if (nearbyStopsControllerRef.current === controller) {
        setStopsError("No se pudieron cargar los paraderos cercanos.");
      }
    } finally {
      if (
        nearbyStopsControllerRef.current === controller &&
        !controller.signal.aborted
      ) {
        setLoadingStops(false);
      }
    }
  }, [gpsReady, userLocation]);

  useEffect(() => {
    return () => {
      nearbyStopsControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const cancel = scheduleNonCriticalTask(async () => {
      if (isMounted) {
        await loadNearbyStops();
      }
    });
    return () => {
      isMounted = false;
      cancel();
    };
  }, [loadNearbyStops]);

  // Reverse geocode user location to detect address name (cached per ~80m movement)
  const lastGeocodeCoordsRef = useRef(null);
  useEffect(() => {
    let isMounted = true;

    if (!gpsReady) {
      if (lastGeocodeCoordsRef.current !== null) {
        lastGeocodeCoordsRef.current = null;
        setUserAddress(null);
        setRawAddressStatus("idle");
      }
      return;
    }
    if (!userLocation?.lat || !userLocation?.lng) return;

    if (lastGeocodeCoordsRef.current) {
      const d = calculateDistanceKm(
        lastGeocodeCoordsRef.current.lat,
        lastGeocodeCoordsRef.current.lng,
        userLocation.lat,
        userLocation.lng,
      );
      if (d < 0.08) return; // Skip if moved less than 80 meters
    }

    lastGeocodeCoordsRef.current = {
      lat: userLocation.lat,
      lng: userLocation.lng,
    };
    setRawAddressStatus("loading");

    let settled = false;
    const controller = new AbortController();
    const cancel = scheduleNonCriticalTask(async () => {
      try {
        const result = await geocodingService.reverseGeocode(
          userLocation.lat,
          userLocation.lng,
          { signal: controller.signal },
        );
        if (!isMounted || controller.signal.aborted) return;
        settled = true;
        if (result) {
          setUserAddress(result);
          setRawAddressStatus("ready");
        } else {
          setRawAddressStatus("error");
        }
      } catch (err) {
        if (isAbortError(err) || controller.signal.aborted) return;
        settled = true;
        console.warn("No se pudo obtener la dirección por GPS:", err);
        if (isMounted) setRawAddressStatus("error");
      }
    });

    return () => {
      isMounted = false;
      controller.abort();
      cancel();
      if (!settled) {
        lastGeocodeCoordsRef.current = null;
      }
    };
  }, [gpsReady, userLocation]);

  // Address status is "idle" if GPS is not ready, otherwise reflects the reverse geocoding state
  const addressStatus = gpsReady ? rawAddressStatus : "idle";

  const gpsValue = useMemo(
    () => ({
      userLocation,
      gpsStatus,
      isLocating,
      gpsReady,
      gpsPermissionState,
      showGpsModal,
      setShowGpsModal,
      userAddress,
      addressStatus,
      nearbyStops,
      loadingStops,
      stopsError,
      loadNearbyStops,
      requestLocation,
      triggerGpsRequest,
      setGpsPermissionState,
      checkPermissionState,
    }),
    [
      userLocation,
      gpsStatus,
      isLocating,
      gpsReady,
      gpsPermissionState,
      showGpsModal,
      userAddress,
      addressStatus,
      nearbyStops,
      loadingStops,
      stopsError,
      loadNearbyStops,
      requestLocation,
      triggerGpsRequest,
      setGpsPermissionState,
      checkPermissionState,
    ],
  );

  return (
    <RouteGpsContext.Provider value={gpsValue}>
      {children}
    </RouteGpsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRouteGps() {
  const context = useContext(RouteGpsContext);
  if (!context) {
    throw new Error("useRouteGps debe ser usado dentro de un RouteProvider");
  }
  return context;
}
