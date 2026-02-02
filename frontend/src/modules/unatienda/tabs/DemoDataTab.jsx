import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Database, Play, Trash2, Loader2, RefreshCw, CheckCircle2, AlertCircle,
  BookOpen, Users, ShoppingCart
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function DemoDataTab({ token, onRefresh }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/admin/unatienda/demo-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [token]);

  const handleGenerateData = async () => {
    setGenerating(true);
    setLastResult(null);
    
    try {
      const response = await fetch(`${API}/api/admin/unatienda/demo-data`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setLastResult(data.data);
        toast.success('Demo data generated successfully!');
        fetchStats();
        onRefresh?.();
      } else {
        toast.error(data.detail || 'Error generating data');
      }
    } catch (error) {
      console.error('Error generating demo data:', error);
      toast.error('Error generating demo data');
    } finally {
      setGenerating(false);
    }
  };

  const handleClearData = async () => {
    setClearing(true);
    setShowClearDialog(false);
    
    try {
      const response = await fetch(`${API}/api/admin/unatienda/demo-data`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Demo data deleted');
        setLastResult(null);
        fetchStats();
        onRefresh?.();
      } else {
        toast.error('Error deleting data');
      }
    } catch (error) {
      console.error('Error clearing demo data:', error);
      toast.error('Error deleting demo data');
    } finally {
      setClearing(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, demoValue, color }) => (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{title}</p>
        {demoValue > 0 && (
          <Badge variant="secondary" className="mt-1 text-xs">
            {demoValue} demo
          </Badge>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <Database className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Demo Data</CardTitle>
                <CardDescription>
                  Generate fictitious data to test the private PCA catalog
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStats}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleGenerateData}
              disabled={generating || clearing}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating data...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Generate Demo Data
                </>
              )}
            </Button>
            
            <Button
              variant="destructive"
              onClick={() => setShowClearDialog(true)}
              disabled={generating || clearing || !stats?.products}
            >
              {clearing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Demo Data
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Last Result */}
      {lastResult && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Data created successfully:</span>
          </div>
          <ul className="mt-2 text-sm text-green-600 dark:text-green-400 space-y-1">
            <li>• {lastResult.products} textbooks for all grades</li>
            <li>• {lastResult.students} students distributed by grade</li>
            <li>• {lastResult.orders} sample orders to test the flow</li>
          </ul>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard 
          icon={BookOpen} 
          title="Private Catalog Books" 
          value={stats?.total_products || 0}
          demoValue={stats?.products || 0}
          color="bg-blue-500"
        />
        <StatCard 
          icon={Users} 
          title="PCA Students" 
          value={stats?.total_students || 0}
          demoValue={stats?.students || 0}
          color="bg-green-500"
        />
        <StatCard 
          icon={ShoppingCart} 
          title="Book Orders" 
          value={stats?.total_orders || 0}
          demoValue={stats?.orders || 0}
          color="bg-purple-500"
        />
      </div>

      {/* Info Card */}
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            What data is generated?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• <strong>~100 textbooks</strong> for Pre-K through 12th grade</p>
          <p>• <strong>~110 students</strong> per grade with complete data (name, number, section)</p>
          <p>• <strong>10 sample orders</strong> with multiple books each</p>
          <p>• Data includes publishers, prices, subjects, and realistic codes</p>
          <p className="text-orange-600 dark:text-orange-400 font-medium">
            Warning: Generated orders may sync with Monday.com if configured
          </p>
        </CardContent>
      </Card>

      {/* Clear Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all demo data?
              This action will delete {stats?.products || 0} books, {stats?.students || 0} students and {stats?.orders || 0} orders marked as demo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearData}>
              Yes, Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
