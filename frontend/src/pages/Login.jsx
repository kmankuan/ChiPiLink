/**
 * Login Page — Clean user-facing login
 * Only LaoPan OAuth options. Admin login moved to /admin.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Book, ExternalLink, Loader2, UserPlus } from 'lucide-react';

export default function Login() {
  const { t } = useTranslation();
  const { loginWithLaoPan, laopanConfig } = useAuth();
  const { siteConfig } = useSiteConfig();
  const navigate = useNavigate();
  const [laopanLoading, setLaopanLoading] = useState(false);

  const laopanEnabled = laopanConfig?.enabled;

  const handleLaoPanLogin = async () => {
    setLaopanLoading(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirect');
      await loginWithLaoPan(redirectTo);
    } catch {
      toast.error(t('auth.laopan.error', 'Error connecting to LaoPan.online'));
      setLaopanLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex noise-bg">
      {/* Left Panel - Image (desktop) */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1715520530023-cc8a1b2044ab?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"
          alt="Books"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-primary/80" />
        <div className="relative z-10 p-12 flex flex-col justify-end text-primary-foreground">
          <h2 className="font-serif text-4xl font-bold mb-4">
            {siteConfig?.site_name || 'ChiPi Link'}
          </h2>
          <p className="text-lg opacity-90 max-w-md">
            {siteConfig?.description || 'Your community platform'}
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="p-2 rounded-xl bg-primary text-primary-foreground">
              <Book className="h-6 w-6" />
            </div>
            <span className="font-serif text-2xl font-bold">
              {siteConfig?.site_name || 'ChiPi Link'}
            </span>
          </div>

          <div className="mb-8">
            <h1 className="font-serif text-3xl font-bold mb-2">
              {t('auth.login', 'Sign In')}
            </h1>
            <p className="text-muted-foreground">
              {t('auth.laopan.description', 'Sign in or register on LaoPan.online to access')}
            </p>
          </div>

          {/* LaoPan Login */}
          {laopanEnabled ? (
            <div className="space-y-4">
              <Button
                type="button"
                className="w-full h-14 rounded-xl text-base font-medium gap-3"
                style={{ backgroundColor: laopanConfig?.button_color || '#4F46E5' }}
                onClick={handleLaoPanLogin}
                disabled={laopanLoading}
                data-testid="laopan-login-button"
              >
                {laopanLoading ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> {t('auth.laopan.connecting', 'Connecting...')}</>
                ) : (
                  <><ExternalLink className="h-5 w-5" /> {t('auth.laopan.loginButton', 'Sign in with LaoPan')}</>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full h-14 rounded-xl text-base font-medium gap-3"
                onClick={() => window.open('https://laopan.online/register/', '_blank')}
                data-testid="laopan-register-button"
              >
                <UserPlus className="h-5 w-5" />
                {t('auth.laopan.registerButton', "Don't have an account? Register on LaoPan")}
              </Button>

              <p className="text-center text-sm text-muted-foreground mt-4">
                {t('auth.laopan.description', 'Sign in or register on LaoPan.online to access')}
              </p>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <p>{t('auth.laopan.notConfigured', 'Login is not yet configured.')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
