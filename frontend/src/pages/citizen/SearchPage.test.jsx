import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SearchPage } from './SearchPage';
import { routeService } from '../../services/routeService';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const routeState = vi.hoisted(() => ({ current: {} }));

vi.mock('../../contexts/RouteContext', () => ({
  useRoutes: () => routeState.current,
}));

vi.mock('../../services/routeService', () => ({
  routeService: {
    getAllRoutes: vi.fn(),
    searchRoutes: vi.fn(),
    getPopularRoutes: vi.fn().mockResolvedValue([]),
  },
}));

const MOCK_CITIES = [
  { id: 'city-lima', name: 'Lima' },
  { id: 'city-ica', name: 'Ica' },
  { id: 'city-huanuco', name: 'Huánuco' },
];

const MOCK_ROUTES = [
  {
    id: 'route-lima-1',
    code: 'LIMA-01',
    name: 'Plaza de Armas - Miraflores',
    color: '#2563eb',
    cityId: 'city-lima',
    cityName: 'Lima',
    stops: [],
  },
  {
    id: 'route-lima-2',
    code: 'LIMA-02',
    name: 'Javier Prado Express',
    color: '#10b981',
    cityId: 'city-lima',
    cityName: 'Lima',
    stops: [],
  },
  {
    id: 'route-ica-1',
    code: 'ICA-01',
    name: 'Huacachina - Centro',
    color: '#f59e0b',
    cityId: 'city-ica',
    cityName: 'Ica',
    stops: [],
  },
  {
    id: 'route-huanuco-1',
    code: 'HCO-01',
    name: 'Amarilis - Kotosh',
    color: '#8b5cf6',
    cityId: 'city-huanuco',
    cityName: 'Huánuco',
    stops: [],
  },
];

const BASE_STATE = {
  routes: MOCK_ROUTES.filter((r) => r.cityId === 'city-lima'),
  popularRoutes: [],
  userAddress: null,
  cities: MOCK_CITIES,
  currentCity: MOCK_CITIES[0],
  selectRoute: vi.fn(),
};

function renderSearchPage(initialEntries = ['/buscar']) {
  routeState.current = { ...BASE_STATE };
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <SearchPage />
    </MemoryRouter>,
  );
}

