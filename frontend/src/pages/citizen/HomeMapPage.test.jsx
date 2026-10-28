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
  MapControls: () => <div data-testid="map-controls" />,
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

describe('HomeMapPage contextual GPS guidance pill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows contextual GPS pill when viewing a selected route and gpsReady is false', () => {
    renderPage({ gpsReady: false });

    expect(
      screen.getByText('Activa tu ubicación para ver tu distancia'),
    ).toBeInTheDocument();
  });

  it('clicking the contextual GPS pill triggers triggerGpsRequest', () => {
    const triggerGpsRequest = vi.fn();
    renderPage({ gpsReady: false, triggerGpsRequest });

    const button = screen.getByRole('button', {
      name: /Activa tu ubicación para ver tu distancia/i,
    });
    fireEvent.click(button);

    expect(triggerGpsRequest).toHaveBeenCalledTimes(1);
  });

  it('does not show the GPS pill when gpsReady is true', () => {
    renderPage({ gpsReady: true });

    expect(
      screen.queryByText('Activa tu ubicación para ver tu distancia'),
    ).toBeNull();
  });

  it('does not show the GPS pill when no route is selected', () => {
    renderPage({ selectedRoute: null, gpsReady: false });

    expect(
      screen.queryByText('Activa tu ubicación para ver tu distancia'),
    ).toBeNull();
  });
});

