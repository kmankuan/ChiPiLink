/**
 * Login Page — Mobile-first, admin-configurable design
 * Layouts: split (desktop image + form), centered, fullscreen
 * Uses siteConfig for branding: logo, bg image, colors, text
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ExternalLink, Loader2, UserPlus } from 'lucide-react';

export default function Login() {
  const { t } = useTranslation();
  const { loginWithLaoPan, laopanConfig } = useAuth();
  const { siteConfig } = useSiteConfig();
  const [laopanLoading, setLaopanLoading] = useState(false);

  const laopanEnabled = laopanConfig?.enabled;
  const siteName = siteConfig?.site_name || 'ChiPi Link';
  const logoUrl = siteConfig?.logo_url;
  const bgImage = siteConfig?.login_bg_image || 'https://images.unsplash.com/photo-1715520530023-cc8a1b2044ab?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200';
  const overlayColor = siteConfig?.login_bg_overlay_color || siteConfig?.color_primario || '#16a34a';
  const overlayOpacity = siteConfig?.login_bg_overlay_opacity ?? 0.7;
  const heading = siteConfig?.login_heading || t('auth.login', 'Sign In');
  const subtext = siteConfig?.login_subtext || t('auth.laopan.description', 'Sign in or register on LaoPan.online to access');
  const layout = siteConfig?.login_layout || 'split';
  const logoSize = siteConfig?.login_logo_size || 'md';

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

  const logoSizeClass = { sm: 'h-8 w-8', md: 'h-12 w-12', lg: 'h-16 w-16' }[logoSize] || 'h-12 w-12';

  const LoginForm = () => (
    <div className="w-full" data-testid="login-form">
      {/* Logo + Site Name */}
      <div className="flex items-center gap-3 mb-6">
        {logoUrl ? (
          <img src={logoUrl} alt={siteName} className={`${logoSizeClass} rounded-xl object-contain`} />
        ) : (
          <div className="p-2.5 rounded-xl bg-primary text-primary-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
            </svg>
          </div>
        )}
        <span className="font-serif text-xl sm:text-2xl font-bold truncate">
          {siteName}
        </span>
      </div>

      {/* Heading */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold mb-1.5" data-testid="login-heading">
          {heading}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {subtext}
        </p>
      </div>

      {/* Login Buttons */}
      {laopanEnabled ? (
        <div className="space-y-3">
          <Button
            type="button"
            className="w-full h-12 sm:h-14 rounded-xl text-sm sm:text-base font-medium gap-2.5"
            style={{ backgroundColor: laopanConfig?.button_color || '#4F46E5' }}
            onClick={handleLaoPanLogin}
            disabled={laopanLoading}
            data-testid="laopan-login-button"
          >
            {laopanLoading ? (
              <><Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin shrink-0" /> <span className="truncate">{t('auth.laopan.connecting', 'Connecting...')}</span></>
            ) : (
              <><ExternalLink className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" /> <span className="truncate">{t('auth.laopan.loginButton', 'Sign in with LaoPan')}</span></>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full h-12 sm:h-14 rounded-xl text-sm sm:text-base font-medium gap-2.5"
            onClick={() => window.open('https://laopan.online/register/', '_blank')}
            data-testid="laopan-register-button"
          >
            <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <span className="truncate">{t('auth.laopan.registerButton', "Don't have an account? Register on LaoPan")}</span>
          </Button>

          <p className="text-center text-xs sm:text-sm text-muted-foreground mt-3 px-2">
            {subtext}
          </p>
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8">
          <p className="text-sm">{t('auth.laopan.notConfigured', 'Login is not yet configured.')}</p>
        </div>
      )}
    </div>
  );

  // Layout: Fullscreen (bg image fills entire screen, form centered on top)
  if (layout === 'fullscreen') {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4" data-testid="login-page">
        <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ backgroundColor: overlayColor, opacity: overlayOpacity }} />
        <div className="relative z-10 w-full max-w-sm bg-background/95 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl">
          <LoginForm />
        </div>
      </div>
    );
  }

  // Layout: Centered (no side image, clean centered form)
  if (layout === 'centered') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30" data-testid="login-page">
        <div className="w-full max-w-sm bg-background rounded-2xl p-6 sm:p-8 shadow-lg border">
          <LoginForm />
        </div>
      </div>
    );
  }

  // Layout: Split (default — image left, form right)
  return (
    <div className="min-h-screen flex" data-testid="login-page">
      {/* Left Panel - Image (hidden on mobile, shown on lg+) */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ backgroundColor: overlayColor, opacity: overlayOpacity }} />
        <div className="relative z-10 p-12 flex flex-col justify-end text-white">
          <h2 className="font-serif text-4xl font-bold mb-4">{siteName}</h2>
          <p className="text-lg opacity-90 max-w-md">{siteConfig?.descripcion || siteConfig?.description || 'Your community platform'}</p>
        </div>
      </div>

      {/* Right Panel - Form (full width on mobile) */}
      <div className="flex-1 flex items-center justify-center px-5 py-8 sm:p-8 md:p-12">
        <div className="w-full max-w-sm sm:max-w-md">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
