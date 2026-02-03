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
import ImageUploader from '@/components/common/ImageUploader';

export default function SiteConfigModule() {
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    site_name: '',
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

  // Helper to safely get string value from potentially multilingual objects
  const safeString = (value) => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') return value.es || value.en || '';
    return '';
  };

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/site-config');
      if (res.data) {
        const data = res.data;
        setConfig({
          site_name: safeString(data.site_name),
          descripcion: safeString(data.description),
          logo_url: safeString(data.logo_url),
          favicon_url: safeString(data.favicon_url),
          color_primario: data.color_primario || '#16a34a',
          color_secundario: data.color_secundario || '#0f766e',
          email_contacto: safeString(data.email_contacto),
          telefono_contacto: safeString(data.telefono_contacto),
          direccion: safeString(data.direccion),
          footer_texto: safeString(data.footer_texto)
        });
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
                value={config.site_name || ''}
                onChange={(e) => setConfig({ ...config, site_name: e.target.value })}
                placeholder="Mi Tienda"
              />
            </div>
            <div>
              <Label>Email de Contacto</Label>
              <Input
                type="email"
                value={config.email_contacto || ''}
                onChange={(e) => setConfig({ ...config, email_contacto: e.target.value })}
                placeholder="contacto@ejemplo.com"
              />
            </div>
          </div>
          
          <div>
            <Label>Descripción</Label>
            <Textarea
              value={config.description || ''}
              onChange={(e) => setConfig({ ...config, descripcion: e.target.value })}
              placeholder="Descripción de tu sitio"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Teléfono de Contacto</Label>
              <Input
                value={config.telefono_contacto || ''}
                onChange={(e) => setConfig({ ...config, telefono_contacto: e.target.value })}
                placeholder="+507 6000-0000"
              />
            </div>
            <div>
              <Label>Dirección</Label>
              <Input
                value={config.direccion || ''}
                onChange={(e) => setConfig({ ...config, direccion: e.target.value })}
                placeholder="Ciudad, País"
              />
            </div>
          </div>
          
          <div>
            <Label>Texto del Footer</Label>
            <Input
              value={config.footer_texto || ''}
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
            <ImageUploader
              label="Logo del Sitio"
              value={config.logo_url}
              onChange={(url) => setConfig({ ...config, logo_url: url })}
              aspectRatio="4/1"
              maxSize={2}
            />
            <ImageUploader
              label="Favicon (Icono de pestaña)"
              value={config.favicon_url}
              onChange={(url) => setConfig({ ...config, favicon_url: url })}
              aspectRatio="1/1"
              maxSize={1}
            />
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
