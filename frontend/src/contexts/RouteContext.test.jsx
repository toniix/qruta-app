import { describe, it, expect, vi } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import { RouteProvider, useRoutes } from "./RouteContext";

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
