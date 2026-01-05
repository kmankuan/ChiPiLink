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
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Lazy load modules for code splitting and better performance
const DashboardModule = lazy(() => import('@/modules/dashboard/DashboardModule'));
const StoreModule = lazy(() => import('@/modules/store/StoreModule'));
const OrdersModule = lazy(() => import('@/modules/store/OrdersModule'));
const CustomersModule = lazy(() => import('@/modules/customers/CustomersModule'));
const AdminModule = lazy(() => import('@/modules/admin/AdminModule'));
const IntegrationsModule = lazy(() => import('@/modules/integrations/IntegrationsModule'));

// Loading component for Suspense
const ModuleLoader = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Navigation items
const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'store', label: 'Tienda', icon: ShoppingBag },
  { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
  { id: 'customers', label: 'Clientes', icon: Users },
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

  // Get active module from URL hash
  const activeModule = location.hash.replace('#', '') || 'dashboard';

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
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold">{currentNavItem?.label || 'Dashboard'}</h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside
          className={cn(
            "hidden lg:flex flex-col h-[calc(100vh-64px)] border-r bg-card transition-all duration-300",
            collapsed ? "w-16" : "w-64"
          )}
        >
          <div className="p-4 flex items-center justify-between">
            {!collapsed && (
              <h2 className="font-semibold text-lg">Panel Admin</h2>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="ml-auto"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
          
          <Separator />
          
          <ScrollArea className="flex-1">
            <nav className="p-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3",
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
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Button>
                );
              })}
            </nav>
          </ScrollArea>
        </aside>

        {/* Mobile Sidebar */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div 
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-64 bg-card border-r">
              <div className="p-4">
                <h2 className="font-semibold text-lg">Panel Admin</h2>
              </div>
              <Separator />
              <nav className="p-2 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeModule === item.id;
                  
                  return (
                    <Button
                      key={item.id}
                      variant={isActive ? "secondary" : "ghost"}
                      className="w-full justify-start gap-3"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        if (item.isExternal && item.path) {
                          navigate(item.path);
                        } else {
                          setActiveModule(item.id);
                        }
                      }}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Button>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {/* Page Header - Desktop only */}
            <div className="hidden lg:block mb-6">
              <h1 className="text-2xl font-bold">{currentNavItem?.label || 'Dashboard'}</h1>
              <p className="text-muted-foreground">
                {activeModule === 'dashboard' && 'Vista general de tu tienda'}
                {activeModule === 'store' && 'Gestiona tus productos e inventario'}
                {activeModule === 'orders' && 'Administra los pedidos de tus clientes'}
                {activeModule === 'customers' && 'Gestiona clientes, estudiantes y matrículas'}
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
