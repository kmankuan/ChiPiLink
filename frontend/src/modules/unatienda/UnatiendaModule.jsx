import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingBag, BookOpen, Users, ShoppingCart, Store, ClipboardList, Package, FileText, Calendar, Warehouse, Truck, Settings, Database, MessageCircle } from 'lucide-react';

import PublicCatalogTab from './tabs/PublicCatalogTab';
import PrivateCatalogTab from './tabs/PrivateCatalogTab';
import StudentsTab from './tabs/StudentsTab';
import ConfigurationTab from './tabs/ConfigurationTab';
import DemoDataTab from './tabs/DemoDataTab';
import TextbookAccessAdminTab from '@/modules/admin/users/components/StudentRequestsTab';
import TextbookOrdersAdminTab from '@/modules/admin/store/TextbookOrdersAdminTab';
import OrderFormConfigTab from './tabs/OrderFormConfigTab';
import SchoolYearTab from './tabs/SchoolYearTab';
import StockOrdersTab from './tabs/StockOrdersTab';
import PreSaleImportTab from './tabs/PreSaleImportTab';
import MessagesTab from './tabs/MessagesTab';

const API = process.env.REACT_APP_BACKEND_URL;

/* Tab groups — logical sections */
const TAB_GROUPS = [
  {
    label: 'Catalog',
    tabs: [
      { id: 'inventory', label: 'Inventory', icon: Warehouse },
      { id: 'public-catalog', label: 'Public Store', icon: Store },
      { id: 'stock-orders', label: 'Stock Mov.', icon: Truck, testId: 'stock-orders-tab-trigger' },
    ],
  },
  {
    label: 'Orders',
    tabs: [
      { id: 'textbook-orders', label: 'Textbook Orders', icon: Package },
      { id: 'access-requests', label: 'Access Requests', icon: ClipboardList },
      { id: 'presale-import', label: 'Pre-Sale Import', icon: Truck, testId: 'presale-import-tab-trigger' },
      { id: 'messages', label: 'Messages', icon: MessageCircle, testId: 'messages-tab-trigger' },
    ],
  },
  {
    label: 'School',
    tabs: [
      { id: 'students', label: 'Students', icon: Users },
      { id: 'school-year', label: 'School Year', icon: Calendar },
    ],
  },
  {
    label: 'Settings',
    tabs: [
      { id: 'form-config', label: 'Order Form', icon: FileText },
      { id: 'configuration', label: 'Config', icon: Settings },
      { id: 'demo', label: 'Demo Data', icon: Database },
    ],
  },
];

function NavTab({ id, label, icon: Icon, isActive, onClick, testId }) {
  return (
    <button
      onClick={() => onClick(id)}
      data-testid={testId || `tab-${id}`}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

export default function UnatiendaModule() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('inventory');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API}/api/admin/unatienda/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) setStats(await response.json());
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statItems = [
    { icon: Store, value: stats?.public_products || 0, label: 'Public', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40' },
    { icon: BookOpen, value: stats?.private_products || 0, label: 'Textbooks', color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40' },
    { icon: Users, value: stats?.students || 0, label: 'Students', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
    { icon: ShoppingCart, value: stats?.orders_pending || 0, label: 'Pending', color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40', alert: (stats?.orders_pending || 0) > 0 },
  ];

  return (
    <div className="space-y-4" data-testid="unatienda-module">
      {/* ── Compact header: stats as inline badges ── */}
      <div className="flex items-center gap-3 flex-wrap" data-testid="unatienda-stats">
        {statItems.map(s => (
          <div
            key={s.label}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${s.alert ? 'border-orange-300 dark:border-orange-700' : 'border-border/50'} ${s.color}`}
          >
            <s.icon className="h-4 w-4" />
            <span className="text-lg font-bold leading-none">{s.value}</span>
            <span className="text-[10px] font-medium opacity-70 leading-none">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Grouped tab navigation ── */}
      <nav className="flex items-center gap-1 flex-wrap border-b pb-2" data-testid="unatienda-nav">
        {TAB_GROUPS.map((group, gi) => (
          <div key={group.label} className="flex items-center">
            {gi > 0 && <div className="w-px h-5 bg-border mx-2 shrink-0" />}
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 mr-1.5 hidden lg:inline">
              {group.label}
            </span>
            <div className="flex items-center gap-0.5">
              {group.tabs.map(tab => (
                <NavTab
                  key={tab.id}
                  id={tab.id}
                  label={tab.label}
                  icon={tab.icon}
                  isActive={activeTab === tab.id}
                  onClick={setActiveTab}
                  testId={tab.testId}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Tab content ── */}
      <div data-testid="unatienda-content">
        {activeTab === 'inventory' && <PrivateCatalogTab token={token} onRefresh={fetchStats} />}
        {activeTab === 'public-catalog' && <PublicCatalogTab token={token} onRefresh={fetchStats} />}
        {activeTab === 'stock-orders' && <StockOrdersTab token={token} />}
        {activeTab === 'textbook-orders' && <TextbookOrdersAdminTab />}
        {activeTab === 'access-requests' && <TextbookAccessAdminTab token={token} />}
        {activeTab === 'presale-import' && <PreSaleImportTab token={token} />}
        {activeTab === 'students' && <StudentsTab token={token} />}
        {activeTab === 'school-year' && <SchoolYearTab token={token} />}
        {activeTab === 'form-config' && <OrderFormConfigTab />}
        {activeTab === 'configuration' && <ConfigurationTab token={token} />}
        {activeTab === 'demo' && <DemoDataTab token={token} onRefresh={fetchStats} />}
      </div>
    </div>
  );
}
