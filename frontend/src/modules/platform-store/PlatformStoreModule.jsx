import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Store,
  CreditCard,
  Settings,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Save,
  TestTube,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function PlatformStoreModule() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState({
    store: {
      nombre: 'Unatienda',
      descripcion: 'Tienda oficial de la plataforma',
      logo_url: '',
      activo: true
    },
    yappy: {
      merchant_id: '',
      secret_key: '',
      url_domain: '',
      activo: false,
      ambiente: 'pruebas'
    }
  });
  const [showSecretKey, setShowSecretKey] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BACKEND_URL}/api/platform-store/admin/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfig(response.data);
    } catch (error) {
      toast.error('Error cargando configuración');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      await axios.put(`${BACKEND_URL}/api/platform-store/admin/config`, config, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Configuración guardada');
    } catch (error) {
      toast.error('Error guardando configuración');
    } finally {
      setSaving(false);
    }
  };

  const testYappy = async () => {
    try {
      setTesting(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(`${BACKEND_URL}/api/platform-store/admin/yappy/test`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error probando conexión');
    } finally {
      setTesting(false);
    }
  };

  const updateStoreConfig = (field, value) => {
    setConfig(prev => ({
      ...prev,
      store: { ...prev.store, [field]: value }
    }));
  };

  const updateYappyConfig = (field, value) => {
    setConfig(prev => ({
      ...prev,
      yappy: { ...prev.yappy, [field]: value }
    }));
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
            <Store className="h-6 w-6" />
            Unatienda
          </h2>
          <p className="text-muted-foreground">
            Tienda exclusiva de la plataforma con integración Yappy
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={config.store.activo ? "default" : "secondary"}>
            {config.store.activo ? "Activa" : "Inactiva"}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="yappy" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Yappy Comercial
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de la Tienda</CardTitle>
              <CardDescription>
                Información básica de Unatienda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Tienda Activa</Label>
                  <p className="text-sm text-muted-foreground">
                    Activar o desactivar la tienda de la plataforma
                  </p>
                </div>
                <Switch
                  checked={config.store.activo}
                  onCheckedChange={(v) => updateStoreConfig('activo', v)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre de la Tienda</Label>
                <Input
                  id="nombre"
                  value={config.store.nombre}
                  onChange={(e) => updateStoreConfig('nombre', e.target.value)}
                  placeholder="Unatienda"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={config.store.descripcion}
                  onChange={(e) => updateStoreConfig('descripcion', e.target.value)}
                  placeholder="Descripción de la tienda"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo_url">URL del Logo</Label>
                <Input
                  id="logo_url"
                  value={config.store.logo_url}
                  onChange={(e) => updateStoreConfig('logo_url', e.target.value)}
                  placeholder="https://..."
                />
                {config.store.logo_url && (
                  <img 
                    src={config.store.logo_url} 
                    alt="Logo preview" 
                    className="h-16 w-16 object-contain rounded border mt-2"
                  />
                )}
              </div>

              <Button onClick={saveConfig} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar Configuración
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Yappy Configuration */}
        <TabsContent value="yappy">
          <div className="space-y-4">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Estado de Yappy Comercial
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                    {config.yappy.merchant_id ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">Merchant ID</p>
                      <p className="text-xs text-muted-foreground">
                        {config.yappy.merchant_id ? "Configurado" : "No configurado"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                    {config.yappy.secret_key ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">Clave Secreta</p>
                      <p className="text-xs text-muted-foreground">
                        {config.yappy.secret_key ? "Configurada" : "No configurada"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                    {config.yappy.activo ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">Estado</p>
                      <p className="text-xs text-muted-foreground">
                        {config.yappy.activo ? "Activo" : "Inactivo"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configuration Form */}
            <Card>
              <CardHeader>
                <CardTitle>Credenciales de Yappy</CardTitle>
                <CardDescription>
                  Obtén estas credenciales desde tu cuenta de{" "}
                  <a 
                    href="https://comercial.yappy.com.pa" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Yappy Comercial
                    <ExternalLink className="h-3 w-3 inline ml-1" />
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Yappy Activo</Label>
                    <p className="text-sm text-muted-foreground">
                      Habilitar pagos con Yappy
                    </p>
                  </div>
                  <Switch
                    checked={config.yappy.activo}
                    onCheckedChange={(v) => updateYappyConfig('activo', v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ambiente">Ambiente</Label>
                  <Select 
                    value={config.yappy.ambiente} 
                    onValueChange={(v) => updateYappyConfig('ambiente', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pruebas">Pruebas (Sandbox)</SelectItem>
                      <SelectItem value="produccion">Producción</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Usa &quot;Pruebas&quot; para desarrollo y &quot;Producción&quot; para pagos reales
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="merchant_id">ID del Comercio (Merchant ID)</Label>
                  <Input
                    id="merchant_id"
                    value={config.yappy.merchant_id}
                    onChange={(e) => updateYappyConfig('merchant_id', e.target.value)}
                    placeholder="Ej: 12345678"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secret_key">Clave Secreta</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secret_key"
                      type={showSecretKey ? "text" : "password"}
                      value={config.yappy.secret_key}
                      onChange={(e) => updateYappyConfig('secret_key', e.target.value)}
                      placeholder="Clave secreta de Yappy"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                    >
                      {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url_domain">URL del Dominio</Label>
                  <Input
                    id="url_domain"
                    value={config.yappy.url_domain}
                    onChange={(e) => updateYappyConfig('url_domain', e.target.value)}
                    placeholder="https://tudominio.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Debe coincidir exactamente con la URL configurada en Yappy Comercial
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={saveConfig} disabled={saving} className="flex-1 gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Guardar
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={testYappy} 
                    disabled={testing || !config.yappy.merchant_id}
                    className="gap-2"
                  >
                    {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                    Probar Conexión
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Help Section */}
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <CardHeader>
                <CardTitle className="text-blue-800 dark:text-blue-200 text-lg">
                  ¿Cómo obtener las credenciales?
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                <ol className="list-decimal list-inside space-y-2">
                  <li>Ingresa a <strong>comercial.yappy.com.pa</strong> con tu cuenta de administrador</li>
                  <li>Ve a <strong>Métodos de cobro</strong> → <strong>Botón de Pago Yappy</strong></li>
                  <li>Selecciona una plataforma de desarrollo (PHP, Node.JS, .Net)</li>
                  <li>Ingresa la URL de tu sitio web y haz clic en <strong>Activar</strong></li>
                  <li>Genera la <strong>Clave Secreta</strong> y copia ambas credenciales aquí</li>
                </ol>
                <p className="mt-4 text-xs">
                  Para pruebas, contacta a <strong>botondepagoYappy@bgeneral.com</strong> para unirte al programa de pruebas.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
