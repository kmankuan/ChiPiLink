/**
 * BottomNav — Native app-style bottom navigation
 * Clean pill-shaped active indicator, no duplication.
 * Cart opens the cart drawer (not navigate to store).
 */
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Home, Compass, ShoppingBag, Trophy, User, LogIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function NavItem({ icon: Icon, label, to, active, badge, onClick }) {
  const Component = to ? Link : 'button';
  const props = to ? { to } : { onClick };

  return (
    <Component
      {...props}
      data-testid={`bottomnav-${label?.toLowerCase()}`}
      className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 min-w-0 flex-1 transition-all duration-200 relative ${
        active ? 'text-foreground' : 'text-muted-foreground/60'
      }`}
    >
      <div className={`relative flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200 ${active ? 'bg-primary/10' : ''}`}>
        <Icon className={`h-[18px] w-[18px] transition-all duration-200 ${active ? 'scale-105' : ''}`} />
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
  const { user, isAuthenticated } = useAuth();
  const { itemCount, openCart } = useCart();
  const path = location.pathname;

  if (path.startsWith('/admin') || path.startsWith('/embed') || path.startsWith('/auth/')) return null;

  const isHome = path === '/' || path === '';
  const isExplore = path.startsWith('/comunidad') || path.startsWith('/eventos') || path.startsWith('/galeria');
  const isStore = path.startsWith('/unatienda') || path.startsWith('/pedidos');
  const isClub = path.startsWith('/pinpanclub') || path.startsWith('/rapidpin');
  const isProfile = path === '/mi-cuenta' || path === '/login';

  return (
    <nav className="bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/10 safe-area-bottom" data-testid="bottom-nav">
      <div className="flex items-stretch justify-around h-[58px] max-w-lg mx-auto px-2">
        <NavItem icon={Home} label={t('common.home', 'Home')} to="/" active={isHome} />
        <NavItem icon={Compass} label={t('common.explore', 'Explore')} to="/comunidad" active={isExplore} />
        <NavItem icon={ShoppingBag} label={t('common.store', 'Store')} to="/unatienda" active={isStore} badge={itemCount} />
        {isAuthenticated ? (
          <>
            {user?.tiene_membresia_activa && (
              <NavItem icon={Trophy} label={t('common.club', 'Club')} to="/pinpanclub" active={isClub} />
            )}
            <NavItem icon={User} label={t('common.me', 'Me')} to="/mi-cuenta" active={isProfile} />
          </>
        ) : (
          <NavItem icon={LogIn} label={t('common.login', 'Login')} to="/login" active={isProfile} />
        )}
      </div>
    </nav>
  );
}
