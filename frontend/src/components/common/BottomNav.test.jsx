import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import * as routePrefetch from '../../utils/routePrefetch';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => {
      try {
        const real = actual.useNavigate();
        return (...args) => {
          mockNavigate(...args);
          real(...args);
        };
      } catch {
        return mockNavigate;
      }
    },
  };
});

vi.mock('../../contexts/RouteContext', () => ({
  useRoutes: () => ({
    selectedRoute: null,
  }),
}));

describe('BottomNav component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all bottom navigation items', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <BottomNav />
      </MemoryRouter>
    );

    expect(screen.getByText('Inicio')).toBeTruthy();
    expect(screen.getByText('Mapa')).toBeTruthy();
    expect(screen.getByText('Rutas')).toBeTruthy();
    expect(screen.getByText('Comunidad')).toBeTruthy();
    expect(screen.getByText('Lugares')).toBeTruthy();
  });

  it('schedules idle prefetch on mount', () => {
    const spySchedule = vi.spyOn(routePrefetch, 'scheduleIdlePrefetch');

    render(
      <MemoryRouter initialEntries={['/']}>
        <BottomNav />
      </MemoryRouter>
    );

    expect(spySchedule).toHaveBeenCalledWith(['/rutas', '/mapa', '/comunidad']);
  });

  it('triggers prefetch on touch and hover', () => {
    const spyPrefetch = vi.spyOn(routePrefetch, 'prefetchRoute');

    render(
      <MemoryRouter initialEntries={['/']}>
        <BottomNav />
      </MemoryRouter>
    );

    const rutasBtn = screen.getByRole('button', { name: /rutas/i });

    fireEvent.mouseEnter(rutasBtn);
    expect(spyPrefetch).toHaveBeenCalledWith('/rutas');

    fireEvent.touchStart(rutasBtn);
    expect(spyPrefetch).toHaveBeenCalledWith('/rutas');
  });

  it('navigates and prefetch when clicking a tab', () => {
    const spyPrefetch = vi.spyOn(routePrefetch, 'prefetchRoute');

    render(
      <MemoryRouter initialEntries={['/']}>
        <BottomNav />
      </MemoryRouter>
    );

    const rutasBtn = screen.getByRole('button', { name: /rutas/i });
    fireEvent.click(rutasBtn);

    expect(spyPrefetch).toHaveBeenCalledWith('/rutas');
    expect(mockNavigate).toHaveBeenCalledWith('/rutas');
  });

  it('highlights Mapa tab when on /mapa or /mapa/ruta/:id', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/mapa']}>
        <BottomNav />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /mapa/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /inicio/i })).not.toHaveAttribute('aria-current');

    unmount();

    render(
      <MemoryRouter initialEntries={['/mapa/ruta/ICA-05']}>
        <BottomNav />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /mapa/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /inicio/i })).not.toHaveAttribute('aria-current');
  });

  it('resets optimistic navigation when location changes without lingering ghost highlight', () => {
    let navigateFn;
    function RouteController() {
      const nav = useNavigate();
      navigateFn = nav;
      return null;
    }

    render(
      <MemoryRouter initialEntries={['/mapa']}>
        <RouteController />
        <BottomNav />
      </MemoryRouter>
    );

    // Initial state on /mapa
    expect(screen.getByRole('button', { name: /mapa/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /inicio/i })).not.toHaveAttribute('aria-current');

    // 1. User clicks Inicio tab -> triggers optimistic transition and navigates to /
    const inicioBtn = screen.getByRole('button', { name: /inicio/i });
    fireEvent.click(inicioBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/');

    // Verify router is now at / and Inicio is active
    expect(screen.getByRole('button', { name: /inicio/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /mapa/i })).not.toHaveAttribute('aria-current');

    // 2. User navigates to a route detail (e.g. from Inicio popular routes)
    act(() => {
      navigateFn('/mapa/ruta/ICA-05');
    });
    expect(screen.getByRole('button', { name: /mapa/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /inicio/i })).not.toHaveAttribute('aria-current');

    // 3. User closes the route detail view -> returns to /mapa
    act(() => {
      navigateFn('/mapa');
    });

    // Mapa MUST remain highlighted, NOT ghost Inicio!
    expect(screen.getByRole('button', { name: /mapa/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /inicio/i })).not.toHaveAttribute('aria-current');
  });
});
