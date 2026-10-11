import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRoutes } from "../../contexts/RouteContext";

// Components
import { InteractiveMap } from "../../components/map/InteractiveMap";
import { MapControls } from "../../components/map/MapControls";
import { MapTopHeader } from "../../components/map/MapTopHeader";
import { RouteDrawer } from "../../components/routes/RouteDrawer";
import { RouteCarousel } from "../../components/routes/RouteCarousel";
import { StopDetailDrawer } from "../../components/stops/StopDetailDrawer";

export function HomeMapPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Route Context states & actions
  const {
    routes,
    filteredRoutes,
    loadingFiltered,
    selectedRoute,
    selectedStop,
    searchedLocation,
    userLocation,
    onlyNearby,
    loading,
    error,
    nearestMatchInfo,
    activeDirection,
    selectRoute,
    selectStop,
    clearSelectedRoute,
    triggerGpsRequest,
    isLocating,
    gpsReady,
    hasCustomLocation,
    loadingRouteDetail,
    userAddress,
    nearbyStops,
  } = useRoutes();

  // Local map & UI states
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [isTracingMap, setIsTracingMap] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);
  const carouselRef = useRef(null);
  const prevIdRef = useRef(id);

  const selectedRouteId = selectedRoute?.id;
  const hasSelectedStop = Boolean(selectedStop);

  // Sync URL parameter /mapa/ruta/:id with selectedRoute state
  useEffect(() => {
    if (id) {
      if (String(selectedRouteId) === String(id)) {
        return;
      }
      const found = routes?.find((r) => String(r.id) === String(id));
      selectRoute(found || { id }, hasSelectedStop);
    }
  }, [id, routes, selectRoute, selectedRouteId, hasSelectedStop]);

  // Clear route and stop when transitioning from a route URL (/mapa/ruta/:id) back to base /mapa
  useEffect(() => {
    if (!id && prevIdRef.current) {
      clearSelectedRoute();
      selectStop(null);
    }
    prevIdRef.current = id;
  }, [id, clearSelectedRoute, selectStop]);

  // Cleanup on unmount: if citizen leaves the map page completely, reset selectedRoute and selectedStop
  useEffect(() => {
    return () => {
      clearSelectedRoute();
      selectStop(null);
    };
  }, [clearSelectedRoute, selectStop]);

  // Auto-scroll carousel to position 0 when nearby filter is activated
  useEffect(() => {
    if (onlyNearby && carouselRef.current) {
      carouselRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  }, [onlyNearby, nearestMatchInfo]);

  // Navigation & selection callbacks
  const handleSelectRoute = useCallback(
    (route, stop = null) => {
      if (route) {
        selectRoute(route);
        if (stop) {
          selectStop(stop);
        }
        if (route.id) {
          navigate(`/mapa/ruta/${route.id}`);
        }
      }
    },
    [selectRoute, selectStop, navigate],
  );

  const handleCloseDetail = useCallback(() => {
    selectStop(null);
    navigate("/mapa");
  }, [selectStop, navigate]);

  const handleClearStop = useCallback(() => {
    selectStop(null);
  }, [selectStop]);

  // Map controls (Zoom & Recenter)
  const handleZoomIn = () => {
    if (mapInstance) {
      mapInstance.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstance) {
      mapInstance.zoomOut();
    }
  };

  const handleRecenterGPS = async () => {
    if (!hasCustomLocation && !gpsReady) {
      try {
        await triggerGpsRequest();
      } catch (err) {
        console.warn("No se pudo obtener ubicación GPS:", err);
      }
    }
    setRecenterTrigger(Date.now());
  };

  const handleScrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = direction === "left" ? -310 : 310;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const isRouteLoading = Boolean(loadingRouteDetail || isTracingMap);

  return (
    <div className="relative w-full h-full flex-1 overflow-hidden bg-slate-100 flex flex-col">
      {/* ── Interactive Leaflet Map Background ────────────────────────────── */}
      <div className="absolute inset-0 z-0 w-full h-full">
        <InteractiveMap
          routes={filteredRoutes}
          selectedRoute={selectedRoute}
          selectedStop={selectedStop}
          searchedLocation={searchedLocation}
          userLocation={userLocation}
          gpsReady={gpsReady || hasCustomLocation}
          isLocating={isLocating}
          onSelectRoute={handleSelectRoute}
          onSelectStop={selectStop}
          activeDirection={activeDirection}
          recenterTrigger={recenterTrigger}
          loadingRouteDetail={loadingRouteDetail}
          userAddress={userAddress}
          nearbyStops={nearbyStops}
          onTracingChange={setIsTracingMap}
          onMapReady={setMapInstance}
        />
      </div>

      {/* ── Top Floating Container (Search & Header States) ─────────────────── */}
      <MapTopHeader
        selectedRoute={selectedRoute}
        selectedStop={selectedStop}
        isRouteLoading={isRouteLoading}
        onCloseDetail={handleCloseDetail}
        onClearStop={handleClearStop}
      />

      {/* ── Bottom Floating Area (Carousel OR Route Drawer OR Stop Info) ───── */}
      <div className="mt-auto relative z-20 pointer-events-none w-full max-w-lg mx-auto">
        {/* Floating Controls: Zoom (+ / -) & GPS Recenter */}
        <MapControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onRecenterGPS={handleRecenterGPS}
          isLocating={isLocating}
        />

        {/* Dynamic Bottom Panels */}
        {selectedRoute ? (
          <div className="pointer-events-auto mb-16 sm:mb-20">
            <RouteDrawer />
          </div>
        ) : selectedStop ? (
          <StopDetailDrawer
            stop={selectedStop}
            onClose={handleClearStop}
          />
        ) : (
          <RouteCarousel
            routes={filteredRoutes}
            selectedRoute={selectedRoute}
            onSelectRoute={handleSelectRoute}
            onlyNearby={onlyNearby}
            loading={loading}
            loadingFiltered={loadingFiltered}
            error={error}
            carouselRef={carouselRef}
            onScroll={handleScrollCarousel}
          />
        )}
      </div>
    </div>
  );
}
