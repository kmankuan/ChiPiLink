/**
 * AuthMethodsConfig - Admin panel for managing authentication methods
 * Allows enabling/disabling sign-in and sign-up methods
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Save,
  Loader2,
  Mail,
  Chrome,
  Facebook,
  Apple,
  Shield,
  Eye,
  EyeOff,
  GripVertical,
  UserPlus,
  LogIn,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const API = process.env.REACT_APP_BACKEND_URL;

// Icon mapping for auth methods
const METHOD_ICONS = {
  email_password: Mail,
  google: Chrome,
  facebook: Facebook,
  apple: Apple
};

const METHOD_LABELS = {
  email_password: 'Email y Contraseña',
  google: 'Google',
  facebook: 'Facebook',
  apple: 'Apple'
};

export default function AuthMethodsConfig() {
  const { t } = useTranslation();
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    email_password: { enabled: true, visible: true, label: null, order: 1 },
    google: { enabled: true, visible: true, label: 'Continuar con Google', order: 2 },
    facebook: { enabled: false, visible: false, label: null, order: 3 },
    apple: { enabled: false, visible: false, label: null, order: 4 },
    registration_fields: {
      nombre: { required: true, visible: true, label: 'Nombre completo' },
      email: { required: true, visible: true, label: 'Correo electrónico' },
      telefono: { required: false, visible: true, label: 'Teléfono' },
      direccion: { required: false, visible: false, label: 'Dirección' },
      contrasena: { required: true, visible: true, label: 'Contraseña' }
    },
    auto_capture_location: true
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth-v2/auth-config/methods');
      if (res.data) {
        setConfig(prev => ({ ...prev, ...res.data }));
      }
    } catch (error) {
      console.error('Error loading auth config:', error);
      toast.error(t("authConfig.configLoadError"));
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      await api.put('/auth-v2/auth-config/methods', config);
      toast.success(t("authConfig.configSaved"));
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error(t("authConfig.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const toggleMethod = (methodId) => {
    setConfig(prev => ({
      ...prev,
      [methodId]: {
        ...prev[methodId],
        enabled: !prev[methodId]?.enabled,
        visible: !prev[methodId]?.visible
      }
    }));
  };

  const updateMethodLabel = (methodId, label) => {
    setConfig(prev => ({
      ...prev,
      [methodId]: {
        ...prev[methodId],
        label: label || null
      }
    }));
  };

  const toggleFieldVisibility = (fieldId) => {
    setConfig(prev => ({
      ...prev,
      registration_fields: {
        ...prev.registration_fields,
        [fieldId]: {
          ...prev.registration_fields?.[fieldId],
          visible: !prev.registration_fields?.[fieldId]?.visible
        }
      }
    }));
  };

  const toggleFieldRequired = (fieldId) => {
    // Don't allow toggling required for essential fields
    if (['nombre', 'email', 'contrasena'].includes(fieldId)) return;
    
    setConfig(prev => ({
      ...prev,
      registration_fields: {
        ...prev.registration_fields,
        [fieldId]: {
          ...prev.registration_fields?.[fieldId],
          required: !prev.registration_fields?.[fieldId]?.required
        }
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const methods = ['email_password', 'google', 'facebook', 'apple'];
  const fields = ['nombre', 'email', 'telefono', 'direccion', 'contrasena'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Métodos de Autenticación
          </h2>
          <p className="text-muted-foreground">
            Configura los métodos de inicio de sesión y registro disponibles
          </p>
        </div>
        <Button onClick={saveConfig} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar Cambios
        </Button>
      </div>

      {/* Auth Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" />
            Métodos de Inicio de Sesión
          </CardTitle>
          <CardDescription>
            Habilita o deshabilita los métodos de autenticación que estarán disponibles para los usuarios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {methods.map((methodId) => {
            const Icon = METHOD_ICONS[methodId];
            const methodConfig = config[methodId] || {};
            const isEnabled = methodConfig.visible;
            
            return (
              <div
                key={methodId}
                className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                  isEnabled ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${isEnabled ? 'bg-green-100 dark:bg-green-900' : 'bg-muted'}`}>
                    <Icon className={`h-5 w-5 ${isEnabled ? 'text-green-600' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{METHOD_LABELS[methodId]}</span>
                      {isEnabled ? (
                        <Badge variant="default" className="bg-green-500">{t("authConfig.activeStatus")}</Badge>
                      ) : (
                        <Badge variant="secondary">{t("authConfig.disabledStatus")}</Badge>
                      )}
                    </div>
                    {methodId === 'google' && !isEnabled && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Google Auth deshabilitado - no visible para usuarios
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {methodId !== 'email_password' && isEnabled && (
                    <Input
                      value={methodConfig.label || ''}
                      onChange={(e) => updateMethodLabel(methodId, e.target.value)}
                      placeholder={t("authConfig.buttonText")}
                      className="w-48"
                    />
                  )}
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => toggleMethod(methodId)}
                    disabled={methodId === 'email_password'} // Always keep email/password
                  />
                </div>
              </div>
            );
          })}
          
          <p className="text-xs text-muted-foreground">
            💡 El método de Email y Contraseña no se puede deshabilitar ya que es el método principal.
          </p>
        </CardContent>
      </Card>

      {/* Registration Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Campos de Registro
          </CardTitle>
          <CardDescription>
            Configura qué campos se muestran en el formulario de registro
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((fieldId) => {
            const fieldConfig = config.registration_fields?.[fieldId] || {};
            const isVisible = fieldConfig.visible !== false;
            const isRequired = fieldConfig.required;
            const isEssential = ['nombre', 'email', 'contrasena'].includes(fieldId);
            
            return (
              <div
                key={fieldId}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  isVisible ? 'bg-background' : 'bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isVisible ? (
                    <Eye className="h-4 w-4 text-primary" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <span className={isVisible ? 'font-medium' : 'text-muted-foreground'}>
                      {fieldConfig.label || fieldId}
                    </span>
                    <div className="flex gap-1 mt-0.5">
                      {isRequired && (
                        <Badge variant="outline" className="text-xs">{t("common.required")}</Badge>
                      )}
                      {isEssential && (
                        <Badge variant="secondary" className="text-xs">{t("authConfig.essential")}</Badge>
                      )}
                      {fieldId === 'direccion' && !isVisible && (
                        <Badge variant="outline" className="text-xs text-blue-600">
                          <MapPin className="h-3 w-3 mr-1" />
                          Auto-captura
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {!isEssential && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Requerido</Label>
                      <Switch
                        checked={isRequired}
                        onCheckedChange={() => toggleFieldRequired(fieldId)}
                        disabled={!isVisible}
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">{t("common.visible")}</Label>
                    <Switch
                      checked={isVisible}
                      onCheckedChange={() => toggleFieldVisibility(fieldId)}
                      disabled={isEssential}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Auto Location Capture */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Captura Automática de Ubicación
          </CardTitle>
          <CardDescription>
            Capturar la ubicación del usuario automáticamente al registrarse (usando IP)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">
                Cuando está habilitado, se guardará la ubicación aproximada del usuario basada en su dirección IP.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Esta información se almacena como historial y no se muestra al usuario.
              </p>
            </div>
            <Switch
              checked={config.auto_capture_location}
              onCheckedChange={(checked) => setConfig(prev => ({
                ...prev,
                auto_capture_location: checked
              }))}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
