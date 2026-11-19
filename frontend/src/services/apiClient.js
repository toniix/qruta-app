import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const ADMIN_TOKEN_KEY = 'rutasya_admin_token';
const ADMIN_USER_KEY = 'rutasya_admin_user';
const OPERATOR_TOKEN_KEY = 'rutasya_operator_token';
const OPERATOR_USER_KEY = 'rutasya_operator_user';

function isOperatorApiRequest(url = '') {
  return (
    url.startsWith('/auth/operator') ||
    url.startsWith('/operator') ||
    url.startsWith('/billing')
  );
}

function isOperatorPage() {
  return (
    typeof window !== 'undefined' &&
    window.location.pathname.startsWith('/operador')
  );
}

function sessionKind(config = {}) {
  return isOperatorApiRequest(config.url) || isOperatorPage() ? 'operator' : 'admin';
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

apiClient.interceptors.request.use(
  (config) => {
    const isOperator = sessionKind(config) === 'operator';
    const token = localStorage.getItem(
      isOperator ? OPERATOR_TOKEN_KEY : ADMIN_TOKEN_KEY
    );
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // 401 Unauthorized: token expired or invalid -> clean session and redirect to login
    if (status === 401) {
      const isOperator = sessionKind(error.config) === 'operator';
      if (isOperator) {
        localStorage.removeItem(OPERATOR_TOKEN_KEY);
        localStorage.removeItem(OPERATOR_USER_KEY);
        if (
          typeof window !== 'undefined' &&
          window.location.pathname.startsWith('/operador') &&
          window.location.pathname !== '/operador/login'
        ) {
          window.location.assign('/operador/login');
        }
      } else {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        localStorage.removeItem(ADMIN_USER_KEY);
        if (
          typeof window !== 'undefined' &&
          window.location.pathname.startsWith('/admin') &&
          window.location.pathname !== '/admin/login'
        ) {
          window.location.assign('/admin/login');
        }
      }
    }

    // 403 Forbidden: authenticated but unauthorized for this resource.
    // Never drop credentials and never force navigation on 403.

    return Promise.reject(error);
  }
);
