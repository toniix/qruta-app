import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, Outlet } from 'react-router-dom';
import { AppRoutes } from './AppRoutes';

vi.mock('../layouts/CitizenLayout', () => ({
  CitizenLayout: () => {
    const LocationProbe = () => {
      const location = useLocation();
      return <div data-testid="location-pathname">{location.pathname}</div>;
    };
    return (
      <div>
        <LocationProbe />
        <Outlet />
      </div>
    );
  },
}));

vi.mock('../services/authService', () => ({
  authService: {
    getToken: () => null,
    isAuthenticated: () => false,
  },
}));

vi.mock('../pages/citizen/HomeMapPage', () => ({
  HomeMapPage: () => <div data-testid="home-map-page-stub" />,
}));

describe('AppRoutes alias redirection', () => {
  it('redirects /ruta/:id to /mapa/ruta/:id', async () => {
    render(
      <MemoryRouter initialEntries={['/ruta/linea-10']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('location-pathname').textContent).toBe(
        '/mapa/ruta/linea-10',
      );
    });
  });
});
