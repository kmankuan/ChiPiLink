import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { useCart } from '@/contexts/CartContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import TickerBar from './TickerBar';
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
  Bell,
  ChevronLeft,
  ChevronRight,
  Home
} from 'lucide-react';
import LanguageSelector from '@/components/common/LanguageSelector';

// Breadcrumb configuration
const ROUTE_CONFIG = {
  '/': { name: 'Inicio', icon: Home },
  '/unatienda': { name: 'Unatienda', icon: Store },
  '/unatienda/producto': { name: 'Producto', icon: Store },
  '/unatienda/checkout': { name: 'Checkout', icon: ShoppingCart },
  '/mi-cuenta': { name: 'Mi Cuenta', icon: Wallet },
  '/my-account': { name: 'Mi Cuenta', icon: Wallet },
  '/pedidos': { name: 'Mis Pedidos', icon: ShoppingCart },
  '/my-book-orders': { name: 'My Books', icon: BookOpen },
  '/orden': { name: 'Nueva Orden', icon: ShoppingCart },
  '/checkout': { name: 'Pago', icon: CreditCard },
  '/payment': { name: 'Resultado de Pago', icon: CreditCard },
  '/recibo': { name: 'Recibo', icon: CreditCard },
  '/pinpanclub': { name: 'PinpanClub', icon: Trophy },
  '/pinpanclub/match': { name: 'Partido', icon: Trophy },
  '/pinpanclub/arbiter': { name: 'Arbitro', icon: Trophy },
  '/pinpanclub/spectator': { name: 'Espectador', icon: Trophy },
  '/pinpanclub/mobile-arbiter': { name: 'Arbitro Movil', icon: Trophy },
  '/pinpanclub/superpin': { name: 'Super Pin', icon: Trophy },
  '/pinpanclub/rapidpin': { name: 'Rapid Pin', icon: Zap },
  '/pinpanclub/seasons': { name: 'Temporadas', icon: Calendar },
  '/pinpanclub/challenges': { name: 'Desafios', icon: Trophy },
  '/pinpanclub/analytics': { name: 'Estadisticas', icon: Trophy },
  '/pinpanclub/sponsors': { name: 'Patrocinadores', icon: Trophy },
  '/pinpanclub/monday': { name: 'Monday.com', icon: LinkIcon },
  '/rapidpin': { name: 'Rapid Pin', icon: Zap },
  '/tv': { name: 'TV', icon: Trophy },
  '/comunidad': { name: 'Comunidad', icon: Users },
  '/eventos': { name: 'Eventos', icon: Calendar },
  '/galeria': { name: 'Galeria', icon: Store },
  '/admin': { name: 'Administracion', icon: Settings },
  '/admin/notifications': { name: 'Notificaciones', icon: MessageCircle },
  '/admin/posts': { name: 'Publicaciones', icon: BookOpen },
  '/admin/memberships': { name: 'Membresías', icon: CreditCard },
  '/admin/book-orders': { name: 'Pedidos de Libros', icon: Book },
  '/admin/chat': { name: 'Chat de Soporte', icon: MessageCircle },
  '/login': { name: 'Iniciar Sesion', icon: User },
  '/registro': { name: 'Registrarse', icon: User },
};

