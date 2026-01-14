/**
 * CXGenie Ticket Widget Component
 * Loads the CXGenie ticket widget dynamically based on backend configuration
 */
import { useEffect, useState } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export function CXGenieWidget() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch widget configuration from backend
    const loadWidget = async () => {
      try {
        const response = await fetch(`${API_URL}/api/cxgenie/widget-code`);
        
        if (!response.ok) {
          console.log('CXGenie widget config not available');
          return;
        }
        
        const data = await response.json();

        // If widget is not active, don't load anything
        if (!data.activo || !data.widget_id || !data.script_url) {
          console.log('CXGenie widget not active or missing configuration');
          return;
        }

        // Check if script already exists
        const existingScript = document.querySelector('script[data-bid], script[data-aid]');
        if (existingScript) {
          console.log('CXGenie widget already loaded');
          setLoaded(true);
          return;
        }

        // Create and inject the script with error handling
        const script = document.createElement('script');
        script.src = data.script_url;
        
        // Use the correct data attribute based on widget type
        const dataAttr = data.data_attribute || 'data-bid';
        script.setAttribute(dataAttr.replace('data-', ''), data.widget_id);
        script.setAttribute('data-lang', data.lang || 'es');
        script.async = true;
        
        script.onload = () => {
          console.log(`CXGenie ${data.widget_type || 'ticket'} widget loaded successfully`);
          setLoaded(true);
        };
        
        // Silent error handling - don't throw or display errors
        script.onerror = (event) => {
          // Prevent the error from propagating
          if (event && event.preventDefault) {
            event.preventDefault();
          }
          console.warn('CXGenie widget script could not be loaded - support chat unavailable');
          setError('Widget unavailable');
          // Don't rethrow - just silently fail
        };

        document.body.appendChild(script);
      } catch (err) {
        // Silent fail - don't propagate errors
        console.warn('CXGenie widget not available:', err.message);
        setError(err.message);
      }
    };

    // Wrap in try-catch to prevent any unhandled errors
    try {
      loadWidget();
    } catch (e) {
      console.warn('Error initializing CXGenie:', e);
    }

    // Cleanup on unmount
    return () => {
      // Note: We don't remove the script on unmount to avoid flicker
    };
  }, []);

  // This component doesn't render anything visible
  return null;
}

export default CXGenieWidget;
