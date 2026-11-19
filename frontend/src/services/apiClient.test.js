// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiClient } from './apiClient';

describe('apiClient interceptors', () => {
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

  it('attaches admin token for non-operator requests by default', async () => {
    localStorage.setItem('rutasya_admin_token', 'admin-token-123');
    localStorage.setItem('rutasya_operator_token', 'operator-token-456');

    let capturedConfig;
    const testAdapter = async (config) => {
      capturedConfig = config;
      return { data: { success: true }, status: 200, statusText: 'OK', headers: {}, config };
    };

    const originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = testAdapter;

    try {
      await apiClient.get('/auth/me');
      expect(capturedConfig.headers.Authorization).toBe('Bearer admin-token-123');
    } finally {
      apiClient.defaults.adapter = originalAdapter;
    }
  });

  it('attaches operator token when request URL starts with /operator', async () => {
    localStorage.setItem('rutasya_admin_token', 'admin-token-123');
    localStorage.setItem('rutasya_operator_token', 'operator-token-456');

    let capturedConfig;
    const testAdapter = async (config) => {
      capturedConfig = config;
      return { data: { success: true }, status: 200, statusText: 'OK', headers: {}, config };
    };

    const originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = testAdapter;

    try {
      await apiClient.get('/operator/lines');
      expect(capturedConfig.headers.Authorization).toBe('Bearer operator-token-456');
    } finally {
      apiClient.defaults.adapter = originalAdapter;
    }
  });

  it('attaches operator token when on an operator page', async () => {
    window.location.pathname = '/operador/overview';
    localStorage.setItem('rutasya_admin_token', 'admin-token-123');
    localStorage.setItem('rutasya_operator_token', 'operator-token-456');

    let capturedConfig;
    const testAdapter = async (config) => {
      capturedConfig = config;
      return { data: { success: true }, status: 200, statusText: 'OK', headers: {}, config };
    };

    const originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = testAdapter;

    try {
      await apiClient.get('/lines/1');
      expect(capturedConfig.headers.Authorization).toBe('Bearer operator-token-456');
    } finally {
      apiClient.defaults.adapter = originalAdapter;
    }
  });

  it('does NOT drop credentials or redirect on 403 Forbidden', async () => {
    window.location.pathname = '/admin/overview';
    localStorage.setItem('rutasya_admin_token', 'admin-token-123');
    localStorage.setItem('rutasya_admin_user', JSON.stringify({ email: 'admin@rutasya.pe' }));

    const testAdapter = async (config) => {
      const error = new Error('Forbidden');
      error.response = { status: 403, data: {}, config };
      error.config = config;
      throw error;
    };

    const originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = testAdapter;

    try {
      await expect(apiClient.get('/admin/restricted')).rejects.toThrow();
      expect(localStorage.getItem('rutasya_admin_token')).toBe('admin-token-123');
      expect(localStorage.getItem('rutasya_admin_user')).toBeTruthy();
      expect(window.location.assign).not.toHaveBeenCalled();
    } finally {
      apiClient.defaults.adapter = originalAdapter;
    }
  });

  it('clears admin credentials and redirects to /admin/login on 401 Unauthorized for admin', async () => {
    window.location.pathname = '/admin/overview';
    localStorage.setItem('rutasya_admin_token', 'admin-token-123');
    localStorage.setItem('rutasya_admin_user', JSON.stringify({ email: 'admin@rutasya.pe' }));

    const testAdapter = async (config) => {
      const error = new Error('Unauthorized');
      error.response = { status: 401, data: {}, config };
      error.config = config;
      throw error;
    };

    const originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = testAdapter;

    try {
      await expect(apiClient.get('/auth/me')).rejects.toThrow();
      expect(localStorage.getItem('rutasya_admin_token')).toBeNull();
      expect(localStorage.getItem('rutasya_admin_user')).toBeNull();
      expect(window.location.assign).toHaveBeenCalledWith('/admin/login');
    } finally {
      apiClient.defaults.adapter = originalAdapter;
    }
  });
});
