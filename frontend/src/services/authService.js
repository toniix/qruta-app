import { apiClient } from './apiClient';

const TOKEN_KEY = 'rutasya_admin_token';
const ADMIN_USER_KEY = 'rutasya_admin_user';

export const authService = {
  async login(email, password) {
    const response = await apiClient.post('/auth/admin/login', { email, password });
    const { token, email: returnedEmail } = response.data;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify({ email: returnedEmail, role: 'ROLE_ADMIN' }));
    return { token, user: { email: returnedEmail, role: 'ROLE_ADMIN' } };
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
