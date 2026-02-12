import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Database, 
  Play, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Users,
  Trophy,
  Wallet,
  Bell,
  Loader2,
  Gamepad2,
  Target,
  Medal,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function DemoDataModule() {
  const { t } = useTranslation();
  const { api } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const fetchStats = async () => {
    try {
      const response = await api.get('/seed/demo-stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSeedData = async () => {
    setSeeding(true);
    setLastResult(null);
    
    try {
      const response = await api.post('/seed/demo-data');
      
      if (response.data.success) {
        setLastResult(response.data.results);
        toast.success(t("demoData.demoCreatedSuccess"));
        fetchStats();
      } else {
        toast.error(t("demoData.createError"));
      }
    } catch (error) {
      console.error('Error seeding data:', error);
      toast.error(t('demoData.createError'));
    } finally {
      setSeeding(false);
    }
  };

  const handleClearData = async () => {
    setClearing(true);
    setShowClearDialog(false);
    
    try {
      const response = await api.delete('/seed/demo-data');
      
      if (response.data.success) {
        toast.success(t("demoData.demoDeletedSuccess"));
        setLastResult(null);
        fetchStats();
      } else {
        toast.error(t('demoData.deleteError'));
      }
    } catch (error) {
      console.error('Error clearing data:', error);
      toast.error('Error al eliminar datos');
    } finally {
      setClearing(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, color, subtitle }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
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
    <div className="space-y-6" data-testid="demo-data-module">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <Database className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>{t("demoData.title")}</CardTitle>
                <CardDescription>
                  {t('demoData.titleDesc')}
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
              {t('common.refresh')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleSeedData}
              disabled={seeding || clearing}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              data-testid="seed-demo-btn"
            >
              {seeding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('demoData.creatingData')}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  {t('demoData.createDemoData')}
                </>
              )}
            </Button>
            
            <Button
              variant="destructive"
              onClick={() => setShowClearDialog(true)}
              disabled={seeding || clearing}
              data-testid="clear-demo-btn"
            >
              {clearing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('demoData.deleting')}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('demoData.clearDemoData')}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Last Result */}
      {lastResult && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-700 dark:text-green-400">
            <strong>{t('demoData.dataCreated')}:</strong>{' '}
            {lastResult.pinpanclub?.players_created || 0} {t('demoData.players')}, {' '}
            {(lastResult.pinpanclub?.superpin_matches_created || 0) + (lastResult.pinpanclub?.rapidpin_matches_created || 0)} {t('demoData.matches')}, {' '}
            {lastResult.users_wallets?.users_created || 0} {t('demoData.demoUsers')}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* PinPanClub Stats */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-lg">PinPanClub</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <StatCard 
                icon={Users} 
                title={t("demoData.players")} 
                value={stats?.pinpanclub?.players || 0}
                color="bg-blue-500"
              />
              <StatCard 
                icon={Gamepad2} 
                title="Super Pin" 
                value={stats?.pinpanclub?.superpin_matches || 0}
                color="bg-green-500"
                subtitle={t("demoData.matches")}
              />
              <StatCard 
                icon={Gamepad2} 
                title="Rapid Pin" 
                value={stats?.pinpanclub?.rapidpin_matches || 0}
                color="bg-yellow-500"
                subtitle={t("demoData.matches")}
              />
              <StatCard 
                icon={Target} 
                title={t("demoData.challenges")} 
                value={stats?.pinpanclub?.challenges || 0}
                color="bg-purple-500"
              />
              <StatCard 
                icon={Medal} 
                title={t("demoData.achievements")} 
                value={stats?.pinpanclub?.achievements || 0}
                color="bg-pink-500"
              />
              <StatCard 
                icon={Trophy} 
                title={t("demoData.tournaments")} 
                value={stats?.pinpanclub?.tournaments || 0}
                color="bg-orange-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users & Wallets Stats */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-500" />
              <CardTitle className="text-lg">{t('demoData.usersWallets')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <StatCard 
                icon={Users} 
                title={t("demoData.profiles")} 
                value={stats?.users_wallets?.profiles || 0}
                color="bg-blue-500"
              />
              <StatCard 
                icon={Wallet} 
                title={t("demoData.wallets")} 
                value={stats?.users_wallets?.wallets || 0}
                color="bg-green-500"
              />
              <StatCard 
                icon={RefreshCw} 
                title={t("demoData.transactions")} 
                value={stats?.users_wallets?.transactions || 0}
                color="bg-purple-500"
              />
              <StatCard 
                icon={Bell} 
                title={t("demoData.posts")} 
                value={stats?.notifications?.posts || 0}
                color="bg-orange-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Memberships Stats */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">{t('demoData.memberships')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <StatCard 
                icon={FileText} 
                title={t("demoData.plans")} 
                value={stats?.memberships?.plans || 0}
                color="bg-blue-500"
              />
              <StatCard 
                icon={Users} 
                title={t("demoData.memberships")} 
                value={stats?.memberships?.memberships || 0}
                color="bg-green-500"
              />
              <StatCard 
                icon={CheckCircle2} 
                title={t("demoData.visits")} 
                value={stats?.memberships?.visits || 0}
                color="bg-purple-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              {t('demoData.whatIncluded')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• {t('demoData.includes12Players')}</p>
            <p>• {t('demoData.includes50Matches')}</p>
            <p>• {t('demoData.includesRankings')}</p>
            <p>• {t('demoData.includesChallenges')}</p>
            <p>• {t('demoData.includes1Tournament')}</p>
            <p>• {t('demoData.includes3Users')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Clear Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              {t('demoData.confirmDeleteTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('demoData.confirmDeleteDesc')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleClearData}>
              {t('demoData.yesDelete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
