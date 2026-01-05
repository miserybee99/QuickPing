import axios from 'axios';

// API URL configuration
// In production, use NEXT_PUBLIC_API_URL environment variable
// In development, use Next.js rewrite proxy or direct localhost
const API_URL = process.env.NEXT_PUBLIC_API_URL || (
  typeof window !== 'undefined' 
    ? '/api'  // Use Next.js rewrite in browser (dev)
    : 'http://localhost:5001/api'  // Direct URL for SSR (dev)
);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Log API calls in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  api.interceptors.request.use(
    (config) => {
      console.log('🌐 API Request:', config.method?.toUpperCase(), config.url, config.data);
      return config;
    },
    (error) => {
      console.error('❌ API Request Error:', error);
      return Promise.reject(error);
    }
  );

  api.interceptors.response.use(
    (response) => {
      console.log('✅ API Response:', response.config.url, response.status);
      return response;
    },
    (error) => {
      console.error('❌ API Response Error:', error.config?.url, error.response?.status, error.response?.data);
      return Promise.reject(error);
    }
  );
}

// Enhanced error logging for production debugging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log detailed error information for debugging
    if (error.response) {
      console.error('🔴 Axios Error Response:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        dataType: typeof error.response.data,
        headers: error.response.headers,
        requestHeaders: error.config?.headers
      });
    } else if (error.request) {
      console.error('🔴 Axios Error Request (no response):', {
        url: error.config?.url,
        method: error.config?.method,
        request: error.request
      });
    } else {
      console.error('🔴 Axios Error (no request/response):', error.message);
    }
    return Promise.reject(error);
  }
);

// Add token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 errors - but don't redirect if already on login/register
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      // Only clear and redirect if not already on auth pages
      if (currentPath !== '/login' && currentPath !== '/register') {
        console.log('🚪 Unauthorized, redirecting to login...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Use setTimeout to avoid race conditions
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

