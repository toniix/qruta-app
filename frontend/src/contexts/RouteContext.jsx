/* eslint-disable react-refresh/only-export-components */
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
import { useGeolocation } from "../hooks/useGeolocation";
import { calculateDistanceKm } from "../utils/geoUtils";

export const RouteContext = createContext(null);

export function RouteProvider({ children }) {
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
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
  } = useGeolocation();

  // Filter popular routes within 2 km if GPS is active
  const displayedPopularRoutes = useMemo(() => {
    if (!popularRoutes || popularRoutes.length === 0) return [];

    if ((hasCustomLocation || gpsReady) && userLocation?.lat && userLocation?.lng) {
      return popularRoutes.filter((pop) => {
        const fullRoute = routes.find(
          (r) => String(r.id) === String(pop.id) || r.code === pop.code,
        );
        if (!fullRoute) return false;

        const routeStops = fullRoute.keyStops?.length > 0 ? fullRoute.keyStops : fullRoute.stops || [];
        if (routeStops.length === 0) return false;

        return routeStops.some((stop) => {
          if (stop.latitude == null || stop.longitude == null) return false;
          const dist = calculateDistanceKm(userLocation.lat, userLocation.lng, stop.latitude, stop.longitude);
          return dist <= 2.0;
        });
      });
    }

    return popularRoutes;
  }, [popularRoutes, routes, hasCustomLocation, gpsReady, userLocation]);

  // Load all routes, stops, and popular routes (Single initial fetch)
  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadingPopular(true);
    setError(null);
    try {
      const [fetchedRoutes, fetchedStops, fetchedPopular] = await Promise.all([
        routeService.getAllRoutes(),
        stopService.getAllStops(),
        routeService.getPopularRoutes().catch(() => []),
      ]);
      setRoutes(fetchedRoutes);
      setStops(fetchedStops);
      setPopularRoutes(fetchedPopular);
    } catch (err) {
      console.error("Error al cargar datos del sistema de rutas:", err);
      setError("No se pudieron cargar las rutas. Revisa la conexión con el servidor.");
    } finally {
      setLoading(false);
      setLoadingPopular(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [fetchedRoutes, fetchedStops, fetchedPopular] = await Promise.all([
          routeService.getAllRoutes(),
          stopService.getAllStops(),
          routeService.getPopularRoutes().catch(() => []),
        ]);
        if (isMounted) {
          setRoutes(fetchedRoutes);
          setStops(fetchedStops);
          setPopularRoutes(fetchedPopular);
          setLoading(false);
          setLoadingPopular(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error al cargar datos del sistema de rutas:", err);
          setError("No se pudieron cargar las rutas. Revisa la conexión con el servidor.");
          setLoading(false);
          setLoadingPopular(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

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
      const fetched = await stopService.getNearbyStops(userLocation.lat, userLocation.lng, 1200);
      setNearbyStops(fetched);
    } catch (err) {
      console.error("Error al cargar paraderos cercanos:", err);
      setStopsError("No se pudieron cargar los paraderos cercanos.");
    } finally {
      setLoadingStops(false);
    }
  }, [hasCustomLocation, userLocation]);

  useEffect(() => {
    if (!hasCustomLocation || !userLocation?.lat || !userLocation?.lng) return;

    if (lastCoordsRef.current) {
      const d = calculateDistanceKm(
        lastCoordsRef.current.lat,
        lastCoordsRef.current.lng,
        userLocation.lat,
        userLocation.lng,
      );
      if (d < 0.05) return;
    }

    lastCoordsRef.current = { lat: userLocation.lat, lng: userLocation.lng };
    let isMounted = true;
    (async () => {
      try {
        const fetched = await stopService.getNearbyStops(userLocation.lat, userLocation.lng, 1200);
        if (isMounted) {
          setNearbyStops(fetched);
          setLoadingStops(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error al cargar paraderos cercanos:", err);
          setStopsError("No se pudieron cargar los paraderos cercanos.");
          setLoadingStops(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [hasCustomLocation, userLocation]);

  // Filter or search routes based on debounced search query or nearby filter
  useEffect(() => {
    let isMounted = true;
    async function computeFiltered() {
      try {
        if (debouncedSearchQuery.trim() !== "") {
          setLoadingFiltered(true);
          const results = await routeService.searchRoutes(debouncedSearchQuery);
          if (isMounted) setFilteredRoutes(results);
        } else if (onlyNearby && userLocation?.lat && userLocation?.lng) {
          setLoadingFiltered(true);
          const results = await routeService.getNearbyRoutes(userLocation.lat, userLocation.lng, 2000);
          if (isMounted) {
            const match = routeService.findNearestRouteAndStop(results, userLocation.lat, userLocation.lng);
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

  // Select a route and ensure full details (directions, stops, points) are loaded
  const selectRoute = useCallback(async (routeOrId) => {
    if (!routeOrId) return;

    const routeId = typeof routeOrId === "object" ? routeOrId.id : routeOrId;
    const initialRoute = typeof routeOrId === "object" ? routeOrId : { id: routeId };

    const hasDirections = Array.isArray(initialRoute.directions) && initialRoute.directions.length > 0;

    setSelectedRoute((current) => {
      if (current && String(current.id) === String(routeId) && current.directions?.length > 0) {
        return current;
      }
      return initialRoute;
    });

    setSelectedStop(null);
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

  const locateNearestRoute = async () => {
    if (!hasCustomLocation && !gpsReady) {
      try {
        await requestLocation();
      } catch (err) {
        console.warn("No se pudo obtener ubicación GPS:", err);
      }
    }
    setOnlyNearby(true);
  };

  return (
    <RouteContext.Provider
      value={{
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
        locateNearestRoute,
        requestLocation,
        loadData,
      }}
    >
      {children}
    </RouteContext.Provider>
  );
}

export function useRoutes() {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error("useRoutes debe ser usado dentro de un RouteProvider");
  }
  return context;
}
