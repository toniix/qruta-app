import { describe, it, expect, vi } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import {
  RouteProvider,
  useRoutes,
  useRouteCatalog,
  useRouteSearch,
  useRouteSelection,
  useRouteGps,
} from "./RouteContext";
import { cityService } from "../services/cityService";
import { routeService } from "../services/routeService";

const geoState = vi.hoisted(() => ({
  location: null,
  gpsStatus: "idle",
  gpsReady: false,
  isLocating: false,
  requestLocation: vi.fn(),
  gpsPermissionState: "granted",
  setGpsPermissionState: vi.fn(),
  checkPermissionState: vi.fn(),
}));

vi.mock("../hooks/useGeolocation", () => ({
  useGeolocation: () => geoState,
}));

const reverseGeocode = vi.hoisted(() => vi.fn());

vi.mock("../services/geocodingService", () => ({
  geocodingService: { reverseGeocode },
}));

vi.mock("../services/routeService", () => ({
  routeService: {
    getAllRoutes: vi.fn(async () => []),
    getPopularRoutes: vi.fn(async () => []),
    getRouteDetail: vi.fn(async () => null),
    getNearbyRoutes: vi.fn(async () => []),
    findNearestRouteAndStop: vi.fn(() => null),
  },
}));

vi.mock("../services/stopService", () => ({
  stopService: { getNearbyStops: vi.fn(async () => []) },
}));

vi.mock("../services/cityService", () => ({
  cityService: { getAllCities: vi.fn(async () => []) },
}));

const COORDS_A = { lat: -14.06, lng: -75.72, accuracy: 12 };
// >80m away from A so the geocode effect re-fires instead of jitter-skipping.
const COORDS_B = { lat: -14.07, lng: -75.73, accuracy: 10 };

function setGeo({ location, gpsStatus }) {
  geoState.location = location;
  geoState.gpsStatus = gpsStatus;
  geoState.gpsReady = gpsStatus === "ready";
  geoState.isLocating = gpsStatus === "locating";
}

describe("RouteContext addressStatus GPS re-request regression", () => {
  it("never exposes stale 'ready' addressStatus while userAddress is null", async () => {
    const history = [];
    function Probe() {
      // triggerGpsRequest/requestLocation read here to mirror the
      // Header re-trigger consumer of this context value.
      const { addressStatus, userAddress, triggerGpsRequest, requestLocation } =
        useRoutes();
      history.push({ addressStatus, userAddress });
      void triggerGpsRequest;
      void requestLocation;
      return null;
    }

    // Phase 1 — first GPS success resolves address A (raw status 'ready').
    reverseGeocode.mockResolvedValueOnce("Address A");
    setGeo({ location: COORDS_A, gpsStatus: "ready" });
    const { rerender } = render(
      <RouteProvider>
        <Probe />
      </RouteProvider>,
    );

    await waitFor(() => {
      const latest = history[history.length - 1];
      expect(latest).toMatchObject({
        addressStatus: "ready",
        userAddress: "Address A",
      });
    });

    // Phase 2 — Header re-trigger: requestLocation flips gpsStatus to
    // 'locating' (gpsReady true -> false); the geocode effect early-returns.
    setGeo({ location: COORDS_A, gpsStatus: "locating" });
    rerender(
      <RouteProvider>
        <Probe />
      </RouteProvider>,
    );

    // Phase 3 — GPS success with fresh coords, but the second reverse
    // geocode is still in flight so userAddress stays null on that commit.
    // This is the one-frame window where stale raw='ready' used to leak
    // through the gpsReady ? raw : 'idle' derivation as addressStatus='ready'.
    reverseGeocode.mockReturnValueOnce(new Promise(() => {}));
    const reRequestMark = history.length;
    await act(async () => {
      setGeo({ location: COORDS_B, gpsStatus: "ready" });
      rerender(
        <RouteProvider>
          <Probe />
        </RouteProvider>,
      );
    });

    const staleFrames = history
      .slice(reRequestMark)
      .filter(
        (frame) =>
          frame.addressStatus === "ready" && frame.userAddress == null,
      );
    expect(staleFrames).toEqual([]);
  });
});

