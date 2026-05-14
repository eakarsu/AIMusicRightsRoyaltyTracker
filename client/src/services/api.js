import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

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
  plagiarismDetection: (data) => api.post('/ai/plagiarism-detection', data),
  catalogValuation: (data) => api.post('/ai/catalog-valuation', data),
  rightsClearance: (data) => api.post('/ai/rights-clearance', data),
  royaltyForecasting: (data) => api.post('/ai/royalty-forecasting', data),
  contractAnalysis: (data) => api.post('/ai/contract-analysis', data),
  marketTrends: (data) => api.post('/ai/market-trends', data),
  // Apply pass 5
  royaltySettlement: (data) => api.post('/ai/royalty-settlement', data),
  copyrightTracking: (data) => api.post('/ai/copyright-tracking', data),
  mechanicalLicensing: (data) => api.post('/ai/mechanical-licensing', data),
  proTracking: (data) => api.post('/ai/pro-tracking', data),
  catalogAcquisitionAdvisor: (data) => api.post('/ai/catalog-acquisition-advisor', data),
};

export default api;
