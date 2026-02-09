/**
 * BottomNav — Native app-style bottom tab navigation for mobile
 * Provides iOS/Android-like navigation with icons + labels
 * Only visible on mobile/tablet screens, hidden on desktop
 */
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Home, Store, ShoppingCart, User, Trophy, LogIn, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

function NavItem({ icon: Icon, label, to, active, badge, onClick }) {
  const Component = to ? Link : 'button';
  const props = to ? { to } : { onClick };

  return (
    <Component
      {...props}
      className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 min-w-0 flex-1 transition-colors relative ${
        active
          ? 'text-primary'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      <div className="relative">
        <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-0.5">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className={`text-[10px] leading-tight truncate max-w-full ${active ? 'font-semibold' : 'font-medium'}`}>
        {label}
      </span>
      {active && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
      )}
    </Component>
  );
}

export default function BottomNav() {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { itemCount } = useCart();
  const path = location.pathname;

  // Don't show on admin, embed, or auth callback pages
  if (path.startsWith('/admin')) return null;
  if (path.startsWith('/embed')) return null;
  if (path.startsWith('/auth/')) return null;

  const isHome = path === '/' || path === '';
  const isStore = path.startsWith('/unatienda');
  const isOrders = path.startsWith('/pedidos') || path.startsWith('/mis-pedidos');
  const isClub = path.startsWith('/pinpanclub');
  const isProfile = path === '/mi-cuenta' || path === '/login';

  return (
    <nav className="bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/98 backdrop-blur-xl border-t border-border/20 safe-area-bottom">
      <div className="flex items-stretch justify-around h-14 max-w-lg mx-auto px-1">
        <NavItem icon={Home} label="Home" to="/" active={isHome} />
        <NavItem icon={Store} label="Store" to="/unatienda" active={isStore} />
        <NavItem icon={ShoppingCart} label="Cart" to="/unatienda" active={false} badge={itemCount} />
        {isAuthenticated ? (
          <>
            {user?.tiene_membresia_activa && (
              <NavItem icon={Trophy} label="Club" to="/pinpanclub" active={isClub} />
            )}
            <NavItem icon={User} label="Me" to="/mi-cuenta" active={isProfile} />
          </>
        ) : (
          <NavItem icon={LogIn} label="Login" to="/login" active={isProfile} />
        )}
      </div>
    </nav>
  );
}
