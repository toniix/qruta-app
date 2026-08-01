import { apiClient } from './apiClient';

const TOKEN_KEY = 'rutasya_admin_token';
const ADMIN_USER_KEY = 'rutasya_admin_user';

export const authService = {
  async login(username, password) {
    if (import.meta.env.VITE_USE_MOCK !== 'false') {
      // Mock login for admin testing
      if (username === 'admin' && password === 'admin123') {
        const token = 'mock_jwt_token_rutasya_admin_' + Date.now();
        const user = { username: 'admin', role: 'ROLE_ADMIN', name: 'Administrador Sistema' };
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
        return { token, user };
      }
      throw new Error('Credenciales inválidas. Usa admin / admin123 para el modo demo.');
    }

    const response = await apiClient.post('/auth/login', { username, password });
    const { token, user } = response.data;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
    return { token, user };
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
  },

  getCurrentUser() {
    const user = localStorage.getItem(ADMIN_USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated() {
    return !!localStorage.getItem(TOKEN_KEY);
  },
};
