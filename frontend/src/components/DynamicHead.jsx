import { useEffect } from 'react';

/**
 * DynamicHead Component
 * Dynamically updates document head meta tags based on site configuration
 * 
 * @param {Object} siteConfig - Site configuration from API
 */
export default function DynamicHead({ siteConfig }) {
  useEffect(() => {
    if (!siteConfig) return;

    // Update document title
    const title = siteConfig.meta_titulo || siteConfig.nombre_sitio || 'ChiPi Link';
    document.title = title;

    // Helper function to update or create meta tag
    const updateMetaTag = (selector, attribute, content) => {
      if (!content) return;
      
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        if (selector.includes('property=')) {
          element.setAttribute('property', selector.match(/property="([^"]+)"/)[1]);
        } else if (selector.includes('name=')) {
          element.setAttribute('name', selector.match(/name="([^"]+)"/)[1]);
        }
        document.head.appendChild(element);
      }
      element.setAttribute(attribute, content);
    };

    // Update meta description
    const description = siteConfig.meta_descripcion || siteConfig.description;
    if (description) {
      updateMetaTag('meta[name="description"]', 'content', description);
    }

    // Update meta keywords
    if (siteConfig.meta_keywords) {
      updateMetaTag('meta[name="keywords"]', 'content', siteConfig.meta_keywords);
    }

    // Update Open Graph tags for social sharing
    updateMetaTag('meta[property="og:title"]', 'content', title);
    if (description) {
      updateMetaTag('meta[property="og:description"]', 'content', description);
    }
    if (siteConfig.og_image) {
      updateMetaTag('meta[property="og:image"]', 'content', siteConfig.og_image);
    }

    // Update Twitter Card tags
    updateMetaTag('meta[name="twitter:card"]', 'content', 'summary_large_image');
    updateMetaTag('meta[name="twitter:title"]', 'content', title);
    if (description) {
      updateMetaTag('meta[name="twitter:description"]', 'content', description);
    }
    if (siteConfig.og_image) {
      updateMetaTag('meta[name="twitter:image"]', 'content', siteConfig.og_image);
    }

    // Update favicon
    if (siteConfig.favicon_url) {
      let favicon = document.querySelector('link[rel="icon"]');
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.href = siteConfig.favicon_url;
    }

    // Update theme color based on primary color
    if (siteConfig.color_primario) {
      let themeColor = document.querySelector('meta[name="theme-color"]');
      if (!themeColor) {
        themeColor = document.createElement('meta');
        themeColor.name = 'theme-color';
        document.head.appendChild(themeColor);
      }
      themeColor.content = siteConfig.color_primario;
    }

    // Add Google Analytics if configured
    if (siteConfig.google_analytics_id && !window.gaInitialized) {
      const gaScript = document.createElement('script');
      gaScript.async = true;
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${siteConfig.google_analytics_id}`;
      document.head.appendChild(gaScript);

      const gaConfigScript = document.createElement('script');
      gaConfigScript.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${siteConfig.google_analytics_id}');
      `;
      document.head.appendChild(gaConfigScript);
      window.gaInitialized = true;
    }

  }, [siteConfig]);

  // This component doesn't render anything
  return null;
}

/**
 * Hook to easily use site config meta tags
 */
export function useDynamicHead(siteConfig) {
  useEffect(() => {
    if (!siteConfig) return;

    // Update title
    document.title = siteConfig.meta_titulo || siteConfig.nombre_sitio || 'ChiPi Link';
  }, [siteConfig]);
}
