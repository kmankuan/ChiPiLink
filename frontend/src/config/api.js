/**
 * API Configuration
 * Centralizes all API endpoint definitions for easy migration to new microservices-ready endpoints
 * 
 * Migration Status:
 * - PinpanClub: ✅ Ready (new: /api/pinpanclub/*)
 * - Store: ✅ Ready (new: /api/store/*)
 * - Auth: ✅ Ready (new: /api/auth-v2/*)
 * - Community: ✅ Ready (new: /api/community-v2/*)
 * 
 * Set USE_NEW_ENDPOINTS to true to use refactored endpoints
 */

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Feature flag for gradual migration
// Set to true to use new microservices-ready endpoints
const USE_NEW_ENDPOINTS = true;

// ============== AUTH ENDPOINTS ==============
export const AUTH_ENDPOINTS = {
  login: USE_NEW_ENDPOINTS ? '/auth-v2/login' : '/auth/login',
  register: USE_NEW_ENDPOINTS ? '/auth-v2/register' : '/auth/registro',
  me: USE_NEW_ENDPOINTS ? '/auth-v2/me' : '/auth/me',
  logout: USE_NEW_ENDPOINTS ? '/auth-v2/logout' : '/auth/logout',
  session: '/auth/session', // OAuth session (same for both)
  changePassword: USE_NEW_ENDPOINTS ? '/auth-v2/change-password' : '/auth/change-password',
  
  // LaoPan OAuth endpoints
  laopanConfig: '/invision/oauth/config',
  laopanLogin: '/invision/oauth/login',
  laopanCallback: '/invision/oauth/callback',
  
  // Admin endpoints
  users: USE_NEW_ENDPOINTS ? '/auth-v2/users' : '/admin/users',
  userStats: USE_NEW_ENDPOINTS ? '/auth-v2/users/stats' : '/admin/users/stats',
  userById: (id) => USE_NEW_ENDPOINTS ? `/auth-v2/users/${id}` : `/admin/users/${id}`,
};

// ============== STORE ENDPOINTS ==============
export const STORE_ENDPOINTS = {
  // Products
  products: '/store/products',
  productById: (id) => `/store/products/${id}`,
  featuredProducts: '/store/products/featured',
  promotionalProducts: '/store/products/promotions',
  newestProducts: '/store/products/newest',
  searchProducts: (q) => `/store/products/search?q=${q}`,
  
  // Categories
  categories: '/store/categories',
  categoryById: (id) => `/store/categories/${id}`,
  categoryLanding: (id) => `/store/categories/${id}/landing`,
  
  // Public data
  grades: '/store/public/grades',
  subjects: '/store/public/subjects',
  
  // Orders
  orders: '/store/orders',
  orderById: (id) => `/store/orders/${id}`,
  orderPublicById: (id) => `/store/public/order/${id}`,
  createOrder: '/store/orders',
  publicOrder: '/store/public/order',
  
  // Students
  students: '/store/students',
  studentById: (id) => `/store/students/${id}`,
  studentAvailableBooks: (id) => `/store/students/${id}/available-books`,
  
  // Inventory (admin)
  inventory: '/store/inventory',
  lowStock: '/store/inventory/low-stock',
  
  // Landing
  landingCategory: (cat) => USE_NEW_ENDPOINTS 
    ? `/store/landing/category/${cat}` 
    : `/landing/categoria/${cat}`,
  landingBanners: (cat) => USE_NEW_ENDPOINTS 
    ? `/store/landing/banners/${cat}` 
    : `/landing/banners/${cat}`,
};

