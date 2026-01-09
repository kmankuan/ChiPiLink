/**
 * PinpanClub API Configuration
 * Centralizes all PinpanClub endpoint definitions
 * 
 * Updated for Microservices Architecture - Phase 3
 * 
 * Note: This module supports both legacy (/api/pingpong/*) and new (/api/pinpanclub/*) endpoints.
 * The backend maintains backward compatibility, so both work.
 * 
 * Set USE_NEW_ENDPOINTS to true to use the new microservices-ready endpoints.
 */

const API_URL = process.env.REACT_APP_BACKEND_URL;
const WS_URL = API_URL?.replace('https://', 'wss://').replace('http://', 'ws://');

// Use new microservices-ready endpoints
const USE_NEW_ENDPOINTS = true;

// Base paths
const BASE_PATH = USE_NEW_ENDPOINTS ? '/api/pinpanclub' : '/api/pingpong';
const WS_BASE_PATH = USE_NEW_ENDPOINTS ? '/api/pinpanclub' : '/api/pingpong';

// ============== HTTP ENDPOINTS ==============
export const PINPANCLUB_API = {
  // Players
  players: `${API_URL}${BASE_PATH}/players`,
  playerById: (id) => `${API_URL}${BASE_PATH}/players/${id}`,
  rankings: `${API_URL}${BASE_PATH}/rankings`,
  
  // Matches
  matches: `${API_URL}${BASE_PATH}/matches`,
  activeMatches: `${API_URL}${BASE_PATH}/matches/active`,
  activeMatchesAll: `${API_URL}${BASE_PATH}/matches/active/all`,
  matchById: (id) => `${API_URL}${BASE_PATH}/matches/${id}`,
  matchLive: (id) => `${API_URL}${BASE_PATH}/matches/${id}/live`,
  matchPoint: (id) => `${API_URL}${BASE_PATH}/matches/${id}/point`,
  matchUndo: (id) => `${API_URL}${BASE_PATH}/matches/${id}/undo`,
  matchStart: (id) => `${API_URL}${BASE_PATH}/matches/${id}/start`,
  matchPause: (id) => `${API_URL}${BASE_PATH}/matches/${id}/pause`,
  
  // Tournaments
  tournaments: `${API_URL}${BASE_PATH}/tournaments`,
  tournamentById: (id) => `${API_URL}${BASE_PATH}/tournaments/${id}`,
  
  // Sponsors
  sponsors: `${API_URL}${BASE_PATH}/sponsors`,
  sponsorById: (id) => `${API_URL}${BASE_PATH}/sponsors/${id}`,
  sponsorsTvDisplay: `${API_URL}${BASE_PATH}/sponsors/tv/display`,
  sponsorsConfigLayout: `${API_URL}${BASE_PATH}/sponsors/config/layout`,
  sponsorsConfigSpace: (id) => `${API_URL}${BASE_PATH}/sponsors/config/space/${id}`,
  
  // Canvas
  canvasLayouts: `${API_URL}${BASE_PATH}/canvas/layouts`,
  
  // Monday.com integration
  monday: {
    status: `${API_URL}${BASE_PATH}/monday/status`,
    config: `${API_URL}${BASE_PATH}/monday/config`,
    stats: `${API_URL}${BASE_PATH}/monday/stats`,
    boards: `${API_URL}${BASE_PATH}/monday/boards`,
    syncPlayers: `${API_URL}${BASE_PATH}/monday/sync/players`,
    syncMatches: `${API_URL}${BASE_PATH}/monday/sync/matches/active`,
    syncResults: `${API_URL}${BASE_PATH}/monday/sync/results`,
    test: `${API_URL}${BASE_PATH}/monday/test`,
  }
};

// ============== WEBSOCKET ENDPOINTS ==============
export const PINPANCLUB_WS = {
  // Live TV feed
  liveTv: (matchId) => matchId 
    ? `${WS_URL}${WS_BASE_PATH}/ws/live?type=tv&match_id=${matchId}`
    : `${WS_URL}${WS_BASE_PATH}/ws/live?type=tv`,
  
  // Arbiter connection
  arbiter: (matchId) => `${WS_URL}${WS_BASE_PATH}/ws/arbiter/${matchId}`,
  
  // Spectator connection
  spectator: (matchId) => `${WS_URL}${WS_BASE_PATH}/ws/spectator/${matchId}`,
};

// ============== HELPER FUNCTIONS ==============

/**
 * Get API URL for a specific endpoint
 */
export const getApiUrl = (endpoint) => {
  return `${API_URL}${BASE_PATH}${endpoint}`;
};

/**
 * Get WebSocket URL for a specific endpoint
 */
export const getWsUrl = (endpoint) => {
  return `${WS_URL}${WS_BASE_PATH}${endpoint}`;
};

// Export configuration
export const PINPANCLUB_CONFIG = {
  apiUrl: API_URL,
  wsUrl: WS_URL,
  basePath: BASE_PATH,
  useNewEndpoints: USE_NEW_ENDPOINTS,
};

export default PINPANCLUB_API;
