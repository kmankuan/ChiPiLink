/**
 * BottomNav — Primary navigation for ALL screen sizes.
 * Native app-style bottom bar. Replaces the traditional header.
 * Includes: Home, Explore, Store (with cart badge), Club, Profile/Login
 * Plus quick-access: Cart drawer, Theme toggle, Language
 */
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '@/hooks/useNotifications';
import {
  Home, Compass, ShoppingBag, Trophy, User, LogIn,
  Sun, Moon, ShoppingCart, Settings, LogOut, Bell,
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import LanguageSelector from '@/components/common/LanguageSelector';

function NavItem({ icon: Icon, label, to, active, badge, onClick }) {
  const Component = to ? Link : 'button';
  const props = to ? { to } : { onClick };

  return (
    <Component
      {...props}
      data-testid={`bottomnav-${label?.toLowerCase().replace(/\s/g, '-')}`}
      className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 sm:px-4 min-w-0 transition-all duration-200 relative ${
        active ? 'text-foreground' : 'text-muted-foreground/60'
      }`}
    >
      <div className={`relative flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200 ${active ? 'bg-primary/10' : ''}`}>
        <Icon className={`h-[18px] w-[18px] transition-transform duration-200 ${active ? 'scale-110' : ''}`} />
        {badge > 0 && (
          <span className="absolute -top-1 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-0.5 shadow-sm">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className={`text-[10px] leading-tight truncate ${active ? 'font-bold' : 'font-medium'}`}>
        {label}
      </span>
    </Component>
  );
}

export default function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { itemCount, openCart } = useCart();
  const { theme, toggleTheme } = useTheme();
  const { totalUnread } = useNotifications();
  const path = location.pathname;

  if (path.startsWith('/embed') || path.startsWith('/auth/')) return null;

  const isHome = path === '/' || path === '';
  const isExplore = path.startsWith('/comunidad') || path.startsWith('/eventos') || path.startsWith('/galeria');
  const isStore = path.startsWith('/unatienda') || path.startsWith('/pedidos');
  const isClub = path.startsWith('/pinpanclub') || path.startsWith('/rapidpin');
  const isProfile = path === '/mi-cuenta' || path === '/my-account' || path === '/login';
  const isAdminPage = path.startsWith('/admin');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/10 safe-area-bottom" data-testid="bottom-nav">
      <div className="flex items-stretch justify-around h-[58px] max-w-2xl mx-auto px-1">
        {/* Core nav items */}
        <NavItem icon={Home} label={t('common.home', 'Home')} to="/" active={isHome} />
        <NavItem icon={Compass} label={t('common.explore', 'Explore')} to="/comunidad" active={isExplore} />
        <NavItem icon={ShoppingBag} label={t('common.store', 'Store')} to="/unatienda" active={isStore} badge={itemCount} />

        {/* Club (if member) */}
        {isAuthenticated && user?.tiene_membresia_activa && (
          <NavItem icon={Trophy} label={t('common.club', 'Club')} to="/pinpanclub" active={isClub} />
        )}

        {/* Cart button */}
        <NavItem icon={ShoppingCart} label={t('common.cart', 'Cart')} onClick={openCart} badge={itemCount} />

        {/* Profile / User menu */}
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-testid="bottomnav-profile-menu"
                className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 sm:px-4 min-w-0 transition-all duration-200 ${
                  isProfile || isAdminPage ? 'text-foreground' : 'text-muted-foreground/60'
                }`}
              >
                <div className={`relative flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200 ${isProfile || isAdminPage ? 'bg-primary/10' : ''}`}>
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-white text-[9px] font-bold">
                    {(user?.nombre || 'U')[0].toUpperCase()}
                  </div>
                  {totalUnread > 0 && (
                    <span className="absolute -top-1 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white px-0.5">
                      {totalUnread > 9 ? '9+' : totalUnread}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] leading-tight truncate ${isProfile || isAdminPage ? 'font-bold' : 'font-medium'}`}>
                  {t('common.me', 'Me')}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-52 mb-2">
              <div className="px-3 py-2 border-b border-border/50">
                <p className="text-sm font-semibold truncate">{user?.nombre || 'User'}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
              <DropdownMenuItem asChild><Link to="/mi-cuenta" className="flex items-center gap-2"><User className="h-4 w-4" />Mi Cuenta</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/pedidos" className="flex items-center gap-2"><ShoppingBag className="h-4 w-4" />{t('nav.orders', 'Orders')}</Link></DropdownMenuItem>
              {user?.tiene_membresia_activa && (
                <DropdownMenuItem asChild><Link to="/pinpanclub" className="flex items-center gap-2"><Trophy className="h-4 w-4" />PinPanClub</Link></DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {/* Theme + Language */}
              <DropdownMenuItem onClick={toggleTheme} className="flex items-center gap-2">
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </DropdownMenuItem>
              <div className="px-2 py-1"><LanguageSelector /></div>
              {(isAdmin) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/admin" className="flex items-center gap-2 text-accent"><Settings className="h-4 w-4" />{t('nav.admin', 'Admin')}</Link></DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />{t('nav.logout', 'Logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <NavItem icon={LogIn} label={t('common.login', 'Login')} to="/login" active={isProfile} />
        )}
      </div>
    </nav>
  );
}
