/**
 * Runtime API URL resolver
 * 
 * React's process.env.REACT_APP_* is replaced at BUILD TIME, which can become stale
 * in production deployments. This module detects the correct URL at runtime.
 */
function resolveApiUrl() {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Production: .emergent.host domain — use current origin
    if (hostname.endsWith('.emergent.host')) {
      return window.location.origin;
    }
    // Preview: .preview.emergentagent.com — use current origin  
    if (hostname.endsWith('.preview.emergentagent.com')) {
      return window.location.origin;
    }
  }
  // Fallback to build-time env var (local dev)
  return process.env.REACT_APP_BACKEND_URL || '';
}

const API_URL = resolveApiUrl();
export default API_URL;
