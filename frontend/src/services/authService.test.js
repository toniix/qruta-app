// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from './authService';
import { adminClient, ADMIN_TOKEN_KEY, ADMIN_USER_KEY } from './apiClient';

vi.mock('./apiClient', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    adminClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  };
});

function createJwt(payload) {
  const header = btoa(JSON.stringify({ alg: 'HS512', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('authService', () => {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  const pastExp = Math.floor(Date.now() / 1000) - 3600;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('logs in and persists token and admin user', async () => {
    const token = createJwt({ sub: 'admin@qruta.pe', role: 'ROLE_ADMIN', exp: futureExp });
    adminClient.post.mockResolvedValueOnce({
      data: { token, email: 'admin@qruta.pe', role: 'ROLE_ADMIN' },
    });

    const session = await authService.login('admin@qruta.pe', 'secret');

    expect(session).toEqual({
      token,
      user: { email: 'admin@qruta.pe', role: 'ROLE_ADMIN' },
    });
    expect(localStorage.getItem(ADMIN_TOKEN_KEY)).toBe(token);
    expect(authService.getCurrentUser()).toEqual({
      email: 'admin@qruta.pe',
      role: 'ROLE_ADMIN',
    });
  });

  it('returns null and clears session when stored admin user JSON is corrupt', () => {
    localStorage.setItem(ADMIN_TOKEN_KEY, 'some-token');
    localStorage.setItem(ADMIN_USER_KEY, '{corrupt-json');

    expect(authService.getCurrentUser()).toBeNull();
    expect(localStorage.getItem(ADMIN_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(ADMIN_USER_KEY)).toBeNull();
  });

  it('returns true for a valid non-expired token and false + logout for an expired token', () => {
    const validToken = createJwt({ sub: 'admin@qruta.pe', exp: futureExp });
    localStorage.setItem(ADMIN_TOKEN_KEY, validToken);
    expect(authService.isAuthenticated()).toBe(true);

    const expiredToken = createJwt({ sub: 'admin@qruta.pe', exp: pastExp });
    localStorage.setItem(ADMIN_TOKEN_KEY, expiredToken);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify({ email: 'admin@qruta.pe', role: 'ROLE_ADMIN' }));

    expect(authService.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(ADMIN_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(ADMIN_USER_KEY)).toBeNull();
  });

  it('validates session via me() and logs out on non-admin role', async () => {
    const token = createJwt({ sub: 'admin@qruta.pe', exp: futureExp });
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    adminClient.get.mockResolvedValueOnce({
      data: { email: 'admin@qruta.pe', role: 'ROLE_ADMIN' },
    });

    const user = await authService.me();
    expect(user).toEqual({ email: 'admin@qruta.pe', role: 'ROLE_ADMIN' });

    adminClient.get.mockResolvedValueOnce({
      data: { email: 'op@qruta.pe', role: 'ROLE_OPERATOR' },
    });

    await expect(authService.me()).rejects.toThrow('Insufficient permissions');
    expect(localStorage.getItem(ADMIN_TOKEN_KEY)).toBeNull();
  });
});
