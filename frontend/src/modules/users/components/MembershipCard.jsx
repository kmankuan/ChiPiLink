/**
 * Membership Card Component - Tarjeta de membresía con pases de visita
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  CreditCard, Calendar, Clock, MapPin, QrCode, 
  LogIn, LogOut, RefreshCw, Award, ChevronRight, History,
  Wallet, Sparkles, AlertCircle, CheckCircle, Timer
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function MembershipCard({ token }) {
  const { t, i18n } = useTranslation();
  const [membership, setMembership] = useState(null);
  const [plans, setPlans] = useState([]);
  const [visits, setVisits] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);
  const [isPlansOpen, setIsPlansOpen] = useState(false);

  const lang = i18n.language || 'es';

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      const [membershipRes, plansRes, visitsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/memberships/me/active`, { headers }),
        fetch(`${API_URL}/api/memberships/plans`),
        fetch(`${API_URL}/api/memberships/visits/me?limit=10`, { headers }),
        fetch(`${API_URL}/api/memberships/visits/stats`, { headers })
      ]);

      if (membershipRes.ok) {
        const data = await membershipRes.json();
        setMembership(data.membership);
      }

      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlans(data.plans || []);
      }

      if (visitsRes.ok) {
        const data = await visitsRes.json();
        setVisits(data.visits || []);
        // Check if currently checked in
        const activeVisit = data.visits?.find(v => !v.check_out_time);
        setCheckedIn(!!activeVisit);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching membership data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      const res = await fetch(`${API_URL}/api/memberships/visits/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          check_in_method: 'manual'
        })
      });

      if (res.ok) {
        setCheckedIn(true);
        fetchData();
      }
    } catch (error) {
      console.error('Error checking in:', error);
    }
  };

  const handleCheckOut = async () => {
    try {
      const res = await fetch(`${API_URL}/api/memberships/visits/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setCheckedIn(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error checking out:', error);
    }
  };

  const purchaseMembership = async (planId) => {
    try {
      const res = await fetch(`${API_URL}/api/memberships/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plan_id: planId,
          pay_with_points: false
        })
      });

      if (res.ok) {
        setIsPlansOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error purchasing membership:', error);
    }
  };

  const getLocalizedText = (obj) => {
    if (!obj) return '';
    return obj[lang] || obj.es || obj.en || Object.values(obj)[0] || '';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    // Use proper locale codes to avoid RangeError with invalid language tags
    const locale = lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : 'es-PA';
    return new Date(dateStr).toLocaleDateString(locale, { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    // Use proper locale codes to avoid RangeError with invalid language tags
    const locale = lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : 'es-PA';
    return new Date(dateStr).toLocaleTimeString(locale, { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const texts = {
    es: {
      title: 'Mi Membresía',
      subtitle: 'Gestiona tus pases y visitas',
      noMembership: 'Sin membresía activa',
      getMembership: 'Obtener Membresía',
      visitsRemaining: 'Visitas restantes',
      validUntil: 'Válido hasta',
      checkIn: 'Registrar Entrada',
      checkOut: 'Registrar Salida',
      currentlyIn: 'Actualmente en el club',
      recentVisits: 'Visitas Recientes',
      statistics: 'Estadísticas',
      totalVisits: 'Total de visitas',
      thisMonth: 'Este mes',
      avgDuration: 'Duración promedio',
      minutes: 'min',
      selectPlan: 'Seleccionar Plan',
      availablePlans: 'Planes Disponibles',
      featured: 'Destacado',
      bonus: 'Bonus',
      points: 'puntos',
      perVisit: 'por visita',
      unlimited: 'Ilimitado',
      trial: 'Prueba',
      buy: 'Comprar'
    },
    en: {
      title: 'My Membership',
      subtitle: 'Manage your passes and visits',
      noMembership: 'No active membership',
      getMembership: 'Get Membership',
      visitsRemaining: 'Visits remaining',
      validUntil: 'Valid until',
      checkIn: 'Check In',
      checkOut: 'Check Out',
      currentlyIn: 'Currently at the club',
      recentVisits: 'Recent Visits',
      statistics: 'Statistics',
      totalVisits: 'Total visits',
      thisMonth: 'This month',
      avgDuration: 'Average duration',
      minutes: 'min',
      selectPlan: 'Select Plan',
      availablePlans: 'Available Plans',
      featured: 'Featured',
      bonus: 'Bonus',
      points: 'points',
      perVisit: 'per visit',
      unlimited: 'Unlimited',
      trial: 'Trial',
      buy: 'Buy'
    },
    zh: {
      title: '我的会员资格',
      subtitle: '管理您的通行证和访问',
      noMembership: '无有效会员资格',
      getMembership: '获取会员资格',
      visitsRemaining: '剩余访问次数',
      validUntil: '有效期至',
      checkIn: '签到',
      checkOut: '签退',
      currentlyIn: '目前在俱乐部',
      recentVisits: '最近访问',
      statistics: '统计',
      totalVisits: '总访问次数',
      thisMonth: '本月',
      avgDuration: '平均时长',
      minutes: '分钟',
      selectPlan: '选择计划',
      availablePlans: '可用计划',
      featured: '推荐',
      bonus: '奖励',
      points: '积分',
      perVisit: '每次访问',
      unlimited: '无限',
      trial: '试用',
      buy: '购买'
    }
  };

  const txt = texts[lang] || texts.es;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="membership-loading">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="membership-card">
      {/* Main Membership Card */}
      <Card className={membership ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className={`flex items-center gap-2 ${membership ? 'text-white' : ''}`}>
                <CreditCard className="h-5 w-5" />
                {txt.title}
              </CardTitle>
              <CardDescription className={membership ? 'text-indigo-100' : ''}>
                {txt.subtitle}
              </CardDescription>
            </div>
            {membership && (
              <Badge variant="secondary" className="text-lg px-4 py-1">
                {membership.plan_info?.icon || '🎫'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {membership ? (
            <div className="space-y-4">
              {/* Plan Name */}
              <div>
                <p className="text-lg font-semibold">
                  {getLocalizedText(membership.plan_info?.name)}
                </p>
                <p className="text-sm text-indigo-100">
                  {getLocalizedText(membership.plan_info?.description)}
                </p>
              </div>

              {/* Visits Progress */}
              {membership.visits_remaining !== null && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{txt.visitsRemaining}</span>
                    <span className="font-bold">
                      {membership.visits_remaining} / {membership.plan_info?.total_visits || membership.visits_remaining}
                    </span>
                  </div>
                  <Progress 
                    value={(membership.visits_remaining / (membership.plan_info?.total_visits || membership.visits_remaining)) * 100} 
                    className="h-3 bg-indigo-400"
                  />
                </div>
              )}

              {/* Validity */}
              <div className="flex items-center gap-2 text-sm text-indigo-100">
                <Calendar className="h-4 w-4" />
                {txt.validUntil}: {formatDate(membership.end_date)}
              </div>

              {/* Check-in/out Button */}
              <div className="pt-4">
                {checkedIn ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-300">
                      <MapPin className="h-4 w-4 animate-pulse" />
                      {txt.currentlyIn}
                    </div>
                    <Button 
                      variant="secondary" 
                      className="w-full"
                      onClick={handleCheckOut}
                      data-testid="checkout-btn"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {txt.checkOut}
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="secondary" 
                    className="w-full"
                    onClick={handleCheckIn}
                    data-testid="checkin-btn"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    {txt.checkIn}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <CreditCard className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">{txt.noMembership}</p>
              <Dialog open={isPlansOpen} onOpenChange={setIsPlansOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="get-membership-btn">
                    <Award className="h-4 w-4 mr-2" />
                    {txt.getMembership}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{txt.availablePlans}</DialogTitle>
                    <DialogDescription>{txt.selectPlan}</DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    {plans.filter(p => p.is_active).map((plan) => (
                      <Card 
                        key={plan.plan_id}
                        className={`cursor-pointer hover:border-primary transition-colors ${
                          plan.is_featured ? 'border-2 border-primary' : ''
                        }`}
                        data-testid={`plan-${plan.plan_id}`}
                      >
                        <CardContent className="pt-6">
                          {plan.is_featured && (
                            <Badge className="mb-2">{txt.featured}</Badge>
                          )}
                          <h3 className="font-semibold text-lg">
                            {getLocalizedText(plan.name)}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            {getLocalizedText(plan.description)}
                          </p>
                          
                          <div className="space-y-2 mb-4">
                            {plan.total_visits && (
                              <div className="flex items-center gap-2 text-sm">
                                <CreditCard className="h-4 w-4" />
                                {plan.total_visits} {txt.visitsRemaining.toLowerCase()}
                              </div>
                            )}
                            {plan.membership_type === 'unlimited' && (
                              <div className="flex items-center gap-2 text-sm">
                                <RefreshCw className="h-4 w-4" />
                                {txt.unlimited}
                              </div>
                            )}
                            {plan.bonus_points > 0 && (
                              <div className="flex items-center gap-2 text-sm text-purple-600">
                                <Award className="h-4 w-4" />
                                +{plan.bonus_points} {txt.bonus} {txt.points}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold">
                              ${plan.price}
                            </span>
                            <Button 
                              size="sm"
                              onClick={() => purchaseMembership(plan.plan_id)}
                              data-testid={`buy-${plan.plan_id}`}
                            >
                              {txt.buy}
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats and History */}
      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stats" data-testid="stats-tab">
            <Award className="h-4 w-4 mr-2" />
            {txt.statistics}
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="history-tab">
            <History className="h-4 w-4 mr-2" />
            {txt.recentVisits}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold text-primary">{stats?.total_visits || 0}</p>
                  <p className="text-sm text-muted-foreground">{txt.totalVisits}</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">{stats?.visits_this_month || 0}</p>
                  <p className="text-sm text-muted-foreground">{txt.thisMonth}</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">
                    {stats?.avg_duration_minutes || 0}
                    <span className="text-lg">{txt.minutes}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">{txt.avgDuration}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="pt-6">
              {visits.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {txt.noMembership}
                </p>
              ) : (
                <div className="space-y-3" data-testid="visits-list">
                  {visits.map((visit) => (
                    <div 
                      key={visit.visit_id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        {visit.check_out_time ? (
                          <LogOut className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <MapPin className="h-4 w-4 text-green-500 animate-pulse" />
                        )}
                        <div>
                          <p className="font-medium text-sm">
                            {formatDate(visit.check_in_time)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(visit.check_in_time)}
                            {visit.check_out_time && ` - ${formatTime(visit.check_out_time)}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {visit.duration_minutes && (
                          <p className="text-sm font-medium">
                            {visit.duration_minutes} {txt.minutes}
                          </p>
                        )}
                        <Badge variant={visit.consumed_visit ? 'default' : 'secondary'} className="text-xs">
                          {visit.visit_type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
