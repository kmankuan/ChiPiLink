/**
 * Module Status Configuration
 * Defines the lifecycle status of each module in the app.
 * Admin can override these via the backend config.
 *
 * Statuses:
 *   production   — stable, no badge shown
 *   live_beta    — actively used but still being improved
 *   coming_soon  — not yet available
 *   maintenance  — temporarily disabled
 */

// Default module statuses (can be overridden by admin via API)
export const DEFAULT_MODULE_STATUS = {
  // Core modules
  home: { status: 'production' },
  unatienda: { status: 'live_beta', customLabel: 'Live Beta' },
  textbook_orders: { status: 'live_beta', customLabel: 'Live Beta' },
  orders: { status: 'live_beta', customLabel: 'Live Beta' },
  my_students: { status: 'live_beta', customLabel: 'Live Beta' },
  
  // PinPanClub modules
  pinpanclub: { status: 'live_beta', customLabel: 'Live Beta' },
  super_pin: { status: 'live_beta', customLabel: 'Live Beta' },
  rapid_pin: { status: 'coming_soon' },
  
  // Community
  events: { status: 'coming_soon' },
  gallery: { status: 'coming_soon' },
  players: { status: 'live_beta', customLabel: 'Live Beta' },
  
  // Admin
  admin_dashboard: { status: 'production' },
  admin_integrations: { status: 'live_beta', customLabel: 'Live Beta' },
};

// Module display names (for admin UI)
export const MODULE_NAMES = {
  home: 'Home',
  unatienda: 'Unatienda (Store)',
  textbook_orders: 'Textbook Orders',
  orders: 'My Orders',
  my_students: 'My Students',
  pinpanclub: 'PinPanClub',
  super_pin: 'Super Pin',
  rapid_pin: 'Rapid Pin',
  events: 'Events',
  gallery: 'Gallery',
  players: 'Players',
  admin_dashboard: 'Admin Dashboard',
  admin_integrations: 'Admin Integrations',
};
