import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
};

export const catalogAPI = {
  getAll: (page = 1, limit = 20) => api.get(`/catalog?page=${page}&limit=${limit}`),
  getById: (id) => api.get(`/catalog/${id}`),
  create: (data) => api.post('/catalog', data),
  update: (id, data) => api.put(`/catalog/${id}`, data),
  delete: (id) => api.delete(`/catalog/${id}`),
};

export const licensesAPI = {
  getAll: (page = 1, limit = 20) => api.get(`/licenses?page=${page}&limit=${limit}`),
  getById: (id) => api.get(`/licenses/${id}`),
  create: (data) => api.post('/licenses', data),
  update: (id, data) => api.put(`/licenses/${id}`, data),
  delete: (id) => api.delete(`/licenses/${id}`),
  checkConflicts: (data) => api.post('/licenses/check-conflicts', data),
};

export const royaltiesAPI = {
  getAll: (page = 1, limit = 20) => api.get(`/royalties?page=${page}&limit=${limit}`),
  getById: (id) => api.get(`/royalties/${id}`),
  create: (data) => api.post('/royalties', data),
  update: (id, data) => api.put(`/royalties/${id}`, data),
  delete: (id) => api.delete(`/royalties/${id}`),
  importCSV: (formData) => api.post('/royalties/import-csv', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const platformsAPI = {
  getAll: () => api.get('/platforms'),
  getById: (id) => api.get(`/platforms/${id}`),
  create: (data) => api.post('/platforms', data),
  update: (id, data) => api.put(`/platforms/${id}`, data),
  delete: (id) => api.delete(`/platforms/${id}`),
};

export const artistsAPI = {
  getAll: () => api.get('/artists'),
  getById: (id) => api.get(`/artists/${id}`),
  create: (data) => api.post('/artists', data),
  update: (id, data) => api.put(`/artists/${id}`, data),
  delete: (id) => api.delete(`/artists/${id}`),
};

export const contractsAPI = {
  getAll: () => api.get('/contracts'),
  getById: (id) => api.get(`/contracts/${id}`),
  create: (data) => api.post('/contracts', data),
  update: (id, data) => api.put(`/contracts/${id}`, data),
  delete: (id) => api.delete(`/contracts/${id}`),
};

export const paymentsAPI = {
  getAll: () => api.get('/payments'),
  getById: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  update: (id, data) => api.put(`/payments/${id}`, data),
  delete: (id) => api.delete(`/payments/${id}`),
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

export const aiAPI = {
  plagiarismDetection: (data, options = {}) => api.post('/ai/plagiarism-detection', data, options),
  catalogValuation: (data, options = {}) => api.post('/ai/catalog-valuation', data, options),
  rightsClearance: (data, options = {}) => api.post('/ai/rights-clearance', data, options),
  royaltyForecasting: (data, options = {}) => api.post('/ai/royalty-forecasting', data, options),
  contractAnalysis: (data, options = {}) => api.post('/ai/contract-analysis', data, options),
  marketTrends: (data, options = {}) => api.post('/ai/market-trends', data, options),
  // Apply pass 5
  royaltySettlement: (data, options = {}) => api.post('/ai/royalty-settlement', data, options),
  copyrightTracking: (data, options = {}) => api.post('/ai/copyright-tracking', data, options),
  mechanicalLicensing: (data, options = {}) => api.post('/ai/mechanical-licensing', data, options),
  proTracking: (data, options = {}) => api.post('/ai/pro-tracking', data, options),
  catalogAcquisitionAdvisor: (data, options = {}) => api.post('/ai/catalog-acquisition-advisor', data, options),
};

export default api;
