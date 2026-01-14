import { lazy, Suspense, useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2 } from 'lucide-react';
import {
  LayoutDashboard,
  ShoppingBag,
  ShoppingCart,
  Users,
  Settings,
  Plug,
  ChevronLeft,
  ChevronRight,
  Menu,
  MessageSquare,
  Link as LinkIcon,
  User,
  LogOut,
  Sun,
  Moon,
  Home,
  X,
  Trophy,
  BookOpen,
  CreditCard,
  QrCode
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Lazy load modules for code splitting and better performance
const DashboardModule = lazy(() => import('@/modules/dashboard/DashboardModule'));
const UnatiendaModule = lazy(() => import('@/modules/unatienda/UnatiendaModule'));
const OrdersModule = lazy(() => import('@/modules/store/OrdersModule'));
const CustomersModule = lazy(() => import('@/modules/customers/CustomersModule'));
const AdminModule = lazy(() => import('@/modules/admin/AdminModule'));
const IntegrationsModule = lazy(() => import('@/modules/integrations/IntegrationsModule'));
const PinpanClubModule = lazy(() => import('@/modules/pinpanclub/pages/PingPongDashboard'));
const AdminMemberships = lazy(() => import('@/modules/users/pages/AdminMemberships'));

// Loading component for Suspense
const ModuleLoader = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Navigation items
const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'unatienda', label: 'Unatienda', icon: ShoppingBag },
  { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
  { id: 'customers', label: 'Clientes', icon: Users },
  { id: 'memberships', label: 'Membresías', icon: CreditCard },
  { id: 'pinpanclub', label: 'PinpanClub', icon: Trophy },
  { id: 'admin', label: 'Administración', icon: Settings },
  { id: 'integrations', label: 'Integraciones', icon: Plug },
  { id: 'tickets', label: 'Tickets/Chat', icon: MessageSquare, isExternal: true, path: '/admin/chat' },
];

export default function AdminDashboard() {
  const { isAdmin, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Get active module from URL hash (default to 'admin' for Administración)
  const activeModule = location.hash.replace('#', '') || 'admin';

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const setActiveModule = (moduleId) => {
    navigate(`/admin#${moduleId}`);
    setMobileMenuOpen(false);
  };

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <DashboardModule />;
      case 'store':
        return <StoreModule />;
      case 'orders':
        return <OrdersModule />;
      case 'customers':
        return <CustomersModule />;
      case 'memberships':
        return <AdminMemberships />;
      case 'pinpanclub':
        return <PinpanClubModule />;
      case 'admin':
        return <AdminModule />;
      case 'integrations':
        return <IntegrationsModule />;
      default:
        return <DashboardModule />;
    }
  };

  const currentNavItem = navItems.find(item => item.id === activeModule);

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header - Full Width */}
      <header className="sticky top-0 z-50 w-full bg-card border-b">
        <div className="flex h-14 items-center justify-between px-4">
          {/* Left: Logo + Menu Toggle */}
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-red-500 to-yellow-500 text-white group-hover:scale-105 transition-transform">
                <LinkIcon className="h-4 w-4" />
              </div>
              <span className="font-serif text-lg font-bold hidden sm:inline bg-gradient-to-r from-red-600 to-yellow-600 bg-clip-text text-transparent">
                ChiPi Link
              </span>
            </Link>
          </div>

          {/* Center: Current Module (Mobile) */}
          <h1 className="font-semibold lg:hidden">{currentNavItem?.label || 'Dashboard'}</h1>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 px-3 gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline max-w-[100px] truncate">
                    {user?.nombre?.split(' ')[0] || 'Admin'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/" className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Ir al Inicio
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside
          className={cn(
            "hidden lg:flex flex-col h-[calc(100vh-56px)] border-r bg-card/50 transition-all duration-300",
            collapsed ? "w-16" : "w-56"
          )}
        >
          <ScrollArea className="flex-1 py-2">
            <nav className="px-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3 h-10",
                      collapsed && "justify-center px-2"
                    )}
                    onClick={() => {
                      if (item.isExternal && item.path) {
                        navigate(item.path);
                      } else {
                        setActiveModule(item.id);
                      }
                    }}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && <span className="text-sm">{item.label}</span>}
                  </Button>
                );
              })}
            </nav>
          </ScrollArea>
          
          {/* Collapse Toggle */}
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="w-full justify-center"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40">
            <div 
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="absolute left-0 top-14 h-[calc(100%-56px)] w-64 bg-card border-r shadow-lg">
              <ScrollArea className="h-full py-2">
                <nav className="px-2 space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeModule === item.id;
                    
                    return (
                      <Button
                        key={item.id}
                        variant={isActive ? "secondary" : "ghost"}
                        className="w-full justify-start gap-3 h-10"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          if (item.isExternal && item.path) {
                            navigate(item.path);
                          } else {
                            setActiveModule(item.id);
                          }
                        }}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm">{item.label}</span>
                      </Button>
                    );
                  })}
                </nav>
              </ScrollArea>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6 max-w-7xl mx-auto">
            {/* Page Header - Desktop only */}
            <div className="hidden lg:block mb-6">
              <h1 className="text-2xl font-bold">{currentNavItem?.label || 'Dashboard'}</h1>
              <p className="text-muted-foreground text-sm">
                {activeModule === 'dashboard' && 'Vista general de tu tienda'}
                {activeModule === 'store' && 'Gestiona tus productos e inventario'}
                {activeModule === 'orders' && 'Administra los pedidos de tus clientes'}
                {activeModule === 'customers' && 'Gestiona clientes, estudiantes y matrículas'}
                {activeModule === 'memberships' && 'Gestiona planes, membresías, visitas y códigos QR'}
                {activeModule === 'pinpanclub' && 'Club de Tenis de Mesa - Partidos, jugadores y torneos'}
                {activeModule === 'admin' && 'Configura tu sitio y personalización'}
                {activeModule === 'integrations' && 'Conecta con servicios externos'}
              </p>
            </div>
            
            {/* Module Content */}
            <Suspense fallback={<ModuleLoader />}>
              {renderModule()}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
