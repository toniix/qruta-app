import { useContext, useMemo } from "react";

import {
  RouteGpsContext,
  RouteGpsProvider,
  useRouteGps,
} from "./RouteGpsContext";
import {
  RouteCatalogContext,
  RouteCatalogProvider,
  useRouteCatalog,
} from "./RouteCatalogContext";
import {
  RouteSearchContext,
  RouteSearchProvider,
  useRouteSearch,
} from "./RouteSearchContext";
import {
  RouteSelectionContext,
  RouteSelectionProvider,
  useRouteSelection,
} from "./RouteSelectionContext";

export function RouteProvider({ children }) {
  return (
    <RouteGpsProvider>
      <RouteCatalogProvider>
        <RouteSearchProvider>
          <RouteSelectionProvider>{children}</RouteSelectionProvider>
        </RouteSearchProvider>
      </RouteCatalogProvider>
    </RouteGpsProvider>
  );
}

export {
  RouteGpsProvider,
  RouteCatalogProvider,
  RouteSearchProvider,
  RouteSelectionProvider,
};

// eslint-disable-next-line react-refresh/only-export-components
export { useRouteGps, useRouteCatalog, useRouteSearch, useRouteSelection };

// eslint-disable-next-line react-refresh/only-export-components
export function useRoutes() {
  const catalog = useContext(RouteCatalogContext);
  const search = useContext(RouteSearchContext);
  const selection = useContext(RouteSelectionContext);
  const gps = useContext(RouteGpsContext);

  if (!catalog || !search || !selection || !gps) {
    throw new Error("useRoutes debe ser usado dentro de un RouteProvider");
  }

  return useMemo(
    () => ({
      ...catalog,
      ...search,
      ...selection,
      ...gps,
    }),
    [catalog, search, selection, gps],
  );
}
