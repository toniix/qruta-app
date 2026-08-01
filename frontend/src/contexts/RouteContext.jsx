/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { routeService } from '../services/routeService';
import { stopService } from '../services/stopService';
import { useGeolocation } from '../hooks/useGeolocation';

export const RouteContext = createContext(null);

export function RouteProvider({ children }) {
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [searchedLocation, setSearchedLocation] = useState(null); // { name, latitude, longitude }
  const [nearestMatchInfo, setNearestMatchInfo] = useState(null); // { route, stop, distanceKm }
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('featured'); // 'featured' | 'university' | 'commercial' | 'tourist' | 'all'
  const [onlyNearby, setOnlyNearby] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { location: userLocation, isLocating, requestLocation, hasCustomLocation } = useGeolocation();

  // Load all routes & stops initially
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
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute filtered routes based on search query, nearby toggle, and active category
  const getFilteredRoutes = useCallback(() => {
    let result = routes;

    // If searching by text, filter across all routes
    if (searchQuery.trim() !== '') {
      const term = searchQuery.toLowerCase().trim();
      return result.filter(
        (r) =>
          r.name.toLowerCase().includes(term) ||
          r.code.toLowerCase().includes(term) ||
          r.origin.toLowerCase().includes(term) ||
          r.destination.toLowerCase().includes(term) ||
          r.lineName.toLowerCase().includes(term) ||
          r.stops.some((s) => s.name.toLowerCase().includes(term))
      );
    }

    // If GPS Nearby filter is active
    if (onlyNearby && userLocation) {
      return result.filter((route) => {
        return route.stops.some((stop) => {
          const latDiff = Math.abs(stop.latitude - userLocation.lat);
          const lngDiff = Math.abs(stop.longitude - userLocation.lng);
          return latDiff < 0.03 && lngDiff < 0.03; // Approx ~2-3km
        });
      });
    }

    // Default category filtering
    if (activeCategory === 'featured') {
      return result.filter((r) => r.isFeatured);
    }
    if (activeCategory === 'university') {
      return result.filter((r) => r.category === 'university');
    }
    if (activeCategory === 'commercial') {
      return result.filter((r) => r.category === 'commercial');
    }
    if (activeCategory === 'tourist') {
      return result.filter((r) => r.category === 'tourist');
    }

    return result; // 'all'
  }, [routes, searchQuery, onlyNearby, activeCategory, userLocation]);

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

  const switchCategory = (category) => {
    clearSelection();
    setSearchQuery('');
    setActiveCategory(category);
  };

  const toggleNearby = () => {
    if (!hasCustomLocation && !onlyNearby) {
      requestLocation();
    }
    clearSelection();
    setOnlyNearby((prev) => !prev);
  };

  // Find & select the single nearest route to the user
  const locateNearestRoute = () => {
    requestLocation();
    setOnlyNearby(true);
    if (userLocation && routes.length > 0) {
      const match = routeService.findNearestRouteAndStop(routes, userLocation.lat, userLocation.lng);
      if (match) {
        setNearestMatchInfo(match);
        selectRoute(match.route);
        selectStop(match.stop);
      }
    }
  };

  return (
    <RouteContext.Provider
      value={{
        routes,
        stops,
        filteredRoutes: getFilteredRoutes(),
        selectedRoute,
        selectedStop,
        searchedLocation,
        nearestMatchInfo,
        searchQuery,
        activeCategory,
        onlyNearby,
        loading,
        error,
        userLocation,
        isLocating,
        hasCustomLocation,
        setSearchQuery,
        setSearchedLocation,
        setActiveCategory: switchCategory,
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
