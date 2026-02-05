/**
 * Store Analytics Module - Comprehensive Reports & Analytics
 * Admin-only access for sensitive business data
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  DollarSign, TrendingUp, Package, Users, GraduationCap, BookOpen,
  AlertTriangle, RefreshCw, Loader2, Download, BarChart3, PieChart,
  ShoppingCart, Calendar, Search, ArrowUp, ArrowDown, AlertCircle
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function StoreAnalyticsModule() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [data, setData] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/store/analytics/comprehensive?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else if (res.status === 403) {
        toast.error('Access denied. Super admin required.');
      } else {
        toast.error('Error loading analytics');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Error loading analytics');
    } finally {
      setLoading(false);
    }
  }, [token, period]);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/store/analytics/inventory-report`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const result = await res.json();
        setInventoryData(result);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchAnalytics();
    fetchInventory();
  }, [fetchAnalytics, fetchInventory]);

  const exportToCSV = (dataArray, filename) => {
    if (!dataArray || dataArray.length === 0) return;
    
    const headers = Object.keys(dataArray[0]).join(',');
    const rows = dataArray.map(row => 
      Object.values(row).map(v => `"${v}"`).join(',')
    ).join('\n');
    
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="store-analytics-module">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive business intelligence for purchase decisions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="quarter">Last 90 Days</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchAnalytics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alerts Banner */}
      {data?.alerts?.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-200">
                  {data.alerts.length} Alert{data.alerts.length > 1 ? 's' : ''} Require Attention
                </p>
                <ul className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                  {data.alerts.slice(0, 3).map((alert, idx) => (
                    <li key={idx}>• {alert.message}</li>
                  ))}
                  {data.alerts.length > 3 && (
                    <li className="text-amber-600">+ {data.alerts.length - 3} more alerts</li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 md:grid-cols-6 gap-1">
          <TabsTrigger value="overview" className="gap-1">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="revenue" className="gap-1">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Revenue</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-1">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Inventory</span>
          </TabsTrigger>
          <TabsTrigger value="books" className="gap-1">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Books</span>
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-1">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Clients</span>
          </TabsTrigger>
          <TabsTrigger value="grades" className="gap-1">
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Grades</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">${data?.revenue?.total?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold">{data?.revenue?.order_count || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Order Value</p>
                    <p className="text-2xl font-bold">${data?.revenue?.average_order_value?.toFixed(2) || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Package className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Inventory Value</p>
                    <p className="text-2xl font-bold">${data?.inventory?.inventory_value?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Inventory Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Products</p>
                    <p className="text-3xl font-bold">{data?.inventory?.total_products || 0}</p>
                  </div>
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className={data?.inventory?.low_stock_count > 0 ? 'border-amber-300' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Low Stock</p>
                    <p className="text-3xl font-bold text-amber-600">{data?.inventory?.low_stock_count || 0}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>

            <Card className={data?.inventory?.out_of_stock_count > 0 ? 'border-red-300' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Out of Stock</p>
                    <p className="text-3xl font-bold text-red-600">{data?.inventory?.out_of_stock_count || 0}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Purchase Recommendations */}
          {data?.purchase_recommendations?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Purchase Recommendations
                </CardTitle>
                <CardDescription>
                  Books that need restocking based on sales velocity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Book</TableHead>
                      <TableHead className="text-right">Current Stock</TableHead>
                      <TableHead className="text-right">Monthly Avg Sales</TableHead>
                      <TableHead className="text-right">Recommended Purchase</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.purchase_recommendations.map((rec, idx) => (
                      <TableRow key={rec.book_id || idx}>
                        <TableCell className="font-medium">{rec.name}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={rec.current_inventory <= 0 ? 'destructive' : 'outline'}>
                            {rec.current_inventory}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{rec.monthly_avg_sales}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          +{rec.recommended_purchase}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{rec.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Monthly Trends */}
          {data?.trends?.monthly?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Monthly Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.trends.monthly.map((month, idx) => (
                      <TableRow key={month.month || idx}>
                        <TableCell className="font-medium">{month.month}</TableCell>
                        <TableCell className="text-right">{month.orders}</TableCell>
                        <TableCell className="text-right font-semibold">${month.revenue?.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Revenue by Order Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(data?.orders?.by_status || {}).map(([status, info]) => (
                      <TableRow key={status}>
                        <TableCell>
                          <Badge variant={
                            status === 'delivered' ? 'default' :
                            status === 'submitted' ? 'secondary' :
                            status === 'cancelled' ? 'destructive' : 'outline'
                          }>
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{info.count}</TableCell>
                        <TableCell className="text-right font-semibold">${info.revenue?.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-3xl font-bold text-green-600">${data?.revenue?.total?.toLocaleString() || 0}</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Average Order</p>
                  <p className="text-2xl font-bold text-blue-600">${data?.revenue?.average_order_value?.toFixed(2) || 0}</p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold text-purple-600">{data?.revenue?.order_count || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-[250px]"
                />
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => exportToCSV(inventoryData?.products, 'inventory_report')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">In Stock</TableHead>
                    <TableHead className="text-right">Reserved</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Total Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(inventoryData?.products || [])
                    .filter(p => !searchTerm || p.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((product, idx) => (
                    <TableRow key={product.book_id || idx}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {product.name}
                      </TableCell>
                      <TableCell>{product.grade}</TableCell>
                      <TableCell className="text-right">${product.price?.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{product.inventory}</TableCell>
                      <TableCell className="text-right">{product.reserved}</TableCell>
                      <TableCell className="text-right font-semibold">{product.available}</TableCell>
                      <TableCell className="text-right">{product.total_sold}</TableCell>
                      <TableCell className="text-right">${product.total_revenue?.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={
                          product.status === 'out_of_stock' ? 'destructive' :
                          product.status === 'low_stock' ? 'warning' : 'default'
                        }>
                          {product.status === 'out_of_stock' ? 'Out of Stock' :
                           product.status === 'low_stock' ? 'Low Stock' : 'In Stock'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Books Tab */}
        <TabsContent value="books" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Book Sales Performance</h3>
            <Button 
              variant="outline" 
              onClick={() => exportToCSV(data?.by_book, 'book_sales_report')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book</TableHead>
                    <TableHead>Grades</TableHead>
                    <TableHead className="text-right">Units Sold</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Students</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.by_book || []).map((book, idx) => (
                    <TableRow key={book.book_id || idx}>
                      <TableCell className="font-medium max-w-[250px]">
                        {book.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {book.grades?.slice(0, 3).map(g => (
                            <Badge key={g} variant="outline" className="text-xs">{g}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{book.total_sold}</TableCell>
                      <TableCell className="text-right">{book.order_count}</TableCell>
                      <TableCell className="text-right">{book.student_count}</TableCell>
                      <TableCell className="text-right text-green-600 font-semibold">
                        ${book.revenue?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={book.needs_restock ? 'destructive' : 'outline'}>
                          {book.current_inventory}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Top Clients by Spending</h3>
            <Button 
              variant="outline" 
              onClick={() => exportToCSV(data?.by_client, 'client_report')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Total Spent</TableHead>
                    <TableHead>Students</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.by_client || []).map((client, idx) => (
                    <TableRow key={client.user_id || idx}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell className="text-muted-foreground">{client.email}</TableCell>
                      <TableCell className="text-right">{client.order_count}</TableCell>
                      <TableCell className="text-right text-green-600 font-semibold">
                        ${client.total_spent?.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {client.students?.slice(0, 2).map((s, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                          ))}
                          {client.students?.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{client.students.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grades Tab */}
        <TabsContent value="grades" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Performance by Grade</h3>
            <Button 
              variant="outline" 
              onClick={() => exportToCSV(
                Object.entries(data?.by_grade || {}).map(([grade, info]) => ({
                  grade,
                  ...info
                })),
                'grade_report'
              )}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(data?.by_grade || {}).sort((a, b) => a[0].localeCompare(b[0])).map(([grade, info]) => (
              <Card key={grade}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Grade {grade}</span>
                    </div>
                    <Badge variant="outline">{info.students} students</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Orders</p>
                      <p className="text-xl font-bold">{info.orders}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Revenue</p>
                      <p className="text-xl font-bold text-green-600">${info.revenue?.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
