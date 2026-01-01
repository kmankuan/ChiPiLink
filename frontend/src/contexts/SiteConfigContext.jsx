import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const SiteConfigContext = createContext({
  siteConfig: {
    nombre_sitio: 'Mi Tienda',
    descripcion: 'Plataforma de comercio electrónico',
    color_primario: '#16a34a',
    color_secundario: '#0f766e',
    email_contacto: '',
    telefono_contacto: '',
    footer_texto: '© 2025 Todos los derechos reservados'
  },
  loading: true,
  refreshConfig: () => {}
});

export function SiteConfigProvider({ children }) {
  const [siteConfig, setSiteConfig] = useState({
    nombre_sitio: 'Mi Tienda',
    descripcion: 'Plataforma de comercio electrónico',
    color_primario: '#16a34a',
    color_secundario: '#0f766e',
    email_contacto: '',
    telefono_contacto: '',
    footer_texto: '© 2025 Todos los derechos reservados'
  });
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/public/site-config`);
      setSiteConfig(response.data);
    } catch (error) {
      console.error('Error fetching site config:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const refreshConfig = () => {
    fetchConfig();
  };

  return (
    <SiteConfigContext.Provider value={{ siteConfig, loading, refreshConfig }}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}
