import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { AUTH_ENDPOINTS } from '@/config/api';

const AuthContext = createContext(null);

import RESOLVED_API_URL from '@/config/apiUrl';
const API_URL = RESOLVED_API_URL;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  const [laopanConfig, setLaopanConfig] = useState(null);

  // Create API instance with dynamic token using interceptors
  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: `${API_URL}/api`
    });

    // Add request interceptor to always use the latest token
    instance.interceptors.request.use((config) => {
      const currentToken = localStorage.getItem('auth_token');
      if (currentToken) {
        config.headers.Authorization = `Bearer ${currentToken}`;
      }
      return config;
    });

    return instance;
  }, []);

  // Fetch LaoPan OAuth configuration
  const fetchLaopanConfig = useCallback(async (attempt = 1) => {
    try {
      const response = await api.get(AUTH_ENDPOINTS.laopanConfig);
      setLaopanConfig(response.data);
    } catch (error) {
      console.error(`LaoPan config fetch error (attempt ${attempt}):`, error?.message);
      if (attempt < 2) {
        setTimeout(() => fetchLaopanConfig(attempt + 1), 1000);
      } else {
        setLaopanConfig({ enabled: false });
      }
    }
  }, [api]);

  const checkAuth = useCallback(async () => {
    const currentToken = localStorage.getItem('auth_token');
    if (!currentToken) {
      setLoading(false);
      return;
    }
    
    // Try up to 3 times — only clear token if server explicitly says "invalid token"
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await api.get(AUTH_ENDPOINTS.me);
        setUser(response.data);
        setLoading(false);
        return;
      } catch (error) {
        const status = error.response?.status;
        const detail = error.response?.data?.detail || '';
        
        // Only clear token if server EXPLICITLY says token is invalid/expired
        // Not on network errors, 500s, 502s, or timeouts
        const isTokenError = status === 401 && (
          detail.includes('expired') || detail.includes('Invalid token') || detail.includes('Not authenticated')
        );
        if (isTokenError) {
          setUser(null);
          localStorage.removeItem('auth_token');
          setToken(null);
          setLoading(false);
          return;
        }
        
        // Server error or network issue — retry, DON'T clear token
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, (attempt + 1) * 1500));
          continue;
        }
        
        // All retries failed but NOT a confirmed invalid token — keep token, user stays logged in
        // They can still navigate the app, and next API call might work
        console.warn('Auth check failed after 3 attempts, keeping session active');
      }
    }
    setLoading(false);
  }, [api]);

  useEffect(() => {
    checkAuth();
    fetchLaopanConfig();
  }, [checkAuth, fetchLaopanConfig]);

  const login = async (email, password) => {
    const response = await api.post(AUTH_ENDPOINTS.login, { email, password });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const register = async (data) => {
    const response = await api.post(AUTH_ENDPOINTS.register, data);
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const loginWithGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/auth/callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  // LaoPan OAuth login
  const loginWithLaoPan = async (redirectAfter = null) => {
    const CACHE_KEY = 'laopan_auth_url';
    const params = redirectAfter ? `?redirect=${encodeURIComponent(redirectAfter)}` : '';
    
    // Try to get auth URL from backend (with retry)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await api.get(`${AUTH_ENDPOINTS.laopanLogin}${params}`);
        const { auth_url } = response.data;
        if (auth_url) {
          // Cache the base auth URL for offline use
          try { localStorage.setItem(CACHE_KEY, auth_url); } catch {}
          window.location.href = auth_url;
          return;
        }
      } catch (error) {
        console.warn(`LaoPan login attempt ${attempt + 1} failed:`, error?.message);
        if (attempt === 0) {
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
      }
    }

    // Fallback: use cached auth URL (includes state from previous successful attempt)
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      console.log('Using cached LaoPan auth URL');
      window.location.href = cached;
      return;
    }

    // No cache, no backend — show error
    throw new Error('Unable to connect to login server. Please try again in a moment.');
  };

  // Process LaoPan OAuth callback
  const processLaoPanCallback = async (code, state) => {
    try {
      const response = await api.get(AUTH_ENDPOINTS.laopanCallback, {
        params: { code, state }
      });
      
      const { token: newToken, user: userData, redirect_after } = response.data;
      
      localStorage.setItem('auth_token', newToken);
      setToken(newToken);
      setUser(userData);
      
      return { user: userData, redirectAfter: redirect_after };
    } catch (error) {
      console.error('LaoPan callback error:', error);
      throw error;
    }
  };

  const processGoogleCallback = async (sessionId) => {
    try {
      // Get session data from Emergent
      const response = await api.get(AUTH_ENDPOINTS.session, {
        headers: { 'X-Session-ID': sessionId }
      });
      
      const { session_token, user: userData } = response.data;
      
      // Set cookie via backend
      await api.post(AUTH_ENDPOINTS.session, { session_token });
      
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Google auth error:', error);
      throw error;
    }
  };

  const logout = async () => {
    // If impersonating, just exit impersonation
    const impersonating = localStorage.getItem('impersonate_original_token');
    if (impersonating) {
      exitImpersonation();
      return;
    }
    try {
      await api.post(AUTH_ENDPOINTS.logout);
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('auth_token');
    // Clear permissions cache on logout
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-logout'));
    }
    setToken(null);
    setUser(null);
  };

  const startImpersonation = (impToken, targetUser) => {
    // Save original admin token
    const originalToken = localStorage.getItem('auth_token');
    localStorage.setItem('impersonate_original_token', originalToken);
    localStorage.setItem('impersonate_target', JSON.stringify(targetUser));
    // Switch to impersonation token
    localStorage.setItem('auth_token', impToken);
    setToken(impToken);
    setUser(null);
    // Redirect to user view and reload
    window.location.href = '/';
  };

  const exitImpersonation = () => {
    const originalToken = localStorage.getItem('impersonate_original_token');
    localStorage.removeItem('impersonate_original_token');
    localStorage.removeItem('impersonate_target');
    if (originalToken) {
      localStorage.setItem('auth_token', originalToken);
      setToken(originalToken);
      setUser(null);
      window.location.href = '/admin';
    }
  };

  const isImpersonating = !!localStorage.getItem('impersonate_original_token');
  const impersonationTarget = isImpersonating
    ? JSON.parse(localStorage.getItem('impersonate_target') || '{}')
    : null;

  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  const value = {
    user,
    loading,
    token,
    isAuthenticated: !!user,
    // Use English field name is_admin
    isAdmin: user?.is_admin || false,
    login,
    register,
    loginWithGoogle,
    loginWithLaoPan,
    processLaoPanCallback,
    processGoogleCallback,
    logout,
    updateUser,
    checkAuth,
    laopanConfig,
    api,
    // Impersonation
    startImpersonation,
    exitImpersonation,
    isImpersonating,
    impersonationTarget,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