describe("RouteContext city caching and waterfall optimization", () => {
  const MOCK_CITY = {
    id: "city-ica-123",
    name: "Ica",
    latitude: -14.0678,
    longitude: -75.7286,
    radiusKm: 30,
  };

  it("boots with cached city synchronously on render 0", () => {
    localStorage.setItem(
      "rutasya_cities_cache",
      JSON.stringify({ timestamp: Date.now(), cities: [MOCK_CITY] }),
    );
    localStorage.setItem("rutasya_selected_city_id", "city-ica-123");

    let firstFrameCity = "unrendered";
    function Probe() {
      const { currentCity } = useRoutes();
      if (firstFrameCity === "unrendered") {
        firstFrameCity = currentCity;
      }
      return null;
    }

    render(
      <RouteProvider>
        <Probe />
      </RouteProvider>,
    );

    expect(firstFrameCity).toMatchObject({ id: "city-ica-123", name: "Ica" });
  });

  it("updates localStorage cache when cityService.getAllCities resolves", async () => {
    localStorage.clear();
    const freshCities = [
      { id: "city-lima-1", name: "Lima", latitude: -12.04, longitude: -77.04 },
      { id: "city-ica-2", name: "Ica", latitude: -14.06, longitude: -75.72 },
    ];
    cityService.getAllCities.mockResolvedValueOnce(freshCities);

    render(
      <RouteProvider>
        <div />
      </RouteProvider>,
    );

    await waitFor(() => {
      const raw = localStorage.getItem("rutasya_cities_cache");
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw);
      expect(parsed.cities).toHaveLength(2);
      expect(parsed.cities[0].name).toBe("Lima");
    });
  });

  it("terminates loading state when database is empty (no cities and no routes)", async () => {
    localStorage.clear();
    cityService.getAllCities.mockResolvedValueOnce([]);

    let latestContext = null;
    function Probe() {
      latestContext = useRoutes();
      return null;
    }

    render(
      <RouteProvider>
        <Probe />
      </RouteProvider>,
    );

    // Initial boot state is loading: true
    expect(latestContext.loading).toBe(true);

    // Once empty cities catalog resolves, loading must transition to false
    await waitFor(() => {
      expect(latestContext.loading).toBe(false);
      expect(latestContext.loadingPopular).toBe(false);
      expect(latestContext.routes).toEqual([]);
      expect(latestContext.currentCity).toBeNull();
    });
  });

  it("terminates loading state when cityService.getAllCities fails", async () => {
    localStorage.clear();
    cityService.getAllCities.mockRejectedValueOnce(new Error("Network Error"));

    let latestContext = null;
    function Probe() {
      latestContext = useRoutes();
      return null;
    }

    render(
      <RouteProvider>
        <Probe />
      </RouteProvider>,
    );

    await waitFor(() => {
      expect(latestContext.loading).toBe(false);
      expect(latestContext.loadingPopular).toBe(false);
    });
  });
});

