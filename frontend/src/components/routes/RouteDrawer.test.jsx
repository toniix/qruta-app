import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RouteDrawer } from './RouteDrawer';
import * as shareUtils from '../../utils/shareUtils';

const { mockUseRoutes, mockUseFavorites } = vi.hoisted(() => ({
  mockUseRoutes: vi.fn(),
  mockUseFavorites: vi.fn(),
}));

vi.mock('../../contexts/RouteContext', () => ({
  useRoutes: mockUseRoutes,
}));

vi.mock('../../hooks/useFavorites', () => ({
  useFavorites: mockUseFavorites,
}));

vi.mock('../../services/communityService', () => ({
  communityService: {
    getRouteSummary: vi.fn().mockResolvedValue({ totalPostsCount: 0, categories: [] }),
  },
  getCategoryMeta: vi.fn().mockReturnValue({ label: 'General', color: '#000' }),
}));

describe('RouteDrawer Share Feature', () => {
  const mockRoute = {
    id: 'route-55',
    code: 'R55',
    name: 'Ruta 55: Miraflores - San Isidro',
    color: '#10b981',
    transportLine: { name: 'Empresa San Jerónimo' },
    directions: [
      {
        direction: 'OUTBOUND',
        originName: 'Miraflores',
        destinationName: 'San Isidro',
        stops: [{ id: 's1', name: 'Paradero 1', stopOrder: 1 }],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFavorites.mockReturnValue({
      isFavorite: vi.fn().mockReturnValue(false),
      toggleFavorite: vi.fn(),
    });
    mockUseRoutes.mockReturnValue({
      selectedRoute: mockRoute,
      focusedStop: null,
      selectStop: vi.fn(),
      focusStop: vi.fn(),
      activeDirection: 'OUTBOUND',
      setActiveDirection: vi.fn(),
      loadingRouteDetail: false,
    });
  });

  it('renders the accessible share button in the route header', () => {
    render(
      <MemoryRouter>
        <RouteDrawer />
      </MemoryRouter>
    );

    const shareButton = screen.getByRole('button', { name: /compartir ruta/i });
    expect(shareButton).toBeInTheDocument();
    expect(shareButton).toHaveAttribute('title', 'Compartir ruta');

    expect(screen.getByText(/operado por/i)).toBeInTheDocument();
    expect(screen.getByText('Empresa San Jerónimo')).toBeInTheDocument();
  });

  it('calls shareRoute and opens fallback modal if native share is not available', async () => {
    vi.spyOn(shareUtils, 'shareRoute').mockResolvedValue({ success: false, fallback: true });

    render(
      <MemoryRouter>
        <RouteDrawer />
      </MemoryRouter>
    );

    const shareButton = screen.getByRole('button', { name: /compartir ruta/i });
    await userEvent.click(shareButton);

    expect(shareUtils.shareRoute).toHaveBeenCalledWith(mockRoute);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Compartir ruta')).toBeInTheDocument();
    });
  });

  it('does not get stuck in loading state when route has no directions', () => {
    mockUseRoutes.mockReturnValue({
      selectedRoute: {
        id: 'route-empty',
        code: 'R0',
        name: 'Ruta Vacía',
        directions: [],
      },
      focusedStop: null,
      selectStop: vi.fn(),
      focusStop: vi.fn(),
      activeDirection: 'OUTBOUND',
      setActiveDirection: vi.fn(),
      loadingRouteDetail: false,
    });

    render(
      <MemoryRouter>
        <RouteDrawer />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: 'Ida' })).toBeInTheDocument();
    expect(screen.getByText('No hay paraderos registrados para este recorrido.')).toBeInTheDocument();
  });
});

