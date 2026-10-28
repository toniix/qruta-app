import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomeMapPage } from './HomeMapPage';

const routeState = vi.hoisted(() => ({ current: {} }));

vi.mock('../../contexts/RouteContext', () => ({
  useRoutes: () => routeState.current,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: '12' }),
    useNavigate: () => vi.fn(),
    useLocation: () => ({ state: null, key: 'default' }),
  };
});

vi.mock('../../components/map/InteractiveMap', () => ({
  InteractiveMap: () => <div data-testid="interactive-map" />,
}));
vi.mock('../../components/map/MapTopHeader', () => ({
  MapTopHeader: () => <div data-testid="map-top-header" />,
}));
vi.mock('../../components/map/MapControls', () => ({
  MapControls: ({ onRecenterGPS, gpsReady, isLocating }) => (
    <div data-testid="map-controls">
      <button data-testid="mock-gps-btn" onClick={onRecenterGPS}>
        {gpsReady ? 'GPS Ready' : isLocating ? 'Locating' : 'GPS Off'}
      </button>
    </div>
  ),
}));
vi.mock('../../components/routes/RouteDrawer', () => ({
  RouteDrawer: () => <div data-testid="route-drawer" />,
}));
vi.mock('../../components/routes/RouteCarousel', () => ({
  RouteCarousel: () => <div data-testid="route-carousel" />,
}));
vi.mock('../../components/stops/StopDetailDrawer', () => ({
  StopDetailDrawer: () => <div data-testid="stop-detail-drawer" />,
}));
vi.mock('../../components/map/DestinationPinSheet', () => ({
  DestinationPinSheet: () => null,
}));
vi.mock('../../components/map/DestinationResults', () => ({
  DestinationResults: () => null,
}));

const BASE_STATE = {
  routes: [{ id: '12', code: '12', name: 'Ruta 12' }],
  filteredRoutes: [],
  loadingFiltered: false,
  selectedRoute: { id: '12', code: '12', name: 'Ruta 12' },
  selectedStop: null,
  focusedStop: null,
  searchedLocation: null,
  userLocation: null,
  onlyNearby: false,
  loading: false,
  error: null,
  activeDirection: 'OUTBOUND',
  selectRoute: vi.fn(),
  selectStop: vi.fn(),
  focusStop: vi.fn(),
  clearSelectedRoute: vi.fn(),
  triggerGpsRequest: vi.fn(),
  isLocating: false,
  gpsReady: false,
  loadingRouteDetail: false,
  userAddress: null,
  nearbyStops: [],
  loadData: vi.fn(),
  currentCity: { id: 'ica', name: 'Ica' },
};

function renderPage(overrides = {}) {
  routeState.current = { ...BASE_STATE, ...overrides };
  return render(<HomeMapPage />);
}

describe('HomeMapPage map controls & unobstructed route view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the route view clean without intrusive top pills', () => {
    renderPage({ gpsReady: false });

    expect(
      screen.queryByText('Activa tu ubicación para ver tu distancia'),
    ).toBeNull();
  });

  it('passes gpsReady state to MapControls', () => {
    renderPage({ gpsReady: true });

    expect(screen.getByTestId('mock-gps-btn').textContent).toBe('GPS Ready');
  });

  it('clicking map GPS button triggers triggerGpsRequest when gpsReady is false', () => {
    const triggerGpsRequest = vi.fn();
    renderPage({ gpsReady: false, triggerGpsRequest });

    fireEvent.click(screen.getByTestId('mock-gps-btn'));
    expect(triggerGpsRequest).toHaveBeenCalledTimes(1);
  });
});

