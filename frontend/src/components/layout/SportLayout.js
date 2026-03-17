import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, Trophy, Users, Swords, Medal,
  Radio, Settings, LogOut, LogIn, Menu, X,
  Globe, ChevronDown
} from 'lucide-react';

const navItems = [
  { path: '/sport', icon: LayoutDashboard, label: 'dashboard', exact: true },
  { path: '/sport/rankings', icon: Trophy, label: 'rankings' },
  { path: '/sport/players', icon: Users, label: 'players' },
  { path: '/sport/leagues', icon: Medal, label: 'leagues' },
  { path: '/sport/matches', icon: Swords, label: 'matches' },
  { path: '/sport/tournaments', icon: Trophy, label: 'tournaments' },
  { path: '/sport/live', icon: Radio, label: 'live' },
];

const adminItems = [
  { path: '/sport/admin', icon: Settings, label: 'admin' },
];

export function SportLayout() {
  const { t, i18n } = useTranslation();
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const isActive = (path, exact) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const changeLang = (lng) => {
    i18n.changeLanguage(lng);
    setLangOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 h-14">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-3">
            <button
              data-testid="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link to="/sport" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
                <span className="text-white font-bold text-sm">🏓</span>
              </div>
              <span className="font-bold text-lg text-gray-900 hidden sm:block">
                ChiPi <span className="text-red-600">Sport</span>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="relative">
              <button
                data-testid="lang-switcher"
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-gray-100 text-sm"
              >
                <Globe size={16} />
                <span className="hidden sm:inline">{i18n.language.toUpperCase()}</span>
                <ChevronDown size={14} />
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 min-w-[120px] z-50">
                  {[['en', 'English'], ['es', 'Español'], ['zh', '中文']].map(([code, name]) => (
                    <button
                      key={code}
                      data-testid={`lang-${code}`}
                      onClick={() => changeLang(code)}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${
                        i18n.language === code ? 'text-red-600 font-medium' : ''
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 hidden sm:block">{user.name}</span>
                <Button
                  data-testid="logout-btn"
                  variant="ghost" size="sm" onClick={logout}
                >
                  <LogOut size={16} />
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button data-testid="login-btn" variant="ghost" size="sm">
                  <LogIn size={16} className="mr-1" /> {t('login')}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`fixed top-14 left-0 bottom-0 w-60 bg-white border-r border-gray-200 z-40 transform transition-transform duration-200 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label}`}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-red-50 text-red-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={18} />
                {t(item.label)}
              </Link>
            );
          })}
          {isAdmin && (
            <>
              <div className="border-t my-2" />
              {adminItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    data-testid={`nav-${item.label}`}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-red-50 text-red-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={18} />
                    {t(item.label)}
                  </Link>
                );
              })}
            </>
          )}
        </nav>
      </aside>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="pt-14 lg:pl-60">
        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
