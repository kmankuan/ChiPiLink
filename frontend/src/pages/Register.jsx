import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Book, Mail, Lock, User, Phone, MapPin, Loader2, Eye, EyeOff } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function Register() {
  const { t } = useTranslation();
  const { register, loginWithGoogle } = useAuth();
  const { siteConfig } = useSiteConfig();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authConfig, setAuthConfig] = useState({ 
    methods: [], 
    registration_fields: {},
    auto_capture_location: true,
    loading: true 
  });
  const [locationData, setLocationData] = useState(null);

  // Fetch public auth configuration
  useEffect(() => {
    const fetchAuthConfig = async () => {
      try {
        const res = await fetch(`${API}/api/auth-v2/auth-config/methods/public`);
        const data = await res.json();
        setAuthConfig({ 
          methods: data.methods || [], 
          registration_fields: data.registration_fields || {},
          auto_capture_location: data.auto_capture_location !== false,
          loading: false 
        });
      } catch (error) {
        // Default config if fetch fails
        setAuthConfig({
          methods: [
            { id: 'email_password', enabled: true, visible: true },
            { id: 'google', enabled: true, visible: true, label: 'Continuar con Google' }
          ],
          registration_fields: {
            nombre: { required: true, visible: true },
            email: { required: true, visible: true },
            telefono: { required: false, visible: true },
            direccion: { required: false, visible: false },
            contrasena: { required: true, visible: true }
          },
          auto_capture_location: true,
          loading: false
        });
      }
    };
    fetchAuthConfig();
  }, []);

  // Auto-capture location via IP geolocation
  useEffect(() => {
    if (authConfig.auto_capture_location) {
      const captureLocation = async () => {
        try {
          // Use a free IP geolocation service
          const res = await fetch('https://ipapi.co/json/');
          const data = await res.json();
          if (data) {
            const locationStr = [data.city, data.region, data.country_name].filter(Boolean).join(', ');
            setLocationData({
              ip: data.ip,
              city: data.city,
              region: data.region,
              country: data.country_name,
              country_code: data.country_code,
              timezone: data.timezone,
              location_string: locationStr
            });
            // Auto-fill direccion (hidden) with captured location
            setFormData(prev => ({
              ...prev,
              direccion: locationStr
            }));
          }
        } catch (error) {
          console.log('Could not capture location:', error);
        }
      };
      captureLocation();
    }
  }, [authConfig.auto_capture_location]);

  const isMethodVisible = (methodId) => {
    const method = authConfig.methods.find(m => m.id === methodId);
    return method?.visible !== false;
  };

  const getMethodLabel = (methodId, defaultLabel) => {
    const method = authConfig.methods.find(m => m.id === methodId);
    return method?.label || defaultLabel;
  };

  const isFieldVisible = (fieldId) => {
    const field = authConfig.registration_fields?.[fieldId];
    return field?.visible !== false;
  };

  const isFieldRequired = (fieldId) => {
    const field = authConfig.registration_fields?.[fieldId];
    return field?.required === true;
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    setLoading(true);
    
    try {
      const { confirmPassword, ...registerData } = formData;
      
      // Add location metadata if captured
      if (locationData) {
        registerData.registro_metadata = {
          location: locationData,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent
        };
      }
      
      await register(registerData);
      toast.success('¡Cuenta creada exitosamente!');
      navigate('/dashboard');
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al crear la cuenta';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const showGoogleRegister = isMethodVisible('google');

  return (
    <div className="min-h-screen flex noise-bg">
      {/* Left Panel - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img 
          src="https://images.unsplash.com/photo-1571260899304-425eee4c7efc?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"
          alt="Students"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-primary/80" />
        <div className="relative z-10 p-12 flex flex-col justify-end text-primary-foreground">
          <h2 className="font-serif text-4xl font-bold mb-4">
            Únase a Nuestra Comunidad
          </h2>
          <p className="text-lg opacity-90 max-w-md">
            Cree su cuenta y agregue a sus estudiantes para ordenar 
            libros de texto de manera fácil y rápida.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          {/* Logo for mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="p-2 rounded-xl bg-primary text-primary-foreground">
              <Book className="h-6 w-6" />
            </div>
            <span className="font-serif text-2xl font-bold">{siteConfig?.nombre_sitio || 'Mi Tienda'}</span>
          </div>

          <div className="mb-8">
            <h1 className="font-serif text-3xl font-bold mb-2">
              {t('auth.register')}
            </h1>
            <p className="text-muted-foreground">
              Complete sus datos para crear una cuenta
            </p>
          </div>

          {/* Google Login - Only show if enabled */}
          {showGoogleRegister && (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 rounded-lg mb-6"
                onClick={loginWithGoogle}
                data-testid="google-register-button"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {getMethodLabel('google', t('auth.loginWithGoogle'))}
              </Button>

              <div className="relative mb-6">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-4 text-xs text-muted-foreground">
                  {t('auth.orContinueWith')}
                </span>
              </div>
            </>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('auth.name')} *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Juan Pérez"
                  value={formData.name}
                  onChange={handleChange}
                  className="h-12 pl-10 rounded-lg"
                  required
                  data-testid="name-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')} *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="h-12 pl-10 rounded-lg"
                  required
                  data-testid="email-input"
                />
              </div>
            </div>

            {/* Phone field - conditionally visible */}
            {isFieldVisible('telefono') && (
              <div className="space-y-2">
                <Label htmlFor="phone">
                  {t('auth.phone')}{isFieldRequired('telefono') ? ' *' : ''}
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+507 6000-0000"
                    value={formData.phone}
                    onChange={handleChange}
                    className="h-12 pl-10 rounded-lg"
                    required={isFieldRequired('telefono')}
                    data-testid="phone-input"
                  />
                </div>
              </div>
            )}

            {/* Address field - conditionally visible (usually hidden, auto-captured) */}
            {isFieldVisible('direccion') && (
              <div className="space-y-2">
                <Label htmlFor="address">
                  {t('auth.address')}{isFieldRequired('direccion') ? ' *' : ''}
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="address"
                    name="address"
                    type="text"
                    placeholder="Ciudad de Panamá, Panamá"
                    value={formData.address}
                    onChange={handleChange}
                    className="h-12 pl-10 rounded-lg"
                    required={isFieldRequired('direccion')}
                    data-testid="address-input"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')} *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="h-12 pl-10 pr-10 rounded-lg"
                    required
                    minLength={6}
                    data-testid="password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="h-12 pl-10 pr-10 rounded-lg"
                    required
                    minLength={6}
                    data-testid="confirm-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 rounded-lg text-base font-medium mt-2"
              disabled={loading}
              data-testid="register-submit-button"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                t('auth.register')
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {t('auth.hasAccount')}{' '}
            <Link 
              to="/login" 
              className="text-primary font-medium hover:underline"
              data-testid="login-link"
            >
              {t('auth.login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
