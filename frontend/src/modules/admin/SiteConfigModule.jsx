import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { Save, Loader2, Globe, Palette } from 'lucide-react';

export default function SiteConfigModule() {
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    nombre_sitio: '',
    descripcion: '',
    logo_url: '',
    favicon_url: '',
    color_primario: '#16a34a',
    color_secundario: '#0f766e',
    email_contacto: '',
    telefono_contacto: '',
    direccion: '',
    footer_texto: ''
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/site-config');
      if (res.data) {
        setConfig(prev => ({ ...prev, ...res.data }));
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      await api.put('/admin/site-config', config);
      toast.success('Configuración guardada');
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* General Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Información General
          </CardTitle>
          <CardDescription>
            Configura el nombre y descripción de tu sitio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nombre del Sitio</Label>
              <Input
                value={config.nombre_sitio}
                onChange={(e) => setConfig({ ...config, nombre_sitio: e.target.value })}
                placeholder="Mi Tienda"
              />
            </div>
            <div>
              <Label>Email de Contacto</Label>
              <Input
                type="email"
                value={config.email_contacto}
                onChange={(e) => setConfig({ ...config, email_contacto: e.target.value })}
                placeholder="contacto@ejemplo.com"
              />
            </div>
          </div>
          
          <div>
            <Label>Descripción</Label>
            <Textarea
              value={config.descripcion}
              onChange={(e) => setConfig({ ...config, descripcion: e.target.value })}
              placeholder="Descripción de tu sitio"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Teléfono de Contacto</Label>
              <Input
                value={config.telefono_contacto}
                onChange={(e) => setConfig({ ...config, telefono_contacto: e.target.value })}
                placeholder="+507 6000-0000"
              />
            </div>
            <div>
              <Label>Dirección</Label>
              <Input
                value={config.direccion}
                onChange={(e) => setConfig({ ...config, direccion: e.target.value })}
                placeholder="Ciudad, País"
              />
            </div>
          </div>
          
          <div>
            <Label>Texto del Footer</Label>
            <Input
              value={config.footer_texto}
              onChange={(e) => setConfig({ ...config, footer_texto: e.target.value })}
              placeholder="© 2025 Mi Tienda. Todos los derechos reservados."
            />
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Marca y Colores
          </CardTitle>
          <CardDescription>
            Personaliza la apariencia de tu sitio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>URL del Logo</Label>
              <Input
                value={config.logo_url}
                onChange={(e) => setConfig({ ...config, logo_url: e.target.value })}
                placeholder="https://..."
              />
              {config.logo_url && (
                <img src={config.logo_url} alt="Logo" className="h-12 mt-2 rounded" />
              )}
            </div>
            <div>
              <Label>URL del Favicon</Label>
              <Input
                value={config.favicon_url}
                onChange={(e) => setConfig({ ...config, favicon_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Color Primario</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={config.color_primario}
                  onChange={(e) => setConfig({ ...config, color_primario: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={config.color_primario}
                  onChange={(e) => setConfig({ ...config, color_primario: e.target.value })}
                  placeholder="#16a34a"
                />
              </div>
            </div>
            <div>
              <Label>Color Secundario</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={config.color_secundario}
                  onChange={(e) => setConfig({ ...config, color_secundario: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={config.color_secundario}
                  onChange={(e) => setConfig({ ...config, color_secundario: e.target.value })}
                  placeholder="#0f766e"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={saveConfig} disabled={saving} className="w-full gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Guardar Configuración
      </Button>
    </div>
  );
}
