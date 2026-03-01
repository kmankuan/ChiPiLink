import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import RESOLVED_API_URL from '@/config/apiUrl';

const BACKEND_URL = RESOLVED_API_URL;

const SiteConfigContext = createContext({
  siteConfig: {
    site_name: 'ChiPi Link',
    descripcion: 'Plataforma de comercio electrónico',
    color_primario: '#16a34a',
    color_secundario: '#0f766e',
    email_contacto: '',
    telefono_contacto: '',
    footer_texto: '© 2025 Todos los derechos reservados',
    landing_footer: 'A dream born from Covid-19',
    landing_footer_es: 'Un sueño nacido del Covid-19',
    landing_footer_zh: '源于新冠疫情的梦想'
  },
  loading: true,
  refreshConfig: () => {}
});

export function SiteConfigProvider({ children }) {
  const [siteConfig, setSiteConfig] = useState({
    site_name: 'ChiPi Link',
    descripcion: 'Plataforma de comercio electrónico',
    color_primario: '#16a34a',
    color_secundario: '#0f766e',
    email_contacto: '',
    telefono_contacto: '',
    footer_texto: '© 2025 Todos los derechos reservados',
    landing_footer: 'A dream born from Covid-19',
    landing_footer_es: 'Un sueño nacido del Covid-19',
    landing_footer_zh: '源于新冠疫情的梦想'
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
