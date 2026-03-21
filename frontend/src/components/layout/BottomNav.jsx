/**
 * BottomNav — Mosaic Community styled bottom navigation.
 * 5 items: Home | Store | My Orders | Alerts | Me
 * Frosted glass background, warm tones, pulse on unread.
 * Chrome-style auto-hide on scroll.
 */
import { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '@/hooks/useNotifications';
import { useCrmNotifications } from '@/hooks/useCrmNotifications';
import {
  Home, ShoppingBag, ClipboardList, Bell, User, LogIn,
  Sun, Moon, Settings, LogOut, Trophy, GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import LanguageSelector from '@/components/common/LanguageSelector';

function NavItem({ icon: Icon, label, to, active, badge, pulse }) {
  return (
    <Link
      to={to}
      data-testid={`bottomnav-${label?.toLowerCase().replace(/\s/g, '-')}`}
      className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 transition-all duration-200 relative"
    >
      <div className={`relative flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200 ${
        active ? 'bg-[#C8102E]/10' : ''
      }`}>
        <Icon className={`h-[18px] w-[18px] transition-all duration-200 ${
          active ? 'text-[#C8102E]' : 'text-[#8b7355]'
        }`} strokeWidth={active ? 2.5 : 1.8} />
        {badge > 0 && (
          <span className={`absolute -top-1 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C8102E] text-[9px] font-bold text-white px-0.5 ${
            pulse ? 'animate-pulse' : ''
          }`}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className={`text-[9px] leading-tight tracking-tight ${
        active ? 'font-bold text-[#C8102E]' : 'font-medium text-[#8b7355]'
      }`}>{label}</span>
    </Link>
  );
}

export default function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { itemCount } = useCart();
  const { theme, toggleTheme } = useTheme();
  const { totalUnread } = useNotifications();
  const { totalUnread: crmUnread } = useCrmNotifications();
  const allUnread = (totalUnread || 0) + (crmUnread || 0);
  const path = location.pathname;

  // Chrome-style auto-hide
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - lastScrollY.current;
        if (delta < -5 || currentY < 50) setVisible(true);
        else if (delta > 10 && currentY > 100) setVisible(false);
        lastScrollY.current = currentY;
        ticking.current = false;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { setVisible(true); }, [path]);

  if (path.startsWith('/embed') || path.startsWith('/auth/') || path === '/payment-status' || path.startsWith('/sport/live/') || path.startsWith('/sport/overlay/') || path === '/sport/tv') return null;

  const isHome = path === '/' || path === '';
  const isStore = path.startsWith('/unatienda');
  const isOrders = path.startsWith('/orders');
  const isProfile = path === '/mi-cuenta' || path === '/my-account';
  const isAdminPage = path.startsWith('/admin');

  const handleLogout = async () => { await logout(); navigate('/'); };

  return (
    <nav
      className={`fixed left-0 right-0 z-50 safe-area-bottom transition-transform duration-300 ease-in-out ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{
        bottom: 0,
        background: 'linear-gradient(180deg, rgba(251,247,240,0.85) 0%, rgba(245,237,224,0.95) 100%)',
        backdropFilter: 'blur(16px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.5)',
        borderTop: '1px solid rgba(139,115,85,0.12)',
      }}
      data-testid="bottom-nav"
    >
      <div className="flex items-stretch h-[56px] max-w-lg mx-auto">
        <NavItem icon={Home} label={t('common.home', 'Home')} to="/" active={isHome} />
        <NavItem icon={ShoppingBag} label={t('common.store', 'Store')} to="/unatienda" active={isStore} badge={itemCount} />
        <NavItem icon={ClipboardList} label={t('cart.myOrders', 'Orders')} to="/orders" active={isOrders} />

        {isAuthenticated ? (
          <>
            <NavItem icon={Bell} label={t('common.alerts', 'Alerts')} to="/orders" active={false} badge={allUnread} pulse={allUnread > 0} />

            {/* Profile menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid="bottomnav-me"
                  className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5"
                >
                  <div className={`relative flex items-center justify-center w-10 h-7 rounded-full ${
                    isProfile || isAdminPage ? 'bg-[#C8102E]/10' : ''
                  }`}>
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#C8102E] to-[#8b1a2a] flex items-center justify-center text-white text-[9px] font-bold">
                      {(user?.nombre || user?.name || 'U')[0].toUpperCase()}
                    </div>
                  </div>
                  <span className={`text-[9px] leading-tight tracking-tight ${
                    isProfile || isAdminPage ? 'font-bold text-[#C8102E]' : 'font-medium text-[#8b7355]'
                  }`}>{t('common.me', 'Me')}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-52 mb-2 rounded-xl shadow-lg" style={{ background: '#FBF7F0', border: '1px solid rgba(139,115,85,0.15)' }}>
                <div className="px-3 py-2 border-b" style={{ borderColor: 'rgba(139,115,85,0.1)' }}>
                  <p className="text-sm font-bold truncate" style={{ color: '#2d2217' }}>{user?.nombre || user?.name || 'User'}</p>
                  <p className="text-[10px] truncate" style={{ color: '#8b7355' }}>{user?.email}</p>
                </div>
                <DropdownMenuItem asChild><Link to="/mi-cuenta" className="flex items-center gap-2"><User className="h-4 w-4" />Mi Cuenta</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/orders" className="flex items-center gap-2"><ClipboardList className="h-4 w-4" />{t('nav.orders', 'Orders')}</Link></DropdownMenuItem>
                {user?.tiene_membresia_activa && (<>
                  <DropdownMenuItem asChild><Link to="/sport" className="flex items-center gap-2"><Trophy className="h-4 w-4" />Sport</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/tutor" className="flex items-center gap-2"><GraduationCap className="h-4 w-4" />Tutor</Link></DropdownMenuItem>
                </>)}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleTheme} className="flex items-center gap-2">
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {theme === 'dark' ? 'Light' : 'Dark'}
                </DropdownMenuItem>
                <div className="px-2 py-1"><LanguageSelector /></div>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild><Link to="/admin" className="flex items-center gap-2" style={{ color: '#C8102E' }}><Settings className="h-4 w-4" />{t('nav.admin', 'Admin')}</Link></DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />{t('nav.logout', 'Logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <NavItem icon={LogIn} label={t('common.login', 'Login')} to="/login" active={path === '/login'} />
        )}
      </div>
    </nav>
  );
}
