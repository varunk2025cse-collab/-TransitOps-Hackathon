import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// ── Auth ────────────────────────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// ── Vehicles ────────────────────────────────────────────────────────
export const vehiclesAPI = {
  getAll: () => api.get('/vehicles'),
  create: (data) => api.post('/vehicles', data),
  update: (id, data) => api.put(`/vehicles/${id}`, data),
  delete: (id) => api.delete(`/vehicles/${id}`),
};

// ── Drivers ─────────────────────────────────────────────────────────
export const driversAPI = {
  getAll: () => api.get('/drivers'),
  create: (data) => api.post('/drivers', data),
  update: (id, data) => api.put(`/drivers/${id}`, data),
};

// ── Trips ───────────────────────────────────────────────────────────
export const tripsAPI = {
  getAll: () => api.get('/trips'),
  dispatch: (data) => api.post('/trips/dispatch', data),
  complete: (id, data) => api.post(`/trips/${id}/complete`, data),
  cancel: (id) => api.post(`/trips/${id}/cancel`),
};

// ── Maintenance ─────────────────────────────────────────────────────
export const maintenanceAPI = {
  getAll: () => api.get('/maintenance'),
  create: (data) => api.post('/maintenance', data),
  close: (id) => api.post(`/maintenance/${id}/close`),
};

// ── Fuel Logs ───────────────────────────────────────────────────────
export const fuelLogsAPI = {
  getAll: () => api.get('/fuel-logs'),
  create: (data) => api.post('/fuel-logs', data),
};

// ── Expenses ────────────────────────────────────────────────────────
export const expensesAPI = {
  getAll: () => api.get('/expenses'),
  create: (data) => api.post('/expenses', data),
};

// ── Dashboard ───────────────────────────────────────────────────────
export const dashboardAPI = {
  getKPI: () => api.get('/dashboard/kpi'),
  getCharts: () => api.get('/dashboard/charts'),
  getFleetHealth: () => api.get('/intelligence/fleet-health'),
};

export default api;
