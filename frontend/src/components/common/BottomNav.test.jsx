import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import * as routePrefetch from '../../utils/routePrefetch';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
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

    expect(spySchedule).toHaveBeenCalledWith(['/rutas', '/mapa']);
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
});
