/**
 * UnatiendaModule — Retail Store Management (Public Store)
 * Contains: Inventory, Public Store, Stock Movements, Store Checkout Form, Config, Demo Data
 * School textbook management is handled separately in the Sysbook module.
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Loader2, Store, ShoppingCart, Warehouse, Truck, Settings, Database, CreditCard } from 'lucide-react';

import InventoryTab from './tabs/InventoryTab';
import PublicInventoryTab from './tabs/PublicInventoryTab';
import StockOrdersTab from './tabs/StockOrdersTab';
import StoreCheckoutFormConfigTab from './tabs/StoreCheckoutFormConfigTab';
import ConfigurationTab from './tabs/ConfigurationTab';
import DemoDataTab from './tabs/DemoDataTab';

const API = process.env.REACT_APP_BACKEND_URL;

const TAB_GROUPS = [
  {
    label: 'Inventory',
    tabs: [
      { id: 'inventory', label: 'Inventory', icon: Warehouse },
      { id: 'public-inventory', label: 'Public Store', icon: Store },
      { id: 'stock-orders', label: 'Stock Mov.', icon: Truck, testId: 'stock-orders-tab-trigger' },
    ],
  },
  {
    label: 'Settings',
    tabs: [
      { id: 'store-checkout-form', label: 'Store Checkout Form', icon: CreditCard, testId: 'store-checkout-form-tab-trigger' },
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
      className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
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
    { icon: ShoppingCart, value: stats?.orders_pending || 0, label: 'Pending', color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40', alert: (stats?.orders_pending || 0) > 0 },
  ];

  return (
    <div className="space-y-4" data-testid="unatienda-module">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1" data-testid="unatienda-stats">
        {statItems.map(s => (
          <div
            key={s.label}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border shrink-0 ${s.alert ? 'border-orange-300 dark:border-orange-700' : 'border-border/50'} ${s.color}`}
          >
            <s.icon className="h-4 w-4" />
            <span className="text-lg font-bold leading-none">{s.value}</span>
            <span className="text-[10px] font-medium opacity-70 leading-none">{s.label}</span>
          </div>
        ))}
      </div>

      <nav data-testid="unatienda-nav">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-b pb-2">
          {TAB_GROUPS.map((group) => (
            <div key={group.label} className="flex items-center gap-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/40 mr-1 select-none">
                {group.label}
              </span>
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
          ))}
        </div>
      </nav>

      <div data-testid="unatienda-content">
        {activeTab === 'inventory' && <InventoryTab token={token} onRefresh={fetchStats} />}
        {activeTab === 'public-inventory' && <PublicInventoryTab token={token} onRefresh={fetchStats} />}
        {activeTab === 'stock-orders' && <StockOrdersTab token={token} />}
        {activeTab === 'store-checkout-form' && <StoreCheckoutFormConfigTab token={token} />}
        {activeTab === 'configuration' && <ConfigurationTab token={token} />}
        {activeTab === 'demo' && <DemoDataTab token={token} onRefresh={fetchStats} />}
      </div>
    </div>
  );
}
