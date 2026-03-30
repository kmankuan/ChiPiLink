import { lazy, Suspense, useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { usePermissions } from '@/hooks/usePermissions';
import RESOLVED_API_URL from '@/config/apiUrl';
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
  FileText,
  EyeOff,
  Trash2,
  GraduationCap,
  Upload,
  RefreshCw,
  ClipboardList,
  Truck,
  AlertTriangle,
  Printer,
  Pin,
  PinOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import SpeechNotifications from '@/modules/dashboard/SpeechNotifications';

const BadgeCustomizationModule = lazy(() => import('@/modules/admin/BadgeCustomizationModule'));
const HubDashboardModule = lazy(() => import('@/modules/admin/HubDashboardModule'));

// Lazy load modules for code splitting and better performance
const DashboardModule = lazy(() => import('@/modules/dashboard/DashboardModule'));
const AdminHomeDashboard = lazy(() => import('@/components/admin/AdminHomeDashboard'));
import AdminCommandPalette from '@/components/admin/AdminCommandPalette';
const UnatiendaModule = lazy(() => import('@/modules/unatienda/UnatiendaModule'));
const TextbookOrdersAdminTab = lazy(() => import('@/modules/admin/store/TextbookOrdersAdminTab'));
const UsersManagementModule = lazy(() => import('@/modules/admin/users/UsersManagementModule'));
const IntegrationsModule = lazy(() => import('@/modules/integrations/IntegrationsModule'));
const SportDashboardEmbed = lazy(() => import('@/modules/sport/SportDashboard'));
// PinpanClub Module — DEPRECATED (replaced by Sport module)
// const PinpanClubModule = lazy(() => import('@/modules/pinpanclub/pages/PingPongDashboard'));
const AdminMemberships = lazy(() => import('@/modules/admin/users/components/AdminMemberships'));
const RolesModule = lazy(() => import('@/modules/admin/RolesModule'));
const StoreAnalyticsModule = lazy(() => import('@/modules/admin/store/StoreAnalyticsModule'));
const WalletModule = lazy(() => import('@/modules/wallet/WalletModule'));
const CommunityFeedModule = lazy(() => import('@/modules/community/CommunityFeedModule'));
const DevControlModule = lazy(() => import('@/modules/admin/DevControlModule'));
const PaymentAlertsModule = lazy(() => import('@/modules/admin/PaymentAlertsModule'));

// School Textbooks modules → Sysbook
const SysbookDashboardTab = lazy(() => import('@/modules/sysbook/SysbookDashboardTab'));
const SysbookInventoryTab = lazy(() => import('@/modules/sysbook/SysbookInventoryTab'));
const SysbookStockMovementsTab = lazy(() => import('@/modules/sysbook/SysbookStockMovementsTab'));
const SysbookAnalyticsTab = lazy(() => import('@/modules/sysbook/SysbookAnalyticsTab'));
const SysbookAlertsTab = lazy(() => import('@/modules/sysbook/SysbookAlertsTab'));
const StudentsSchoolsModule = lazy(() => import('@/modules/school-textbooks/StudentsSchoolsModule'));
const PreSaleImportTab = lazy(() => import('@/modules/unatienda/tabs/PreSaleImportTab'));
const MondayHubModule = lazy(() => import('@/modules/monday/MondayHubModule'));
const PrintConfigPanel = lazy(() => import('@/modules/print/PrintConfigPanel'));
const TextbookFormSettingsModule = lazy(() => import('@/modules/school-textbooks/TextbookFormSettingsModule'));
const MessagesTab = lazy(() => import('@/modules/unatienda/tabs/MessagesTab'));

// Prefetch critical modules after initial render (avoids loading flash on navigation)
const PREFETCH_MODULES = [
  () => import('@/modules/admin/store/TextbookOrdersAdminTab'),
  () => import('@/modules/unatienda/tabs/MessagesTab'),
  () => import('@/modules/unatienda/UnatiendaModule'),
  () => import('@/modules/wallet/WalletModule'),
  () => import('@/modules/sysbook/SysbookInventoryTab'),
  () => import('@/modules/school-textbooks/StudentsSchoolsModule'),
];

// Administration sub-modules (previously nested inside AdminModule)
const SiteConfigModule = lazy(() => import('@/modules/admin/SiteConfigModule'));
const AuthMethodsConfig = lazy(() => import('@/modules/admin/AuthMethodsConfig'));
const UIStyleModule = lazy(() => import('@/modules/admin/UIStyleModule'));
const PrivacyModule = lazy(() => import('@/modules/admin/PrivacyModule'));
const PagesManager = lazy(() => import('@/modules/admin/pages/PagesManager'));
const AppAppearanceManager = lazy(() => import('@/modules/admin/pages/AppAppearanceManager'));
const ShowcaseAdminModule = lazy(() => import('@/modules/admin/ShowcaseAdminModule'));
const SystemMonitorTab = lazy(() => import('@/modules/admin/SystemMonitorTab'));
import AdminStatusBar from '@/modules/admin/AdminStatusBar';
const LayoutPreviewModule = lazy(() => import('@/modules/admin/LayoutPreviewModule'));
const TickerAdminModule = lazy(() => import('@/modules/admin/TickerAdminModule'));
const WidgetManagerModule = lazy(() => import('@/modules/admin/WidgetManagerModule'));
const TelegramAdminModule = lazy(() => import('@/modules/admin/TelegramAdminModule'));
const TelegramChannelHub = lazy(() => import('@/modules/community/TelegramChannelHub'));
const FormsManagerModule = lazy(() => import('@/modules/admin/FormsManagerModule'));
const TranslationsPanel = lazy(() => import('@/modules/admin/TranslationsModule'));
const DictionaryManagerModule = lazy(() => import('@/modules/admin/DictionaryManagerModule'));
const TranslationCoverageCard = lazy(() => import('@/modules/admin/TranslationCoverageCard'));
const DemoDataModule = lazy(() => import('@/modules/admin/DemoDataModule'));
const DatabaseMigrationModule = lazy(() => import('@/modules/admin/DatabaseMigrationModule'));
const DataCleanupModule = lazy(() => import('@/modules/admin/DataCleanupModule'));
const DataManagerModule = lazy(() => import('@/modules/admin/DataManagerModule'));
const ModuleStatusModule = lazy(() => import('@/modules/admin/ModuleStatusModule'));
const MenuManagerModule = lazy(() => import('@/modules/admin/MenuManagerModule'));
const MergeDuplicates = lazy(() => import('@/modules/sysbook/MergeDuplicates'));

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
      { id: 'messages', labelKey: 'nav.messages', fallbackLabel: 'Messages', icon: MessageSquare, permission: 'unatienda.access' },
      { id: 'wallet', labelKey: 'nav.wallet', icon: Wallet, permission: 'admin.site_config' },
      { id: 'payment-alerts', labelKey: 'nav.paymentAlerts', icon: BellRing, permission: 'admin.site_config', adminOnly: true },
      { id: 'analytics', labelKey: 'nav.reports', icon: BarChart2, permission: 'admin.site_config', adminOnly: true },
    ],
  },
  {
    group: 'Sysbook',
    items: [
      { id: 'sysbook-dashboard', labelKey: 'nav.sysbookDashboard', fallbackLabel: 'Dashboard', icon: LayoutDashboard, permission: 'unatienda.access' },
      { id: 'sysbook-inventory', labelKey: 'nav.sysbookInventory', fallbackLabel: 'Inventory', icon: BookOpen, permission: 'unatienda.access' },
      { id: 'sysbook-stock-movements', labelKey: 'nav.sysbookStockMovements', fallbackLabel: 'Stock Movements', icon: Truck, permission: 'unatienda.access' },
      { id: 'sysbook-analytics', labelKey: 'nav.sysbookAnalytics', fallbackLabel: 'Analytics', icon: BarChart2, permission: 'unatienda.access' },
      { id: 'sysbook-alerts', labelKey: 'nav.sysbookAlerts', fallbackLabel: 'Stock Alerts', icon: AlertTriangle, permission: 'unatienda.access' },
      { id: 'students-schools', labelKey: 'nav.studentsSchools', fallbackLabel: 'Students & Schools', icon: GraduationCap, permission: 'unatienda.access' },
      { id: 'presale-import', labelKey: 'nav.presaleImport', fallbackLabel: 'Pre-Sale Import', icon: Upload, permission: 'unatienda.access' },
      { id: 'textbook-form-settings', labelKey: 'nav.textbookFormSettings', fallbackLabel: 'Form Settings', icon: ClipboardList, permission: 'unatienda.access' },
    ],
  },
  {
    group: 'Community',
    items: [
      { id: 'sport', labelKey: 'nav.sport', fallbackLabel: 'Sport', icon: Trophy, permission: 'sport.admin_panel' },
      { id: 'telegram-channel', labelKey: 'nav.telegramChannel', fallbackLabel: 'Telegram Channel', icon: Send, permission: 'admin.site_config' },
      { id: 'tickets', labelKey: 'nav.ticketsChat', icon: MessageSquare, permission: 'tickets.access', isExternal: true, path: '/admin/chat' },
    ],
  },
  {
    group: 'Management',
    items: [
      { id: 'customers', labelKey: 'nav.users', icon: Users, permission: 'users.view' },
      { id: 'memberships', labelKey: 'nav.memberships', icon: CreditCard, permission: 'memberships.view' },
      { id: 'roles', labelKey: 'nav.rolesPermissions', icon: Shield, permission: 'roles.view' },
      { id: 'data-manager', labelKey: 'nav.dataManager', fallbackLabel: 'Data Manager', icon: Database, permission: 'admin.site_config', adminOnly: true },
    ],
  },
  {
    group: 'Configuration',
    items: [
      { id: 'site-config', labelKey: 'nav.siteConfig', icon: Settings, permission: 'admin.site_config' },
      { id: 'print-config', labelKey: 'nav.printConfig', fallbackLabel: 'Print & Package', icon: Printer, permission: 'admin.site_config' },
      { id: 'privacy', labelKey: 'nav.privacy', icon: EyeOff, permission: 'admin.site_config' },
      { id: 'auth-config', labelKey: 'nav.authentication', icon: Shield, permission: 'admin.site_config' },
      { id: 'ui-style', labelKey: 'nav.uiStyle', icon: Paintbrush, permission: 'admin.site_config' },
      { id: 'badge-config', labelKey: 'nav.badgeConfig', fallbackLabel: 'Badge Config', icon: Palette, permission: 'admin.site_config' },
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
    group: 'Monday.com',
    items: [
      { id: 'monday-hub', labelKey: 'nav.mondayHub', fallbackLabel: 'Monday.com', icon: Plug, permission: 'integrations.access' },
    ],
  },
  {
    group: 'Integrations',
    items: [
      { id: 'hub-dashboard', labelKey: 'nav.hubDashboard', fallbackLabel: 'Integration Hub', icon: Radio, permission: 'admin.site_config', adminOnly: true },
      { id: 'forms', labelKey: 'nav.forms', icon: FileText, permission: 'admin.site_config' },
    ],
  },
  {
    group: 'Developer',
    items: [
      { id: 'demo', labelKey: 'nav.demoData', icon: Database, permission: 'admin.site_config', adminOnly: true },
      { id: 'migration', labelKey: 'nav.migration', icon: ArrowRightLeft, permission: 'admin.site_config', adminOnly: true },
      { id: 'modules', labelKey: 'nav.moduleStatus', icon: LayoutGrid, permission: 'admin.site_config', adminOnly: true },
      { id: 'devcontrol', labelKey: 'nav.devControl', icon: Code2, permission: 'admin.site_config', adminOnly: true },
      { id: 'system-monitor', labelKey: 'nav.systemMonitor', icon: BarChart2, permission: 'admin.site_config', adminOnly: true },
    ],
  },
];

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const { isAdmin, user, logout, loading: authLoading } = useAuth();
  const { hasPermission, role } = usePermissions();
  const { theme, toggleTheme, setScope } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [commandOpen, setCommandOpen] = useState(false);
  const [pinnedItems, setPinnedItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('admin_pinned_items') || '[]'); } catch { return []; }
  });

  const togglePin = (itemId, e) => {
    e.stopPropagation();
    e.preventDefault();
    setPinnedItems(prev => {
      const isPinned = prev.includes(itemId);
      const next = isPinned ? prev.filter(id => id !== itemId) : [...prev, itemId];
      localStorage.setItem('admin_pinned_items', JSON.stringify(next));
      return next;
    });
  };

  // ─── Backend-driven menu (cached for instant load) ───
  const [dynamicMenu, setDynamicMenu] = useState(() => {
    try { const c = localStorage.getItem('admin_menu_cache'); return c ? JSON.parse(c) : null; } catch { return null; }
  });
  const [activeModuleTab, setActiveModuleTab] = useState(() => localStorage.getItem('admin_active_module') || 'main');

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    fetch(`${RESOLVED_API_URL}/api/admin/menu`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.modules || data?.groups) {
          setDynamicMenu(data);
          try { localStorage.setItem('admin_menu_cache', JSON.stringify(data)); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Icon name → component map (for backend-driven labels)
  const ICON_MAP = {
    'layout-dashboard': LayoutDashboard, 'shopping-bag': ShoppingBag, 'shopping-cart': ShoppingCart,
    'message-square': MessageSquare, 'wallet': Wallet, 'bell-ring': BellRing, 'bar-chart-2': BarChart2,
    'book-open': BookOpen, 'truck': Truck, 'alert-triangle': AlertTriangle, 'graduation-cap': GraduationCap,
    'upload': Upload, 'clipboard-list': ClipboardList, 'trophy': Trophy, 'send': Send,
    'users': Users, 'credit-card': CreditCard, 'shield': Shield, 'database': Database,
    'settings': Settings, 'printer': Printer, 'eye-off': EyeOff, 'paintbrush': Paintbrush,
    'palette': Palette, 'languages': Languages, 'layout': Layout, 'image': Megaphone,
    'radio': Radio, 'plug': Plug, 'file-text': FileText, 'code': Code2,
    'activity': BarChart2, 'cpu': Radio, 'wand': Database, 'puzzle': Layout, 'layers': Layers,
  };

  // Module tabs (v2 menu format)
  const modulesTabs = useMemo(() => {
    if (!dynamicMenu?.modules) return [];
    return dynamicMenu.modules
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(mod => ({
        id: mod.id,
        label: mod.label?.[i18n.language] || mod.label?.en || mod.id,
        icon: ICON_MAP[mod.icon] || Settings,
        color: mod.color || '#6b7280',
      }));
  }, [dynamicMenu, i18n.language]);

  const switchModule = (modId) => {
    setActiveModuleTab(modId);
    localStorage.setItem('admin_active_module', modId);
    
    // Automatically select the first item of the first group in the new module tab
    if (dynamicMenu?.modules) {
      const targetMod = dynamicMenu.modules.find(m => m.id === modId);
      if (targetMod && targetMod.groups && targetMod.groups.length > 0) {
        // Find the first enabled item in the groups
        for (const g of targetMod.groups.sort((a, b) => (a.order || 0) - (b.order || 0))) {
          const firstItem = (g.items || [])
            .filter(item => item.enabled !== false)
            .sort((a, b) => (a.order || 0) - (b.order || 0))[0];
            
          if (firstItem) {
            // Check if user has permission
            const userRole = role?.role_id || (isAdmin ? 'super_admin' : '');
            let hasAccess = false;
            
            if (isAdmin) {
              hasAccess = true;
            } else if (!firstItem.admin_only) {
              if (!firstItem.visible_roles || firstItem.visible_roles.length === 0 || firstItem.visible_roles.includes(userRole)) {
                if (!firstItem.permission || hasPermission(firstItem.permission)) {
                  hasAccess = true;
                }
              }
            }
            
            if (hasAccess) {
              if (firstItem.path) {
                navigate(firstItem.path);
              } else {
                setActiveModule(firstItem.id);
              }
              break; // Stop after finding the first valid item
            }
          }
        }
      }
    }
  };

  // Merge backend menu with static fallback — now supports v2 modules
  const effectiveNavGroups = useMemo(() => {
    if (!dynamicMenu) return [];

    // v2 format: modules → groups → items
    if (dynamicMenu.modules) {
      const currentMod = dynamicMenu.modules.find(m => m.id === activeModuleTab) || dynamicMenu.modules[0];
      if (!currentMod) return [];

      return (currentMod.groups || [])
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(g => ({
          group: g.label?.[i18n.language] || g.label?.en || g.id,
          groupId: g.id,
          collapsed_default: g.collapsed_default,
          items: (g.items || [])
            .filter(item => item.enabled !== false)
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(item => ({
              id: item.id,
              label: item.label?.[i18n.language] || item.label?.en || item.id,
              labelKey: `nav.${item.id}`,
              fallbackLabel: item.label?.en,
              icon: ICON_MAP[item.icon] || Settings,
              permission: item.permission,
              adminOnly: item.admin_only,
              isExternal: item.is_external,
              path: item.path,
            })),
        }));
    }

    // v1 format fallback: flat groups
    return dynamicMenu.groups
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(g => ({
        group: g.label?.[i18n.language] || g.label?.en || g.id,
        groupId: g.id,
        collapsed_default: g.collapsed_default,
        items: (g.items || [])
          .filter(item => item.enabled !== false)
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map(item => ({
            id: item.id,
            label: item.label?.[i18n.language] || item.label?.en || item.id,
            labelKey: `nav.${item.id}`,
            fallbackLabel: item.label?.en,
            icon: ICON_MAP[item.icon] || Settings,
            permission: item.permission,
            adminOnly: item.admin_only,
            isExternal: item.is_external,
            path: item.path,
          })),
      }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynamicMenu, activeModuleTab, i18n.language]);

  // Init openGroups from backend collapsed_default
  const [openGroups, setOpenGroups] = useState({});
  useEffect(() => {
    const defaults = {};
    effectiveNavGroups.forEach(g => {
      defaults[g.group] = g.collapsed_default === true ? false : true;
    });
    setOpenGroups(prev => Object.keys(prev).length === 0 ? defaults : prev);
  }, [effectiveNavGroups]);

  // Flatten all items with translated labels for lookups
  const allNavItems = useMemo(() =>
    effectiveNavGroups.flatMap(g => g.items.map(item => ({
      ...item,
      label: item.label || (t(item.labelKey) === item.labelKey && item.fallbackLabel ? item.fallbackLabel : t(item.labelKey)),
      group: g.group
    }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveNavGroups, i18n.language]
  );

  // Switch to admin theme scope on mount, restore on unmount
  useEffect(() => {
    setScope('admin');
    return () => setScope('public');
  }, [setScope]);

  // Prefetch critical modules after initial paint to avoid loading flash on nav
  useEffect(() => {
    const timer = setTimeout(() => {
      PREFETCH_MODULES.forEach(loader => loader().catch(() => {}));
    }, 2000);
    return () => clearTimeout(timer);
  }, []);


  // Get active module from URL hash (default to 'dashboard')
  const activeModule = location.hash.replace('#', '') || 'dashboard';

  // Ensure activeModuleTab stays in sync with activeModule (if user navigates via direct link or back button)
  useEffect(() => {
    if (dynamicMenu?.modules) {
      const foundMod = dynamicMenu.modules.find(m => 
        m.groups?.some(g => 
          g.items?.some(i => i.id === activeModule)
        )
      );
      if (foundMod && foundMod.id !== activeModuleTab) {
        setActiveModuleTab(foundMod.id);
        localStorage.setItem('admin_active_module', foundMod.id);
      }
    }
  }, [activeModule, dynamicMenu]);

  /**
   * SIMPLIFIED LOGIC:
   * If user.is_admin is true (from auth context), show ALL modules.
   * This is the most reliable check since it comes directly from the login response.
   * The RBAC system is used for more granular permissions within modules.
   */
  const filteredNavGroups = useMemo(() => {
    const source = effectiveNavGroups;
    if (authLoading) return source.map(g => ({ ...g, items: g.items.map(i => ({ ...i, label: i.label || (t(i.labelKey) === i.labelKey && i.fallbackLabel ? i.fallbackLabel : t(i.labelKey)) })) }));
    
    const userRole = role?.role_id || (isAdmin ? 'super_admin' : '');
    
    return source.map(g => ({
      ...g,
      items: g.items
        .filter(item => {
          // Super admin sees everything
          if (isAdmin) return true;
          // Admin-only items
          if (item.adminOnly) return false;
          // Per-role visibility (empty = all roles)
          if (item.visible_roles && item.visible_roles.length > 0) {
            if (!item.visible_roles.includes(userRole)) return false;
          }
          // Permission check
          if (!item.permission) return true;
          return hasPermission(item.permission);
        })
        .map(i => ({ ...i, label: i.label || (t(i.labelKey) === i.labelKey && i.fallbackLabel ? i.fallbackLabel : t(i.labelKey)) })),
    })).filter(g => g.items.length > 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveNavGroups, authLoading, isAdmin, hasPermission, i18n.language]);

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

  // Redirect non-admins away from admin panel
  // ONLY redirect if auth has fully loaded AND user is confirmed non-admin
  // Don't redirect if user is null (loading/retry state) — token might still be valid
  useEffect(() => {
    if (!authLoading && user && !user.is_admin) {
      navigate('/');
    }
  }, [authLoading, user, navigate]);

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
        return <AdminHomeDashboard />;
      case 'unatienda':
        return <UnatiendaModule />;
      case 'orders':
        return <TextbookOrdersAdminTab />;
      case 'messages':
        return <MessagesTab token={localStorage.getItem('auth_token')} />;
      case 'wallet':
        return <WalletModule />;
      case 'payment-alerts':
        return <PaymentAlertsModule />;
      case 'analytics':
        return <StoreAnalyticsModule />;
      // Sysbook
      case 'sysbook-dashboard':
        return <SysbookDashboardTab onNavigate={(section) => setActiveModule(section)} />;
      case 'sysbook-inventory':
        return <SysbookInventoryTab />;
      case 'sysbook-stock-movements':
        return <SysbookStockMovementsTab />;
      case 'sysbook-analytics':
        return <SysbookAnalyticsTab />;
      case 'sysbook-alerts':
        return <SysbookAlertsTab />;
      case 'students-schools':
        return <StudentsSchoolsModule />;
      case 'presale-import':
        return <PreSaleImportTab token={localStorage.getItem('auth_token')} />;
      case 'monday-textbook-sync':
      case 'monday-hub':
        return <MondayHubModule />;
      case 'textbook-form-settings':
        return <TextbookFormSettingsModule />;
      case 'print-config':
        return <PrintConfigPanel />;
      case 'customers':
        return <UsersManagementModule />;
      case 'memberships':
        return <AdminMemberships />;
      case 'sport':
        return <SportDashboardEmbed />;
      case 'pinpanclub':
        return <SportDashboardEmbed />; // DEPRECATED: redirected to Sport module
      case 'roles':
        return <RolesModule />;
      case 'community':
      case 'telegram-channel':
      case 'telegram':
        return <TelegramChannelHub />;
      case 'integrations':
        return <MondayHubModule />;
      case 'devcontrol':
        return <DevControlModule />;
      case 'system-monitor':
        return <SystemMonitorTab />;
      // Configuration
      case 'site-config':
        return <SiteConfigModule />;
      case 'privacy':
        return <PrivacyModule />;
      case 'auth-config':
        return <AuthMethodsConfig />;
      case 'ui-style':
        return <UIStyleModule />;
      case 'badge-config':
        return <BadgeCustomizationModule />;
      case 'translations':
        return (
          <div className="space-y-8">
            <TranslationCoverageCard />
            <DictionaryManagerModule />
            <div className="border-t pt-6"><TranslationsPanel /></div>
          </div>
        );
      // Content
      case 'pages-manager':
        return <PagesManager />;
      case 'app-appearance':
        return <AppAppearanceManager />;
      case 'showcase':
        return <ShowcaseAdminModule />;
      case 'layouts':
        return <LayoutPreviewModule />;
      case 'ticker':
        return <TickerAdminModule />;
      case 'widget':
        return <WidgetManagerModule />;
      // Integrations
      case 'hub-dashboard':
        return <HubDashboardModule />;
      case 'forms':
        return <FormsManagerModule />;
      // Developer
      case 'demo':
        return <DemoDataModule />;
      case 'migration':
        return <DatabaseMigrationModule />;
      case 'modules':
        return <ModuleStatusModule />;
      case 'menu-manager':
        return <MenuManagerModule />;
      case 'merge-duplicates':
        return <MergeDuplicates />;
      case 'cleanup':
        return <DataCleanupModule />;
      // Management
      case 'data-manager':
        return <DataManagerModule />;
      default:
        return <DashboardModule />;
    }
  };

  const currentNavItem = filteredNavItems.find(item => item.id === activeModuleTab) || filteredNavItems[0];

  return (
    <div className="min-h-screen bg-background">
      <AdminCommandPalette 
        open={commandOpen} 
        setOpen={setCommandOpen} 
        menuData={dynamicMenu} 
        iconMap={ICON_MAP}
        onNavigate={(itemId, moduleId) => {
          if (moduleId && moduleId !== activeModuleTab) {
            setActiveModuleTab(moduleId);
          }
          setActiveModule(itemId);
        }} 
      />

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

            {/* Speech Notifications */}
            <SpeechNotifications />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 px-3 gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline max-w-[100px] truncate">
                    {(user?.nombre || user?.name || '')?.split(' ')[0] || 'Admin'}
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

      {/* Module Tabs — Horizontal navigation between major modules */}
      {modulesTabs.length > 0 && (
        <div className="sticky top-14 z-40 bg-card border-b overflow-x-auto">
          <div className="flex items-center px-2 gap-0.5 h-10">
            {modulesTabs.map(mod => {
              const Icon = mod.icon;
              const isActive = activeModuleTab === mod.id;
              return (
                <button
                  key={mod.id}
                  data-testid={`module-tab-${mod.id}`}
                  onClick={() => switchModule(mod.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                  style={isActive ? { backgroundColor: mod.color } : {}}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{mod.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside
          className={cn(
            "hidden lg:flex flex-col border-r bg-card/50 transition-all duration-300 sticky",
            collapsed ? "w-16" : "w-56",
            modulesTabs.length > 0 ? "top-24 h-[calc(100vh-96px)]" : "top-14 h-[calc(100vh-56px)]"
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
              {/* Pinned Favorites Section */}
              {pinnedItems.length > 0 && !sidebarSearch.trim() && (
                <div className="mb-2 border-b pb-2">
                  {!collapsed && (
                    <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-600/80 flex items-center gap-1.5">
                      <Pin className="h-3 w-3" /> Favorites
                    </div>
                  )}
                  {pinnedItems.map(itemId => {
                    // Find item in all modules
                    let item = null;
                    if (dynamicMenu?.modules) {
                      dynamicMenu.modules.forEach(m => m.groups?.forEach(g => g.items?.forEach(i => { if (i.id === itemId) item = i; })));
                    }
                    if (!item) return null;
                    const Icon = ICON_MAP[item.icon] || Settings;
                    const isActive = activeModule === item.id;
                    return (
                      <div key={`pin-${item.id}`} className="relative group/item flex items-center mb-0.5">
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start gap-3 h-9",
                            collapsed && "justify-center px-2",
                            isActive ? "bg-amber-50 text-amber-900" : "hover:bg-amber-50/50"
                          )}
                          onClick={() => {
                            if (item.path) navigate(item.path);
                            else {
                              // Switch to the correct module tab if needed
                              if (dynamicMenu?.modules) {
                                const mod = dynamicMenu.modules.find(m => m.groups?.some(g => g.items?.some(i => i.id === item.id)));
                                if (mod && mod.id !== activeModuleTab) setActiveModuleTab(mod.id);
                              }
                              setActiveModule(item.id);
                            }
                          }}
                        >
                          <Icon className={cn("h-4 w-4 flex-shrink-0", isActive && "text-amber-600")} />
                          {!collapsed && <span className="text-sm truncate pr-4">{item.label?.en || item.label}</span>}
                        </Button>
                        {!collapsed && (
                          <button
                            onClick={(e) => togglePin(item.id, e)}
                            className="absolute right-2 p-1 rounded hover:bg-muted text-amber-600 opacity-0 group-hover/item:opacity-100 transition-opacity"
                            title="Unpin from Favorites"
                          >
                            <PinOff className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

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
                    const isPinned = pinnedItems.includes(item.id);
                    return (
                      <div key={item.id} className="relative group/item flex items-center">
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start gap-3 h-9",
                            collapsed && "justify-center px-2"
                          )}
                          onClick={() => {
                            if (item.path) {
                              navigate(item.path);
                            } else {
                              setActiveModule(item.id);
                            }
                          }}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          {!collapsed && <span className="text-sm">{item.label}</span>}
                        </Button>
                        {!collapsed && (
                          <button
                            onClick={(e) => togglePin(item.id, e)}
                            className={cn(
                              "absolute right-2 p-1 rounded hover:bg-muted opacity-0 group-hover/item:opacity-100 transition-opacity",
                              isPinned && "opacity-100 text-primary"
                            )}
                            title={isPinned ? "Unpin from Favorites" : "Pin to Favorites"}
                          >
                            {isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                          </button>
                        )}
                      </div>
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
                              if (item.path) {
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
        <main className="flex-1 overflow-auto pb-7 relative">
          
          {/* Smart Breadcrumb Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b mb-6 hidden lg:block">
            <div className="px-6 h-12 flex items-center gap-2 text-sm text-muted-foreground max-w-7xl mx-auto">
              <span className="font-medium text-foreground">ChiPi Admin</span>
              <ChevronRight className="h-4 w-4" />
              <span>{modulesTabs.find(m => m.id === activeModuleTab)?.label || 'Module'}</span>
              <ChevronRight className="h-4 w-4" />
              <span className="font-medium text-primary">{currentNavItem?.label || 'Dashboard'}</span>
              
              <div className="ml-auto text-xs flex items-center gap-1 border rounded-md px-2 py-1 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                onClick={() => setCommandOpen(true)}
                title="Global Search"
              >
                <Search className="h-3 w-3" />
                <span className="hidden xl:inline">Search everywhere</span>
                <kbd className="ml-2 font-mono text-[10px] font-bold opacity-70 border bg-background px-1 rounded">⌘K</kbd>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-4 lg:p-6 lg:pt-0 max-w-7xl mx-auto min-w-0">
            {/* Page Header - Desktop only */}
            <div className="hidden lg:block mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{currentNavItem?.label || 'Dashboard'}</h1>
                  <p className="text-muted-foreground text-sm">
                    {activeModule === 'dashboard' && t('admin.moduleDesc.dashboard', 'Welcome to ChiPi Link administration panel')}
                    {activeModule === 'unatienda' && t('admin.moduleDesc.unatienda', 'Manage catalogs, products, students, schools and Unatienda orders')}
                    {activeModule === 'orders' && t('admin.moduleDesc.orders', 'Manage your customer orders')}
                    {activeModule === 'customers' && t('admin.moduleDesc.users', 'Manage user accounts and connections')}
                    {activeModule === 'memberships' && t('admin.moduleDesc.memberships', 'Manage plans, memberships, visits and QR codes')}
                    {activeModule === 'pinpanclub' && t('admin.moduleDesc.sport', 'Table Tennis Club - Matches, players and tournaments')}
                    {activeModule === 'roles' && t('admin.moduleDesc.roles', 'Manage user roles and system permissions')}
                    {activeModule === 'admin' && t('admin.moduleDesc.admin', 'Configure your site and customization')}
                    {activeModule === 'integrations' && t('admin.moduleDesc.integrations', 'Connect with external services')}
                    {activeModule === 'payment-alerts' && t('admin.moduleDesc.paymentAlerts', 'Bank payment detection, approval queue & email rules')}
                    {activeModule === 'devcontrol' && t('admin.moduleDesc.devcontrol', 'Architecture, API reference, roadmap & dev annotations')}
                    {activeModule === 'cleanup' && 'Clean up test data, orders, CRM links, and Monday.com items'}
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
      <AdminStatusBar onNavigateToMonitor={() => navigate('/admin#system-monitor')} />
    </div>
  );
}