describe("RouteContext GPS modal & onlyNearby flow", () => {
  it("does not automatically trigger showGpsModal on mount even if permission is prompt", async () => {
    sessionStorage.clear();
    geoState.gpsPermissionState = "prompt";
    geoState.gpsReady = false;

    let latestContext = null;
    function Probe() {
      latestContext = useRoutes();
      return null;
    }

    render(
      <RouteProvider>
        <Probe />
      </RouteProvider>,
    );

    // Initial state
    expect(latestContext.showGpsModal).toBe(false);

    // Wait past the old 1200ms timer
    await new Promise((resolve) => setTimeout(resolve, 1300));
    expect(latestContext.showGpsModal).toBe(false);
  });

  it("locateNearestRoute does not set onlyNearby to true if GPS request fails or is dismissed", async () => {
    geoState.gpsReady = false;
    geoState.location = null;
    geoState.requestLocation.mockRejectedValueOnce(new Error("User dismissed"));

    let latestContext = null;
    function Probe() {
      latestContext = useRoutes();
      return null;
    }

    render(
      <RouteProvider>
        <Probe />
      </RouteProvider>,
    );

    expect(latestContext.onlyNearby).toBe(false);

    await act(async () => {
      await latestContext.locateNearestRoute();
    });

    expect(latestContext.onlyNearby).toBe(false);
  });

  it("locateNearestRoute sets onlyNearby to true when GPS is successfully acquired", async () => {
    geoState.gpsReady = false;
    geoState.location = null;
    geoState.requestLocation.mockImplementationOnce(async () => {
      setGeo({ location: COORDS_A, gpsStatus: "ready" });
      return COORDS_A;
    });

    let latestContext = null;
    function Probe() {
      latestContext = useRoutes();
      return null;
    }

    render(
      <RouteProvider>
        <Probe />
      </RouteProvider>,
    );

    expect(latestContext.onlyNearby).toBe(false);

    await act(async () => {
      await latestContext.locateNearestRoute();
    });

    await waitFor(() => {
      expect(latestContext.onlyNearby).toBe(true);
    });
  });

  it("reverts onlyNearby to false if gpsReady flips back to false", async () => {
    setGeo({ location: COORDS_A, gpsStatus: "ready" });

    let latestContext = null;
    function Probe() {
      latestContext = useRoutes();
      return null;
    }

    const { rerender } = render(
      <RouteProvider>
        <Probe />
      </RouteProvider>,
    );

    await act(async () => {
      await latestContext.locateNearestRoute();
    });
    expect(latestContext.onlyNearby).toBe(true);

    // Simulate GPS lost or disabled
    await act(async () => {
      setGeo({ location: null, gpsStatus: "idle" });
      rerender(
        <RouteProvider>
          <Probe />
        </RouteProvider>,
      );
    });

    await waitFor(() => {
      expect(latestContext.onlyNearby).toBe(false);
    });
  });
});