// ============== COMMUNITY ENDPOINTS ==============
export const COMMUNITY_ENDPOINTS = {
  // Posts
  posts: USE_NEW_ENDPOINTS ? '/community-v2/posts' : '/community/posts',
  postById: (id) => USE_NEW_ENDPOINTS ? `/community-v2/posts/${id}` : `/community/posts/${id}`,
  likePost: (id) => USE_NEW_ENDPOINTS ? `/community-v2/posts/${id}/like` : `/community/posts/${id}/like`,
  postComments: (id) => USE_NEW_ENDPOINTS 
    ? `/community-v2/posts/${id}/comments` 
    : `/community/posts/${id}/comments`,
  
  // Events
  events: USE_NEW_ENDPOINTS ? '/community-v2/events' : '/community/events',
  eventById: (id) => USE_NEW_ENDPOINTS ? `/community-v2/events/${id}` : `/community/events/${id}`,
  registerEvent: (id) => USE_NEW_ENDPOINTS 
    ? `/community-v2/events/${id}/register` 
    : `/community/events/${id}/register`,
  
  // Gallery
  gallery: USE_NEW_ENDPOINTS ? '/community-v2/gallery' : '/community/gallery',
  albumById: (id) => USE_NEW_ENDPOINTS ? `/community-v2/gallery/${id}` : `/community/gallery/${id}`,
  
  // Landing
  landing: USE_NEW_ENDPOINTS ? '/community-v2/landing' : '/community/landing',
  
  // Admin
  adminPosts: USE_NEW_ENDPOINTS ? '/community-v2/posts/admin/all' : '/community/admin/posts',
  adminCreatePost: USE_NEW_ENDPOINTS ? '/community-v2/posts/admin' : '/community/admin/posts',
  adminUpdatePost: (id) => USE_NEW_ENDPOINTS 
    ? `/community-v2/posts/admin/${id}` 
    : `/community/admin/posts/${id}`,
  adminDeletePost: (id) => USE_NEW_ENDPOINTS 
    ? `/community-v2/posts/admin/${id}` 
    : `/community/admin/posts/${id}`,
  
  adminEvents: USE_NEW_ENDPOINTS ? '/community-v2/events/admin/all' : '/community/admin/events',
  adminCreateEvent: USE_NEW_ENDPOINTS ? '/community-v2/events/admin' : '/community/admin/events',
  adminUpdateEvent: (id) => USE_NEW_ENDPOINTS 
    ? `/community-v2/events/admin/${id}` 
    : `/community/admin/events/${id}`,
  
  adminGallery: USE_NEW_ENDPOINTS ? '/community-v2/gallery/admin/all' : '/community/admin/gallery',
  adminCreateAlbum: USE_NEW_ENDPOINTS ? '/community-v2/gallery/admin' : '/community/admin/gallery',
  adminUpdateAlbum: (id) => USE_NEW_ENDPOINTS 
    ? `/community-v2/gallery/admin/${id}` 
    : `/community/admin/gallery/${id}`,
};

// ============== PINPANCLUB ENDPOINTS ==============
export const PINPANCLUB_ENDPOINTS = {
  // Players
  players: '/pinpanclub/players',
  playerById: (id) => `/pinpanclub/players/${id}`,
  rankings: '/pinpanclub/rankings',
  
  // Matches
  matches: '/pinpanclub/matches',
  activeMatches: '/pinpanclub/matches/active',
  activeMatchesAll: '/pinpanclub/matches/active/all',
  matchById: (id) => `/pinpanclub/matches/${id}`,
  matchLive: (id) => `/pinpanclub/matches/${id}/live`,
  matchPoint: (id) => `/pinpanclub/matches/${id}/point`,
  matchUndo: (id) => `/pinpanclub/matches/${id}/undo`,
  matchStart: (id) => `/pinpanclub/matches/${id}/start`,
  matchPause: (id) => `/pinpanclub/matches/${id}/pause`,
  
  // Tournaments
  tournaments: '/pinpanclub/tournaments',
  tournamentById: (id) => `/pinpanclub/tournaments/${id}`,
  
  // Sponsors
  sponsors: '/pinpanclub/sponsors',
  sponsorById: (id) => `/pinpanclub/sponsors/${id}`,
  sponsorsTvDisplay: '/pinpanclub/sponsors/tv/display',
  sponsorsConfigLayout: '/pinpanclub/sponsors/config/layout',
  sponsorsConfigSpace: (id) => `/pinpanclub/sponsors/config/space/${id}`,
  
  // Canvas
  canvasLayouts: '/pinpanclub/canvas/layouts',
  
  // Monday.com integration
  mondayStatus: '/pinpanclub/monday/status',
  mondaySync: '/pinpanclub/monday/sync',
};

// ============== HELPER FUNCTIONS ==============

/**
 * Build full API URL
 * @param {string} endpoint - The endpoint path (e.g., '/auth-v2/login')
 * @returns {string} Full URL
 */
export const buildUrl = (endpoint) => {
  return `${API_URL}/api${endpoint}`;
};

/**
 * Get endpoint with query params
 * @param {string} endpoint - Base endpoint
 * @param {object} params - Query parameters
 * @returns {string} Endpoint with query string
 */
export const withParams = (endpoint, params) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value);
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `${endpoint}?${queryString}` : endpoint;
};

// Export configuration
export const API_CONFIG = {
  baseUrl: API_URL,
  useNewEndpoints: USE_NEW_ENDPOINTS,
  auth: AUTH_ENDPOINTS,
  store: STORE_ENDPOINTS,
  community: COMMUNITY_ENDPOINTS,
  pinpanclub: PINPANCLUB_ENDPOINTS,
};

export default API_CONFIG;
