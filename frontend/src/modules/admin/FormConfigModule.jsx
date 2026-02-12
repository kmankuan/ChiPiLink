import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { Save, Loader2, Copy, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function FormConfigModule() {
  const { t } = useTranslation();
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    titulo: 'Formulario de Pedido',
    descripcion: 'Complete el formulario para ordenar',
    mostrar_precios: true,
    metodos_pago: ['transferencia_bancaria', 'yappy'],
    mensaje_exito: '¡Gracias! Su pedido ha sido recibido.',
    color_primario: '#166534'
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/config-formulario');
      if (res.data) {
        setConfig(res.data);
      }
    } catch (error) {
      console.error('Error loading form config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      await api.put('/admin/config-formulario', config);
      toast.success(t("formConfig.configSaved"));
    } catch (error) {
      toast.error(t("formConfig.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const copyEmbedUrl = () => {
    const url = `${window.location.origin}/embed/orden`;
    navigator.clipboard.writeText(url);
    toast.success(t("formConfig.urlCopied"));
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
      {/* Form Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración del Formulario</CardTitle>
          <CardDescription>
            Personaliza el formulario de pedidos público
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Título del Formulario</Label>
            <Input
              value={config.titulo}
              onChange={(e) => setConfig({ ...config, titulo: e.target.value })}
            />
          </div>
          
          <div>
            <Label>Descripción</Label>
            <Textarea
              value={config.description}
              onChange={(e) => setConfig({ ...config, descripcion: e.target.value })}
              rows={2}
            />
          </div>
          
          <div>
            <Label>Mensaje de Éxito</Label>
            <Textarea
              value={config.mensaje_exito}
              onChange={(e) => setConfig({ ...config, mensaje_exito: e.target.value })}
              rows={2}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Mostrar Precios</Label>
              <p className="text-sm text-muted-foreground">Muestra los precios en el formulario</p>
            </div>
            <Switch
              checked={config.mostrar_precios}
              onCheckedChange={(v) => setConfig({ ...config, mostrar_precios: v })}
            />
          </div>
          
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
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Embed URL */}
      <Card>
        <CardHeader>
          <CardTitle>URL del Formulario</CardTitle>
          <CardDescription>
            Comparte esta URL o incrústala en tu sitio web
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              readOnly
              value={`${window.location.origin}/embed/orden`}
              className="font-mono text-sm"
            />
            <Button variant="outline" onClick={copyEmbedUrl}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.open('/embed/orden', '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
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
