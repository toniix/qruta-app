import { apiClient } from './apiClient';

const TOKEN_KEY = 'rutasya_admin_token';
const ADMIN_USER_KEY = 'rutasya_admin_user';

function decodePayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function isExpired(token) {
  const payload = decodePayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 <= Date.now();
}

export const authService = {
  async login(email, password) {
    const response = await apiClient.post('/auth/admin/login', { email, password });
    const { token, email: returnedEmail, role } = response.data;
    const userRole = role || 'ROLE_ADMIN';
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify({ email: returnedEmail, role: userRole }));
    return { token, user: { email: returnedEmail, role: userRole } };
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  getCurrentUser() {
    const user = localStorage.getItem(ADMIN_USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    if (isExpired(token)) {
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
      const response = await apiClient.get('/auth/me');
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
