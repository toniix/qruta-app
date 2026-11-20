// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { operatorAuthService } from './operatorAuthService';
import { operatorClient } from './apiClient';

vi.mock('./apiClient', () => ({
  operatorClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

function createJwt(payload) {
  const header = btoa(JSON.stringify({ alg: 'HS512', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('operatorAuthService', () => {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  const pastExp = Math.floor(Date.now() / 1000) - 3600;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('logs in successfully and saves token and user', async () => {
    const token = createJwt({ sub: 'op@test.pe', role: 'ROLE_OPERATOR', exp: futureExp });
    operatorClient.post.mockResolvedValueOnce({
      data: {
        token,
        email: 'op@test.pe',
        fullName: 'Operator Test',
        role: 'ROLE_OPERATOR',
        operatorId: 'op-1',
        operatorName: 'Empresa Test',
      },
    });

    const session = await operatorAuthService.login('op@test.pe', 'password');

    expect(session.token).toBe(token);
    expect(session.user.role).toBe('OPERATOR');
    expect(localStorage.getItem('rutasya_operator_token')).toBe(token);
    expect(JSON.parse(localStorage.getItem('rutasya_operator_user')).role).toBe('OPERATOR');
  });

  it('rejects login if role is not an operator role', async () => {
    const token = createJwt({ sub: 'admin@test.pe', role: 'ROLE_ADMIN', exp: futureExp });
    operatorClient.post.mockResolvedValueOnce({
      data: { token, role: 'ROLE_ADMIN' },
    });

    await expect(operatorAuthService.login('admin@test.pe', 'password')).rejects.toThrow(
      'La cuenta no tiene permisos de operador'
    );
    expect(localStorage.getItem('rutasya_operator_token')).toBeNull();
  });

  it('me() succeeds when profile returns role OWNER', async () => {
    const token = createJwt({ sub: 'owner@test.pe', role: 'ROLE_OPERATOR', exp: futureExp });
    localStorage.setItem('rutasya_operator_token', token);
    localStorage.setItem(
      'rutasya_operator_user',
      JSON.stringify({ email: 'owner@test.pe', role: 'OPERATOR' })
    );

    operatorClient.get.mockResolvedValueOnce({
      data: {
        operatorId: 'op-1',
        operatorName: 'Empresa Test',
        email: 'owner@test.pe',
        fullName: 'Owner Test',
        role: 'OWNER',
      },
    });

    const user = await operatorAuthService.me();

    expect(user.role).toBe('OWNER');
    expect(localStorage.getItem('rutasya_operator_token')).toBe(token);
    expect(JSON.parse(localStorage.getItem('rutasya_operator_user')).role).toBe('OWNER');
  });

  it('me() succeeds when profile returns role EDITOR', async () => {
    const token = createJwt({ sub: 'editor@test.pe', role: 'ROLE_OPERATOR', exp: futureExp });
    localStorage.setItem('rutasya_operator_token', token);
    localStorage.setItem(
      'rutasya_operator_user',
      JSON.stringify({ email: 'editor@test.pe', role: 'OPERATOR' })
    );

    operatorClient.get.mockResolvedValueOnce({
      data: {
        operatorId: 'op-1',
        operatorName: 'Empresa Test',
        email: 'editor@test.pe',
        fullName: 'Editor Test',
        role: 'EDITOR',
      },
    });

    const user = await operatorAuthService.me();

    expect(user.role).toBe('EDITOR');
    expect(localStorage.getItem('rutasya_operator_token')).toBe(token);
  });

  it('me() rejects and logs out when profile returns unauthorized role', async () => {
    const token = createJwt({ sub: 'admin@test.pe', role: 'ROLE_OPERATOR', exp: futureExp });
    localStorage.setItem('rutasya_operator_token', token);

    operatorClient.get.mockResolvedValueOnce({
      data: {
        role: 'CITIZEN',
      },
    });

    await expect(operatorAuthService.me()).rejects.toThrow(
      'La cuenta no tiene permisos de operador'
    );
    expect(localStorage.getItem('rutasya_operator_token')).toBeNull();
    expect(localStorage.getItem('rutasya_operator_user')).toBeNull();
  });

  it('isAuthenticated returns true for valid token and stored user with OWNER role', () => {
    const token = createJwt({ sub: 'owner@test.pe', role: 'ROLE_OPERATOR', exp: futureExp });
    localStorage.setItem('rutasya_operator_token', token);
    localStorage.setItem(
      'rutasya_operator_user',
      JSON.stringify({ email: 'owner@test.pe', role: 'OWNER' })
    );

    expect(operatorAuthService.isAuthenticated()).toBe(true);
  });

  it('isAuthenticated returns false and logs out on expired token', () => {
    const token = createJwt({ sub: 'op@test.pe', role: 'ROLE_OPERATOR', exp: pastExp });
    localStorage.setItem('rutasya_operator_token', token);

    expect(operatorAuthService.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('rutasya_operator_token')).toBeNull();
  });
});
