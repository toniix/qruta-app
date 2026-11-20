// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  publicClient,
  adminClient,
  operatorClient,
  apiClient,
} from './apiClient';

describe('Specialized HTTP clients', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.clear();
    delete window.location;
    window.location = {
      pathname: '/',
      assign: vi.fn(),
    };
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  describe('publicClient', () => {
    it('does not attach authorization headers even if tokens exist', async () => {
      localStorage.setItem('rutasya_admin_token', 'admin-token-123');
      localStorage.setItem('rutasya_operator_token', 'operator-token-456');

      let capturedConfig;
      const originalAdapter = publicClient.defaults.adapter;
      publicClient.defaults.adapter = async (config) => {
        capturedConfig = config;
        return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
      };

      try {
        await publicClient.get('/routes');
        expect(capturedConfig.headers.Authorization).toBeUndefined();
      } finally {
        publicClient.defaults.adapter = originalAdapter;
      }
    });

    it('does not purge tokens or redirect on 401', async () => {
      localStorage.setItem('rutasya_admin_token', 'admin-token-123');

      const originalAdapter = publicClient.defaults.adapter;
      publicClient.defaults.adapter = async (config) => {
        const error = new Error('Unauthorized');
        error.response = { status: 401, data: {}, config };
        error.config = config;
        throw error;
      };

      try {
        await expect(publicClient.get('/routes')).rejects.toThrow();
        expect(localStorage.getItem('rutasya_admin_token')).toBe('admin-token-123');
        expect(window.location.assign).not.toHaveBeenCalled();
      } finally {
        publicClient.defaults.adapter = originalAdapter;
      }
    });
  });

  describe('adminClient', () => {
    it('attaches admin token and ignores operator token', async () => {
      localStorage.setItem('rutasya_admin_token', 'admin-token-123');
      localStorage.setItem('rutasya_operator_token', 'operator-token-456');

      let capturedConfig;
      const originalAdapter = adminClient.defaults.adapter;
      adminClient.defaults.adapter = async (config) => {
        capturedConfig = config;
        return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
      };

      try {
        await adminClient.get('/admin/routes');
        expect(capturedConfig.headers.Authorization).toBe('Bearer admin-token-123');
      } finally {
        adminClient.defaults.adapter = originalAdapter;
      }
    });

    it('clears only admin credentials and redirects to /admin/login on 401', async () => {
      window.location.pathname = '/admin/overview';
      localStorage.setItem('rutasya_admin_token', 'admin-token-123');
      localStorage.setItem('rutasya_admin_user', JSON.stringify({ email: 'admin@rutasya.pe' }));
      localStorage.setItem('rutasya_operator_token', 'operator-token-456');

      const originalAdapter = adminClient.defaults.adapter;
      adminClient.defaults.adapter = async (config) => {
        const error = new Error('Unauthorized');
        error.response = { status: 401, data: {}, config };
        error.config = config;
        throw error;
      };

      try {
        await expect(adminClient.get('/auth/me')).rejects.toThrow();
        expect(localStorage.getItem('rutasya_admin_token')).toBeNull();
        expect(localStorage.getItem('rutasya_admin_user')).toBeNull();
        // Operator token is untouched
        expect(localStorage.getItem('rutasya_operator_token')).toBe('operator-token-456');
        expect(window.location.assign).toHaveBeenCalledWith('/admin/login');
      } finally {
        adminClient.defaults.adapter = originalAdapter;
      }
    });

    it('does NOT drop credentials or redirect on 403 Forbidden', async () => {
      window.location.pathname = '/admin/overview';
      localStorage.setItem('rutasya_admin_token', 'admin-token-123');
      localStorage.setItem('rutasya_admin_user', JSON.stringify({ email: 'admin@rutasya.pe' }));

      const originalAdapter = adminClient.defaults.adapter;
      adminClient.defaults.adapter = async (config) => {
        const error = new Error('Forbidden');
        error.response = { status: 403, data: {}, config };
        error.config = config;
        throw error;
      };

      try {
        await expect(adminClient.get('/admin/restricted')).rejects.toThrow();
        expect(localStorage.getItem('rutasya_admin_token')).toBe('admin-token-123');
        expect(localStorage.getItem('rutasya_admin_user')).toBeTruthy();
        expect(window.location.assign).not.toHaveBeenCalled();
      } finally {
        adminClient.defaults.adapter = originalAdapter;
      }
    });
  });

  describe('operatorClient', () => {
    it('attaches operator token and ignores admin token', async () => {
      localStorage.setItem('rutasya_admin_token', 'admin-token-123');
      localStorage.setItem('rutasya_operator_token', 'operator-token-456');

      let capturedConfig;
      const originalAdapter = operatorClient.defaults.adapter;
      operatorClient.defaults.adapter = async (config) => {
        capturedConfig = config;
        return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
      };

      try {
        await operatorClient.get('/operator/lines');
        expect(capturedConfig.headers.Authorization).toBe('Bearer operator-token-456');
      } finally {
        operatorClient.defaults.adapter = originalAdapter;
      }
    });

    it('clears only operator credentials and redirects to /operador/login on 401', async () => {
      window.location.pathname = '/operador/overview';
      localStorage.setItem('rutasya_admin_token', 'admin-token-123');
      localStorage.setItem('rutasya_operator_token', 'operator-token-456');
      localStorage.setItem('rutasya_operator_user', JSON.stringify({ email: 'op@test.pe' }));

      const originalAdapter = operatorClient.defaults.adapter;
      operatorClient.defaults.adapter = async (config) => {
        const error = new Error('Unauthorized');
        error.response = { status: 401, data: {}, config };
        error.config = config;
        throw error;
      };

      try {
        await expect(operatorClient.get('/operator/profile')).rejects.toThrow();
        expect(localStorage.getItem('rutasya_operator_token')).toBeNull();
        expect(localStorage.getItem('rutasya_operator_user')).toBeNull();
        // Admin token is untouched
        expect(localStorage.getItem('rutasya_admin_token')).toBe('admin-token-123');
        expect(window.location.assign).toHaveBeenCalledWith('/operador/login');
      } finally {
        operatorClient.defaults.adapter = originalAdapter;
      }
    });

    it('does NOT drop credentials or redirect on 403 Forbidden', async () => {
      window.location.pathname = '/operador/overview';
      localStorage.setItem('rutasya_operator_token', 'operator-token-456');

      const originalAdapter = operatorClient.defaults.adapter;
      operatorClient.defaults.adapter = async (config) => {
        const error = new Error('Forbidden');
        error.response = { status: 403, data: {}, config };
        error.config = config;
        throw error;
      };

      try {
        await expect(operatorClient.get('/operator/restricted')).rejects.toThrow();
        expect(localStorage.getItem('rutasya_operator_token')).toBe('operator-token-456');
        expect(window.location.assign).not.toHaveBeenCalled();
      } finally {
        operatorClient.defaults.adapter = originalAdapter;
      }
    });
  });

  describe('apiClient alias', () => {
    it('is an alias to adminClient for backwards compatibility', () => {
      expect(apiClient).toBe(adminClient);
    });
  });
});
