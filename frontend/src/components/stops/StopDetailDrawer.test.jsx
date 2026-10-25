import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StopDetailDrawer } from './StopDetailDrawer';

vi.mock('../../services/stopService', () => ({
  stopService: { getStopRoutes: vi.fn(async () => []) },
}));

const { mockUseRoutes } = vi.hoisted(() => ({
  mockUseRoutes: vi.fn(),
}));

vi.mock('../../contexts/RouteContext', () => ({
  useRoutes: mockUseRoutes,
}));

function routesContext(selectedRoute = null) {
  return {
    routes: [],
    selectedRoute,
    selectRoute: vi.fn(),
    selectStop: vi.fn(),
    userLocation: null,
  };
}

function renderDrawer(stop, props = {}) {
  return render(
    <MemoryRouter>
      <StopDetailDrawer
        stop={stop}
        context={props.context}
      />
    </MemoryRouter>
  );
}

function useStandaloneMapContext() {
  mockUseRoutes.mockImplementation(() => routesContext());
}

function useRouteContext(route) {
  mockUseRoutes.mockImplementation(() => routesContext(route));
}

describe('StopDetailDrawer reference image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStandaloneMapContext();
  });

  it('renders the reference image when stop.imageUrl is present', async () => {
    renderDrawer({
      id: 'stop-1',
      name: 'Paradero Mercado',
      imageUrl: 'https://cdn.example.com/stops/stop-1.jpg',
    });

    const img = await screen.findByRole('img', { name: /paradero mercado/i });
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/stops/stop-1.jpg');
  });

  it('renders no image when imageUrl is null', async () => {
    renderDrawer({ id: 'stop-2', name: 'Paradero Centro', imageUrl: null });

    await waitFor(() =>
      expect(screen.queryByRole('img', { name: /paradero centro/i })).not.toBeInTheDocument()
    );
  });

  it('renders no image when imageUrl is absent', async () => {
    renderDrawer({ id: 'stop-3', name: 'Paradero Sur' });

    await waitFor(() =>
      expect(screen.queryByRole('img', { name: /paradero sur/i })).not.toBeInTheDocument()
    );
  });

  it('hides the image gracefully when it fails to load', async () => {
    renderDrawer({
      id: 'stop-4',
      name: 'Paradero Roto',
      imageUrl: 'https://cdn.example.com/stops/broken.jpg',
    });

    const img = await screen.findByRole('img', { name: /paradero roto/i });
    fireEvent.error(img);

    await waitFor(() =>
      expect(screen.queryByRole('img', { name: /paradero roto/i })).not.toBeInTheDocument()
    );
  });

  it('hides the reference image while the routes list is expanded and restores it when collapsed', async () => {
    renderDrawer({
      id: 'stop-5',
      name: 'Paradero Expandible',
      imageUrl: 'https://cdn.example.com/stops/stop-5.jpg',
    });

    // Visible by default (routes list collapsed)
    const img = await screen.findByRole('img', { name: /paradero expandible/i });
    expect(img).toBeInTheDocument();

    // Expanding the routes list hides the image to keep the drawer compact
    // (the name matches both the header toggle and the collapsed CTA; use the first toggle)
    const [expandToggle] = screen.getAllByRole('button', {
      name: /ver rutas de este paradero/i,
    });
    fireEvent.click(expandToggle);
    await waitFor(() =>
      expect(screen.queryByRole('img', { name: /paradero expandible/i })).not.toBeInTheDocument()
    );

    // Collapsing again restores it
    fireEvent.click(screen.getByRole('button', { name: /ocultar rutas/i }));
    await waitFor(() =>
      expect(screen.getByRole('img', { name: /paradero expandible/i })).toBeInTheDocument()
    );
  });
});

describe('StopDetailDrawer route context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('omits the close button in route context to avoid dual-X ambiguity', () => {
    useRouteContext({ id: 'route-1', code: '12A', name: 'Ruta 12A: Centro' });
    renderDrawer({ id: 'stop-1', name: 'Paradero A' }, { context: 'route' });

    expect(
      screen.queryByRole('button', { name: 'Cerrar paradero' }),
    ).not.toBeInTheDocument();
    // The back affordance lives in MapTopHeader, not the drawer.
    expect(
      screen.queryByRole('button', { name: 'Volver al detalle de ruta' }),
    ).not.toBeInTheDocument();
  });

  it('shows a chip with the current route code', () => {
    useRouteContext({ id: 'route-1', code: '12A', name: 'Ruta 12A: Centro' });
    renderDrawer({ id: 'stop-1', name: 'Paradero A' }, { context: 'route' });

    expect(screen.getByTestId('route-context-chip')).toBeInTheDocument();
    expect(screen.getByText('Ruta 12A')).toBeInTheDocument();
  });

  it('hides the route chip when no route is selected in route context', () => {
    useRouteContext(null);
    renderDrawer({ id: 'stop-1', name: 'Paradero A' }, { context: 'route' });

    expect(screen.queryByTestId('route-context-chip')).not.toBeInTheDocument();
  });

  it('omits the routes list and does not fetch routes in route context', () => {
    useRouteContext({ id: 'route-1', code: '12A', name: 'Ruta 12A: Centro' });
    renderDrawer({ id: 'stop-1', name: 'Paradero A' }, { context: 'route' });

    expect(
      screen.queryByRole('button', { name: /ver rutas de este paradero/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /ocultar rutas/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/rutas que transitan por aquí/i),
    ).not.toBeInTheDocument();
  });

  it('omits close button in map context as well, delegating dismissal to MapTopHeader', () => {
    useRouteContext({ id: 'route-1', code: '12A', name: 'Ruta 12A: Centro' });
    renderDrawer({ id: 'stop-1', name: 'Paradero A' });

    expect(
      screen.queryByRole('button', { name: 'Cerrar paradero' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Volver al detalle de ruta' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('route-context-chip')).not.toBeInTheDocument();
  });
});
