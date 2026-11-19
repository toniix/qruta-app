import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, Outlet } from 'react-router-dom';
import { AppRoutes } from './AppRoutes';

const authMocks = vi.hoisted(() => ({
  getToken: vi.fn(),
  isAuthenticated: vi.fn(),
  me: vi.fn(),
}));

const operatorAuthMocks = vi.hoisted(() => ({
  getToken: vi.fn(),
  isAuthenticated: vi.fn(),
  me: vi.fn(),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="route-location">{location.pathname}</div>;
}

vi.mock('../layouts/CitizenLayout', () => ({
  CitizenLayout: () => {
    const CitizenLocationProbe = () => {
      const location = useLocation();
      return <div data-testid="location-pathname">{location.pathname}</div>;
    };
    return (
      <div>
        <CitizenLocationProbe />
        <Outlet />
      </div>
    );
  },
}));

vi.mock('../services/authService', () => ({
  authService: authMocks,
}));

vi.mock('../services/operatorAuthService', () => ({
  operatorAuthService: operatorAuthMocks,
}));

vi.mock('../layouts/AdminLayout', () => ({
  AdminLayout: () => <div data-testid="admin-layout-stub"><Outlet /></div>,
}));

vi.mock('../layouts/OperatorLayout', () => ({
  OperatorLayout: () => <div data-testid="operator-layout-stub"><Outlet /></div>,
}));

vi.mock('../pages/admin/AdminLoginPage', () => ({
  AdminLoginPage: () => <div data-testid="admin-login-stub" />,
}));

vi.mock('../pages/admin/overview/AdminOverviewPage', () => ({
  AdminOverviewPage: () => <div data-testid="admin-overview-stub" />,
}));

vi.mock('../pages/operator/OperatorLoginPage', () => ({
  OperatorLoginPage: () => <div data-testid="operator-login-stub" />,
}));

vi.mock('../pages/operator/OperatorOverviewPage', () => ({
  OperatorOverviewPage: () => <div data-testid="operator-overview-stub" />,
}));

vi.mock('../pages/citizen/HomeMapPage', () => ({
  HomeMapPage: () => <div data-testid="home-map-page-stub" />,
}));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <AppRoutes />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  authMocks.getToken.mockReturnValue(null);
  authMocks.isAuthenticated.mockReturnValue(false);
  authMocks.me.mockReset();

  operatorAuthMocks.getToken.mockReturnValue(null);
  operatorAuthMocks.isAuthenticated.mockReturnValue(false);
  operatorAuthMocks.me.mockReset();
});

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

describe('AppRoutes operator and admin session isolation', () => {
  it('redirects an operator session away from admin routes', async () => {
    operatorAuthMocks.getToken.mockReturnValue('operator-token');
    operatorAuthMocks.me.mockResolvedValue({ role: 'OPERATOR' });

    renderAt('/admin/overview');

    await waitFor(() => {
      expect(screen.getByTestId('route-location').textContent).toBe('/admin/login');
    });
    expect(authMocks.me).not.toHaveBeenCalled();
  });

  it('redirects an admin session away from operator routes', async () => {
    authMocks.getToken.mockReturnValue('admin-token');
    authMocks.me.mockResolvedValue({ role: 'ADMIN' });

    renderAt('/operador/overview');

    await waitFor(() => {
      expect(screen.getByTestId('route-location').textContent).toBe('/operador/login');
    });
    expect(operatorAuthMocks.me).not.toHaveBeenCalled();
  });

  it('allows a valid operator session into the operator portal', async () => {
    operatorAuthMocks.getToken.mockReturnValue('operator-token');
    operatorAuthMocks.me.mockResolvedValue({ role: 'OPERATOR' });

    renderAt('/operador/overview');

    expect(await screen.findByTestId('operator-layout-stub')).toBeTruthy();
    expect(screen.getByTestId('operator-overview-stub')).toBeTruthy();
  });

  it('keeps a valid admin session in the admin portal', async () => {
    authMocks.getToken.mockReturnValue('admin-token');
    authMocks.me.mockResolvedValue({ role: 'ADMIN' });

    renderAt('/admin/overview');

    expect(await screen.findByTestId('admin-layout-stub')).toBeTruthy();
    expect(screen.getByTestId('admin-overview-stub')).toBeTruthy();
  });
});
