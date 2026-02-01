import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { AUTH_ENDPOINTS } from '@/config/api';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL;

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
  const fetchLaopanConfig = useCallback(async () => {
    try {
      const response = await api.get(AUTH_ENDPOINTS.laopanConfig);
      setLaopanConfig(response.data);
    } catch (error) {
      console.error('LaoPan config fetch error:', error);
      setLaopanConfig({ enabled: false });
    }
  }, [api]);

  const checkAuth = useCallback(async () => {
    const currentToken = localStorage.getItem('auth_token');
    if (!currentToken) {
      setLoading(false);
      return;
    }
    
    try {
      const response = await api.get(AUTH_ENDPOINTS.me);
      setUser(response.data);
    } catch (error) {
      console.error('Auth check error:', error);
      // Only clear auth on 401 (unauthorized) - token is invalid/expired
      // Don't clear on network errors or other issues
      if (error.response?.status === 401 || error.response?.status === 403) {
        setUser(null);
        localStorage.removeItem('auth_token');
        setToken(null);
      }
      // For network errors or other issues, keep the existing user state
      // This prevents accidental logouts due to temporary connectivity issues
    } finally {
      setLoading(false);
    }
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
    try {
      const params = redirectAfter ? `?redirect=${encodeURIComponent(redirectAfter)}` : '';
      const response = await api.get(`${AUTH_ENDPOINTS.laopanLogin}${params}`);
      const { auth_url } = response.data;
      
      if (auth_url) {
        // Redirect to LaoPan OAuth
        window.location.href = auth_url;
      }
    } catch (error) {
      console.error('LaoPan login error:', error);
      throw error;
    }
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
    api
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
