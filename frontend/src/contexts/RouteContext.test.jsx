import { describe, it, expect, vi } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import { RouteProvider, useRoutes } from "./RouteContext";
import { cityService } from "../services/cityService";

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
