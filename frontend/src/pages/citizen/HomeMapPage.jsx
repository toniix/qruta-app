import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRoutes } from "../../contexts/RouteContext";
import { routeService } from "../../services/routeService";
import { calculateDistanceKm } from "../../utils/geoUtils";
import {
  DESTINATION_DEFAULT_RADIUS_M,
  clampRadiusMeters,
  sortRoutesByDistance,
} from "../../utils/distanceBands";

// Components
import { InteractiveMap } from "../../components/map/InteractiveMap";
import { MapControls } from "../../components/map/MapControls";
import { MapTopHeader } from "../../components/map/MapTopHeader";
import { DestinationPinSheet } from "../../components/map/DestinationPinSheet";
import { DestinationResults } from "../../components/map/DestinationResults";
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
    loadData,
    currentCity,
  } = useRoutes();

  // Local map & UI states
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [isTracingMap, setIsTracingMap] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);
  const carouselRef = useRef(null);

  const selectedRouteId = selectedRoute?.id;
  const hasSelectedStop = Boolean(selectedStop);

  const isClosingRef = useRef(false);

  // Sync route only when entering via a route URL (/mapa/ruta/:id)
  useEffect(() => {
    if (id) {
      if (isClosingRef.current) return;
      if (String(selectedRouteId) !== String(id)) {
        const found = routes?.find((r) => String(r.id) === String(id));
        selectRoute(found || { id }, hasSelectedStop);
      }
    }
  }, [id, routes, selectRoute, selectedRouteId, hasSelectedStop]);

  // Auto-scroll carousel to position 0 when nearby filter is activated
  useEffect(() => {
    if (onlyNearby && carouselRef.current) {
      carouselRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  }, [onlyNearby]);

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

  // Close route detail explicitly in one click when user clicks X
  const handleCloseDetail = useCallback(() => {
    isClosingRef.current = true;
    clearSelectedRoute();
    selectStop(null);
    navigate("/mapa", { replace: true });
    // Reset flag after navigation completes
    setTimeout(() => {
      isClosingRef.current = false;
    }, 100);
  }, [clearSelectedRoute, selectStop, navigate]);

  const handleClearStop = useCallback(() => {
    selectStop(null);
  }, [selectStop]);

  // ── Destination picker flow (pin mode → confirm → ranked nearby results) ──
  const [isPinMode, setIsPinMode] = useState(false);
  const [destinationPin, setDestinationPin] = useState(null);
  const [destinationLabel, setDestinationLabel] = useState("");
  const [destinationRadius, setDestinationRadius] = useState(
    DESTINATION_DEFAULT_RADIUS_M,
  );
  const [destinationRanked, setDestinationRanked] = useState([]);
  const [destinationLoading, setDestinationLoading] = useState(false);
  const [destinationError, setDestinationError] = useState(null);
  const [showingDestinationResults, setShowingDestinationResults] =
    useState(false);

  const destinationActive = isPinMode || showingDestinationResults;

  // Label sources: stops visible in the loaded catalog / nearby stops only,
  // else raw coordinates. NEVER userAddress (GPS address of the user, not of
  // the picked point) and NEVER an invented address. Wording is "Cerca de X".
  const resolveDestinationLabel = useCallback(
    (point) => {
      if (point == null || point.lat == null || point.lng == null) return "";
      let bestStop = null;
      let bestMeters = Infinity;
      const consider = (stop) => {
        if (stop?.latitude == null || stop?.longitude == null) return;
        const meters =
          calculateDistanceKm(
            point.lat,
            point.lng,
            stop.latitude,
            stop.longitude,
          ) * 1000;
        if (meters < bestMeters) {
          bestMeters = meters;
          bestStop = stop;
        }
      };
      for (const route of [...(routes || []), ...(filteredRoutes || [])]) {
        const stops =
          route?.keyStops?.length > 0 ? route.keyStops : route?.stops || [];
        for (const stop of stops) consider(stop);
      }
      for (const stop of nearbyStops || []) consider(stop);
      if (bestStop?.name && bestMeters <= destinationRadius) {
        return `Cerca de ${bestStop.name}`;
      }
      return `${Number(point.lat).toFixed(5)}, ${Number(point.lng).toFixed(5)}`;
    },
    [routes, filteredRoutes, nearbyStops, destinationRadius],
  );

  // Enter pin mode: clear selection WITHOUT navigating (caller is /mapa),
  // seed the pin from the map center, else GPS, else null (first tap sets it).
  const handleEnterDestinationMode = useCallback(() => {
    clearSelectedRoute();
    selectStop(null);
    let initialPin = null;
    try {
      const center = mapInstance?.getCenter?.();
      if (center != null && center.lat != null && center.lng != null) {
        initialPin = { lat: center.lat, lng: center.lng };
      }
    } catch {
      initialPin = null;
    }
    if (
      !initialPin &&
      userLocation?.lat != null &&
      userLocation?.lng != null
    ) {
      initialPin = { lat: userLocation.lat, lng: userLocation.lng };
    }
    setDestinationPin(initialPin);
    setDestinationLabel(initialPin ? resolveDestinationLabel(initialPin) : "");
    setDestinationRadius(DESTINATION_DEFAULT_RADIUS_M);
    setDestinationRanked([]);
    setDestinationError(null);
    setDestinationLoading(false);
    setShowingDestinationResults(false);
    setIsPinMode(true);
  }, [
    clearSelectedRoute,
    selectStop,
    mapInstance,
    userLocation,
    resolveDestinationLabel,
  ]);

  // Pin moves (map tap or marker drag) → update point + re-resolve label.
  const handlePinMove = useCallback(
    (point) => {
      if (point == null || point.lat == null || point.lng == null) return;
      const next = { lat: point.lat, lng: point.lng };
      setDestinationPin(next);
      setDestinationLabel(resolveDestinationLabel(next));
    },
    [resolveDestinationLabel],
  );

  const runDestinationSearch = useCallback(async (point, radiusMeters) => {
    if (point == null || point.lat == null || point.lng == null) return;
    const radius = clampRadiusMeters(
      radiusMeters ?? DESTINATION_DEFAULT_RADIUS_M,
    );
    setDestinationRadius(radius);
    setDestinationLoading(true);
    setDestinationError(null);
    try {
      const results = await routeService.getNearbyRoutes(
        point.lat,
        point.lng,
        radius,
      );
      setDestinationRanked(
        sortRoutesByDistance(results, point.lat, point.lng),
      );
    } catch {
      setDestinationRanked([]);
      setDestinationError(
        "No se pudieron cargar las rutas cerca del punto. Revisa tu conexión e inténtalo de nuevo.",
      );
    } finally {
      setDestinationLoading(false);
    }
  }, []);

  // Confirm → leave pin mode, show results, run nearby around the picked point.
  const handleConfirmDestination = useCallback(() => {
    if (!destinationPin) return;
    setIsPinMode(false);
    setShowingDestinationResults(true);
    runDestinationSearch(destinationPin, destinationRadius);
  }, [destinationPin, destinationRadius, runDestinationSearch]);

  // Radius preset → re-run around the SAME point, no re-picking.
  const handleDestinationRadiusChange = useCallback(
    (preset) => {
      runDestinationSearch(destinationPin, preset);
    },
    [destinationPin, runDestinationSearch],
  );

  const handleRetryDestinationSearch = useCallback(() => {
    runDestinationSearch(destinationPin, destinationRadius);
  }, [destinationPin, destinationRadius, runDestinationSearch]);

  // Back to pin mode keeping the picked point.
  const handleMovePinBack = useCallback(() => {
    setShowingDestinationResults(false);
    setIsPinMode(true);
  }, []);

  // Exit the destination flow entirely: no pin, no sheet, no results.
  const handleCloseDestination = useCallback(() => {
    setIsPinMode(false);
    setShowingDestinationResults(false);
    setDestinationPin(null);
    setDestinationLabel("");
    setDestinationRanked([]);
    setDestinationError(null);
    setDestinationLoading(false);
    setDestinationRadius(DESTINATION_DEFAULT_RADIUS_M);
  }, []);

  // Result selection: route ONLY (no stop pre-selection), same journey as search.
  const handleSelectDestinationRoute = useCallback(
    (route) => {
      handleCloseDestination();
      handleSelectRoute(route, null);
    },
    [handleCloseDestination, handleSelectRoute],
  );

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
          pinMode={isPinMode}
          destinationPin={destinationPin}
          onPinMove={handlePinMove}
        />
      </div>

      {/* ── Top Floating Container (Search & Header States) ─────────────────── */}
      <MapTopHeader
        selectedRoute={selectedRoute}
        selectedStop={selectedStop}
        isRouteLoading={isRouteLoading}
        onCloseDetail={handleCloseDetail}
        onClearStop={handleClearStop}
        onPickDestination={
          selectedRoute == null && !destinationActive
            ? handleEnterDestinationMode
            : null
        }
        destinationActive={destinationActive}
        onCloseDestination={handleCloseDestination}
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
        {isPinMode ? (
          <DestinationPinSheet
            label={
              destinationPin
                ? destinationLabel
                : "Toca el mapa para elegir el punto"
            }
            resolvingLabel={false}
            onCancel={handleCloseDestination}
            onConfirm={handleConfirmDestination}
          />
        ) : showingDestinationResults ? (
          <DestinationResults
            label={destinationLabel}
            radiusMeters={destinationRadius}
            loading={destinationLoading}
            error={destinationError}
            ranked={destinationRanked}
            onSelectRoute={handleSelectDestinationRoute}
            onRadiusChange={handleDestinationRadiusChange}
            onMovePin={handleMovePinBack}
            onClose={handleCloseDestination}
            onRetry={handleRetryDestinationSearch}
          />
        ) : selectedRoute ? (
          <div className="pointer-events-auto mb-16 lg:mb-4">
            <RouteDrawer />
          </div>
        ) : selectedStop ? (
          <StopDetailDrawer stop={selectedStop} onClose={handleClearStop} />
        ) : (
          <RouteCarousel
            routes={filteredRoutes}
            selectedRoute={selectedRoute}
            onSelectRoute={handleSelectRoute}
            onlyNearby={onlyNearby}
            loading={loading}
            loadingFiltered={loadingFiltered}
            error={error}
            onRetry={() => loadData(currentCity?.id)}
            carouselRef={carouselRef}
            onScroll={handleScrollCarousel}
          />
        )}
      </div>
    </div>
  );
}
