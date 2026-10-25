import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useRoutes } from "../../contexts/RouteContext";
import { routeService } from "../../services/routeService";
import { geocodingService, streetLine } from "../../services/geocodingService";
import { calculateDistanceKm } from "../../utils/geoUtils";
import {
  DESTINATION_DEFAULT_RADIUS_M,
  clampRadiusMeters,
  sortRoutesByDistance,
  sortRoutesByOriginDestination,
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
  const location = useLocation();

  const fromOrigin = location.state?.from;
  const fromStop = location.state?.fromStop;

  // Route Context states & actions
  const {
    routes,
    filteredRoutes,
    loadingFiltered,
    selectedRoute,
    selectedStop,
    focusedStop,
    searchedLocation,
    userLocation,
    onlyNearby,
    loading,
    error,
    activeDirection,
    selectRoute,
    selectStop,
    focusStop,
    clearSelectedRoute,
    triggerGpsRequest,
    isLocating,
    gpsReady,
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

  const handleBack = useCallback(() => {
    // If viewing a route and we navigated to it from a stop on the map: unwind back to that stop
    if (selectedRoute && fromStop) {
      isClosingRef.current = true;
      clearSelectedRoute();
      selectStop(fromStop);
      navigate("/mapa", {
        replace: true,
        state: fromOrigin ? { from: fromOrigin } : null,
      });
      setTimeout(() => {
        isClosingRef.current = false;
      }, 100);
      return;
    }

    if (fromOrigin) {
      isClosingRef.current = true;
      clearSelectedRoute();
      selectStop(null);
      navigate(fromOrigin);
      setTimeout(() => {
        isClosingRef.current = false;
      }, 100);
    }
  }, [selectedRoute, fromStop, fromOrigin, clearSelectedRoute, selectStop, navigate]);

  // Close route detail explicitly in one click when user clicks X
  const handleCloseDetail = useCallback(() => {
    isClosingRef.current = true;
    clearSelectedRoute();
    selectStop(null);
    navigate("/mapa", { replace: true, state: null });
    // Reset flag after navigation completes
    setTimeout(() => {
      isClosingRef.current = false;
    }, 100);
  }, [clearSelectedRoute, selectStop, navigate]);

  const handleClearStop = useCallback(() => {
    selectStop(null);
    if (!selectedRoute) {
      navigate("/mapa", { replace: true, state: null });
    }
  }, [selectStop, selectedRoute, navigate]);

  // ── Destination picker flow (pin mode → confirm → ranked nearby results) ──
  const [isPinMode, setIsPinMode] = useState(false);
  const [destinationPin, setDestinationPin] = useState(null);
  const [destinationLabel, setDestinationLabel] = useState("");
  const [resolvingLabel, setResolvingLabel] = useState(false);
  const [destinationRadius, setDestinationRadius] = useState(
    DESTINATION_DEFAULT_RADIUS_M,
  );
  const [destinationRanked, setDestinationRanked] = useState([]);
  const [destinationLoading, setDestinationLoading] = useState(false);
  const [destinationError, setDestinationError] = useState(null);
  // Snapshot of whether the last search filtered by the origin too (false
  // when GPS was missing and we fell back to destination-only).
  const [destinationUsedOrigin, setDestinationUsedOrigin] = useState(false);
  const [showingDestinationResults, setShowingDestinationResults] =
    useState(false);

  // While the map moves under the fixed pin (drag or tap-relocate), the
  // sheet and the floating pill hide; the moveend center becomes the pin.
  const [isPinMoving, setIsPinMoving] = useState(false);
  // Sequence guard so a slow older destination search never overwrites a
  // newer one, plus a trailing-debounce timer for move-triggered re-search.
  const destinationSearchSeqRef = useRef(0);
  const destinationLabelSeqRef = useRef(0);
  const destinationResearchTimerRef = useRef(null);
  // Debounce timer for moveend-triggered label resolution (500 ms).
  const pinResolveTimerRef = useRef(null);

  // Clear any pending debounced re-search (unmount or flow transitions).
  useEffect(() => {
    const timerRef = destinationResearchTimerRef;
    const resolveTimerRef = pinResolveTimerRef;
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (resolveTimerRef.current) clearTimeout(resolveTimerRef.current);
    };
  }, []);

  const destinationActive = isPinMode || showingDestinationResults;

  // Label sources: backend reverse-geocode first (a real street only), then
  // stops visible in the loaded catalog / nearby stops, else raw coordinates.
  // NEVER userAddress (GPS address of the user, not of the picked point) and
  // NEVER an invented address. Wording is "Cerca de X".
  const resolveLocalDestinationLabel = useCallback(
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

  // Async label: accept the proxy label only when it carries a real street
  // (number optional); show the short street + number line. Otherwise keep
  // the local stop/coordinates fallback so raw coordinates are never shown
  // while a street or stop reference exists.
  const resolveDestinationLabel = useCallback(
    async (point) => {
      if (point == null || point.lat == null || point.lng == null) return "";
      try {
        const result = await geocodingService.reverseGeocode(
          point.lat,
          point.lng,
        );
        const street = result?.street?.trim?.() ?? "";
        const formatted = result?.formattedAddress?.trim?.() ?? "";
        if (street) return streetLine(result) || formatted || street;
      } catch {
        // Geocoding failure: fall through to the local label below.
      }
      return resolveLocalDestinationLabel(point);
    },
    [resolveLocalDestinationLabel],
  );

  // Sequence-guarded setter so a slow older resolution never overwrites the
  // label of a newer pin. Same discipline as destinationSearchSeqRef.
  const resolveAndSetDestinationLabel = useCallback(
    async (point) => {
      if (point == null || point.lat == null || point.lng == null) {
        setDestinationLabel("");
        setResolvingLabel(false);
        return;
      }
      const seq = destinationLabelSeqRef.current + 1;
      destinationLabelSeqRef.current = seq;
      setResolvingLabel(true);
      try {
        const label = await resolveDestinationLabel(point);
        if (destinationLabelSeqRef.current !== seq) return;
        setDestinationLabel(label);
      } finally {
        if (destinationLabelSeqRef.current === seq) {
          setResolvingLabel(false);
        }
      }
    },
    [resolveDestinationLabel],
  );

  // Enter pin mode: clear selection WITHOUT navigating (caller is /mapa),
  // seed the pin from GPS, else map center, else null (first tap sets it).
  const handleEnterDestinationMode = useCallback(() => {
    clearSelectedRoute();
    selectStop(null);
    let initialPin = null;
    if (
      userLocation?.lat != null &&
      userLocation?.lng != null
    ) {
      initialPin = { lat: userLocation.lat, lng: userLocation.lng };
    }
    if (!initialPin) {
      try {
        const center = mapInstance?.getCenter?.();
        if (center != null && center.lat != null && center.lng != null) {
          initialPin = { lat: center.lat, lng: center.lng };
        }
      } catch {
        initialPin = null;
      }
    }
    setDestinationPin(initialPin);
    if (initialPin) {
      resolveAndSetDestinationLabel(initialPin);
    } else {
      setDestinationLabel("");
    }
    setDestinationRadius(DESTINATION_DEFAULT_RADIUS_M);
    setDestinationRanked([]);
    setDestinationError(null);
    setDestinationLoading(false);
    setDestinationUsedOrigin(false);
    setShowingDestinationResults(false);
    setIsPinMode(true);
    // Strong zoom onto the pin: exploration starts from the user's point.
    // A missing map never blocks the flow.
    if (initialPin) {
      try {
        if (typeof mapInstance?.flyTo === "function") {
          mapInstance.flyTo([initialPin.lat, initialPin.lng], 17, {
            duration: 1.2,
          });
        } else if (typeof mapInstance?.setView === "function") {
          mapInstance.setView([initialPin.lat, initialPin.lng], 17);
        }
      } catch {
        // Map not ready: pin mode still works without the zoom.
      }
    }
  }, [
    clearSelectedRoute,
    selectStop,
    mapInstance,
    userLocation,
    resolveAndSetDestinationLabel,
  ]);

  // Destination search: keep ONLY routes passing near BOTH the user's
  // origin and the picked destination (same radius for both endpoints).
  // Without GPS there is no origin to filter by — fall back to a
  // destination-only search exactly as before, so the flow never dead-ends.
  // A sequence guard drops stale responses: only the latest call may write
  // results, error, or loading state.
  const runDestinationSearch = useCallback(
    async (point, radiusMeters) => {
      if (point == null || point.lat == null || point.lng == null) return;
      const seq = destinationSearchSeqRef.current + 1;
      destinationSearchSeqRef.current = seq;
      const radius = clampRadiusMeters(
        radiusMeters ?? DESTINATION_DEFAULT_RADIUS_M,
      );
      setDestinationRadius(radius);
      setDestinationLoading(true);
      setDestinationError(null);
      const hasOrigin =
        userLocation?.lat != null && userLocation?.lng != null;
      setDestinationUsedOrigin(hasOrigin);
      try {
        if (!hasOrigin) {
          const results = await routeService.getNearbyRoutes(
            point.lat,
            point.lng,
            radius,
          );
          if (destinationSearchSeqRef.current !== seq) return;
          setDestinationRanked(
            sortRoutesByDistance(results, point.lat, point.lng),
          );
          return;
        }
        const [originRoutes, destRoutes] = await Promise.all([
          routeService.getNearbyRoutes(
            userLocation.lat,
            userLocation.lng,
            radius,
          ),
          routeService.getNearbyRoutes(point.lat, point.lng, radius),
        ]);
        if (destinationSearchSeqRef.current !== seq) return;
        const destIds = new Set(
          (destRoutes || []).map((route) => String(route?.id)),
        );
        const both = (originRoutes || []).filter((route) =>
          destIds.has(String(route?.id)),
        );
        setDestinationRanked(
          sortRoutesByOriginDestination(
            both,
            userLocation.lat,
            userLocation.lng,
            point.lat,
            point.lng,
          ),
        );
      } catch {
        if (destinationSearchSeqRef.current !== seq) return;
        setDestinationRanked([]);
        setDestinationError(
          "No se pudieron cargar las rutas cerca del punto. Revisa tu conexión e inténtalo de nuevo.",
        );
      } finally {
        if (destinationSearchSeqRef.current === seq) {
          setDestinationLoading(false);
        }
      }
    },
    [userLocation],
  );

  // Pin moves (results-mode marker drag, or tap-flyTo fallback when the
  // map instance is not ready) → update point + re-resolve label.
  // While results show (no route detail open), marker drags also schedule a
  // debounced re-search around the new point. In pin mode map taps animate
  // the map instead and the ensuing moveend drives resolution (single path).
  const handlePinMove = useCallback(
    (point) => {
      if (point == null || point.lat == null || point.lng == null) return;
      const next = { lat: point.lat, lng: point.lng };
      setDestinationPin(next);
      resolveAndSetDestinationLabel(next);
      if (showingDestinationResults && selectedRoute == null) {
        if (destinationResearchTimerRef.current) {
          clearTimeout(destinationResearchTimerRef.current);
        }
        destinationResearchTimerRef.current = setTimeout(() => {
          runDestinationSearch(next, destinationRadius);
        }, 500);
      }
    },
    [
      resolveAndSetDestinationLabel,
      showingDestinationResults,
      selectedRoute,
      destinationRadius,
      runDestinationSearch,
    ],
  );

  // Fixed-pin movement: the map moves under the pin (drag or tap-relocate).
  // movestart hides the sheet + pill and drops any pending resolution;
  // moveend makes the center the new pin and re-resolves after a 500 ms
  // debounce so a flurry of moves resolves once. A center identical to the
  // current pin (entry zoom, zoom-only change) skips the resolve and just
  // re-shows: the label already matches.
  const handlePinMoveStart = useCallback(() => {
    if (pinResolveTimerRef.current) {
      clearTimeout(pinResolveTimerRef.current);
      pinResolveTimerRef.current = null;
    }
    setIsPinMoving(true);
  }, []);

  const handlePinMoveEnd = useCallback(
    (center) => {
      if (center == null || center.lat == null || center.lng == null) {
        setIsPinMoving(false);
        return;
      }
      const next = { lat: center.lat, lng: center.lng };
      const prev = destinationPin;
      const samePoint =
        prev != null &&
        Math.abs(prev.lat - next.lat) < 1e-7 &&
        Math.abs(prev.lng - next.lng) < 1e-7;
      setDestinationPin(next);
      if (pinResolveTimerRef.current) {
        clearTimeout(pinResolveTimerRef.current);
        pinResolveTimerRef.current = null;
      }
      if (samePoint) {
        setIsPinMoving(false);
        return;
      }
      pinResolveTimerRef.current = setTimeout(() => {
        pinResolveTimerRef.current = null;
        setIsPinMoving(false);
        resolveAndSetDestinationLabel(next);
      }, 500);
    },
    [destinationPin, resolveAndSetDestinationLabel],
  );

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
    if (destinationResearchTimerRef.current) {
      clearTimeout(destinationResearchTimerRef.current);
    }
    if (pinResolveTimerRef.current) {
      clearTimeout(pinResolveTimerRef.current);
      pinResolveTimerRef.current = null;
    }
    setIsPinMoving(false);
    setShowingDestinationResults(false);
    setIsPinMode(true);
  }, []);

  // Exit the destination flow entirely: no pin, no sheet, no results.
  const handleCloseDestination = useCallback(() => {
    if (destinationResearchTimerRef.current) {
      clearTimeout(destinationResearchTimerRef.current);
    }
    if (pinResolveTimerRef.current) {
      clearTimeout(pinResolveTimerRef.current);
      pinResolveTimerRef.current = null;
    }
    setIsPinMoving(false);
    // Invalidate any in-flight label resolution for the discarded pin.
    destinationLabelSeqRef.current += 1;
    setResolvingLabel(false);
    setIsPinMode(false);
    setShowingDestinationResults(false);
    setDestinationPin(null);
    setDestinationLabel("");
    setDestinationRanked([]);
    setDestinationError(null);
    setDestinationLoading(false);
    setDestinationUsedOrigin(false);
    setDestinationRadius(DESTINATION_DEFAULT_RADIUS_M);
  }, []);

  // Result selection: keep the destination context (pin + ranked results)
  // behind the detail — closing the detail returns to the results.
  // Route ONLY (no stop pre-selection), same journey as search.
  const handleSelectDestinationRoute = useCallback(
    (route) => {
      handleSelectRoute(route, null);
    },
    [handleSelectRoute],
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
    if (!gpsReady) {
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

  // Flag stays draggable while results show with no route detail open.
  // Pin mode uses the fixed center overlay instead (the map moves under
  // it), so dragging is results-only. Dedicated boolean — pinMode alone
  // also gates tap-to-relocate and must stay exclusive to pin mode.
  const canDragDestinationPin =
    isPinMode || (showingDestinationResults && selectedRoute == null);

  return (
    <div className="relative w-full h-full flex-1 overflow-hidden bg-slate-100 flex flex-col">
      {/* ── Interactive Leaflet Map Background ────────────────────────────── */}
      <div className="absolute inset-0 z-0 w-full h-full">
        <InteractiveMap
          routes={filteredRoutes}
          selectedRoute={selectedRoute}
          selectedStop={selectedStop}
          focusedStop={focusedStop}
          searchedLocation={searchedLocation}
          userLocation={userLocation}
          gpsReady={gpsReady}
          isLocating={isLocating}
          onSelectRoute={handleSelectRoute}
          onSelectStop={selectStop}
          onFocusStop={focusStop}
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
          onPinMoveStart={handlePinMoveStart}
          onPinMoveEnd={handlePinMoveEnd}
          pinLabel={destinationLabel}
          pinMoving={isPinMoving}
          pinResolving={resolvingLabel}
          canDragDestinationPin={canDragDestinationPin}
        />
      </div>

      {/* ── Top Floating Container (Search & Header States) ─────────────────── */}
      <MapTopHeader
        selectedRoute={selectedRoute}
        selectedStop={selectedStop}
        isRouteLoading={isRouteLoading}
        onCloseDetail={handleCloseDetail}
        onClearStop={handleClearStop}
        onBack={fromOrigin || fromStop ? handleBack : null}
        onPickDestination={
          selectedRoute == null && !destinationActive
            ? handleEnterDestinationMode
            : null
        }
        destinationActive={
          isPinMode || (showingDestinationResults && selectedRoute == null)
        }
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

        {/* Dynamic Bottom Panels.
            Route detail wins over destination results so the preserved
            pin + ranking wait behind; closing the detail reveals them. */}
        {isPinMode ? (
          // While the map moves under the fixed pin the sheet hides with
          // the floating pill; it reappears once the new center resolves.
          !isPinMoving && (
            <DestinationPinSheet
              label={
                destinationPin
                  ? destinationLabel
                  : "Toca el mapa para elegir el punto"
              }
              resolvingLabel={resolvingLabel}
              onCancel={handleCloseDestination}
              onConfirm={handleConfirmDestination}
            />
          )
        ) : selectedRoute ? (
          // Route detail is the base sheet. While a stop inside the route is
          // focused, the stop drawer takes the same slot instead of stacking
          // over it; its back action clears only the stop, re-revealing the
          // identical route detail (all RouteDrawer state lives in the
          // RouteContext, so the unmount/remount is invisible to it).
          <div className="pointer-events-auto mb-16 lg:mb-4">
            {selectedStop ? (
              <StopDetailDrawer
                stop={selectedStop}
                context="route"
              />
            ) : (
              <RouteDrawer />
            )}
          </div>
        ) : showingDestinationResults ? (
          <DestinationResults
            label={destinationLabel}
            radiusMeters={destinationRadius}
            loading={destinationLoading}
            error={destinationError}
            ranked={destinationRanked}
            originApplied={destinationUsedOrigin}
            onSelectRoute={handleSelectDestinationRoute}
            onRadiusChange={handleDestinationRadiusChange}
            onMovePin={handleMovePinBack}
            onClose={handleCloseDestination}
            onRetry={handleRetryDestinationSearch}
          />
        ) : selectedStop ? (
          <StopDetailDrawer stop={selectedStop} />
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
