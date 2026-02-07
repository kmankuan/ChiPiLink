import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { applyUIStyle, clearUIStyle } from '@/config/uiStylePresets';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  });

  const [uiStyle, setUIStyle] = useState(null);

  // Apply dark/light class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Fetch UI style from API on mount
  useEffect(() => {
    const fetchStyle = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/public/ui-style`);
        setUIStyle(data.style);
      } catch {
        // Silently fail — defaults from CSS will apply
      }
    };
    fetchStyle();
  }, []);

  // Re-apply UI style whenever theme (dark/light) or uiStyle changes
  useEffect(() => {
    if (uiStyle) {
      applyUIStyle(uiStyle, theme);
    }
  }, [uiStyle, theme]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Allow admin to refresh style after saving
  const refreshUIStyle = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/public/ui-style`);
      setUIStyle(data.style);
    } catch {
      // ignore
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, uiStyle, refreshUIStyle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
