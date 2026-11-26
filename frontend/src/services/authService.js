import { adminClient, ADMIN_TOKEN_KEY, ADMIN_USER_KEY } from './apiClient';
import { isJwtExpired } from '../utils/jwtUtils';

export const authService = {
  async login(email, password) {
    const response = await adminClient.post('/auth/admin/login', { email, password });
    const { token, email: returnedEmail, role } = response.data;
    const userRole = role || 'ROLE_ADMIN';
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify({ email: returnedEmail, role: userRole }));
    return { token, user: { email: returnedEmail, role: userRole } };
  },

  logout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
  },

  getToken() {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  },

  getCurrentUser() {
    const raw = localStorage.getItem(ADMIN_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      this.logout();
      return null;
    }
  },

  isAuthenticated() {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) return false;
    if (isJwtExpired(token)) {
      this.logout();
      return false;
    }
    return true;
  },

  /** Validates the session against the backend. Clears storage and throws on failure. */
  async me() {
    if (!this.isAuthenticated()) {
      throw new Error('No active session');
    }
    try {
      const response = await adminClient.get('/auth/me');
      const { email, role } = response.data;
      if (role && role !== 'ROLE_ADMIN') {
        throw new Error('Insufficient permissions');
      }
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify({ email, role: role || 'ROLE_ADMIN' }));
      return { email, role: role || 'ROLE_ADMIN' };
    } catch (err) {
      this.logout();
      throw err;
    }
  },
};
