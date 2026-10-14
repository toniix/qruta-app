import axios from "axios";

// Base API Configuration
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Request interceptor to attach JWT token for admin routes if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("rutasya_admin_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor to handle errors gracefully
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      // Session is invalid or lacks admin rights: drop stored credentials.
      localStorage.removeItem('rutasya_admin_token');
      localStorage.removeItem('rutasya_admin_user');
      // Only force navigation when inside the admin tree — never kick citizens.
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
        const isLogin = window.location.pathname === '/admin/login';
        if (status === 401 && !isLogin) {
          window.location.assign('/admin/login');
        }
      }
    }
    return Promise.reject(error);
  },
);
