import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingBag, BookOpen, Users, ShoppingCart, Settings, Link2, Database, CreditCard, Store, ClipboardList, Package, FileText, Calendar, Warehouse } from 'lucide-react';

// Import sub-modules
import PublicCatalogTab from './tabs/PublicCatalogTab';
import PrivateCatalogTab from './tabs/PrivateCatalogTab';
import StudentsTab from './tabs/StudentsTab';
import ConfigurationTab from './tabs/ConfigurationTab';
import DemoDataTab from './tabs/DemoDataTab';
import TextbookAccessAdminTab from '@/modules/admin/users/components/StudentRequestsTab';
import TextbookOrdersAdminTab from '@/modules/admin/store/TextbookOrdersAdminTab';
import OrderFormConfigTab from './tabs/OrderFormConfigTab';
import SchoolYearTab from './tabs/SchoolYearTab';

const API = process.env.REACT_APP_BACKEND_URL;

export default function UnatiendaModule() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('public-catalog');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API}/api/admin/unatienda/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
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

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.public_products || 0}</p>
                <p className="text-xs text-muted-foreground">Public Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <BookOpen className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.private_products || 0}</p>
                <p className="text-xs text-muted-foreground">Private Catalog PCA</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.students || 0}</p>
                <p className="text-xs text-muted-foreground">PCA Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <ShoppingCart className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.orders_pending || 0}</p>
                <p className="text-xs text-muted-foreground">Pending Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-9 mb-6">
          <TabsTrigger value="public-catalog" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            <span className="hidden md:inline">Public</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Warehouse className="h-4 w-4" />
            <span className="hidden md:inline">Inventory</span>
          </TabsTrigger>
          <TabsTrigger value="access-requests" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden md:inline">Requests</span>
          </TabsTrigger>
          <TabsTrigger value="textbook-orders" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden md:inline">Txt Orders</span>
          </TabsTrigger>
          <TabsTrigger value="form-config" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden md:inline">Form</span>
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden md:inline">Students</span>
          </TabsTrigger>
          <TabsTrigger value="configuration" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden md:inline">Config</span>
          </TabsTrigger>
          <TabsTrigger value="demo" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden md:inline">Demo</span>
          </TabsTrigger>
          <TabsTrigger value="school-year" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden md:inline">School Year</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="public-catalog">
          <PublicCatalogTab token={token} onRefresh={fetchStats} />
        </TabsContent>

        <TabsContent value="inventory">
          <PrivateCatalogTab token={token} onRefresh={fetchStats} />
        </TabsContent>

        <TabsContent value="access-requests">
          <TextbookAccessAdminTab token={token} />
        </TabsContent>

        <TabsContent value="textbook-orders">
          <TextbookOrdersAdminTab />
        </TabsContent>

        <TabsContent value="form-config">
          <OrderFormConfigTab />
        </TabsContent>

        <TabsContent value="students">
          <StudentsTab token={token} />
        </TabsContent>

        <TabsContent value="configuration">
          <ConfigurationTab token={token} />
        </TabsContent>

        <TabsContent value="demo">
          <DemoDataTab token={token} onRefresh={fetchStats} />
        </TabsContent>

        <TabsContent value="school-year">
          <SchoolYearTab token={token} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
