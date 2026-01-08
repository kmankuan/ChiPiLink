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
  
  // Admin endpoints
  users: USE_NEW_ENDPOINTS ? '/auth-v2/users' : '/admin/users',
  userStats: USE_NEW_ENDPOINTS ? '/auth-v2/users/stats' : '/admin/users/stats',
  userById: (id) => USE_NEW_ENDPOINTS ? `/auth-v2/users/${id}` : `/admin/users/${id}`,
};

// ============== STORE ENDPOINTS ==============
export const STORE_ENDPOINTS = {
  // Products
  products: USE_NEW_ENDPOINTS ? '/store/products' : '/libros',
  productById: (id) => USE_NEW_ENDPOINTS ? `/store/products/${id}` : `/libros/${id}`,
  featuredProducts: USE_NEW_ENDPOINTS ? '/store/products/featured' : '/libros?destacado=true',
  promotionalProducts: USE_NEW_ENDPOINTS ? '/store/products/promotions' : '/libros?en_promocion=true',
  newestProducts: USE_NEW_ENDPOINTS ? '/store/products/newest' : '/libros/newest',
  searchProducts: (q) => USE_NEW_ENDPOINTS ? `/store/products/search?q=${q}` : `/libros/search?q=${q}`,
  
  // Categories
  categories: USE_NEW_ENDPOINTS ? '/store/categories' : '/categorias',
  categoryById: (id) => USE_NEW_ENDPOINTS ? `/store/categories/${id}` : `/categorias/${id}`,
  categoryLanding: (id) => USE_NEW_ENDPOINTS ? `/store/categories/${id}/landing` : `/categorias/${id}/landing`,
  
  // Public data
  grades: USE_NEW_ENDPOINTS ? '/store/public/grades' : '/grados',
  subjects: USE_NEW_ENDPOINTS ? '/store/public/subjects' : '/materias',
  
  // Orders
  orders: USE_NEW_ENDPOINTS ? '/store/orders' : '/pedidos',
  orderById: (id) => USE_NEW_ENDPOINTS ? `/store/orders/${id}` : `/pedidos/${id}`,
  createOrder: USE_NEW_ENDPOINTS ? '/store/orders' : '/pedidos',
  publicOrder: USE_NEW_ENDPOINTS ? '/store/public/order' : '/pedidos/publico',
  
  // Students
  students: USE_NEW_ENDPOINTS ? '/store/students' : '/estudiantes',
  studentById: (id) => USE_NEW_ENDPOINTS ? `/store/students/${id}` : `/estudiantes/${id}`,
  studentAvailableBooks: (id) => USE_NEW_ENDPOINTS 
    ? `/store/students/${id}/available-books` 
    : `/estudiantes/${id}/libros-disponibles`,
  
  // Inventory (admin)
  inventory: USE_NEW_ENDPOINTS ? '/store/inventory' : '/admin/inventario',
  lowStock: USE_NEW_ENDPOINTS ? '/store/inventory/low-stock' : '/admin/inventario/bajo-stock',
  
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
  
  // Matches
  matches: '/pinpanclub/matches',
  activeMatches: '/pinpanclub/matches/active',
  matchById: (id) => `/pinpanclub/matches/${id}`,
  
  // Sponsors
  sponsors: '/pinpanclub/sponsors',
  sponsorById: (id) => `/pinpanclub/sponsors/${id}`,
  
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
