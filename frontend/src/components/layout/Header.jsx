import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Book,
  User,
  Sun,
  Moon,
  Globe,
  Menu,
  X,
  LogOut,
  Settings,
  ShoppingCart,
  Users,
  LayoutDashboard,
  Link as LinkIcon
} from 'lucide-react';
import LanguageSelector from '@/components/common/LanguageSelector';

export function Header() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { siteConfig } = useSiteConfig();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full glass border-b border-border/50">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-3 group"
            data-testid="logo-link"
          >
            <div className="p-2 rounded-xl bg-primary text-primary-foreground group-hover:scale-105 transition-transform">
              <Book className="h-5 w-5" />
            </div>
            <span className="font-serif text-xl font-bold tracking-tight hidden sm:inline">
              {siteConfig?.nombre_sitio || 'Mi Tienda'}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {/* Catalog only visible for admins */}
            {isAdmin && (
              <Link 
                to="/catalogo" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                data-testid="catalog-nav-link"
              >
                {t('nav.catalog')}
              </Link>
            )}
            
            {isAuthenticated && (
              <>
                <Link 
                  to="/dashboard" 
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="dashboard-nav-link"
                >
                  {t('nav.students')}
                </Link>
                <Link 
                  to="/pedidos" 
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="orders-nav-link"
                >
                  {t('nav.orders')}
                </Link>
              </>
            )}
            
            {isAdmin && (
              <Link 
                to="/admin" 
                className="text-sm font-medium text-accent hover:text-accent/80 transition-colors"
                data-testid="admin-nav-link"
              >
                {t('nav.admin')}
              </Link>
            )}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="h-9 px-3 rounded-full gap-2"
              data-testid="language-toggle"
            >
              <Globe className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">
                {currentLangCode === 'zh' ? '中文' : 'ES'}
              </span>
            </Button>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-full"
              data-testid="theme-toggle"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* User Menu or Auth Buttons */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="h-9 px-3 rounded-full gap-2"
                    data-testid="user-menu-trigger"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline max-w-[100px] truncate">
                      {user?.nombre?.split(' ')[0] || 'Usuario'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="flex items-center gap-2" data-testid="menu-dashboard">
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/estudiantes" className="flex items-center gap-2" data-testid="menu-students">
                      <Users className="h-4 w-4" />
                      {t('nav.students')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/pedidos" className="flex items-center gap-2" data-testid="menu-orders">
                      <ShoppingCart className="h-4 w-4" />
                      {t('nav.orders')}
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center gap-2 text-accent" data-testid="menu-admin">
                          <Settings className="h-4 w-4" />
                          {t('nav.admin')}
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="text-destructive focus:text-destructive"
                    data-testid="menu-logout"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('nav.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/login')}
                  className="hidden sm:inline-flex"
                  data-testid="login-button"
                >
                  {t('nav.login')}
                </Button>
                <Button 
                  size="sm"
                  onClick={() => navigate('/registro')}
                  className="rounded-full px-4"
                  data-testid="register-button"
                >
                  {t('nav.register')}
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border/50">
            <div className="flex flex-col gap-2">
              {/* Catalog only for admins */}
              {isAdmin && (
                <Link 
                  to="/catalogo"
                  className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid="mobile-catalog-link"
                >
                  {t('nav.catalog')}
                </Link>
              )}
              
              {isAuthenticated && (
                <>
                  <Link 
                    to="/dashboard"
                    className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="mobile-dashboard-link"
                  >
                    Dashboard
                  </Link>
                  <Link 
                    to="/pedidos"
                    className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="mobile-orders-link"
                  >
                    {t('nav.orders')}
                  </Link>
                </>
              )}
              
              {isAdmin && (
                <Link 
                  to="/admin"
                  className="px-4 py-2 text-sm font-medium text-accent hover:bg-muted rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid="mobile-admin-link"
                >
                  {t('nav.admin')}
                </Link>
              )}

              {!isAuthenticated && (
                <Link 
                  to="/login"
                  className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid="mobile-login-link"
                >
                  {t('nav.login')}
                </Link>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
