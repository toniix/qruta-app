/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { routeService } from '../services/routeService';
import { stopService } from '../services/stopService';
import { nearbyService } from '../services/nearbyService';
import { useGeolocation } from '../hooks/useGeolocation';

export const RouteContext = createContext(null);

export function RouteProvider({ children }) {
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [searchedLocation, setSearchedLocation] = useState(null);
  const [nearestMatchInfo, setNearestMatchInfo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyNearby, setOnlyNearby] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredRoutes, setFilteredRoutes] = useState([]);
  // Controls the GPS permission modal imperatively (e.g., from the Cercanas button)
  const [showGpsModal, setShowGpsModal] = useState(false);

  const { location: userLocation, isLocating, requestLocation, hasCustomLocation, gpsReady, gpsPermissionState } = useGeolocation();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [fetchedRoutes, fetchedStops] = await Promise.all([
        routeService.getAllRoutes(),
        stopService.getAllStops(),
      ]);
      setRoutes(fetchedRoutes);
      setStops(fetchedStops);
    } catch (err) {
      console.error('Error al cargar datos de rutas:', err);
      setError('No se pudieron cargar las rutas. Revisa tu conexión.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        const [fetchedRoutes, fetchedStops] = await Promise.all([
          routeService.getAllRoutes(),
          stopService.getAllStops(),
        ]);
        if (isMounted) {
          setRoutes(fetchedRoutes);
          setStops(fetchedStops);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error al cargar datos de rutas:', err);
          setError('No se pudieron cargar las rutas. Revisa tu conexión.');
          setLoading(false);
        }
      }
    }
    fetchData();
    return () => { isMounted = false; };
  }, []);

  // Re-compute filtered routes whenever searchQuery, onlyNearby, or routes change
  useEffect(() => {
    let isMounted = true;
    async function computeFiltered() {
      try {
        if (searchQuery.trim() !== '') {
          const results = await routeService.searchRoutes(searchQuery);
          if (isMounted) setFilteredRoutes(results);
        } else if (onlyNearby && userLocation) {
          const results = await nearbyService.findNearbyRoutes(userLocation.lat, userLocation.lng, 1500);
          if (isMounted) {
            const match = routeService.findNearestRouteAndStop(results, userLocation.lat, userLocation.lng);
            if (match) {
              setNearestMatchInfo(match);
              // Sort nearest route first
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
        console.error('Error al filtrar rutas:', err);
      }
    }
    computeFiltered();
    return () => { isMounted = false; };
  }, [searchQuery, onlyNearby, userLocation, routes]);

  const selectRoute = (route) => {
    setSelectedRoute(route);
    setSelectedStop(null);
  };

  const selectStop = (stop) => {
    setSelectedStop(stop);
  };

  const clearSelection = () => {
    setSelectedRoute(null);
    setSelectedStop(null);
    setSearchedLocation(null);
    setNearestMatchInfo(null);
    setOnlyNearby(false);
  };

  /**
   * Activates/deactivates the "nearby routes" filter.
   *
   * Correct behaviour:
   *   - If a route is currently selected  → clear the selected route and show nearby routes.
   *   - If filter is ON (and no route selected) → toggle filter OFF.
   *   - If filter is OFF → enable filter (using GPS if ready, or opening modal if not).
   */
  const toggleNearby = () => {
    // If a route is currently selected, tapping "Cercanas" should clear the selected route
    // and show all nearby routes instead of staying stuck on the selected route's detail view.
    if (selectedRoute) {
      setSelectedRoute(null);
      setSelectedStop(null);
      setSearchedLocation(null);
      setNearestMatchInfo(null);

      if (gpsReady) {
        setOnlyNearby(true);
      } else if (gpsPermissionState === 'granted') {
        requestLocation().then(() => {
          setOnlyNearby(true);
        }).catch(() => {
          setShowGpsModal(true);
        });
      } else {
        setShowGpsModal(true);
      }
      return;
    }

    if (onlyNearby) {
      // Turning the filter OFF — just reset, no GPS needed.
      setOnlyNearby(false);
      return;
    }

    // Turning the filter ON:
    if (gpsReady) {
      // Location already known — filter instantly without re-requesting GPS.
      setSelectedRoute(null);
      setSelectedStop(null);
      setNearestMatchInfo(null);
      setOnlyNearby(true);
    } else if (gpsPermissionState === 'granted') {
      // Granted but no fix yet (rare after auto-detect). Request once then enable.
      requestLocation().then(() => {
        setOnlyNearby(true);
      }).catch(() => {
        setShowGpsModal(true);
      });
    } else {
      // Not granted (prompt / denied / unknown / unsupported) → show the GPS modal.
      setShowGpsModal(true);
    }
  };

  /**
   * Filters by nearby routes and identifies the nearest route/stop match without forcing a single route drawer selection.
   */
  const locateNearestRoute = async () => {
    // Helper: given coords, find nearby routes and highlight nearest match.
    const findAndShowNearby = async (coords) => {
      setSelectedRoute(null);
      setSelectedStop(null);
      setOnlyNearby(true);
      const nearbyRoutes = await nearbyService.findNearbyRoutes(coords.lat, coords.lng, 1500);
      const match = routeService.findNearestRouteAndStop(nearbyRoutes, coords.lat, coords.lng);
      if (match) {
        setNearestMatchInfo(match);
        // Sort nearest route first
        const sorted = [...nearbyRoutes].sort((a, b) => {
          if (a.id === match.route?.id) return -1;
          if (b.id === match.route?.id) return 1;
          return 0;
        });
        setFilteredRoutes(sorted);
      } else {
        setFilteredRoutes(nearbyRoutes);
      }
    };

    try {
      if (gpsReady) {
        // GPS is already active — use the location we already have. No re-request.
        await findAndShowNearby(userLocation);
      } else if (gpsPermissionState === 'granted') {
        // Granted but no cached fix yet — request once, then search.
        try {
          const coords = await requestLocation();
          await findAndShowNearby(coords);
        } catch {
          setShowGpsModal(true);
        }
      } else {
        // GPS not available or not yet permitted — open the modal.
        setShowGpsModal(true);
      }
    } catch (err) {
      console.error('Error al buscar rutas cercanas:', err);
      setShowGpsModal(true);
    }
  };

  return (
    <RouteContext.Provider
      value={{
        routes,
        stops,
        filteredRoutes,
        selectedRoute,
        selectedStop,
        searchedLocation,
        nearestMatchInfo,
        searchQuery,
        onlyNearby,
        loading,
        error,
        userLocation,
        isLocating,
        gpsReady,
        gpsPermissionState,
        hasCustomLocation,
        setSearchQuery,
        setSearchedLocation,
        selectRoute,
        selectStop,
        clearSelection,
        toggleNearby,
        locateNearestRoute,
        requestLocation,
        showGpsModal,
        setShowGpsModal,
        reload: loadData,
      }}
    >
      {children}
    </RouteContext.Provider>
  );
}

export function useRoutes() {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error('useRoutes debe ser usado dentro de un RouteProvider');
  }
  return context;
}
