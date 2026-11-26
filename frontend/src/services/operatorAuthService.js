import { operatorClient, OPERATOR_TOKEN_KEY, OPERATOR_USER_KEY } from './apiClient';
import { isJwtExpired, parseJwtPayload } from '../utils/jwtUtils';

const OPERATOR_ROLE = 'OPERATOR';
const OPERATOR_ROLES = new Set(['OPERATOR', 'OWNER', 'EDITOR']);

function normalizeRole(role) {
  return String(role || '')
    .toUpperCase()
    .replace(/^ROLE_/, '');
}

function buildUser(data = {}, token = '') {
  const payload = parseJwtPayload(token) || {};
  return {
    operatorId: data.operatorId ?? payload.operatorId ?? null,
    operatorName: data.operatorName ?? null,
    email: data.email ?? payload.sub ?? payload.email ?? null,
    fullName: data.fullName ?? null,
    role: normalizeRole(data.role ?? payload.role ?? OPERATOR_ROLE),
  };
}

function isOperatorUser(user) {
  return OPERATOR_ROLES.has(normalizeRole(user?.role));
}

function persistSession(token, data) {
  const user = buildUser(data, token);
  localStorage.setItem(OPERATOR_TOKEN_KEY, token);
  localStorage.setItem(OPERATOR_USER_KEY, JSON.stringify(user));
  return user;
}

export const operatorAuthService = {
  async login(email, password) {
    const { data } = await operatorClient.post('/auth/operator/login', { email, password });
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
    localStorage.removeItem(OPERATOR_TOKEN_KEY);
    localStorage.removeItem(OPERATOR_USER_KEY);
  },

  getToken() {
    return localStorage.getItem(OPERATOR_TOKEN_KEY);
  },

  getCurrentUser() {
    const raw = localStorage.getItem(OPERATOR_USER_KEY);
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
    if (isJwtExpired(token)) {
      this.logout();
      return false;
    }
    const payload = parseJwtPayload(token);
    const storedUser = this.getCurrentUser();
    if (payload?.role && !OPERATOR_ROLES.has(normalizeRole(payload.role))) {
      this.logout();
      return false;
    }
    if (storedUser && !isOperatorUser(storedUser)) {
      this.logout();
      return false;
    }
    return true;
  },

  async me() {
    if (!this.isAuthenticated()) {
      throw new Error('No active session');
    }
    try {
      const { data } = await operatorClient.get('/operator/profile');
      const user = persistSession(this.getToken(), {
        ...this.getCurrentUser(),
        ...data,
      });
      if (!isOperatorUser(user)) {
        throw new Error('La cuenta no tiene permisos de operador');
      }
      return user;
    } catch (err) {
      this.logout();
      throw err;
    }
  },
};

export default operatorAuthService;
