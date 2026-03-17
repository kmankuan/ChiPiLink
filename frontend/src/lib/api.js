import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${BACKEND_URL}/api/sport`,
  headers: { 'Content-Type': 'application/json' }
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sport_token');
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
      localStorage.removeItem('sport_token');
      localStorage.removeItem('sport_user');
    }
    return Promise.reject(error);
  }
);

export const sportApi = {
  // Health
  health: () => api.get('/health'),
  
  // Players
  getPlayers: (params) => api.get('/players', { params }),
  getPlayer: (id) => api.get(`/players/${id}`),
  createPlayer: (data) => api.post('/players', data),
  updatePlayer: (id, data) => api.put(`/players/${id}`, data),
  deletePlayer: (id) => api.delete(`/players/${id}`),
  getRankings: () => api.get('/rankings'),
  
  // Leagues
  getLeagues: (params) => api.get('/leagues', { params }),
  getLeague: (id) => api.get(`/leagues/${id}`),
  createLeague: (data) => api.post('/leagues', data),
  updateLeague: (id, data) => api.put(`/leagues/${id}`, data),
  
  // Matches
  getMatches: (params) => api.get('/matches', { params }),
  getMatch: (id) => api.get(`/matches/${id}`),
  createMatch: (data) => api.post('/matches', data),
  validateMatch: (id, data) => api.put(`/matches/${id}/validate`, data),
  
  // Tournaments
  getTournaments: (params) => api.get('/tournaments', { params }),
  getTournament: (id) => api.get(`/tournaments/${id}`),
  createTournament: (data) => api.post('/tournaments', data),
  registerPlayer: (id, data) => api.post(`/tournaments/${id}/register`, data),
  startTournament: (id) => api.post(`/tournaments/${id}/start`),
  submitMatchResult: (tid, mid, data) => api.post(`/tournaments/${tid}/match/${mid}/result`, data),
  
  // Live
  getLiveSessions: (params) => api.get('/live', { params }),
  getLiveSession: (id) => api.get(`/live/${id}`),
  createLiveSession: (data) => api.post('/live', data),
  scorePoint: (id, data) => api.post(`/live/${id}/score`, data),
  undoPoint: (id) => api.post(`/live/${id}/undo`),
  endSession: (id) => api.post(`/live/${id}/end`),
  updateReferee: (id, data) => api.put(`/live/${id}/referee`, data),
  
  // Settings
  getSettings: () => api.get('/settings'),
  updateSettings: (data) => api.put('/settings', data),
  getTvSettings: () => api.get('/settings/tv'),
};

// WebSocket helper
export const createLiveWebSocket = (sessionId) => {
  const wsUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
  return new WebSocket(`${wsUrl}/api/sport/ws/live/${sessionId}`);
};

export default api;
