import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Package,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  DollarSign,
  Eye,
  Loader2,
  Bell,
  ShoppingBag,
  BookOpen,
  Trophy,
  Settings,
  CreditCard,
  ArrowRight,
  BarChart3,
  Activity
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function DashboardModule() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    orders: { total: 0, pending: 0 },
    products: { total: 0, low_stock: 0 },
    users: { total: 0 },
    notifications: { unread: 0 }
  });
  const [unatiendaStats, setUnatiendaStats] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard stats
      const [dashboardRes, unatiendaRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/admin/unatienda/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => null)
      ]);

      if (dashboardRes.ok) {
        const data = await dashboardRes.json();
        setStats(data);
      }

      if (unatiendaRes?.ok) {
        const data = await unatiendaRes.json();
        setUnatiendaStats(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Error al cargar algunos datos del dashboard');
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

  // Quick access modules
  const quickAccessModules = [
    { 
      id: 'unatienda', 
      label: 'Unatienda', 
      icon: ShoppingBag, 
      color: 'bg-blue-500',
      description: 'Manage products and catalog',
      stats: unatiendaStats ? `${unatiendaStats.public_products || 0} products` : null
    },
    { 
      id: 'orders', 
      label: 'Orders', 
      icon: ShoppingCart, 
      color: 'bg-green-500',
      description: 'View and process orders',
      stats: stats.orders?.pending > 0 ? `${stats.orders.pending} pending` : 'No pending',
      alert: stats.orders?.pending > 0
    },
    { 
      id: 'customers', 
      label: 'Users', 
      icon: Users, 
      color: 'bg-purple-500',
      description: 'Manage customers and users',
      stats: `${stats.users?.total || 0} registered`
    },
    { 
      id: 'memberships', 
      label: 'Memberships', 
      icon: CreditCard, 
      color: 'bg-amber-500',
      description: 'Plans and subscriptions'
    },
    { 
      id: 'pinpanclub', 
      label: 'PinpanClub', 
      icon: Trophy, 
      color: 'bg-emerald-500',
      description: 'Tournaments and ranking'
    },
    { 
      id: 'roles', 
      label: 'Roles', 
      icon: Settings, 
      color: 'bg-slate-500',
      description: 'Permissions and access'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.products?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats.products?.low_stock > 0 && (
                <span className="text-amber-600">{stats.products.low_stock} low stock</span>
              )}
              {(stats.products?.low_stock || 0) === 0 && 'Healthy stock'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.orders?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats.orders?.pending > 0 ? (
                <span className="text-amber-600">{stats.orders.pending} pending</span>
              ) : (
                'All processed'
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Registered users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.notifications?.unread || 0}</div>
            <p className="text-xs text-muted-foreground">
              {(stats.notifications?.unread || 0) > 0 ? 'Unread' : 'All read'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Unatienda Stats */}
      {unatiendaStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Unatienda Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Public Products</p>
                <p className="text-2xl font-bold">{unatiendaStats.public_products || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Private Catalog PCA</p>
                <p className="text-2xl font-bold text-purple-600">{unatiendaStats.private_products || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Linked Students</p>
                <p className="text-2xl font-bold">{unatiendaStats.student_requests_approved || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Pending Connections</p>
                <p className="text-2xl font-bold text-amber-600">{unatiendaStats.student_requests_pending || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Access */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Quick Access</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quickAccessModules.map((module) => {
            const Icon = module.icon;
            return (
              <Card 
                key={module.id} 
                className="cursor-pointer hover:shadow-md transition-shadow group"
                onClick={() => window.location.hash = module.id}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${module.color} text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{module.label}</h4>
                        {module.alert && (
                          <Badge variant="destructive" className="text-xs">!</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {module.description}
                      </p>
                      {module.stats && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {module.stats}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Alerts Section */}
      {((stats.products?.low_stock || 0) > 0 || (stats.orders?.pending || 0) > 0) && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(stats.products?.low_stock || 0) > 0 && (
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-amber-600" />
                  <span className="text-sm">{stats.products.low_stock} products with low stock</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.hash = 'unatienda'}
                >
                  View inventory
                </Button>
              </div>
            )}
            {(stats.orders?.pending || 0) > 0 && (
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="text-sm">{stats.orders.pending} orders pending processing</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.hash = 'orders'}
                >
                  View orders
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Summary
          </CardTitle>
          <CardDescription>
            System overall status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Inventory</span>
              <div className="flex items-center gap-2">
                <Progress 
                  value={(stats.products?.low_stock || 0) > 0 ? 70 : 100} 
                  className="w-32 h-2" 
                />
                <Badge variant={(stats.products?.low_stock || 0) > 0 ? "secondary" : "default"}>
                  {(stats.products?.low_stock || 0) > 0 ? 'Review' : 'OK'}
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Orders</span>
              <div className="flex items-center gap-2">
                <Progress 
                  value={(stats.orders?.pending || 0) > 0 ? 60 : 100} 
                  className="w-32 h-2" 
                />
                <Badge variant={(stats.orders?.pending || 0) > 0 ? "secondary" : "default"}>
                  {(stats.orders?.pending || 0) > 0 ? 'Pending' : 'OK'}
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">System</span>
              <div className="flex items-center gap-2">
                <Progress value={100} className="w-32 h-2" />
                <Badge>Operational</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
