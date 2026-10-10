/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";

import { routeService } from "../services/routeService";
import { stopService } from "../services/stopService";
import { nearbyService } from "../services/nearbyService";
import { useGeolocation } from "../hooks/useGeolocation";
import { calculateDistanceKm } from "../utils/geoUtils";

export const RouteContext = createContext(null);

export function RouteProvider({ children }) {
  const [routes, setRoutes] = useState([]);
  // Stops are fetched and kept in sync, but not exposed through the context yet.
  const [, setStops] = useState([]);
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

    // If user has active GPS location, restrict popular routes to 2km radius
    if (
      (hasCustomLocation || gpsReady) &&
      userLocation?.lat &&
      userLocation?.lng
    ) {
      return popularRoutes.filter((pop) => {
        const fullRoute = routes.find(
          (r) => String(r.id) === String(pop.id) || r.code === pop.code,
        );
        if (!fullRoute) return false;

        const stops = fullRoute.keyStops || fullRoute.stops || [];
        if (stops.length === 0) return false;

        return stops.some((stop) => {
          const lat = stop.latitude ?? stop.location?.latitude;
          const lng = stop.longitude ?? stop.location?.longitude;
          if (lat == null || lng == null) return false;
          const dist = calculateDistanceKm(
            userLocation.lat,
            userLocation.lng,
            lat,
            lng,
          );
          return dist <= 2.0; // Within 2 kilometers
        });
      });
    }

    return popularRoutes;
  }, [popularRoutes, routes, hasCustomLocation, gpsReady, userLocation]);

  // Fetch all routes and stops in parallel
  //TODO: VERIFICAR SI ESTO ES NECESARIO, YA QUE SE HACE EN EL USEEFFECT DE ABAJO ADEMAS SI SE PUEDE HACER EN UNA SOLA LLAMDAZ
  const fetchRoutesAndStops = useCallback(async () => {
    const [fetchedRoutes, fetchedStops] = await Promise.all([
      routeService.getAllRoutes(),
      stopService.getAllStops(),
    ]);
    return { fetchedRoutes, fetchedStops };
  }, []);

  // Load all routes and stops on mount
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { fetchedRoutes, fetchedStops } = await fetchRoutesAndStops();
      setRoutes(fetchedRoutes);
      setStops(fetchedStops);
    } catch (err) {
      console.error("Error al cargar datos de rutas:", err);
      setError("No se pudieron cargar las rutas. Revisa tu conexión.");
    } finally {
      setLoading(false);
    }
  }, [fetchRoutesAndStops]);

  // Load all routes and stops on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        const { fetchedRoutes, fetchedStops } = await fetchRoutesAndStops();
        if (isMounted) {
          setRoutes(fetchedRoutes);
          setStops(fetchedStops);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error al cargar datos de rutas:", err);
          setError("No se pudieron cargar las rutas. Revisa tu conexión.");
          setLoading(false);
        }
      }
    }
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [fetchRoutesAndStops]);

  // Load popular routes on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchPopular() {
      try {
        const data = await routeService.getPopularRoutes();
        if (isMounted) {
          setPopularRoutes(data);
        }
      } catch (err) {
        console.warn("Error al obtener rutas populares:", err);
      } finally {
        if (isMounted) setLoadingPopular(false);
      }
    }
    fetchPopular();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load nearby stops whenever we have a real GPS location
  //TODO: VERIFICAR SI ESTO ES NECESARIO, YA QUE SE HACE EN EL USEEFFECT DE ABAJO ADEMAS SI SE PUEDE HACER EN UNA SOLA LLAMDAZ
  const loadNearbyStops = useCallback(async () => {
    if (!hasCustomLocation || !userLocation) return;
    setLoadingStops(true);
    setStopsError(null);
    try {
      const stops = await nearbyService.findNearbyStops(
        userLocation.lat,
        userLocation.lng,
        1200,
      );
      setNearbyStops(stops);
    } catch (err) {
      console.error("Error al cargar paraderos cercanos:", err);
      setStopsError("No se pudieron cargar los paraderos cercanos.");
    } finally {
      setLoadingStops(false);
    }
  }, [hasCustomLocation, userLocation]);

  // Re-compute nearby stops whenever the user location changes
  useEffect(() => {
    let isMounted = true;
    async function fetchNearby() {
      if (!hasCustomLocation || !userLocation) return;
      setLoadingStops(true);
      setStopsError(null);
      try {
        const stops = await nearbyService.findNearbyStops(
          userLocation.lat,
          userLocation.lng,
          1200,
        );
        if (isMounted) {
          setNearbyStops(stops);
        }
      } catch (err) {
        console.error("Error al cargar paraderos cercanos:", err);
        if (isMounted) {
          setStopsError("No se pudieron cargar los paraderos cercanos.");
        }
      } finally {
        if (isMounted) setLoadingStops(false);
      }
    }
    fetchNearby();
    return () => {
      isMounted = false;
    };
  }, [hasCustomLocation, userLocation]);

  // Re-compute filtered routes when filters change with clear loading state
  useEffect(() => {
    let isMounted = true;
    async function computeFiltered() {
      try {
        if (searchQuery.trim() !== "") {
          setLoadingFiltered(true);
          const results = await routeService.searchRoutes(searchQuery);
          if (isMounted) setFilteredRoutes(results);
        } else if (onlyNearby && userLocation) {
          setLoadingFiltered(true);
          const results = await nearbyService.findNearbyRoutes(
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
  }, [searchQuery, onlyNearby, userLocation, routes]);

  const selectRoute = useCallback(async (route) => {
    console.log("Seleccionando ruta:", route);
    if (!route) return;

    // Check if route already has full directions loaded
    const hasDirections = route.directions && route.directions.length > 0;

    // Synchronously update selectedRoute so UI responds immediately
    setSelectedRoute((current) => {
      if (
        current &&
        String(current.id) === String(route.id) &&
        current.directions?.length > 0
      ) {
        return current;
      }
      return route;
    });

    setSelectedStop(null);
    setActiveDirection("OUTBOUND");

    if (hasDirections || !route.id) {
      setLoadingRouteDetail(false);
      return;
    }

    setLoadingRouteDetail(true);
    try {
      const detail = await routeService.getRouteDetail(route.id);
      console.log("Detalle de ruta cargado:", detail);
      setSelectedRoute((current) => {
        if (current && String(current.id) === String(route.id)) {
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
        console.log("Ubicación GPS obtenida exitosamente.");
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
