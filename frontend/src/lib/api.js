/**
 * API client for KedaiOps backend
 */
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kedaiops_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('kedaiops_token');
      localStorage.removeItem('kedaiops_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  getMe: () => api.get('/api/auth/me'),
  register: (data) => api.post('/api/auth/register', data),
};

// Ingredients
export const ingredientsAPI = {
  list: (lowStockOnly = false) => 
    api.get('/api/ingredients', { params: { low_stock_only: lowStockOnly } }),
  create: (data) => api.post('/api/ingredients', data),
  update: (id, data) => api.put(`/api/ingredients/${id}`, data),
  delete: (id) => api.delete(`/api/ingredients/${id}`),
  adjust: (data) => api.post('/api/ingredients/adjust', data),
  getLedger: (id, days = 30) => api.get(`/api/ingredients/${id}/ledger`, { params: { days } }),
};

// Menus
export const menusAPI = {
  list: (category, activeOnly = false) => 
    api.get('/api/menus', { params: { category, active_only: activeOnly } }),
  getCategories: () => api.get('/api/menus/categories'),
  get: (id) => api.get(`/api/menus/${id}`),
  create: (data) => api.post('/api/menus', data),
  update: (id, data) => api.put(`/api/menus/${id}`, data),
  delete: (id) => api.delete(`/api/menus/${id}`),
};

// Sales
export const salesAPI = {
  create: (data) => api.post('/api/sales', data),
  sync: (sales) => api.post('/api/sales/sync', { sales }),
  list: (params) => api.get('/api/sales', { params }),
  get: (id) => api.get(`/api/sales/${id}`),
};

// Reports
export const reportsAPI = {
  summary: (startDate, endDate) => 
    api.get('/api/reports/summary', { params: { start_date: startDate, end_date: endDate } }),
  daily: (days = 7) => api.get('/api/reports/daily', { params: { days } }),
  ingredientUsage: (days = 7) => api.get('/api/reports/ingredient-usage', { params: { days } }),
  // Export endpoints
  exportSales: (startDate, endDate) => 
    api.get('/api/reports/export/sales', { 
      params: { start_date: startDate, end_date: endDate },
      responseType: 'blob'
    }),
  exportIngredients: () => 
    api.get('/api/reports/export/ingredients', { responseType: 'blob' }),
  exportUsage: (days = 30) => 
    api.get('/api/reports/export/usage', { params: { days }, responseType: 'blob' }),
};

// Settings
export const settingsAPI = {
  get: () => api.get('/api/settings'),
  update: (data) => api.put('/api/settings', data),
};

// Users
export const usersAPI = {
  list: () => api.get('/api/users'),
  update: (id, data) => api.put(`/api/users/${id}`, data),
};

export default api;
