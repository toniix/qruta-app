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
import { isAbortError } from "../utils/abortUtils";
import { useRouteSearchReset } from "./RouteSearchContext";

// eslint-disable-next-line react-refresh/only-export-components
export const RouteSelectionContext = createContext(null);

export function RouteSelectionProvider({ children }) {
  const resetSearchState = useRouteSearchReset();

  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [focusedStop, setFocusedStop] = useState(null);
  const [activeDirection, setActiveDirection] = useState("IDA");
  const [loadingRouteDetail, setLoadingRouteDetail] = useState(false);

  const detailControllerRef = useRef(null);

  useEffect(() => {
    return () => {
      detailControllerRef.current?.abort();
    };
  }, []);

  const selectRoute = useCallback(async (routeOrId, preserveStop = false) => {
    if (!routeOrId) return;

    detailControllerRef.current?.abort();
    detailControllerRef.current = null;

    const identifier =
      typeof routeOrId === "object"
        ? routeOrId.code || routeOrId.id
        : routeOrId;
    const isUUID =
      typeof identifier === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        identifier,
      );
    const initialRoute =
      typeof routeOrId === "object"
        ? routeOrId
        : isUUID
        ? { id: identifier, code: identifier }
        : { code: identifier };

    const hasDirections =
      Array.isArray(initialRoute.directions) &&
      initialRoute.directions.length > 0;

    const matchesRoute = (r, target) => {
      if (!r || !target) return false;
      const targetStr = String(target).toLowerCase();
      return (
        String(r.id || "").toLowerCase() === targetStr ||
        String(r.code || "").toLowerCase() === targetStr
      );
    };

    setSelectedRoute((current) => {
      if (
        current &&
        matchesRoute(current, identifier) &&
        current.directions?.length > 0
      ) {
        return current;
      }
      return initialRoute;
    });

    if (!preserveStop) {
      setSelectedStop(null);
      setFocusedStop(null);
    }
    setActiveDirection("IDA");

    if (hasDirections || !identifier) {
      setLoadingRouteDetail(false);
      return;
    }

    const controller = new AbortController();
    detailControllerRef.current = controller;

    setLoadingRouteDetail(true);
    try {
      const detail = await routeService.getRouteDetail(identifier, {
        signal: controller.signal,
      });
      if (
        detailControllerRef.current !== controller ||
        controller.signal.aborted
      ) {
        return;
      }
      setSelectedRoute((current) => {
        if (current && matchesRoute(current, identifier)) {
          return detail;
        }
        return current;
      });
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) return;
      console.error("Error al cargar detalle de ruta:", err);
    } finally {
      if (
        detailControllerRef.current === controller &&
        !controller.signal.aborted
      ) {
        setLoadingRouteDetail(false);
      }
    }
  }, []);

  const selectStop = useCallback((stop) => {
    setSelectedStop(stop);
    if (stop) {
      setFocusedStop(null);
    }
  }, []);

  const focusStop = useCallback((stop) => {
    setFocusedStop(stop);
  }, []);

  const clearSelection = useCallback(() => {
    detailControllerRef.current?.abort();
    detailControllerRef.current = null;
    setSelectedRoute(null);
    setSelectedStop(null);
    setFocusedStop(null);
    setActiveDirection("IDA");
    resetSearchState();
    setLoadingRouteDetail(false);
  }, [resetSearchState]);

  const clearSelectedRoute = useCallback(() => {
    detailControllerRef.current?.abort();
    detailControllerRef.current = null;
    setSelectedRoute(null);
    setFocusedStop(null);
    setActiveDirection("IDA");
    setLoadingRouteDetail(false);
  }, []);

  const selectionValue = useMemo(
    () => ({
      selectedRoute,
      selectedStop,
      focusedStop,
      activeDirection,
      setActiveDirection,
      loadingRouteDetail,
      selectRoute,
      selectStop,
      focusStop,
      setFocusedStop,
      clearSelection,
      clearSelectedRoute,
    }),
    [
      selectedRoute,
      selectedStop,
      focusedStop,
      activeDirection,
      loadingRouteDetail,
      selectRoute,
      selectStop,
      focusStop,
      clearSelection,
      clearSelectedRoute,
    ],
  );

  return (
    <RouteSelectionContext.Provider value={selectionValue}>
      {children}
    </RouteSelectionContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRouteSelection() {
  const context = useContext(RouteSelectionContext);
  if (!context) {
    throw new Error(
      "useRouteSelection debe ser usado dentro de un RouteProvider",
    );
  }
  return context;
}
