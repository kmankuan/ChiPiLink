import { lazy, Suspense, useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import LanguageSelector from '@/components/common/LanguageSelector';
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
  Wallet,
  Rss,
  Code2,
  BellRing,
  ChevronDown,
  Search,
  Paintbrush,
  Palette,
  Languages,
  Database,
  ArrowRightLeft,
  LayoutGrid,
  Layout,
  Radio,
  Layers,
  Megaphone,
  Send,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

// Lazy load modules for code splitting and better performance
const DashboardModule = lazy(() => import('@/modules/dashboard/DashboardModule'));
const UnatiendaModule = lazy(() => import('@/modules/unatienda/UnatiendaModule'));
const TextbookOrdersAdminTab = lazy(() => import('@/modules/admin/store/TextbookOrdersAdminTab'));
const UsersManagementModule = lazy(() => import('@/modules/admin/users/UsersManagementModule'));
const IntegrationsModule = lazy(() => import('@/modules/integrations/IntegrationsModule'));
const PinpanClubModule = lazy(() => import('@/modules/pinpanclub/pages/PingPongDashboard'));
const AdminMemberships = lazy(() => import('@/modules/admin/users/components/AdminMemberships'));
const RolesModule = lazy(() => import('@/modules/admin/RolesModule'));
const StoreAnalyticsModule = lazy(() => import('@/modules/admin/store/StoreAnalyticsModule'));
const WalletModule = lazy(() => import('@/modules/wallet/WalletModule'));
const CommunityFeedModule = lazy(() => import('@/modules/community/CommunityFeedModule'));
const DevControlModule = lazy(() => import('@/modules/admin/DevControlModule'));
const PaymentAlertsModule = lazy(() => import('@/modules/admin/PaymentAlertsModule'));

// Administration sub-modules (previously nested inside AdminModule)
const SiteConfigModule = lazy(() => import('@/modules/admin/SiteConfigModule'));
const AuthMethodsConfig = lazy(() => import('@/modules/admin/AuthMethodsConfig'));
const UIStyleModule = lazy(() => import('@/modules/admin/UIStyleModule'));
const LandingPageEditor = lazy(() => import('@/components/admin/LandingPageEditor'));
const ShowcaseAdminModule = lazy(() => import('@/modules/admin/ShowcaseAdminModule'));
const LayoutPreviewModule = lazy(() => import('@/modules/admin/LayoutPreviewModule'));
const TickerAdminModule = lazy(() => import('@/modules/admin/TickerAdminModule'));
const WidgetManagerModule = lazy(() => import('@/modules/admin/WidgetManagerModule'));
const TelegramAdminModule = lazy(() => import('@/modules/admin/TelegramAdminModule'));
const FormsManagerModule = lazy(() => import('@/modules/admin/FormsManagerModule'));
const TranslationsPanel = lazy(() => import('@/modules/admin/TranslationsModule'));
const DictionaryManagerModule = lazy(() => import('@/modules/admin/DictionaryManagerModule'));
const TranslationCoverageCard = lazy(() => import('@/modules/admin/TranslationCoverageCard'));
const DemoDataModule = lazy(() => import('@/modules/admin/DemoDataModule'));
const DatabaseMigrationModule = lazy(() => import('@/modules/admin/DatabaseMigrationModule'));
const ModuleStatusModule = lazy(() => import('@/modules/admin/ModuleStatusModule'));

// Loading component for Suspense
const ModuleLoader = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Navigation items with required permissions, grouped (labelKey for i18n)
const navGroups = [
  {
    group: 'Overview',
    items: [
      { id: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, permission: 'admin.dashboard' },
    ],
  },
  {
    group: 'Commerce',
    items: [
      { id: 'unatienda', labelKey: 'nav.unatienda', icon: ShoppingBag, permission: 'unatienda.access' },
      { id: 'orders', labelKey: 'nav.orders', icon: ShoppingCart, permission: 'unatienda.manage_orders' },
      { id: 'wallet', labelKey: 'nav.wallet', icon: Wallet, permission: 'admin.site_config' },
      { id: 'payment-alerts', labelKey: 'nav.paymentAlerts', icon: BellRing, permission: 'admin.site_config', adminOnly: true },
      { id: 'analytics', labelKey: 'nav.reports', icon: BarChart2, permission: 'admin.site_config', adminOnly: true },
    ],
  },
  {
    group: 'Community',
    items: [
      { id: 'pinpanclub', labelKey: 'nav.pinpanclub', icon: Trophy, permission: 'pinpanclub.admin_panel' },
      { id: 'community', labelKey: 'nav.community', icon: Rss, permission: 'admin.site_config' },
      { id: 'tickets', labelKey: 'nav.ticketsChat', icon: MessageSquare, permission: 'tickets.access', isExternal: true, path: '/admin/chat' },
    ],
  },
  {
    group: 'Management',
    items: [
      { id: 'customers', labelKey: 'nav.users', icon: Users, permission: 'users.view' },
      { id: 'memberships', labelKey: 'nav.memberships', icon: CreditCard, permission: 'memberships.view' },
      { id: 'roles', labelKey: 'nav.rolesPermissions', icon: Shield, permission: 'roles.view' },
    ],
  },
  {
    group: 'Configuration',
    items: [
      { id: 'site-config', labelKey: 'nav.siteConfig', icon: Settings, permission: 'admin.site_config' },
      { id: 'auth-config', labelKey: 'nav.authentication', icon: Shield, permission: 'admin.site_config' },
      { id: 'ui-style', labelKey: 'nav.uiStyle', icon: Paintbrush, permission: 'admin.site_config' },
      { id: 'translations', labelKey: 'nav.translations', icon: Languages, permission: 'admin.site_config' },
    ],
  },
  {
    group: 'Content',
    items: [
      { id: 'landing', labelKey: 'nav.landingPage', icon: Palette, permission: 'admin.site_config' },
      { id: 'showcase', labelKey: 'nav.bannersMedia', icon: Megaphone, permission: 'admin.site_config' },
      { id: 'layouts', labelKey: 'nav.layoutsIcons', icon: Layers, permission: 'admin.site_config' },
      { id: 'ticker', labelKey: 'nav.activityTicker', icon: Radio, permission: 'admin.site_config' },
      { id: 'widget', labelKey: 'nav.widget', icon: Layout, permission: 'admin.site_config' },
    ],
  },
  {
    group: 'Integrations',
    items: [
      { id: 'telegram', labelKey: 'nav.telegram', icon: Send, permission: 'admin.site_config' },
      { id: 'forms', labelKey: 'nav.forms', icon: FileText, permission: 'admin.site_config' },
      { id: 'integrations', labelKey: 'nav.integrations', icon: Plug, permission: 'integrations.access' },
    ],
  },
  {
    group: 'Developer',
    items: [
      { id: 'demo', labelKey: 'nav.demoData', icon: Database, permission: 'admin.site_config', adminOnly: true },
      { id: 'migration', labelKey: 'nav.migration', icon: ArrowRightLeft, permission: 'admin.site_config', adminOnly: true },
      { id: 'modules', labelKey: 'nav.moduleStatus', icon: LayoutGrid, permission: 'admin.site_config', adminOnly: true },
      { id: 'devcontrol', labelKey: 'nav.devControl', icon: Code2, permission: 'admin.site_config', adminOnly: true },
    ],
  },
];

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  // Flatten all items with translated labels for lookups
  const allNavItems = useMemo(() =>
    navGroups.flatMap(g => g.items.map(item => ({ ...item, label: t(item.labelKey), group: g.group }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [i18n.language]
  );
  const { isAdmin, user, logout, loading: authLoading } = useAuth();
  const { hasPermission, role } = usePermissions();
  const { theme, toggleTheme, setScope } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({ Overview: true, Commerce: true, Community: true, Management: true, Configuration: false, Content: false, Integrations: false, Developer: false });
  const [sidebarSearch, setSidebarSearch] = useState('');

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
  const filteredNavGroups = useMemo(() => {
    if (authLoading) return navGroups.map(g => ({ ...g, items: g.items.map(i => ({ ...i, label: t(i.labelKey) })) }));
    
    return navGroups.map(g => ({
      ...g,
      items: g.items
        .filter(item => {
          if (isAdmin) return true;
          if (item.adminOnly) return false;
          if (!item.permission) return true;
          return hasPermission(item.permission);
        })
        .map(i => ({ ...i, label: t(i.labelKey) })),
    })).filter(g => g.items.length > 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAdmin, hasPermission, i18n.language]);

  // Flat list for lookups
  const filteredNavItems = useMemo(() => filteredNavGroups.flatMap(g => g.items), [filteredNavGroups]);

  // Search-filtered groups for sidebar display
  const displayNavGroups = useMemo(() => {
    if (!sidebarSearch.trim()) return filteredNavGroups;
    const q = sidebarSearch.toLowerCase();
    return filteredNavGroups
      .map(g => ({
        ...g,
        items: g.items.filter(i =>
          i.label.toLowerCase().includes(q) || i.id.toLowerCase().includes(q) || g.group.toLowerCase().includes(q)
        ),
      }))
      .filter(g => g.items.length > 0);
  }, [filteredNavGroups, sidebarSearch]);

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
      case 'wallet':
        return <WalletModule />;
      case 'payment-alerts':
        return <PaymentAlertsModule />;
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
      case 'community':
        return <CommunityFeedModule />;
      case 'integrations':
        return <IntegrationsModule />;
      case 'devcontrol':
        return <DevControlModule />;
      // Configuration
      case 'site-config':
        return <SiteConfigModule />;
      case 'auth-config':
        return <AuthMethodsConfig />;
      case 'ui-style':
        return <UIStyleModule />;
      case 'translations':
        return (
          <div className="space-y-8">
            <TranslationCoverageCard />
            <DictionaryManagerModule />
            <div className="border-t pt-6"><TranslationsPanel /></div>
          </div>
        );
      // Content
      case 'landing':
        return <LandingPageEditor />;
      case 'showcase':
        return <ShowcaseAdminModule />;
      case 'layouts':
        return <LayoutPreviewModule />;
      case 'ticker':
        return <TickerAdminModule />;
      case 'widget':
        return <WidgetManagerModule />;
      // Integrations
      case 'telegram':
        return <TelegramAdminModule />;
      case 'forms':
        return <FormsManagerModule />;
      // Developer
      case 'demo':
        return <DemoDataModule />;
      case 'migration':
        return <DatabaseMigrationModule />;
      case 'modules':
        return <ModuleStatusModule />;
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
            <LanguageSelector variant="ghost" />
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
                    {t('nav.goHome', 'Go to Home')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('nav.logout')}
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
          {!collapsed && (
            <div className="px-2 pt-2 pb-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-accent/50 border-0 outline-none focus:bg-accent placeholder:text-muted-foreground/40 transition-colors"
                  data-testid="sidebar-search"
                />
              </div>
            </div>
          )}
          <ScrollArea className="flex-1 py-2">
            <nav className="px-2 space-y-0.5">
              {displayNavGroups.map((group) => (
                <div key={group.group} className="mb-1">
                  {!collapsed && (
                    <button
                      onClick={() => setOpenGroups(prev => ({ ...prev, [group.group]: !prev[group.group] }))}
                      className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                    >
                      {group.group}
                      {openGroups[group.group] !== false
                        ? <ChevronDown className="h-3 w-3" />
                        : <ChevronRight className="h-3 w-3" />}
                    </button>
                  )}
                  {(collapsed || sidebarSearch.trim() || openGroups[group.group] !== false) && group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeModule === item.id;
                    return (
                      <Button
                        key={item.id}
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-3 h-9",
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
                </div>
              ))}
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
              <div className="px-2 pt-2 pb-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                  <input
                    type="text"
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-accent/50 border-0 outline-none focus:bg-accent placeholder:text-muted-foreground/40 transition-colors"
                    data-testid="sidebar-search-mobile"
                  />
                </div>
              </div>
              <ScrollArea className="h-full py-2">
                <nav className="px-2 space-y-0.5">
                  {displayNavGroups.map((group) => (
                    <div key={group.group} className="mb-1">
                      <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                        {group.group}
                      </div>
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeModule === item.id;
                        return (
                          <Button
                            key={item.id}
                            variant={isActive ? "secondary" : "ghost"}
                            className="w-full justify-start gap-3 h-9"
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
                    </div>
                  ))}
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
                    {activeModule === 'dashboard' && t('admin.moduleDesc.dashboard', 'Welcome to ChiPi Link administration panel')}
                    {activeModule === 'unatienda' && t('admin.moduleDesc.unatienda', 'Manage catalogs, products, students and Unatienda orders')}
                    {activeModule === 'orders' && t('admin.moduleDesc.orders', 'Manage your customer orders')}
                    {activeModule === 'customers' && t('admin.moduleDesc.users', 'Manage users, their exclusive access requests and connections')}
                    {activeModule === 'memberships' && t('admin.moduleDesc.memberships', 'Manage plans, memberships, visits and QR codes')}
                    {activeModule === 'pinpanclub' && t('admin.moduleDesc.pinpanclub', 'Table Tennis Club - Matches, players and tournaments')}
                    {activeModule === 'roles' && t('admin.moduleDesc.roles', 'Manage user roles and system permissions')}
                    {activeModule === 'admin' && t('admin.moduleDesc.admin', 'Configure your site and customization')}
                    {activeModule === 'integrations' && t('admin.moduleDesc.integrations', 'Connect with external services')}
                    {activeModule === 'payment-alerts' && t('admin.moduleDesc.paymentAlerts', 'Bank payment detection, approval queue & email rules')}
                    {activeModule === 'devcontrol' && t('admin.moduleDesc.devcontrol', 'Architecture, API reference, roadmap & dev annotations')}
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
