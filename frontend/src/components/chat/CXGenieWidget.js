/**
 * CXGenie Ticket Widget Component
 * Loads the CXGenie ticket widget dynamically based on backend configuration
 */
import { useEffect, useState } from 'react';

const API_URL = import.meta.env.REACT_APP_BACKEND_URL || '';

export function CXGenieWidget() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch widget configuration from backend
    const loadWidget = async () => {
      try {
        const response = await fetch(`${API_URL}/api/cxgenie/widget-code`);
        const data = await response.json();

        if (!data.activo || !data.widget_id) {
          console.log('CXGenie widget not active');
          return;
        }

        // Check if script already exists
        const existingScript = document.querySelector('script[data-bid], script[data-aid]');
        if (existingScript) {
          console.log('CXGenie widget already loaded');
          setLoaded(true);
          return;
        }

        // Create and inject the script
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
        
        script.onerror = () => {
          console.error('Failed to load CXGenie widget');
          setError('Failed to load ticket widget');
        };

        document.body.appendChild(script);
      } catch (err) {
        console.error('Error loading CXGenie config:', err);
        setError(err.message);
      }
    };

    loadWidget();

    // Cleanup on unmount
    return () => {
      // Note: We don't remove the script on unmount to avoid flicker
      // The widget handles its own lifecycle
    };
  }, []);

  // This component doesn't render anything visible
  // The widget is injected by CXGenie's script
  return null;
}

export default CXGenieWidget;
