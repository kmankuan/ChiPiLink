import { useState, useEffect, useMemo } from 'react';
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
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Home
} from 'lucide-react';
import LanguageSelector from '@/components/common/LanguageSelector';

// Breadcrumb configuration - maps routes to display names and icons
const ROUTE_CONFIG = {
  '/': { name: 'Inicio', icon: Home },
  '/unatienda': { name: 'Unatienda', icon: Store },
  '/unatienda/producto': { name: 'Producto', icon: Store },
  '/unatienda/checkout': { name: 'Checkout', icon: ShoppingCart },
  '/mi-cuenta': { name: 'Mi Cuenta', icon: Wallet },
  '/my-account': { name: 'Mi Cuenta', icon: Wallet },
  '/pedidos': { name: 'Mis Pedidos', icon: ShoppingCart },
  '/mis-pedidos-libros': { name: 'Mis Libros', icon: BookOpen },
  '/orden': { name: 'Nueva Orden', icon: ShoppingCart },
  '/checkout': { name: 'Pago', icon: CreditCard },
  '/payment': { name: 'Resultado de Pago', icon: CreditCard },
  '/recibo': { name: 'Recibo', icon: CreditCard },
  // PinpanClub
  '/pinpanclub': { name: 'PinpanClub', icon: Trophy },
  '/pinpanclub/match': { name: 'Partido', icon: Trophy },
  '/pinpanclub/arbiter': { name: 'Árbitro', icon: Trophy },
  '/pinpanclub/spectator': { name: 'Espectador', icon: Trophy },
  '/pinpanclub/mobile-arbiter': { name: 'Árbitro Móvil', icon: Trophy },
  '/pinpanclub/superpin': { name: 'Super Pin', icon: Trophy },
  '/pinpanclub/rapidpin': { name: 'Rapid Pin', icon: Zap },
  '/pinpanclub/seasons': { name: 'Temporadas', icon: Calendar },
  '/pinpanclub/challenges': { name: 'Desafíos', icon: Trophy },
  '/pinpanclub/analytics': { name: 'Estadísticas', icon: Trophy },
  '/pinpanclub/sponsors': { name: 'Patrocinadores', icon: Trophy },
  '/pinpanclub/monday': { name: 'Monday.com', icon: LinkIcon },
  '/rapidpin': { name: 'Rapid Pin', icon: Zap },
  '/tv': { name: 'TV', icon: Trophy },
  // Community
  '/comunidad': { name: 'Comunidad', icon: Users },
  '/eventos': { name: 'Eventos', icon: Calendar },
  '/galeria': { name: 'Galería', icon: Store },
  // Admin Routes
  '/admin': { name: 'Administración', icon: Settings },
  '/admin/notifications': { name: 'Notificaciones', icon: MessageCircle },
  '/admin/posts': { name: 'Publicaciones', icon: BookOpen },
  '/admin/memberships': { name: 'Membresías', icon: CreditCard },
  '/admin/book-orders': { name: 'Pedidos de Libros', icon: Book },
  '/admin/chat': { name: 'Chat de Soporte', icon: MessageCircle },
  // Auth
  '/login': { name: 'Iniciar Sesión', icon: User },
  '/registro': { name: 'Registrarse', icon: User },
};

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
  const isHomePage = location.pathname === '/';

  // Helper to determine if user can access admin panel
  const canAccessAdmin = isAdmin || hasAdminAccess;

  // Get current page info for breadcrumb
  const currentPageInfo = useMemo(() => {
    const path = location.pathname;
    
    // Check exact match first
    if (ROUTE_CONFIG[path]) {
      return ROUTE_CONFIG[path];
    }
    
    // Check for partial matches (e.g., /admin#something, /unatienda/producto/123)
    for (const [route, config] of Object.entries(ROUTE_CONFIG)) {
      if (route !== '/' && path.startsWith(route)) {
        return config;
      }
    }
    
    // Default fallback
    return { name: 'Página', icon: Home };
  }, [location.pathname]);

  // Check if we can go back (not on home page and have history)
  const canGoBack = !isHomePage;

  // Check if user has linked students for book orders
  useEffect(() => {
    const checkLinkedStudents = async () => {
      try {
        const API_URL = process.env.REACT_APP_BACKEND_URL;
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_URL}/api/store/vinculacion/mis-estudiantes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setHasLinkedStudents(data.students?.length > 0 || data.length > 0);
        }
      } catch (error) {
        console.error('Error checking linked students:', error);
      }
    };

    // Use English field name user_id
    if (isAuthenticated && user?.user_id) {
      checkLinkedStudents();
    }
  }, [isAuthenticated, user?.user_id]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Function to toggle CXGenie chat widget
  const toggleSupportChat = () => {
    try {
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
    } catch (error) {
      console.warn('Support chat not available:', error);
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
          {/* Left Section: Back Button + Logo + Breadcrumb */}
          <div className="flex items-center gap-2">
            {/* Back Button - only show when not on home */}
            {canGoBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="h-9 w-9 rounded-full hover:bg-muted"
                data-testid="back-button"
                title="Regresar"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            
            {/* Logo - links to home */}
            <Link 
              to="/" 
              className="flex items-center gap-2 group"
              data-testid="logo-link"
              title="Ir al inicio"
            >
              <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-yellow-500 text-white group-hover:scale-105 transition-transform">
                <LinkIcon className="h-5 w-5" />
              </div>
              <span className="font-serif text-xl font-bold tracking-tight hidden sm:inline bg-gradient-to-r from-red-600 to-yellow-600 bg-clip-text text-transparent">
                ChiPi Link
              </span>
            </Link>

            {/* Breadcrumb - current page indicator */}
            {!isHomePage && (
              <div className="hidden sm:flex items-center">
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 mx-1" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-1.5 text-muted-foreground hover:text-foreground h-8 px-2"
                      data-testid="breadcrumb-trigger"
                    >
                      {currentPageInfo.icon && <currentPageInfo.icon className="h-4 w-4" />}
                      <span className="text-sm font-medium">{currentPageInfo.name}</span>
                      <ChevronRight className="h-3 w-3 rotate-90" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to="/" className="flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        Inicio
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/unatienda" className="flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        Tienda
                      </Link>
                    </DropdownMenuItem>
                    {isAuthenticated && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/mi-cuenta" className="flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            Mi Cuenta
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/pedidos" className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" />
                            Mis Pedidos
                          </Link>
                        </DropdownMenuItem>
                        {user?.tiene_membresia_activa && (
                          <DropdownMenuItem asChild>
                            <Link to="/pinpanclub" className="flex items-center gap-2">
                              <Trophy className="h-4 w-4" />
                              PinpanClub
                            </Link>
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                    {canAccessAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/admin" className="flex items-center gap-2 text-accent">
                            <Settings className="h-4 w-4" />
                            Administración
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

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
              Unatienda
            </Link>

            {/* PinPanClub Quick Access - Solo visible para usuarios con membresía activa o admins */}
            {(user?.tiene_membresia_activa || canAccessAdmin) && (
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
            )}

            {/* Catalog link removed - now integrated in Admin > Unatienda */}
            
            {isAuthenticated && (
              <>
                {/* Mis Pedidos - visible para todos los usuarios autenticados */}
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
                  {/* Mi Cuenta - Siempre visible para usuarios autenticados */}
                  <DropdownMenuItem asChild>
                    <Link to="/mi-cuenta" className="flex items-center gap-2" data-testid="menu-my-account">
                      <Wallet className="h-4 w-4" />
                      Mi Cuenta
                    </Link>
                  </DropdownMenuItem>
                  
                  {/* Mis Pedidos - Siempre visible para usuarios autenticados */}
                  <DropdownMenuItem asChild>
                    <Link to="/pedidos" className="flex items-center gap-2" data-testid="menu-orders">
                      <ShoppingCart className="h-4 w-4" />
                      {t('nav.orders')}
                    </Link>
                  </DropdownMenuItem>
                  
                  {/* Mis Libros Escolares - Solo si tiene estudiantes vinculados */}
                  {hasLinkedStudents && (
                    <DropdownMenuItem asChild>
                      <Link to="/mis-pedidos-libros" className="flex items-center gap-2" data-testid="menu-book-orders">
                        <BookOpen className="h-4 w-4" />
                        Mis Libros Escolares
                      </Link>
                    </DropdownMenuItem>
                  )}
                  
                  {/* PinpanClub - Solo si tiene membresía activa */}
                  {user?.tiene_membresia_activa && (
                    <DropdownMenuItem asChild>
                      <Link to="/pinpanclub" className="flex items-center gap-2" data-testid="menu-pingpong">
                        <Trophy className="h-4 w-4" />
                        PinpanClub
                      </Link>
                    </DropdownMenuItem>
                  )}
                  
                  {/* Admin Section - Solo para admins */}
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

              {/* Catalog link removed - now in Admin > Unatienda */}
              
              {isAuthenticated && (
                <>
                  {/* Mis Pedidos - Siempre visible */}
                  <Link 
                    to="/pedidos"
                    className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="mobile-orders-link"
                  >
                    {t('nav.orders')}
                  </Link>
                  
                  {/* Mis Libros Escolares - Solo si tiene estudiantes vinculados */}
                  {hasLinkedStudents && (
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
                  
                  {/* PinpanClub - Solo si tiene membresía activa */}
                  {user?.tiene_membresia_activa && (
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
                  )}
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
