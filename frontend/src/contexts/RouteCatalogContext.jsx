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
import { cityService } from "../services/cityService";
import { calculateDistanceKm, detectCityFromCoords } from "../utils/geoUtils";
import {
  readCachedCities,
  saveCachedCities,
  readInitialCity,
  getSelectedCityId,
  persistSelectedCity,
  clearSelectedCityId,
} from "../utils/cityCache";
import { isAbortError } from "../utils/abortUtils";
import { useRouteGps } from "./RouteGpsContext";

// eslint-disable-next-line react-refresh/only-export-components
export const RouteCatalogContext = createContext(null);

export function RouteCatalogProvider({ children }) {
  const { gpsReady, userLocation } = useRouteGps();

  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [popularRoutes, setPopularRoutes] = useState([]);
  const [loadingPopular, setLoadingPopular] = useState(false);

  const [cities, setCities] = useState(() => readCachedCities() || []);
  const [initialCityConfig] = useState(() => {
    const cached = readCachedCities();
    return readInitialCity(cached);
  });
  const [currentCity, setCurrentCity] = useState(initialCityConfig.city);
  const [isManualCity, setIsManualCity] = useState(initialCityConfig.isManual);
  const [outsideCoverage, setOutsideCoverage] = useState(false);

  // Filter popular routes within 2 km if GPS is active (optimized O(1) Map lookup)
  const displayedPopularRoutes = useMemo(() => {
    if (!popularRoutes || popularRoutes.length === 0) return [];

    const isGpsActive = Boolean(gpsReady);
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
  }, [popularRoutes, routes, gpsReady, userLocation?.lat, userLocation?.lng]);

  const loadDataControllerRef = useRef(null);

  // Load all routes and popular routes for the initial citizen dashboard.
  // Stops are fetched by geographic proximity when GPS is active (nearbyStops) or within each route (keyStops).
  const loadData = useCallback(async (cityId) => {
    loadDataControllerRef.current?.abort();
    const controller = new AbortController();
    loadDataControllerRef.current = controller;

    setLoading(true);
    setLoadingPopular(true);
    setError(null);
    try {
      const [fetchedRoutes, fetchedPopular] = await Promise.all([
        routeService.getAllRoutes(cityId, { signal: controller.signal }),
        routeService
          .getPopularRoutes(cityId, { signal: controller.signal })
          .catch((err) => {
            if (isAbortError(err) || controller.signal.aborted) throw err;
            return [];
          }),
      ]);
      if (
        loadDataControllerRef.current === controller &&
        !controller.signal.aborted
      ) {
        setRoutes(fetchedRoutes);
        setPopularRoutes(fetchedPopular);
      }
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) return;
      console.error("Error al cargar datos del sistema de rutas:", err);
      if (loadDataControllerRef.current === controller) {
        setError(
          "No se pudieron cargar las rutas. Revisa la conexión con el servidor.",
        );
      }
    } finally {
      if (
        loadDataControllerRef.current === controller &&
        !controller.signal.aborted
      ) {
        setLoading(false);
        setLoadingPopular(false);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      loadDataControllerRef.current?.abort();
    };
  }, []);

  // Load cities catalog on mount (SWR: refreshes cache and revalidates in background)
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    (async () => {
      try {
        const fetchedCities = await cityService.getAllCities({
          signal: controller.signal,
        });
        if (!isMounted || controller.signal.aborted) return;
        setCities(fetchedCities);
        saveCachedCities(fetchedCities);

        const savedCityId = getSelectedCityId();
        const resolvedCity = savedCityId
          ? fetchedCities.find((c) => c.id === savedCityId)
          : fetchedCities.find((c) => c.name === "Ica") ||
            fetchedCities[0] ||
            null;

        if (resolvedCity) {
          setCurrentCity((prev) => {
            // Keep existing reference if ID matches to prevent redundant route re-fetches
            if (prev?.id === resolvedCity.id) {
              return { ...prev, ...resolvedCity };
            }
            return resolvedCity;
          });
          setIsManualCity(Boolean(savedCityId));
          persistSelectedCity(resolvedCity, Boolean(savedCityId));
        } else {
          setCurrentCity(null);
          setIsManualCity(false);
          clearSelectedCityId();
          try {
            localStorage.removeItem("rutasya_cached_city");
            localStorage.removeItem("rutasya_cities_cache");
          } catch {
            // ignore
          }
          loadData(null);
        }
      } catch (err) {
        if (isAbortError(err) || controller.signal.aborted || !isMounted) return;
        console.error("Error al cargar ciudades:", err);
        setCurrentCity((prev) => {
          if (prev) return prev;
          const fallback = {
            id: null,
            name: "Ica",
            latitude: -14.0678,
            longitude: -75.7286,
            radiusKm: 30,
          };
          setCities([fallback]);
          return fallback;
        });
        loadData(null);
      }
    })();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [loadData]);

  // Auto-detect city from GPS when available (unless user manually selected a different city)
  useEffect(() => {
    if (!gpsReady) return;
    if (!userLocation?.lat || !userLocation?.lng) return;
    if (!cities || cities.length === 0) return;
    if (isManualCity) return;

    const result = detectCityFromCoords(
      userLocation.lat,
      userLocation.lng,
      cities,
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs geolocation coordinates with coverage boundaries
    setOutsideCoverage(!result.isInsideCoverage);

    if (result.city && result.city.id !== currentCity?.id) {
      setCurrentCity(result.city);
      persistSelectedCity(result.city, false);
    }
  }, [gpsReady, userLocation, cities, isManualCity, currentCity?.id]);

  // Reload routes whenever currentCity changes
  useEffect(() => {
    if (currentCity?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizes route dataset with selected city
      loadData(currentCity.id);
    }
  }, [currentCity?.id, loadData]);

  const setCity = useCallback((city, isManual = true) => {
    if (!city) return;
    setCurrentCity(city);
    setIsManualCity(isManual);
    setOutsideCoverage(false);
    persistSelectedCity(city, isManual);
  }, []);

  const resetToGpsDetection = useCallback(() => {
    setIsManualCity(false);
    clearSelectedCityId();
  }, []);

  const catalogValue = useMemo(
    () => ({
      routes,
      cities,
      currentCity,
      isManualCity,
      outsideCoverage,
      loading,
      error,
      popularRoutes,
      displayedPopularRoutes,
      loadingPopular,
      loadData,
      setCity,
      resetToGpsDetection,
    }),
    [
      routes,
      cities,
      currentCity,
      isManualCity,
      outsideCoverage,
      loading,
      error,
      popularRoutes,
      displayedPopularRoutes,
      loadingPopular,
      loadData,
      setCity,
      resetToGpsDetection,
    ],
  );

  return (
    <RouteCatalogContext.Provider value={catalogValue}>
      {children}
    </RouteCatalogContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRouteCatalog() {
  const context = useContext(RouteCatalogContext);
  if (!context) {
    throw new Error("useRouteCatalog debe ser usado dentro de un RouteProvider");
  }
  return context;
}
