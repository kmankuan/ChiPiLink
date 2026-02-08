import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
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

  const [uiStyles, setUIStyles] = useState(null); // { public: {...}, admin: {...} }
  const [scope, setScope] = useState('public'); // 'public' or 'admin'
  const [isPreviewMode, setIsPreviewMode] = useState(false);

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
      // Check for preview mode (admin previewing unsaved public theme)
      const urlParams = new URLSearchParams(window.location.search);
      const isPreview = urlParams.get('preview_theme') === '1';

      if (isPreview) {
        try {
          const previewRaw = localStorage.getItem('chipi_preview_style');
          if (previewRaw) {
            const previewStyle = JSON.parse(previewRaw);
            setUIStyles({ public: previewStyle, admin: previewStyle });
            // Clean up after loading — one-time use
            localStorage.removeItem('chipi_preview_style');
            return;
          }
        } catch {
          // Fall through to normal fetch
        }
      }

      try {
        const { data } = await axios.get(`${API_URL}/api/public/ui-style`);
        // Handle both old format ({style: ...}) and new format ({public: ..., admin: ...})
        if (data.public) {
          setUIStyles({ public: data.public, admin: data.admin });
        } else if (data.style) {
          setUIStyles({ public: data.style, admin: data.style });
        }
      } catch {
        // Silently fail — defaults from CSS will apply
      }
    };
    fetchStyle();
  }, []);

  // Active style based on scope
  const activeStyle = useMemo(() => {
    if (!uiStyles) return null;
    return uiStyles[scope] || uiStyles.public;
  }, [uiStyles, scope]);

  // Re-apply UI style whenever theme (dark/light), scope, or uiStyles changes
  useEffect(() => {
    if (activeStyle) {
      applyUIStyle(activeStyle, theme);
    }
  }, [activeStyle, theme]);

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
      if (data.public) {
        setUIStyles({ public: data.public, admin: data.admin });
      } else if (data.style) {
        setUIStyles({ public: data.style, admin: data.style });
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, uiStyle: activeStyle, uiStyles, scope, setScope, refreshUIStyle }}>
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
