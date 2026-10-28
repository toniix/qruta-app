import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './HomePage';

// Mutable context state read by the mocked useRoutes. vi.hoisted keeps the
// holder available to the hoisted vi.mock factory without a TDZ crash.
const routeState = vi.hoisted(() => ({ current: {} }));

vi.mock('../../contexts/RouteContext', () => ({
  useRoutes: () => routeState.current,
}));

vi.mock('../../hooks/useFavorites', () => ({
  useFavorites: () => ({ favorites: [] }),
}));

const BASE_STATE = {
  routes: [],
  triggerGpsRequest: vi.fn(),
  isLocating: false,
  gpsReady: false,
  selectRoute: vi.fn(),
  nearbyStops: [],
  loadingStops: false,
  stopsError: null,
  loadNearbyStops: vi.fn(),
  displayedPopularRoutes: [],
  loadingPopular: false,
  userAddress: null,
  cities: [],
  currentCity: { id: 'ica', name: 'Ica' },
  outsideCoverage: false,
  setCity: vi.fn(),
  resetToGpsDetection: vi.fn(),
  addressStatus: 'idle',
};

function renderHome(overrides = {}) {
  routeState.current = { ...BASE_STATE, ...overrides };
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

describe('HomePage location pill', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the locating spinner while GPS is ready but the address is still resolving', () => {
    renderHome({
      gpsReady: true,
      isLocating: false,
      addressStatus: 'loading',
      userAddress: null,
    });

    expect(screen.getByText(/Detectando tu ubicación/)).toBeInTheDocument();
    expect(screen.queryByText(/Sin ubicación activa/)).toBeNull();
  });

  it('shows "Sin ubicación activa" when GPS is idle', () => {
    renderHome({
      gpsReady: false,
      isLocating: false,
      addressStatus: 'idle',
      userAddress: null,
    });

    expect(screen.getByText(/Sin ubicación activa/)).toBeInTheDocument();
  });

  it('shows the resolved address once it is available', () => {
    renderHome({
      gpsReady: true,
      isLocating: false,
      addressStatus: 'ready',
      userAddress: { formattedAddress: 'Av. Test 123' },
    });

    expect(screen.getByText('Av. Test 123')).toBeInTheDocument();
    expect(screen.queryByText(/Sin ubicación activa/)).toBeNull();
  });

  it('triggers setShowGpsModal after polite delay when permission is prompt and not dismissed', async () => {
    sessionStorage.clear();
    const setShowGpsModal = vi.fn();
    renderHome({
      gpsPermissionState: 'prompt',
      setShowGpsModal,
    });

    expect(setShowGpsModal).not.toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 1300));
    expect(setShowGpsModal).toHaveBeenCalledWith(true);
  });
});
