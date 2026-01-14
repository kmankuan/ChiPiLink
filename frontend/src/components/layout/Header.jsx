import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { useCart } from '@/contexts/CartContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Link as LinkIcon,
  Store,
  Trophy,
  Zap,
  Calendar,
  BookOpen,
  Wallet,
  QrCode,
  CreditCard,
  MessageCircle
} from 'lucide-react';
import LanguageSelector from '@/components/common/LanguageSelector';

export function Header() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { hasPermission, isAdmin: hasAdminAccess, loading: permissionsLoading } = usePermissions();
  const { theme, toggleTheme } = useTheme();
  const { siteConfig } = useSiteConfig();
  const { itemCount, openCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasLinkedStudents, setHasLinkedStudents] = useState(false);

  const isUnatiendaPage = location.pathname.startsWith('/unatienda');

  // Check if user has linked students for book orders
  useEffect(() => {
    if (isAuthenticated && user?.cliente_id) {
      checkLinkedStudents();
    }
  }, [isAuthenticated, user?.cliente_id]);

  const checkLinkedStudents = async () => {
    try {
      const API_URL = process.env.REACT_APP_BACKEND_URL;
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/api/store/vinculacion/mis-estudiantes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setHasLinkedStudents(data.estudiantes?.length > 0 || data.length > 0);
      }
    } catch (error) {
      console.error('Error checking linked students:', error);
    }
  };

  // Helper to determine if user can access admin panel
  const canAccessAdmin = isAdmin || hasAdminAccess;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Function to toggle CXGenie chat widget
  const toggleSupportChat = () => {
    // CXGenie widget from emergent-main.js exposes window.CXGenie or similar
    if (window.CXGenie?.toggle) {
      window.CXGenie.toggle();
    } else if (window.Emergent?.openChat) {
      window.Emergent.openChat();
    } else {
      // Fallback: try to find and click the widget button
      const widgetButton = document.querySelector('[data-cxgenie-trigger], .cxgenie-widget-button, [class*="cxgenie"]');
      if (widgetButton) {
        widgetButton.click();
      } else {
        // Last resort: dispatch custom event
        window.dispatchEvent(new CustomEvent('cxgenie:toggle'));
      }
    }
  };

  // Hide floating widget on mount and continuously monitor for dynamic injections
  useEffect(() => {
    const hideFloatingWidget = () => {
      // Inject CSS to hide any floating widgets
      if (!document.getElementById('cxgenie-hide-floating')) {
        const style = document.createElement('style');
        style.id = 'cxgenie-hide-floating';
        style.innerHTML = `
          /* Hide CXGenie and similar floating widgets */
          [class*="cxgenie"],
          [id*="cxgenie"],
          [data-cxgenie],
          [data-bid],
          [data-aid],
          iframe[src*="cxgenie"],
          iframe[src*="widget"],
          div[style*="position: fixed"][style*="z-index: 9999"]:not(#root):not(.toast),
          div[style*="position: fixed"][style*="z-index: 99999"] {
            display: none !important;
            visibility: hidden !important;
            pointer-events: none !important;
          }
        `;
        document.head.appendChild(style);
      }
      
      // Also try to remove any dynamically injected elements
      const selectors = [
        '[data-bid]',
        '[data-aid]',
        'iframe[src*="cxgenie"]',
        'iframe[src*="widget.cxgenie"]',
        '[class*="cxgenie"]',
        '[id*="cxgenie"]'
      ];
      
      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          el.style.display = 'none';
          el.style.visibility = 'hidden';
        });
      });
    };
    
    // Run immediately
    hideFloatingWidget();
    
    // Run periodically to catch async-loaded widgets
    const interval = setInterval(hideFloatingWidget, 1000);
    
    // Stop after 10 seconds
    const timeout = setTimeout(() => clearInterval(interval), 10000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

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
            <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-yellow-500 text-white group-hover:scale-105 transition-transform">
              <LinkIcon className="h-5 w-5" />
            </div>
            <span className="font-serif text-xl font-bold tracking-tight hidden sm:inline bg-gradient-to-r from-red-600 to-yellow-600 bg-clip-text text-transparent">
              ChiPi Link
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {/* Unatienda - Public store link */}
            <Link 
              to="/unatienda" 
              className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                isUnatiendaPage 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid="unatienda-nav-link"
            >
              <Store className="h-4 w-4" />
              Tienda
            </Link>

            {/* PinPanClub Quick Access - Public */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    location.pathname.startsWith('/pinpanclub')
                      ? 'text-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid="pinpanclub-dropdown"
                >
                  <Trophy className="h-4 w-4" />
                  PinPanClub
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem asChild>
                  <Link to="/pinpanclub/superpin/ranking" className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    🏆 Super Pin
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/rapidpin" className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-orange-500" />
                    ⚡ Rapid Pin
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/pinpanclub/players" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Jugadores
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/pinpanclub/tournaments" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Torneos
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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
            {/* Support Chat Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSupportChat}
              className="h-9 w-9 rounded-full"
              data-testid="support-chat-button"
              title="Soporte"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="sr-only">Soporte</span>
            </Button>

            {/* Cart Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={openCart}
              className="h-9 w-9 rounded-full relative"
              data-testid="cart-button"
            >
              <ShoppingCart className="h-4 w-4" />
              {itemCount > 0 && (
                <Badge 
                  variant="default" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {itemCount > 9 ? '9+' : itemCount}
                </Badge>
              )}
              <span className="sr-only">Carrito</span>
            </Button>

            {/* Language Selector */}
            <LanguageSelector />

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
                    <Link to="/mi-cuenta" className="flex items-center gap-2" data-testid="menu-my-account">
                      <Wallet className="h-4 w-4" />
                      Mi Cuenta
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="flex items-center gap-2" data-testid="menu-dashboard">
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/pinpanclub" className="flex items-center gap-2" data-testid="menu-pingpong">
                      <Trophy className="h-4 w-4" />
                      PinpanClub
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
                  {/* Show "Mis Libros Escolares" only if user has linked students or has admin/view permission */}
                  {(hasLinkedStudents || hasPermission('unatienda.view_private_catalog')) && (
                    <DropdownMenuItem asChild>
                      <Link to="/mis-pedidos-libros" className="flex items-center gap-2" data-testid="menu-book-orders">
                        <BookOpen className="h-4 w-4" />
                        Mis Libros Escolares
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {canAccessAdmin && (
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
              {/* Unatienda */}
              <Link 
                to="/unatienda"
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                  isUnatiendaPage ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                }`}
                onClick={() => setMobileMenuOpen(false)}
                data-testid="mobile-unatienda-link"
              >
                <Store className="h-4 w-4" />
                Tienda
              </Link>

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
                  {/* Show "Mis Libros Escolares" only if user has linked students or permission */}
                  {(hasLinkedStudents || hasPermission('unatienda.view_private_catalog')) && (
                    <Link 
                      to="/mis-pedidos-libros"
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                        location.pathname === '/mis-pedidos-libros' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                      data-testid="mobile-book-orders-link"
                    >
                      <BookOpen className="h-4 w-4" />
                      Mis Libros Escolares
                    </Link>
                  )}
                  {/* PinpanClub - Solo autenticados */}
                  <Link 
                    to="/pinpanclub"
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                      location.pathname.startsWith('/pinpanclub') ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="mobile-pingpong-link"
                  >
                    <Trophy className="h-4 w-4" />
                    PinpanClub
                  </Link>
                </>
              )}
              
              {canAccessAdmin && (
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
