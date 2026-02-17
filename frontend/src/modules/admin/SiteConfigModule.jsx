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
import { Save, Loader2, Globe, Palette, LogIn } from 'lucide-react';
import ImageUploader from '@/components/common/ImageUploader';
import { useTranslation } from 'react-i18next';

export default function SiteConfigModule() {
  const { api } = useAuth();
  const { t } = useTranslation();
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
    footer_texto: '',
    login_bg_image: '',
    login_bg_overlay_color: '',
    login_bg_overlay_opacity: 0.7,
    login_heading: '',
    login_subtext: '',
    login_layout: 'split',
    login_logo_size: 'md',
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
          footer_texto: safeString(data.footer_texto),
          login_bg_image: safeString(data.login_bg_image),
          login_bg_overlay_color: data.login_bg_overlay_color || '',
          login_bg_overlay_opacity: data.login_bg_overlay_opacity ?? 0.7,
          login_heading: safeString(data.login_heading),
          login_subtext: safeString(data.login_subtext),
          login_layout: data.login_layout || 'split',
          login_logo_size: data.login_logo_size || 'md',
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
      toast.success(t('siteConfig.configSaved'));
    } catch (error) {
      toast.error(t('siteConfig.saveError'));
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
            {t('siteConfig.title')}
          </CardTitle>
          <CardDescription>
            {t('siteConfig.titleDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('siteConfig.siteName')}</Label>
              <Input
                value={config.site_name || ''}
                onChange={(e) => setConfig({ ...config, site_name: e.target.value })}
                placeholder="Mi Tienda"
              />
            </div>
            <div>
              <Label>{t('siteConfig.contactEmail')}</Label>
              <Input
                type="email"
                value={config.email_contacto || ''}
                onChange={(e) => setConfig({ ...config, email_contacto: e.target.value })}
                placeholder="contacto@ejemplo.com"
              />
            </div>
          </div>
          
          <div>
            <Label>{t('siteConfig.description')}</Label>
            <Textarea
              value={config.description || ''}
              onChange={(e) => setConfig({ ...config, descripcion: e.target.value })}
              placeholder={t('siteConfig.descPlaceholder')}
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('siteConfig.contactPhone')}</Label>
              <Input
                value={config.telefono_contacto || ''}
                onChange={(e) => setConfig({ ...config, telefono_contacto: e.target.value })}
                placeholder="+507 6000-0000"
              />
            </div>
            <div>
              <Label>{t('siteConfig.address')}</Label>
              <Input
                value={config.direccion || ''}
                onChange={(e) => setConfig({ ...config, direccion: e.target.value })}
                placeholder="Ciudad, País"
              />
            </div>
          </div>
          
          <div>
            <Label>{t('siteConfig.footerText')}</Label>
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
            {t('siteConfig.brandTitle')}
          </CardTitle>
          <CardDescription>
            {t('siteConfig.brandDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ImageUploader
              label={t('siteConfig.siteLogo')}
              value={config.logo_url}
              onChange={(url) => setConfig({ ...config, logo_url: url })}
              aspectRatio="4/1"
              maxSize={2}
            />
            <ImageUploader
              label={t('siteConfig.favicon')}
              value={config.favicon_url}
              onChange={(url) => setConfig({ ...config, favicon_url: url })}
              aspectRatio="1/1"
              maxSize={1}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('siteConfig.primaryColor')}</Label>
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
              <Label>{t('siteConfig.secondaryColor')}</Label>
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
        {t('siteConfig.saveConfig')}
      </Button>
    </div>
  );
}
