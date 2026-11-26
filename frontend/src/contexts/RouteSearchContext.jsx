import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";

import { routeService } from "../services/routeService";
import { isAbortError } from "../utils/abortUtils";
import { useRouteCatalog } from "./RouteCatalogContext";
import { useRouteGps } from "./RouteGpsContext";

// eslint-disable-next-line react-refresh/only-export-components
export const RouteSearchContext = createContext(null);

const RouteSearchResetContext = createContext(null);

export function RouteSearchProvider({ children }) {
  const { routes } = useRouteCatalog();
  const { gpsReady, userLocation, showGpsModal, triggerGpsRequest } =
    useRouteGps();

  const [searchedLocation, setSearchedLocation] = useState(null);
  const [nearestMatchInfo, setNearestMatchInfo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyNearby, setOnlyNearby] = useState(false);
  const [filteredRoutes, setFilteredRoutes] = useState([]);
  const [loadingFiltered, setLoadingFiltered] = useState(false);
  const [pendingNearbyAfterGps, setPendingNearbyAfterGps] = useState(false);

  // Debounced search query to prevent hammering backend on each keystroke
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 280);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Track gpsReady transitions so onlyNearby reverts only when GPS is actually lost/disabled
  const [prevGpsReady, setPrevGpsReady] = useState(gpsReady);
  if (gpsReady !== prevGpsReady) {
    setPrevGpsReady(gpsReady);
    if (!gpsReady && onlyNearby) {
      setOnlyNearby(false);
    }
  }

  // When GPS becomes ready after user requested nearby routes (e.g. granted via modal), activate onlyNearby
  if (gpsReady && pendingNearbyAfterGps) {
    setOnlyNearby(true);
    setPendingNearbyAfterGps(false);
  } else if (!showGpsModal && !gpsReady && pendingNearbyAfterGps) {
    // If the GPS permission modal is closed without granting GPS, cancel pending nearby request
    setPendingNearbyAfterGps(false);
  }

  // Filter routes for the map/catalog scope.
  // The citizen search journey lives in SearchPage (/buscar, global search).
  // This context only filters the already-loaded city catalog client-side and
  // never runs its own remote search; catalog, nearby and popular loading
  // stay city-scoped exactly as before.
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
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
                const matchStops = (route.keyStops || route.stops || []).some(
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
            { signal: controller.signal },
          );
          if (isMounted && !controller.signal.aborted) {
            const match = routeService.findNearestRouteAndStop(
              results,
              userLocation.lat,
              userLocation.lng,
            );
            if (match) {
              setNearestMatchInfo(match);
              const sorted = results.toSorted((a, b) => {
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
        if (isAbortError(err) || controller.signal.aborted) return;
        console.error("Error al filtrar rutas:", err);
      } finally {
        if (isMounted && !controller.signal.aborted) setLoadingFiltered(false);
      }
    }
    computeFiltered();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [debouncedSearchQuery, onlyNearby, userLocation, routes]);

  const locateNearestRoute = useCallback(async () => {
    if (gpsReady) {
      setOnlyNearby(true);
      return;
    }
    setPendingNearbyAfterGps(true);
    try {
      const success = await triggerGpsRequest();
      if (success) {
        setOnlyNearby(true);
        setPendingNearbyAfterGps(false);
      }
    } catch (err) {
      console.warn("No se pudo obtener ubicación GPS:", err);
      setPendingNearbyAfterGps(false);
      setOnlyNearby(false);
    }
  }, [gpsReady, triggerGpsRequest]);

  // Stable reset callback consumed by RouteSelectionProvider.clearSelection
  const resetSearchState = useCallback(() => {
    setSearchedLocation(null);
    setNearestMatchInfo(null);
    setPendingNearbyAfterGps(false);
    setOnlyNearby(false);
  }, []);

  const searchValue = useMemo(
    () => ({
      searchQuery,
      setSearchQuery,
      filteredRoutes,
      loadingFiltered,
      onlyNearby,
      setOnlyNearby,
      searchedLocation,
      setSearchedLocation,
      nearestMatchInfo,
      locateNearestRoute,
    }),
    [
      searchQuery,
      filteredRoutes,
      loadingFiltered,
      onlyNearby,
      searchedLocation,
      nearestMatchInfo,
      locateNearestRoute,
    ],
  );

  return (
    <RouteSearchContext.Provider value={searchValue}>
      <RouteSearchResetContext.Provider value={resetSearchState}>
        {children}
      </RouteSearchResetContext.Provider>
    </RouteSearchContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRouteSearch() {
  const context = useContext(RouteSearchContext);
  if (!context) {
    throw new Error("useRouteSearch debe ser usado dentro de un RouteProvider");
  }
  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRouteSearchReset() {
  const resetSearchState = useContext(RouteSearchResetContext);
  if (!resetSearchState) {
    throw new Error(
      "useRouteSearchReset debe ser usado dentro de un RouteSearchProvider",
    );
  }
  return resetSearchState;
}
