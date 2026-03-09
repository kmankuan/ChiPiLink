/**
 * LayoutProvider — Applies the active public layout CSS classes.
 * Each layout changes how the Header, BottomNav, and content area behave.
 *
 * Layouts:
 *   mobile_app   — Bottom tab nav, full-width cards (default, current)
 *   storefront   — Top category bar, wider content, no bottom nav on desktop
 *   portal       — Left sidebar nav on desktop, content shifted right
 *   single_page  — Sticky nav, scrollable sections, no bottom nav
 *   chat_app     — Full-height, floating action btn, compact header
 *   card_grid    — Masonry grid, filter bar, no bottom nav on desktop
 *   china_panama — Decorative borders, symmetrical layout, cultural motifs
 */
import { createContext, useContext, useEffect, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

const LayoutContext = createContext({ layout: 'mobile_app' });

export function useLayout() {
  return useContext(LayoutContext);
}

// Layout-specific CSS injected into <head>
const LAYOUT_STYLES = {
  mobile_app: `
    [data-layout="mobile_app"] .app-content { padding-bottom: 68px; }
    @media (min-width: 1024px) { [data-layout="mobile_app"] .bottom-nav { display: none; } }
  `,
  // Structural layouts — minimal CSS, structure handled by JSX components
  bento_grid: `
    @media (min-width: 1024px) { [data-layout="bento_grid"] .bottom-nav { display: none; } }
  `,
  tab_hub: `
    [data-layout="tab_hub"] .app-content { padding-bottom: 68px; }
    @media (min-width: 1024px) { [data-layout="tab_hub"] .bottom-nav { display: none; } }
  `,
  social_feed: `
    [data-layout="social_feed"] .app-content { padding-bottom: 68px; }
    @media (min-width: 1024px) { [data-layout="social_feed"] .bottom-nav { display: none; } }
  `,
  magazine: `
    @media (min-width: 1024px) { [data-layout="magazine"] .bottom-nav { display: none; } }
  `,
  storefront: `
    [data-layout="storefront"] .bottom-nav { display: none; }
    @media (min-width: 1024px) {
      [data-layout="storefront"] .app-content { max-width: 1280px; margin: 0 auto; }
      [data-layout="storefront"] .site-header { border-bottom: 2px solid hsl(var(--border)); }
    }
  `,
  portal: `
    @media (min-width: 1024px) {
      [data-layout="portal"] .bottom-nav { display: none; }
      [data-layout="portal"] .site-header { position: fixed; top: 0; left: 0; right: 0; z-index: 50; }
      [data-layout="portal"] .app-content { margin-left: 0; padding-top: 56px; }
    }
  `,
  single_page: `
    [data-layout="single_page"] .bottom-nav { display: none; }
    [data-layout="single_page"] .site-header { position: sticky; top: 0; z-index: 50; backdrop-filter: blur(12px); background: hsl(var(--background) / 0.85); }
    [data-layout="single_page"] .app-content { scroll-behavior: smooth; }
  `,
  chat_app: `
    [data-layout="chat_app"] .app-content { height: calc(100vh - 48px); overflow: hidden; display: flex; flex-direction: column; }
    [data-layout="chat_app"] .site-header { height: 48px; min-height: 48px; }
    [data-layout="chat_app"] .bottom-nav { display: none; }
  `,
  card_grid: `
    @media (min-width: 1024px) { [data-layout="card_grid"] .bottom-nav { display: none; } }
    [data-layout="card_grid"] .app-content { padding-bottom: 68px; }
  `,
  china_panama: `
    [data-layout="china_panama"] .site-header {
      background: linear-gradient(135deg, hsl(0 72% 51% / 0.05), hsl(45 80% 55% / 0.08));
      border-bottom: 2px solid hsl(0 72% 51% / 0.15);
    }
    [data-layout="china_panama"] .app-content {
      padding-bottom: 68px;
    }
    [data-layout="china_panama"] .landing-hero {
      background: linear-gradient(135deg, hsl(0 72% 51% / 0.08) 0%, hsl(45 80% 55% / 0.12) 50%, hsl(220 70% 50% / 0.06) 100%);
      border: 1px solid hsl(45 80% 55% / 0.2);
      position: relative;
    }
    [data-layout="china_panama"] .landing-hero::before {
      content: '';
      position: absolute;
      top: 8px; left: 8px; right: 8px; bottom: 8px;
      border: 1px solid hsl(0 72% 51% / 0.12);
      border-radius: inherit;
      pointer-events: none;
    }
    [data-layout="china_panama"] .quick-access-card {
      border: 1px solid hsl(45 80% 55% / 0.25);
      box-shadow: 0 2px 8px hsl(0 72% 51% / 0.06);
    }
    [data-layout="china_panama"] .section-header-icon {
      background: linear-gradient(135deg, hsl(0 72% 51% / 0.15), hsl(45 80% 55% / 0.15));
      border: 1px solid hsl(45 80% 55% / 0.3);
    }
    @media (min-width: 1024px) {
      [data-layout="china_panama"] .bottom-nav { display: none; }
    }
  `,
};

export function LayoutProvider({ children }) {
  const { uiStyle } = useTheme();
  const layout = useMemo(() => uiStyle?.layout || 'mobile_app', [uiStyle]);

  // Apply layout data attribute to root
  useEffect(() => {
    document.documentElement.dataset.layout = layout;
    return () => { delete document.documentElement.dataset.layout; };
  }, [layout]);

  // Inject layout-specific CSS
  useEffect(() => {
    const styleId = 'chipi-layout-styles';
    let el = document.getElementById(styleId);
    if (!el) {
      el = document.createElement('style');
      el.id = styleId;
      document.head.appendChild(el);
    }
    el.textContent = LAYOUT_STYLES[layout] || LAYOUT_STYLES.mobile_app;
    return () => { el.textContent = ''; };
  }, [layout]);

  return (
    <LayoutContext.Provider value={{ layout }}>
      {children}
    </LayoutContext.Provider>
  );
}
