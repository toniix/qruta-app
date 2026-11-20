import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const ADMIN_TOKEN_KEY = 'rutasya_admin_token';
export const ADMIN_USER_KEY = 'rutasya_admin_user';
export const OPERATOR_TOKEN_KEY = 'rutasya_operator_token';
export const OPERATOR_USER_KEY = 'rutasya_operator_user';

/**
 * Factory to create scoped HTTP clients.
 * Isolates credentials, authorization headers, and 401 handling per portal domain.
 */
export function createHttpClient({ tokenKey, userKey, loginPath } = {}) {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });

  if (tokenKey) {
    client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem(tokenKey);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error.response?.status;

      // 401 Unauthorized: token expired or invalid -> clean session and redirect to login
      if (status === 401 && tokenKey) {
        localStorage.removeItem(tokenKey);
        if (userKey) {
          localStorage.removeItem(userKey);
        }
        if (
          loginPath &&
          typeof window !== 'undefined' &&
          window.location.pathname !== loginPath
        ) {
          const basePath = loginPath.replace(/\/login$/, '');
          if (window.location.pathname.startsWith(basePath)) {
            window.location.assign(loginPath);
          }
        }
      }

      // 403 Forbidden: authenticated but unauthorized for this resource.
      // Never drop credentials and never force navigation on 403.
      return Promise.reject(error);
    }
  );

  return client;
}

// Public client for citizen/guest routes: no tokens attached, no auto-redirects on 401
export const publicClient = createHttpClient();

// Dedicated Admin client: attaches rutasya_admin_token and redirects to /admin/login on 401
export const adminClient = createHttpClient({
  tokenKey: ADMIN_TOKEN_KEY,
  userKey: ADMIN_USER_KEY,
  loginPath: '/admin/login',
});

// Dedicated Operator client: attaches rutasya_operator_token and redirects to /operador/login on 401
export const operatorClient = createHttpClient({
  tokenKey: OPERATOR_TOKEN_KEY,
  userKey: OPERATOR_USER_KEY,
  loginPath: '/operador/login',
});

// Default client alias for backward compatibility (points to adminClient)
export const apiClient = adminClient;