describe('SearchPage city filtering & search workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    routeService.getAllRoutes.mockResolvedValue(MOCK_ROUTES);
    routeService.searchRoutes.mockResolvedValue(MOCK_ROUTES);
  });

  it('renders idle suggestions initially and shows Ciudades principales', () => {
    renderSearchPage();
    expect(screen.getByText('Explora antes de buscar')).toBeInTheDocument();
    expect(screen.getByText('Ciudades principales')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lima/i })).toBeInTheDocument();
  });

  it('filters by city when shortcut is clicked, allows switching to Todas las ciudades, other cities, and clearing', async () => {
    const user = userEvent.setup();
    renderSearchPage();

    // 1. Click Lima shortcut in Ciudades principales
    const limaShortcut = screen.getByRole('button', { name: /Lima/i });
    await user.click(limaShortcut);

    // Should load catalog routes and show Lima routes (2 routes)
    await waitFor(() => {
      expect(screen.getByText('2 rutas encontradas')).toBeInTheDocument();
      expect(screen.getByText('Plaza de Armas - Miraflores')).toBeInTheDocument();
      expect(screen.getByText('Javier Prado Express')).toBeInTheDocument();
    });
    // Ica and Huánuco routes should not be visible
    expect(screen.queryByText('Huacachina - Centro')).not.toBeInTheDocument();
    expect(screen.queryByText('Amarilis - Kotosh')).not.toBeInTheDocument();

    // Verify city chips are visible: "Todas las ciudades", "Huánuco", "Ica", "Lima"
    const allCitiesChip = screen.getByRole('button', { name: 'Todas las ciudades' });
    const icaChip = screen.getByRole('button', { name: 'Ica' });
    const huanucoChip = screen.getByRole('button', { name: 'Huánuco' });
    expect(allCitiesChip).toBeInTheDocument();
    expect(icaChip).toBeInTheDocument();
    expect(huanucoChip).toBeInTheDocument();

    // 2. Click "Todas las ciudades" chip -> should show all 4 routes
    await user.click(allCitiesChip);
    await waitFor(() => {
      expect(screen.getByText('4 rutas encontradas')).toBeInTheDocument();
      expect(screen.getByText('Plaza de Armas - Miraflores')).toBeInTheDocument();
      expect(screen.getByText('Huacachina - Centro')).toBeInTheDocument();
      expect(screen.getByText('Amarilis - Kotosh')).toBeInTheDocument();
    });

    // 3. Click "Ica" chip -> should show only Ica route
    await user.click(icaChip);
    await waitFor(() => {
      expect(screen.getByText('1 ruta encontrada')).toBeInTheDocument();
      expect(screen.getByText('Huacachina - Centro')).toBeInTheDocument();
      expect(screen.queryByText('Plaza de Armas - Miraflores')).not.toBeInTheDocument();
    });

    // 4. Click clear button on the query badge -> should return to idle view
    const clearBadgeBtn = screen.getByRole('button', { name: /Quitar filtro y volver a explorar/i });
    await user.click(clearBadgeBtn);

    await waitFor(() => {
      expect(screen.getByText('Explora antes de buscar')).toBeInTheDocument();
      expect(screen.queryByText('Huacachina - Centro')).not.toBeInTheDocument();
    });
  });

  it('clears query and results via input clear button', async () => {
    const user = userEvent.setup();
    renderSearchPage();

    // Click Lima shortcut to enter results
    await user.click(screen.getByRole('button', { name: /Lima/i }));
    await waitFor(() => {
      expect(screen.getByText('2 rutas encontradas')).toBeInTheDocument();
    });

    // Click clear button in the input field
    const clearInputBtn = screen.getByRole('button', { name: 'Limpiar búsqueda' });
    await user.click(clearInputBtn);

    await waitFor(() => {
      expect(screen.getByText('Explora antes de buscar')).toBeInTheDocument();
    });
  });

  it('preserves search results across unmount and remount when returning from route detail', async () => {
    const user = userEvent.setup();
    const { unmount } = renderSearchPage();

    // 1. Search for Lima shortcut
    await user.click(screen.getByRole('button', { name: /Lima/i }));
    await waitFor(() => {
      expect(screen.getByText('2 rutas encontradas')).toBeInTheDocument();
      expect(screen.getByText('Plaza de Armas - Miraflores')).toBeInTheDocument();
    });

    // 2. Click a route card (simulating navigation to /mapa/ruta/:id)
    await user.click(screen.getByText('Plaza de Armas - Miraflores'));
    expect(BASE_STATE.selectRoute).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'route-lima-1' }),
    );

    // 3. Unmount component (leaving /buscar)
    unmount();

    // 4. Remount component (returning back from route detail)
    const { unmount: unmountSecond } = renderSearchPage();

    // Search results and query state should be immediately preserved!
    expect(screen.getByText('2 rutas encontradas')).toBeInTheDocument();
    expect(screen.getByText('Plaza de Armas - Miraflores')).toBeInTheDocument();
    expect(screen.getByText('Javier Prado Express')).toBeInTheDocument();
    expect(screen.queryByText('Explora antes de buscar')).not.toBeInTheDocument();

    // 5. Manually clear search
    const clearBtn = screen.getByRole('button', { name: /Quitar filtro y volver a explorar/i });
    await user.click(clearBtn);

    await waitFor(() => {
      expect(screen.getByText('Explora antes de buscar')).toBeInTheDocument();
    });

    // 6. Unmount and remount again -> state should stay cleared
    unmountSecond();
    renderSearchPage();
    expect(screen.getByText('Explora antes de buscar')).toBeInTheDocument();
  });

  it('navigates back using react-router state.from, passing returnTo and avoiding route detail loop', async () => {
    const user = userEvent.setup();

    // 1. Enter SearchPage with state.from = '/rutas'
    renderSearchPage([{ pathname: '/buscar', state: { from: '/rutas' } }]);

    const backButton = screen.getByRole('button', { name: 'Regresar' });
    await user.click(backButton);

    // Should navigate to '/rutas'
    expect(mockNavigate).toHaveBeenCalledWith('/rutas');
  });

  it('falls back to "/" when state.from points to route detail or is missing', async () => {
    const user = userEvent.setup();

    // Enter SearchPage with invalid / looping state.from
    renderSearchPage([{ pathname: '/buscar', state: { from: '/mapa/ruta/route-123' } }]);

    const backButton = screen.getByRole('button', { name: 'Regresar' });
    await user.click(backButton);

    // Must NEVER navigate into /mapa/ruta/...; should safely fall back to '/'
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
