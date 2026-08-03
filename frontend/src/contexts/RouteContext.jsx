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

  const { location: userLocation, isLocating, requestLocation, hasCustomLocation } = useGeolocation();

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

  // Re-compute filtered routes when filters change
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

  const selectRoute = async (route) => {
    // If we only have summary (no directions or empty directions), fetch full detail
    const hasDirections = route.directions && route.directions.length > 0;
    if (!hasDirections) {
      try {
        const detail = await routeService.getRouteDetail(route.id);
        setSelectedRoute(detail);
      } catch (err) {
        console.error('Error al cargar detalle de ruta:', err);
        setSelectedRoute(route);
      }
    } else {
      setSelectedRoute(route);
    }
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

  const toggleNearby = () => {
    if (!hasCustomLocation && !onlyNearby) {
      requestLocation();
    }
    clearSelection();
    setOnlyNearby((prev) => !prev);
  };

  const locateNearestRoute = async () => {
    requestLocation();
    setOnlyNearby(true);
    if (userLocation) {
      try {
        const nearbyRoutes = await nearbyService.findNearbyRoutes(userLocation.lat, userLocation.lng, 1500);
        const match = routeService.findNearestRouteAndStop(nearbyRoutes, userLocation.lat, userLocation.lng);
        if (match) {
          setNearestMatchInfo(match);
          const sorted = [...nearbyRoutes].sort((a, b) => {
            if (a.id === match.route?.id) return -1;
            if (b.id === match.route?.id) return 1;
            return 0;
          });
          setFilteredRoutes(sorted);
        } else {
          setFilteredRoutes(nearbyRoutes);
        }
      } catch (err) {
        console.error('Error al buscar rutas cercanas:', err);
      }
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
        hasCustomLocation,
        setSearchQuery,
        setSearchedLocation,
        selectRoute,
        selectStop,
        clearSelection,
        toggleNearby,
        locateNearestRoute,
        requestLocation,
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
