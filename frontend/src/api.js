import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('banquo_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function login(username, password) {
  return api.post('/auth/login', { username, password });
}

export async function register(username, password) {
  return api.post('/auth/register', { username, password });
}

export async function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  const token = localStorage.getItem('banquo_token');
  return axios.post(`${api.defaults.baseURL}/upload`, form, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchMonths() {
  return api.get('/analysis/months');
}

export async function fetchSummary(month) {
  return api.get('/analysis/summary', { params: { month } });
}

export async function fetchReceipts(month) {
  return api.get('/analysis/receipts', { params: { month } });
}

export async function fetchExpenses(month) {
  return api.get('/analysis/expenses', { params: { month } });
}

export async function updateCategory(id, categorie) {
  return api.post(`/analysis/expense/${id}/category`, { categorie });
}

export async function fetchCategorySuggestions(q) {
  return api.get('/categories/suggest', { params: { q } });
}

export default api;
