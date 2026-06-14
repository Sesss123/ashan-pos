import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { useBranchStore } from '../store/branchStore';

// Assuming the backend is running on localhost:5000
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor to add JWT token and Branch ID
axiosClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Inject selected branch ID if not 'all'
    const branchId = useBranchStore.getState().selectedBranchId;
    if (branchId && branchId !== 'all') {
      config.headers['X-Branch-Id'] = branchId;
      // Also attach as a query param for GET requests as a fallback
      if (config.method?.toLowerCase() === 'get') {
        config.params = { ...config.params, branchId };
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor to handle 401 Unauthorized
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