export function Header() {
  const { t } = useTranslation();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { totalUnread } = useNotifications();
  const { hasPermission, isAdmin: hasAdminAccess, loading: permissionsLoading } = usePermissions();
  const { theme, toggleTheme } = useTheme();
  const { siteConfig } = useSiteConfig();
  const { itemCount, openCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasLinkedStudents, setHasLinkedStudents] = useState(false);

  const isUnatiendaPage = location.pathname.startsWith('/unatienda');
  const isHomePage = location.pathname === '/';
  const canAccessAdmin = isAdmin || hasAdminAccess;

  const currentPageInfo = useMemo(() => {
    const path = location.pathname;
    if (ROUTE_CONFIG[path]) return ROUTE_CONFIG[path];
    for (const [route, config] of Object.entries(ROUTE_CONFIG)) {
      if (route !== '/' && path.startsWith(route)) return config;
    }
    return { name: 'Pagina', icon: Home };
  }, [location.pathname]);

  useEffect(() => {
    const checkLinkedStudents = async () => {
      try {
        const API_URL = process.env.REACT_APP_BACKEND_URL;
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_URL}/api/store/textbook-access/my-students`, {
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
    if (isAuthenticated && user?.user_id) checkLinkedStudents();
  }, [isAuthenticated, user?.user_id]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const toggleSupportChat = () => {
    try {
      if (window.CXGenie?.toggle) window.CXGenie.toggle();
      else if (window.Emergent?.openChat) window.Emergent.openChat();
      else {
        const widgetButton = document.querySelector('[data-cxgenie-trigger], .cxgenie-widget-button, [class*="cxgenie"]');
        if (widgetButton) widgetButton.click();
        else window.dispatchEvent(new CustomEvent('cxgenie:toggle'));
      }
    } catch (error) {
      console.warn('Support chat not available:', error);
    }
  };

  // Hide floating widget
  useEffect(() => {
    const hideFloatingWidget = () => {
      if (!document.getElementById('cxgenie-hide-floating')) {
        const style = document.createElement('style');
        style.id = 'cxgenie-hide-floating';
        style.innerHTML = `
          [class*="cxgenie"], [id*="cxgenie"], [data-cxgenie], [data-bid], [data-aid],
          iframe[src*="cxgenie"], iframe[src*="widget"],
          div[style*="position: fixed"][style*="z-index: 9999"]:not(#root):not(.toast),
          div[style*="position: fixed"][style*="z-index: 99999"] {
            display: none !important; visibility: hidden !important; pointer-events: none !important;
          }
        `;
        document.head.appendChild(style);
      }
      ['[data-bid]','[data-aid]','iframe[src*="cxgenie"]','iframe[src*="widget.cxgenie"]','[class*="cxgenie"]','[id*="cxgenie"]'].forEach(s => {
        document.querySelectorAll(s).forEach(el => { el.style.display = 'none'; el.style.visibility = 'hidden'; });
      });
    };
    hideFloatingWidget();
    const interval = setInterval(hideFloatingWidget, 1000);
    const timeout = setTimeout(() => clearInterval(interval), 10000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, []);

  return (
    <header className="site-header sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border/10" data-testid="app-header">
      <div className="mx-auto px-4 md:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Left: Logo + Breadcrumb */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group" data-testid="logo-link" title="Home">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <LinkIcon className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-black tracking-tight hidden sm:inline">
                ChiPi Link
              </span>
            </Link>

            {!isHomePage && (
              <div className="flex items-center gap-0.5">
                <span className="text-muted-foreground/30 hidden sm:inline">/</span>
                <button
                  onClick={() => navigate(-1)}
                  className="p-1 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors sm:hidden"
                  data-testid="back-button"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground h-7 px-2 text-sm" data-testid="breadcrumb-trigger">
                      {currentPageInfo.icon && <currentPageInfo.icon className="h-3.5 w-3.5" />}
                      <span className="font-medium">{currentPageInfo.name}</span>
                      <ChevronRight className="h-3 w-3 rotate-90 opacity-40" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem asChild><Link to="/" className="flex items-center gap-2"><Home className="h-4 w-4" />Inicio</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/unatienda" className="flex items-center gap-2"><Store className="h-4 w-4" />Tienda</Link></DropdownMenuItem>
                    {isAuthenticated && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild><Link to="/mi-cuenta" className="flex items-center gap-2"><Wallet className="h-4 w-4" />Mi Cuenta</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link to="/pedidos" className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Mis Pedidos</Link></DropdownMenuItem>
                        {user?.tiene_membresia_activa && (
                          <DropdownMenuItem asChild><Link to="/pinpanclub" className="flex items-center gap-2"><Trophy className="h-4 w-4" />PinpanClub</Link></DropdownMenuItem>
                        )}
                      </>
                    )}
                    {canAccessAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild><Link to="/admin" className="flex items-center gap-2 text-accent"><Settings className="h-4 w-4" />Admin</Link></DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Right: Compact action bar */}
          <div className="flex items-center gap-1">
            {/* Support Chat */}
            <Button variant="ghost" size="icon" onClick={toggleSupportChat} className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground" data-testid="support-chat-button">
              <MessageCircle className="h-4 w-4" />
            </Button>

            {/* Notifications */}
            {isAuthenticated && (
              <Button variant="ghost" size="icon" onClick={() => navigate('/pedidos')} className="h-8 w-8 rounded-full relative text-muted-foreground hover:text-foreground" data-testid="notifications-bell">
                <Bell className="h-4 w-4" />
                {totalUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-0.5">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </Button>
            )}

            {/* Cart */}
            <Button variant="ghost" size="icon" onClick={openCart} className="h-8 w-8 rounded-full relative text-muted-foreground hover:text-foreground" data-testid="cart-button">
              <ShoppingCart className="h-4 w-4" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-0.5">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Button>

            {/* Language */}
            <LanguageSelector />

            {/* Theme */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground" data-testid="theme-toggle">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* User */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 rounded-full p-0" data-testid="user-menu-trigger">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-white text-xs font-bold">
                      {(user?.nombre || 'U')[0].toUpperCase()}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 border-b border-border/50 mb-1">
                    <p className="text-sm font-semibold truncate">{user?.nombre || 'User'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <DropdownMenuItem asChild><Link to="/mi-cuenta" className="flex items-center gap-2" data-testid="menu-my-account"><Wallet className="h-4 w-4" />Mi Cuenta</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/pedidos" className="flex items-center gap-2" data-testid="menu-orders"><ShoppingCart className="h-4 w-4" />{t('nav.orders')}</Link></DropdownMenuItem>
                  {hasLinkedStudents && (
                    <DropdownMenuItem asChild><Link to="/my-book-orders" className="flex items-center gap-2" data-testid="menu-book-orders"><BookOpen className="h-4 w-4" />Mis Libros</Link></DropdownMenuItem>
                  )}
                  {user?.tiene_membresia_activa && (
                    <DropdownMenuItem asChild><Link to="/pinpanclub" className="flex items-center gap-2" data-testid="menu-pingpong"><Trophy className="h-4 w-4" />PinpanClub</Link></DropdownMenuItem>
                  )}
                  {canAccessAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild><Link to="/admin" className="flex items-center gap-2 text-accent" data-testid="menu-admin"><Settings className="h-4 w-4" />{t('nav.admin')}</Link></DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive" data-testid="menu-logout">
                    <LogOut className="h-4 w-4 mr-2" />{t('nav.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                onClick={() => navigate('/login')}
                className="h-8 rounded-full px-4 text-xs font-bold"
                data-testid="login-button"
              >
                {t('nav.login')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
