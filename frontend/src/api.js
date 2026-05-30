import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('banko_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('banko_token');
      localStorage.removeItem('banko_user');
      window.location.href = import.meta.env.BASE_URL + 'login';
    }
    return Promise.reject(error);
  }
);

// Auth
export async function login(username, password) {
  return api.post('/auth/login', { username, password });
}
export async function register(username, password) {
  return api.post('/auth/register', { username, password });
}

// Upload
export async function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  return api.post('/upload', form, { headers: { 'Content-Type': null } });
}

// Analyse
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

// Paramétrage
export async function resetMonths() {
  return api.post('/analysis/settings/reset-months');
}

// Catégorisation des opérations
export async function fetchCategorisationStats() {
  return api.get('/categorisation/stats');
}
export async function fetchUncategorized(page = 1) {
  return api.get('/categorisation/uncategorized', { params: { page } });
}
export async function applyCategory({ operation_id, categorie_id, new_category_name, keyword }) {
  return api.post('/categorisation/apply', { operation_id, categorie_id, new_category_name, keyword });
}

// Catégories
export async function fetchCategories() {
  return api.get('/categories');
}
export async function deleteAllCategories() {
  return api.delete('/categories/all');
}

// Portefeuilles
export async function fetchPortefeuilles() {
  return api.get('/portefeuilles');
}
export async function createPortefeuille(nom) {
  return api.post('/portefeuilles', { nom });
}
export async function deletePortefeuille(id) {
  return api.delete(`/portefeuilles/${id}`);
}
export async function deleteAllPortefeuilles() {
  return api.delete('/portefeuilles/all');
}
export async function fetchPortefeuilleDetail(id, month) {
  const params = month ? { month } : {};
  return api.get(`/portefeuilles/${id}/detail`, { params });
}
export async function fetchOrphanCategories() {
  return api.get('/portefeuilles/orphan-categories');
}
export async function addCategoryToPortefeuille(id, categorie_id) {
  return api.post(`/portefeuilles/${id}/categories`, { categorie_id });
}
export async function removeCategoryFromPortefeuille(id, cat_id) {
  return api.delete(`/portefeuilles/${id}/categories/${cat_id}`);
}

// Cash flow
export async function fetchCashflow(period = '3m') {
  return api.get('/cashflow', { params: { period } });
}

// Répartition dépenses / recettes
export async function fetchRepartition(month) {
  return api.get('/repartition', { params: month ? { month } : {} });
}

// Évolution dépenses / recettes par portefeuille
export async function fetchEvolution(portefeuille_id, type) {
  return api.get('/evolution', { params: { portefeuille_id, type } });
}

export default api;
