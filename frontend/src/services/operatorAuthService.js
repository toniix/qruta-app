import { apiClient } from './apiClient';

const TOKEN_KEY = 'rutasya_operator_token';
const USER_KEY = 'rutasya_operator_user';
const OPERATOR_ROLE = 'OPERATOR';

function normalizeRole(role) {
  return String(role || '')
    .toUpperCase()
    .replace(/^ROLE_/, '');
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return decodeURIComponent(
    atob(padded)
      .split('')
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join('')
  );
}

function parseJwt(token) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(decodeBase64Url(payload));
  } catch {
    return null;
  }
}

function tokenExpired(token) {
  const payload = parseJwt(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 <= Date.now();
}

function buildUser(data = {}, token = '') {
  const payload = parseJwt(token) || {};
  return {
    operatorId: data.operatorId ?? payload.operatorId ?? null,
    operatorName: data.operatorName ?? null,
    email: data.email ?? payload.sub ?? payload.email ?? null,
    fullName: data.fullName ?? null,
    role: normalizeRole(data.role ?? payload.role ?? OPERATOR_ROLE),
  };
}

function isOperatorUser(user) {
  return normalizeRole(user?.role) === OPERATOR_ROLE;
}

function persistSession(token, data) {
  const user = buildUser(data, token);
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export const operatorAuthService = {
  async login(email, password) {
    const { data } = await apiClient.post('/auth/operator/login', { email, password });
    if (!data?.token) {
      throw new Error('El servidor no devolvió una sesión válida');
    }
    const user = persistSession(data.token, data);
    if (!isOperatorUser(user)) {
      this.logout();
      throw new Error('La cuenta no tiene permisos de operador');
    }
    return { token: data.token, user };
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  getCurrentUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      this.logout();
      return null;
    }
  },

  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;
    if (tokenExpired(token)) {
      this.logout();
      return false;
    }
    const payload = parseJwt(token);
    const storedUser = this.getCurrentUser();
    if (payload?.role && normalizeRole(payload.role) !== OPERATOR_ROLE) {
      this.logout();
      return false;
    }
    if (!isOperatorUser(storedUser) && normalizeRole(payload?.role) !== OPERATOR_ROLE) {
      this.logout();
      return false;
    }
    return true;
  },

  async me() {
    if (!this.isAuthenticated()) {
      throw new Error('No active session');
    }
    const { data } = await apiClient.get('/operator/profile');
    const user = persistSession(this.getToken(), {
      ...this.getCurrentUser(),
      ...data,
    });
    if (!isOperatorUser(user)) {
      this.logout();
      throw new Error('La cuenta no tiene permisos de operador');
    }
    return user;
  },
};

export default operatorAuthService;
