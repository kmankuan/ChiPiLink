import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { AUTH_ENDPOINTS } from '@/config/api';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));

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
  }, [checkAuth]);

  const login = async (email, password) => {
    const response = await api.post(AUTH_ENDPOINTS.login, { email, password });
    const { token: newToken, user } = response.data;
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
    setUser(user);
    return user;
  };

  const register = async (data) => {
    const response = await api.post(AUTH_ENDPOINTS.register, data);
    const { token: newToken, user } = response.data;
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
    setUser(user);
    return user;
  };

  const loginWithGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/auth/callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const processGoogleCallback = async (sessionId) => {
    try {
      // Get session data from Emergent
      const response = await api.get(AUTH_ENDPOINTS.session, {
        headers: { 'X-Session-ID': sessionId }
      });
      
      const { session_token, user } = response.data;
      
      // Set cookie via backend
      await api.post(AUTH_ENDPOINTS.session, { session_token });
      
      setUser(user);
      return user;
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
    isAdmin: user?.es_admin || false,
    login,
    register,
    loginWithGoogle,
    processGoogleCallback,
    logout,
    updateUser,
    checkAuth,
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
