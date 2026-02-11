import { lazy, Suspense, useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { usePermissions } from '@/hooks/usePermissions';
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
  QrCode,
  Shield,
  BarChart2,
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Lazy load modules for code splitting and better performance
const DashboardModule = lazy(() => import('@/modules/dashboard/DashboardModule'));
const UnatiendaModule = lazy(() => import('@/modules/unatienda/UnatiendaModule'));
const TextbookOrdersAdminTab = lazy(() => import('@/modules/admin/store/TextbookOrdersAdminTab'));
const UsersManagementModule = lazy(() => import('@/modules/admin/users/UsersManagementModule'));
const AdminModule = lazy(() => import('@/modules/admin/AdminModule'));
const IntegrationsModule = lazy(() => import('@/modules/integrations/IntegrationsModule'));
const PinpanClubModule = lazy(() => import('@/modules/pinpanclub/pages/PingPongDashboard'));
const AdminMemberships = lazy(() => import('@/modules/admin/users/components/AdminMemberships'));
const RolesModule = lazy(() => import('@/modules/admin/RolesModule'));
const StoreAnalyticsModule = lazy(() => import('@/modules/admin/store/StoreAnalyticsModule'));
const WalletModule = lazy(() => import('@/modules/wallet/WalletModule'));

// Loading component for Suspense
const ModuleLoader = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Navigation items with required permissions
// Each item can have: permission (single), permissions (array), requireAll (bool)
const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'admin.dashboard' },
  { id: 'unatienda', label: 'Unatienda', icon: ShoppingBag, permission: 'unatienda.access' },
  { id: 'orders', label: 'Orders', icon: ShoppingCart, permission: 'unatienda.manage_orders' },
  { id: 'analytics', label: 'Reports', icon: BarChart2, permission: 'admin.site_config', adminOnly: true },
  { id: 'customers', label: 'Users', icon: Users, permission: 'users.view' },
  { id: 'memberships', label: 'Memberships', icon: CreditCard, permission: 'memberships.view' },
  { id: 'pinpanclub', label: 'PinpanClub', icon: Trophy, permission: 'pinpanclub.admin_panel' },
  { id: 'roles', label: 'Roles & Permissions', icon: Shield, permission: 'roles.view' },
  { id: 'admin', label: 'Administration', icon: Settings, permission: 'admin.site_config' },
  { id: 'integrations', label: 'Integrations', icon: Plug, permission: 'integrations.access' },
  { id: 'tickets', label: 'Tickets/Chat', icon: MessageSquare, permission: 'tickets.access', isExternal: true, path: '/admin/chat' },
];

export default function AdminDashboard() {
  const { isAdmin, user, logout, loading: authLoading } = useAuth();
  const { hasPermission, role } = usePermissions();
  const { theme, toggleTheme, setScope } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Switch to admin theme scope on mount, restore on unmount
  useEffect(() => {
    setScope('admin');
    return () => setScope('public');
  }, [setScope]);

  // Get active module from URL hash (default to 'dashboard')
  const activeModule = location.hash.replace('#', '') || 'dashboard';

  /**
   * SIMPLIFIED LOGIC:
   * If user.is_admin is true (from auth context), show ALL modules.
   * This is the most reliable check since it comes directly from the login response.
   * The RBAC system is used for more granular permissions within modules.
   */
  const filteredNavItems = useMemo(() => {
    // If auth is still loading, show all items to prevent flash
    if (authLoading) {
      return navItems;
    }
    
    // Admin users see all navigation items
    if (isAdmin) {
      return navItems;
    }
    
    // Non-admin users: filter by specific permissions and exclude adminOnly items
    return navItems.filter(item => {
      // Skip admin-only items for non-admins
      if (item.adminOnly) return false;
      if (!item.permission) return true;
      return hasPermission(item.permission);
    });
  }, [authLoading, isAdmin, hasPermission]);

  // Redirect non-admins away from admin panel (only after auth is loaded)
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
    }
  }, [authLoading, isAdmin, navigate]);

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
      case 'unatienda':
        return <UnatiendaModule />;
      case 'orders':
        return <TextbookOrdersAdminTab />;
      case 'analytics':
        return <StoreAnalyticsModule />;
      case 'customers':
        return <UsersManagementModule />;
      case 'memberships':
        return <AdminMemberships />;
      case 'pinpanclub':
        return <PinpanClubModule />;
      case 'roles':
        return <RolesModule />;
      case 'admin':
        return <AdminModule />;
      case 'integrations':
        return <IntegrationsModule />;
      default:
        return <DashboardModule />;
    }
  };

  const currentNavItem = filteredNavItems.find(item => item.id === activeModule) || filteredNavItems[0];

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
                    Go to Home
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log Out
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
              {filteredNavItems.map((item) => {
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
                  {filteredNavItems.map((item) => {
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
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{currentNavItem?.label || 'Dashboard'}</h1>
                  <p className="text-muted-foreground text-sm">
                    {activeModule === 'dashboard' && 'Welcome to ChiPi Link administration panel'}
                    {activeModule === 'unatienda' && 'Manage catalogs, products, students and Unatienda orders'}
                    {activeModule === 'orders' && 'Manage your customer orders'}
                    {activeModule === 'customers' && 'Manage users, their exclusive access requests and connections'}
                    {activeModule === 'memberships' && 'Manage plans, memberships, visits and QR codes'}
                    {activeModule === 'pinpanclub' && 'Table Tennis Club - Matches, players and tournaments'}
                    {activeModule === 'roles' && 'Manage user roles and system permissions'}
                    {activeModule === 'admin' && 'Configure your site and customization'}
                    {activeModule === 'integrations' && 'Connect with external services'}
                  </p>
                </div>
                {role && (
                  <Badge 
                    variant="outline" 
                    className="hidden md:flex items-center gap-1.5"
                    style={{ 
                      backgroundColor: `${role.color}15`,
                      borderColor: role.color,
                      color: role.color
                    }}
                  >
                    <Shield className="h-3 w-3" />
                    {role.nombre}
                  </Badge>
                )}
              </div>
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
