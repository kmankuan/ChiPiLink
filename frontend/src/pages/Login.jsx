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
import { Book, Mail, Lock, Loader2, Eye, EyeOff, Shield, ChevronDown, ChevronUp, ExternalLink, UserPlus } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const API = process.env.REACT_APP_BACKEND_URL;

export default function Login() {
  const { t } = useTranslation();
  const { login, loginWithLaoPan, laopanConfig } = useAuth();
  const { siteConfig } = useSiteConfig();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [laopanLoading, setLaopanLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  // Check if LaoPan OAuth is available
  const laopanEnabled = laopanConfig?.enabled;

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // LaoPan OAuth login handler
  const handleLaoPanLogin = async () => {
    setLaopanLoading(true);
    try {
      // Get redirect param from URL if present
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirect');
      await loginWithLaoPan(redirectTo);
    } catch (error) {
      toast.error('Error al conectar con LaoPan.online');
      setLaopanLoading(false);
    }
  };

  // Email/Password login (for admins)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const user = await login(formData.email, formData.password);
      toast.success(`Welcome, ${user.name}!`);
      
      // Check for redirect parameter in URL
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirect');
      
      if (redirectTo) {
        navigate(redirectTo);
      } else if (user.is_admin) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al iniciar sesión';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex noise-bg">
      {/* Left Panel - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img 
          src="https://images.unsplash.com/photo-1715520530023-cc8a1b2044ab?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"
          alt="Books"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-primary/80" />
        <div className="relative z-10 p-12 flex flex-col justify-end text-primary-foreground">
          <h2 className="font-serif text-4xl font-bold mb-4">
            {siteConfig?.site_name || 'Mi Tienda'}
          </h2>
          <p className="text-lg opacity-90 max-w-md">
            {siteConfig?.description || 'Plataforma de comercio electrónico'}
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          {/* Logo for mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="p-2 rounded-xl bg-primary text-primary-foreground">
              <Book className="h-6 w-6" />
            </div>
            <span className="font-serif text-2xl font-bold">{siteConfig?.site_name || 'Mi Tienda'}</span>
          </div>

          <div className="mb-8">
            <h1 className="font-serif text-3xl font-bold mb-2">
              {t('auth.login')}
            </h1>
            <p className="text-muted-foreground">
              {t('auth.laopan.description')}
            </p>
          </div>

          {/* Primary: LaoPan OAuth Login */}
          {laopanEnabled && (
            <div className="space-y-4 mb-6">
              {/* Sign In Button */}
              <Button
                type="button"
                className="w-full h-14 rounded-xl text-base font-medium gap-3"
                style={{ backgroundColor: laopanConfig?.button_color || '#4F46E5' }}
                onClick={handleLaoPanLogin}
                disabled={laopanLoading}
                data-testid="laopan-login-button"
              >
                {laopanLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t('auth.laopan.connecting')}
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-5 w-5" />
                    {t('auth.laopan.loginButton')}
                  </>
                )}
              </Button>
              
              {/* Sign Up Button - for users without LaoPan account */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-14 rounded-xl text-base font-medium gap-3"
                onClick={() => window.open('https://laopan.online/register/', '_blank')}
                data-testid="laopan-register-button"
              >
                <UserPlus className="h-5 w-5" />
                {t('auth.laopan.registerButton')}
              </Button>
              
              <p className="text-center text-sm text-muted-foreground">
                {t('auth.laopan.description')}
              </p>
            </div>
          )}

          {/* Separator */}
          <div className="relative my-8">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-4 text-xs text-muted-foreground">
              {laopanEnabled ? 'o' : 'Ingrese sus credenciales'}
            </span>
          </div>

          {/* Secondary: Admin/Email Login (Collapsible when LaoPan is enabled) */}
          {laopanEnabled ? (
            <Collapsible open={showAdminLogin} onOpenChange={setShowAdminLogin}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                  data-testid="admin-login-toggle"
                >
                  <Shield className="h-4 w-4" />
                  <span>Acceso Administrativo</span>
                  {showAdminLogin ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-4">
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <p className="text-xs text-muted-foreground mb-4 text-center">
                    Solo para administradores y moderadores
                  </p>
                  <AdminLoginForm 
                    formData={formData}
                    handleChange={handleChange}
                    handleSubmit={handleSubmit}
                    loading={loading}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                    t={t}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            /* When LaoPan is not enabled, show regular login form */
            <AdminLoginForm 
              formData={formData}
              handleChange={handleChange}
              handleSubmit={handleSubmit}
              loading={loading}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              t={t}
            />
          )}

          {/* Register link - Only show if LaoPan is not the sole auth method */}
          {!laopanEnabled && (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              {t('auth.noAccount')}{' '}
              <Link 
                to="/registro" 
                className="text-primary font-medium hover:underline"
                data-testid="register-link"
              >
                {t('auth.register')}
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Extracted admin login form component
function AdminLoginForm({ formData, handleChange, handleSubmit, loading, showPassword, setShowPassword, t }) {
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">{t('auth.email')}</Label>
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t('auth.password')}</Label>
          <Link 
            to="/recuperar-contrasena"
            className="text-xs text-primary hover:underline"
          >
            {t('auth.forgotPassword')}
          </Link>
        </div>
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
            data-testid="password-input"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full h-12 rounded-lg text-base font-medium"
        disabled={loading}
        data-testid="login-submit-button"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('common.loading')}
          </>
        ) : (
          t('auth.login')
        )}
      </Button>
    </form>
  );
}