describe("RouteContext slice render isolation", () => {
  it("does not re-render catalog or GPS consumers when searchQuery or selection changes", async () => {
    let catalogRenders = 0;
    let gpsRenders = 0;
    let latestSearch = null;
    let latestSelection = null;

    function CatalogConsumer() {
      useRouteCatalog();
      catalogRenders += 1;
      return null;
    }

    function GpsConsumer() {
      useRouteGps();
      gpsRenders += 1;
      return null;
    }

    function SearchConsumer() {
      latestSearch = useRouteSearch();
      return null;
    }

    function SelectionConsumer() {
      latestSelection = useRouteSelection();
      return null;
    }

    render(
      <RouteProvider>
        <CatalogConsumer />
        <GpsConsumer />
        <SearchConsumer />
        <SelectionConsumer />
      </RouteProvider>,
    );

    await waitFor(() => {
      expect(latestSearch).not.toBeNull();
      expect(latestSelection).not.toBeNull();
    });

    const catalogBefore = catalogRenders;
    const gpsBefore = gpsRenders;

    act(() => {
      latestSearch.setSearchQuery("Bolognesi");
      latestSelection.setActiveDirection("VUELTA");
    });

    expect(latestSearch.searchQuery).toBe("Bolognesi");
    expect(latestSelection.activeDirection).toBe("VUELTA");
    expect(catalogRenders).toBe(catalogBefore);
    expect(gpsRenders).toBe(gpsBefore);
  });
});

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("RouteContext AbortController cancellation & cross-slice reset", () => {
  it("aborts previous selectRoute request and never lets a slower response overwrite the latest selection or loading state", async () => {
    const calls = new Map();
    routeService.getRouteDetail.mockImplementation((identifier, options) => {
      const deferred = createDeferred();
      calls.set(identifier, { deferred, signal: options?.signal });
      return deferred.promise;
    });

    let latestSelection = null;
    function Probe() {
      latestSelection = useRouteSelection();
      return null;
    }

    render(
      <RouteProvider>
        <Probe />
      </RouteProvider>,
    );

    await waitFor(() => {
      expect(latestSelection).not.toBeNull();
    });

    // Start slow request for route-a
    let selectAPromise;
    act(() => {
      selectAPromise = latestSelection.selectRoute("route-a");
    });

    expect(calls.has("route-a")).toBe(true);
    expect(calls.get("route-a").signal?.aborted).toBe(false);
    expect(latestSelection.loadingRouteDetail).toBe(true);

    // Immediately switch to route-b (fast)
    let selectBPromise;
    act(() => {
      selectBPromise = latestSelection.selectRoute("route-b");
    });

    expect(calls.has("route-b")).toBe(true);
    expect(calls.get("route-a").signal?.aborted).toBe(true);
    expect(calls.get("route-b").signal?.aborted).toBe(false);
    expect(latestSelection.loadingRouteDetail).toBe(true);

    // Even if route-a's aborted promise settles first, loadingRouteDetail must stay true
    const abortErr = new DOMException("Aborted", "AbortError");
    await act(async () => {
      calls.get("route-a").deferred.reject(abortErr);
      await selectAPromise;
    });

    expect(latestSelection.loadingRouteDetail).toBe(true);
    expect(latestSelection.selectedRoute?.code).toBe("route-b");

    // Resolve route-b with full detail
    const detailB = {
      id: "id-route-b",
      code: "route-b",
      name: "Ruta B",
      directions: [{ type: "IDA", stops: [] }],
    };
    await act(async () => {
      calls.get("route-b").deferred.resolve(detailB);
      await selectBPromise;
    });

    expect(latestSelection.loadingRouteDetail).toBe(false);
    expect(latestSelection.selectedRoute).toEqual(detailB);

    // Also verify a stale resolution arriving AFTER route-b never overwrites route-b
    calls.clear();
    let selectCPromise;
    let selectDPromise;
    act(() => {
      selectCPromise = latestSelection.selectRoute("route-c");
    });
    act(() => {
      selectDPromise = latestSelection.selectRoute("route-d");
    });
    expect(calls.get("route-c").signal?.aborted).toBe(true);

    const detailD = {
      id: "id-route-d",
      code: "route-d",
      name: "Ruta D",
      directions: [{ type: "IDA", stops: [] }],
    };
    const staleDetailC = {
      id: "id-route-c",
      code: "route-c",
      name: "Ruta C (stale)",
      directions: [{ type: "IDA", stops: [] }],
    };

    await act(async () => {
      calls.get("route-d").deferred.resolve(detailD);
      await selectDPromise;
    });
    await act(async () => {
      calls.get("route-c").deferred.resolve(staleDetailC);
      await selectCPromise;
    });

    expect(latestSelection.selectedRoute).toEqual(detailD);
    expect(latestSelection.loadingRouteDetail).toBe(false);

    routeService.getRouteDetail.mockReset();
    routeService.getRouteDetail.mockImplementation(async () => null);
  });

  it("clearSelection resets both selection state and search state", async () => {
    setGeo({ location: COORDS_A, gpsStatus: "ready" });

    const mockRoute = {
      id: "route-1",
      code: "R1",
      name: "Ruta 1",
      directions: [{ type: "IDA", stops: [] }],
    };
    const mockStop = { id: "stop-1", name: "Paradero Central" };
    const mockMatch = { route: mockRoute, stop: mockStop, distanceKm: 0.2 };

    routeService.getNearbyRoutes.mockResolvedValueOnce([mockRoute]);
    routeService.findNearestRouteAndStop.mockReturnValueOnce(mockMatch);

    let latestContext = null;
    function Probe() {
      latestContext = useRoutes();
      return null;
    }

    render(
      <RouteProvider>
        <Probe />
      </RouteProvider>,
    );

    await waitFor(() => {
      expect(latestContext).not.toBeNull();
    });

    await act(async () => {
      await latestContext.selectRoute(mockRoute);
      latestContext.selectStop(mockStop);
      latestContext.setActiveDirection("VUELTA");
      latestContext.setSearchedLocation({ lat: -14.06, lng: -75.72, name: "Plaza" });
      await latestContext.locateNearestRoute();
    });

    await waitFor(() => {
      expect(latestContext.selectedRoute).toEqual(mockRoute);
      expect(latestContext.selectedStop).toEqual(mockStop);
      expect(latestContext.activeDirection).toBe("VUELTA");
      expect(latestContext.onlyNearby).toBe(true);
      expect(latestContext.searchedLocation).toEqual({
        lat: -14.06,
        lng: -75.72,
        name: "Plaza",
      });
      expect(latestContext.nearestMatchInfo).toEqual(mockMatch);
    });

    act(() => {
      latestContext.clearSelection();
    });

    expect(latestContext.selectedRoute).toBeNull();
    expect(latestContext.selectedStop).toBeNull();
    expect(latestContext.activeDirection).toBe("IDA");
    expect(latestContext.onlyNearby).toBe(false);
    expect(latestContext.searchedLocation).toBeNull();
    expect(latestContext.nearestMatchInfo).toBeNull();
  });

  it("aborts in-flight getAllRoutes request when switching city via setCity and commits only the latest city routes", async () => {
    localStorage.clear();
    const cityA = {
      id: "city-a",
      name: "Ica",
      latitude: -14.0678,
      longitude: -75.7286,
      radiusKm: 30,
    };
    const cityB = {
      id: "city-b",
      name: "Lima",
      latitude: -12.0464,
      longitude: -77.0428,
      radiusKm: 40,
    };
    cityService.getAllCities.mockResolvedValueOnce([cityA, cityB]);

    const routeCalls = new Map();
    routeService.getAllRoutes.mockImplementation((cityId, options) => {
      const deferred = createDeferred();
      routeCalls.set(cityId, { deferred, signal: options?.signal });
      return deferred.promise;
    });
    routeService.getPopularRoutes.mockImplementation(async () => []);

    let latestCatalog = null;
    function Probe() {
      latestCatalog = useRouteCatalog();
      return null;
    }

    render(
      <RouteProvider>
        <Probe />
      </RouteProvider>,
    );

    // Wait for initial city A load to start
    await waitFor(() => {
      expect(routeCalls.has("city-a")).toBe(true);
    });
    expect(routeCalls.get("city-a").signal?.aborted).toBe(false);

    // Switch to city B while city A's routes request is still in-flight
    act(() => {
      latestCatalog.setCity(cityB);
    });

    await waitFor(() => {
      expect(routeCalls.has("city-b")).toBe(true);
    });
    expect(routeCalls.get("city-a").signal?.aborted).toBe(true);
    expect(routeCalls.get("city-b").signal?.aborted).toBe(false);

    const routesA = [{ id: "r-a", code: "A1", name: "Ruta A1" }];
    const routesB = [{ id: "r-b", code: "B1", name: "Ruta B1" }];

    // Resolve city B first, then resolve stale city A
    await act(async () => {
      routeCalls.get("city-b").deferred.resolve(routesB);
    });

    await waitFor(() => {
      expect(latestCatalog.loading).toBe(false);
      expect(latestCatalog.routes).toEqual(routesB);
    });

    await act(async () => {
      routeCalls.get("city-a").deferred.resolve(routesA);
    });

    // Latest city routes must remain intact
    expect(latestCatalog.routes).toEqual(routesB);
    expect(latestCatalog.currentCity?.id).toBe("city-b");

    routeService.getAllRoutes.mockReset();
    routeService.getAllRoutes.mockImplementation(async () => []);
    routeService.getPopularRoutes.mockReset();
    routeService.getPopularRoutes.mockImplementation(async () => []);
  });
});
