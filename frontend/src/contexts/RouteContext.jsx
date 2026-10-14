import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";

import { routeService } from "../services/routeService";
import { stopService } from "../services/stopService";
import { geocodingService } from "../services/geocodingService";
import { cityService } from "../services/cityService";
import { useGeolocation } from "../hooks/useGeolocation";
import { calculateDistanceKm, detectCityFromCoords } from "../utils/geoUtils";

const RouteContext = createContext(null);

export function RouteProvider({ children }) {
  const [routes, setRoutes] = useState([]);
  const stops = useMemo(() => [], []);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [activeDirection, setActiveDirection] = useState("OUTBOUND");
  const [searchedLocation, setSearchedLocation] = useState(null);
  const [nearestMatchInfo, setNearestMatchInfo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyNearby, setOnlyNearby] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredRoutes, setFilteredRoutes] = useState([]);
  const [loadingFiltered, setLoadingFiltered] = useState(false);

  const [nearbyStops, setNearbyStops] = useState([]);
  const [loadingStops, setLoadingStops] = useState(false);
  const [stopsError, setStopsError] = useState(null);
  const [popularRoutes, setPopularRoutes] = useState([]);
  const [loadingPopular, setLoadingPopular] = useState(false);
  const [loadingRouteDetail, setLoadingRouteDetail] = useState(false);
  const [showGpsModal, setShowGpsModal] = useState(false);
  const [userAddress, setUserAddress] = useState(null);
  const [loadingAddress, setLoadingAddress] = useState(false);

  const [cities, setCities] = useState([]);
  const [currentCity, setCurrentCity] = useState(null);
  const [isManualCity, setIsManualCity] = useState(false);
  const [outsideCoverage, setOutsideCoverage] = useState(false);

  // Debounced search query to prevent hammering backend on each keystroke
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 280);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const {
    location: userLocation,
    isLocating,
    requestLocation,
    hasCustomLocation,
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
      return;
    }

    try {
      await requestLocation();
    } catch {
      // If user dismissed browser dialog or denied, open modal to offer manual guidance
      setShowGpsModal(true);
    }
  }, [gpsPermissionState, requestLocation]);

  // Check once on mount: if session hasn't dismissed yet and GPS isn't granted, show polite modal
  useEffect(() => {
    const hasDismissed = sessionStorage.getItem("rutasya_gps_modal_dismissed");
    if (!hasDismissed && gpsPermissionState === "prompt") {
      const timer = setTimeout(() => {
        setShowGpsModal(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [gpsPermissionState]);

  // Filter popular routes within 2 km if GPS is active (optimized O(1) Map lookup)
  const displayedPopularRoutes = useMemo(() => {
    if (!popularRoutes || popularRoutes.length === 0) return [];

    const isGpsActive = Boolean(hasCustomLocation || gpsReady);
    const lat = userLocation?.lat;
    const lng = userLocation?.lng;

    if (!isGpsActive || lat == null || lng == null) {
      return popularRoutes;
    }

    // Index routes by ID and Code for fast O(1) retrieval
    const routeMap = new Map();
    for (const r of routes) {
      if (r?.id) routeMap.set(String(r.id), r);
      if (r?.code) routeMap.set(r.code, r);
    }

    return popularRoutes.filter((pop) => {
      const fullRoute =
        routeMap.get(String(pop.id)) ||
        (pop.code ? routeMap.get(pop.code) : null);
      if (!fullRoute) return false;

      const routeStops =
        fullRoute.keyStops?.length > 0
          ? fullRoute.keyStops
          : fullRoute.stops || [];
      if (routeStops.length === 0) return false;

      return routeStops.some((stop) => {
        if (stop.latitude == null || stop.longitude == null) return false;
        const dist = calculateDistanceKm(
          lat,
          lng,
          stop.latitude,
          stop.longitude,
        );
        return dist <= 2.0;
      });
    });
  }, [
    popularRoutes,
    routes,
    hasCustomLocation,
    gpsReady,
    userLocation?.lat,
    userLocation?.lng,
  ]);

  // Load all routes and popular routes for the initial citizen dashboard.
  // Stops are fetched by geographic proximity when GPS is active (nearbyStops) or within each route (keyStops).
  const loadData = useCallback(async (cityId) => {
    setLoading(true);
    setLoadingPopular(true);
    setError(null);
    try {
      const [fetchedRoutes, fetchedPopular] = await Promise.all([
        routeService.getAllRoutes(cityId),
        routeService.getPopularRoutes(cityId).catch(() => []),
      ]);
      setRoutes(fetchedRoutes);
      setPopularRoutes(fetchedPopular);
    } catch (err) {
      console.error("Error al cargar datos del sistema de rutas:", err);
      setError(
        "No se pudieron cargar las rutas. Revisa la conexión con el servidor.",
      );
    } finally {
      setLoading(false);
      setLoadingPopular(false);
    }
  }, []);

  // Load cities catalog on mount and set initial city from localStorage or default
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const fetchedCities = await cityService.getAllCities();
        if (!isMounted) return;
        setCities(fetchedCities);

        const savedCityId = localStorage.getItem("rutasya_selected_city_id");
        const initialCity = savedCityId
          ? fetchedCities.find((c) => c.id === savedCityId)
          : fetchedCities.find((c) => c.name === "Ica") || fetchedCities[0] || null;

        if (initialCity) {
          setCurrentCity(initialCity);
          setIsManualCity(!!savedCityId);
        }
      } catch (err) {
        console.error("Error al cargar ciudades:", err);
        const fallback = { id: null, name: "Ica", latitude: -14.0678, longitude: -75.7286, radiusKm: 30 };
        setCities([fallback]);
        setCurrentCity(fallback);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-detect city from GPS when available (unless user manually selected a different city)
  useEffect(() => {
    if (!hasCustomLocation && !gpsReady) return;
    if (!userLocation?.lat || !userLocation?.lng) return;
    if (!cities || cities.length === 0) return;
    if (isManualCity) return;

    const result = detectCityFromCoords(userLocation.lat, userLocation.lng, cities);
    setOutsideCoverage(!result.isInsideCoverage);

    if (result.city && result.city.id !== currentCity?.id) {
      setCurrentCity(result.city);
      localStorage.removeItem("rutasya_selected_city_id");
    }
  }, [hasCustomLocation, gpsReady, userLocation, cities, isManualCity, currentCity?.id]);

  // Reload routes whenever currentCity changes
  useEffect(() => {
    if (currentCity?.id) {
      loadData(currentCity.id);
    }
  }, [currentCity?.id, loadData]);

  // Fetch nearby stops once user location is known, avoiding re-fetches on tiny GPS jitter
  const lastCoordsRef = useRef(null);
  const loadNearbyStops = useCallback(async () => {
    if (!hasCustomLocation || !userLocation?.lat || !userLocation?.lng) return;

    if (lastCoordsRef.current) {
      const d = calculateDistanceKm(
        lastCoordsRef.current.lat,
        lastCoordsRef.current.lng,
        userLocation.lat,
        userLocation.lng,
      );
      if (d < 0.05) return; // Ignore movements under 50 meters
    }

    lastCoordsRef.current = { lat: userLocation.lat, lng: userLocation.lng };
    setLoadingStops(true);
    setStopsError(null);
    try {
      const fetched = await stopService.getNearbyStops(
        userLocation.lat,
        userLocation.lng,
        1200,
      );
      setNearbyStops(fetched);
    } catch (err) {
      console.error("Error al cargar paraderos cercanos:", err);
      setStopsError("No se pudieron cargar los paraderos cercanos.");
    } finally {
      setLoadingStops(false);
    }
  }, [hasCustomLocation, userLocation]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (isMounted) {
        await loadNearbyStops();
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [loadNearbyStops]);

  // Reverse geocode user location to detect address name (cached per ~80m movement)
  const lastGeocodeCoordsRef = useRef(null);
  useEffect(() => {
    let isMounted = true;

    if (!hasCustomLocation && !gpsReady) {
      if (lastGeocodeCoordsRef.current !== null) {
        lastGeocodeCoordsRef.current = null;
        setUserAddress(null);
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
    (async () => {
      setLoadingAddress(true);
      try {
        const result = await geocodingService.reverseGeocode(
          userLocation.lat,
          userLocation.lng,
        );
        if (isMounted && result) {
          setUserAddress(result);
        }
      } catch (err) {
        console.warn("No se pudo obtener la dirección por GPS:", err);
      } finally {
        if (isMounted) setLoadingAddress(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [hasCustomLocation, gpsReady, userLocation]);

  // Filter routes for the map/catalog scope.
  // The citizen search journey lives in SearchPage (/buscar, global search).
  // This context only filters the already-loaded city catalog client-side and
  // never runs its own remote search; catalog, nearby and popular loading
  // stay city-scoped exactly as before.
  useEffect(() => {
    let isMounted = true;
    async function computeFiltered() {
      try {
        if (debouncedSearchQuery.trim() !== "") {
          const term = debouncedSearchQuery.toLowerCase().trim();
          if (isMounted) {
            setFilteredRoutes(
              routes.filter((route) => {
                const matchName = route.name?.toLowerCase().includes(term);
                const matchCode = route.code?.toLowerCase().includes(term);
                const matchLine = route.transportLineName
                  ?.toLowerCase()
                  .includes(term);
                const matchStops = (
                  route.keyStops ||
                  route.stops ||
                  []
                ).some(
                  (s) =>
                    s.name?.toLowerCase().includes(term) ||
                    s.address?.toLowerCase().includes(term),
                );
                return matchName || matchCode || matchLine || matchStops;
              }),
            );
          }
        } else if (onlyNearby && userLocation?.lat && userLocation?.lng) {
          setLoadingFiltered(true);
          const results = await routeService.getNearbyRoutes(
            userLocation.lat,
            userLocation.lng,
            2000,
          );
          if (isMounted) {
            const match = routeService.findNearestRouteAndStop(
              results,
              userLocation.lat,
              userLocation.lng,
            );
            if (match) {
              setNearestMatchInfo(match);
              const sorted = [...results].sort((a, b) => {
                if (a.id === match.route?.id) return -1;
                if (b.id === match.route?.id) return 1;
                return 0;
              });
              setFilteredRoutes(sorted);
            } else {
              setFilteredRoutes(results);
            }
          }
        } else {
          if (isMounted) setFilteredRoutes(routes);
        }
      } catch (err) {
        console.error("Error al filtrar rutas:", err);
      } finally {
        if (isMounted) setLoadingFiltered(false);
      }
    }
    computeFiltered();
    return () => {
      isMounted = false;
    };
  }, [debouncedSearchQuery, onlyNearby, userLocation, routes]);

  const selectRoute = useCallback(async (routeOrId, preserveStop = false) => {
    if (!routeOrId) return;

    const routeId = typeof routeOrId === "object" ? routeOrId.id : routeOrId;
    const initialRoute =
      typeof routeOrId === "object" ? routeOrId : { id: routeId };

    const hasDirections =
      Array.isArray(initialRoute.directions) &&
      initialRoute.directions.length > 0;

    setSelectedRoute((current) => {
      if (
        current &&
        String(current.id) === String(routeId) &&
        current.directions?.length > 0
      ) {
        return current;
      }
      return initialRoute;
    });

    if (!preserveStop) {
      setSelectedStop(null);
    }
    setActiveDirection("OUTBOUND");

    if (hasDirections || !routeId) {
      setLoadingRouteDetail(false);
      return;
    }

    setLoadingRouteDetail(true);
    try {
      const detail = await routeService.getRouteDetail(routeId);
      setSelectedRoute((current) => {
        if (current && String(current.id) === String(routeId)) {
          return detail;
        }
        return current;
      });
    } catch (err) {
      console.error("Error al cargar detalle de ruta:", err);
    } finally {
      setLoadingRouteDetail(false);
    }
  }, []);

  const selectStop = useCallback((stop) => {
    setSelectedStop(stop);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRoute(null);
    setSelectedStop(null);
    setActiveDirection("OUTBOUND");
    setSearchedLocation(null);
    setNearestMatchInfo(null);
    setOnlyNearby(false);
    setLoadingRouteDetail(false);
  }, []);

  const clearSelectedRoute = useCallback(() => {
    setSelectedRoute(null);
    setActiveDirection("OUTBOUND");
    setLoadingRouteDetail(false);
  }, []);

  const locateNearestRoute = useCallback(async () => {
    if (!hasCustomLocation && !gpsReady) {
      try {
        await triggerGpsRequest();
      } catch (err) {
        console.warn("No se pudo obtener ubicación GPS:", err);
      }
    }
    setOnlyNearby(true);
  }, [hasCustomLocation, gpsReady, triggerGpsRequest]);

  const setCity = useCallback((city, isManual = true) => {
    if (!city) return;
    setCurrentCity(city);
    setIsManualCity(isManual);
    setOutsideCoverage(false);
    if (isManual) {
      localStorage.setItem("rutasya_selected_city_id", city.id);
    } else {
      localStorage.removeItem("rutasya_selected_city_id");
    }
  }, []);

  const resetToGpsDetection = useCallback(() => {
    setIsManualCity(false);
    localStorage.removeItem("rutasya_selected_city_id");
  }, []);

  // Stabilize context value reference to prevent redundant re-renders across all child components
  const contextValue = useMemo(
    () => ({
      routes,
      stops,
      filteredRoutes,
      loadingFiltered,
      selectedRoute,
      selectedStop,
      activeDirection,
      setActiveDirection,
      searchedLocation,
      nearestMatchInfo,
      searchQuery,
      onlyNearby,
      setOnlyNearby,
      loading,
      error,
      userLocation,
      isLocating,
      hasCustomLocation,
      gpsReady,
      gpsPermissionState,
      showGpsModal,
      setShowGpsModal,
      userAddress,
      loadingAddress,
      nearbyStops,
      loadingStops,
      stopsError,
      popularRoutes,
      displayedPopularRoutes,
      loadingPopular,
      loadingRouteDetail,
      loadNearbyStops,
      setSearchQuery,
      setSearchedLocation,
      selectRoute,
      selectStop,
      clearSelection,
      clearSelectedRoute,
      locateNearestRoute,
      requestLocation,
      triggerGpsRequest,
      setGpsPermissionState,
      checkPermissionState,
      loadData,
      cities,
      currentCity,
      isManualCity,
      outsideCoverage,
      setCity,
      resetToGpsDetection,
    }),
    [
      routes,
      stops,
      filteredRoutes,
      loadingFiltered,
      selectedRoute,
      selectedStop,
      activeDirection,
      searchedLocation,
      nearestMatchInfo,
      searchQuery,
      onlyNearby,
      loading,
      error,
      userLocation,
      isLocating,
      hasCustomLocation,
      gpsReady,
      gpsPermissionState,
      showGpsModal,
      setShowGpsModal,
      userAddress,
      loadingAddress,
      nearbyStops,
      loadingStops,
      stopsError,
      popularRoutes,
      displayedPopularRoutes,
      loadingPopular,
      loadingRouteDetail,
      loadNearbyStops,
      setSearchQuery,
      setSearchedLocation,
      selectRoute,
      selectStop,
      clearSelection,
      clearSelectedRoute,
      locateNearestRoute,
      requestLocation,
      triggerGpsRequest,
      setGpsPermissionState,
      checkPermissionState,
      loadData,
      cities,
      currentCity,
      isManualCity,
      outsideCoverage,
      setCity,
      resetToGpsDetection,
    ],
  );

  return (
    <RouteContext.Provider value={contextValue}>
      {children}
    </RouteContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRoutes() {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error("useRoutes debe ser usado dentro de un RouteProvider");
  }
  return context;
}
