/**
 * Membership Card Component - Displays membership passes and visits
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

export default function MembershipCard({ token, walletBalance }) {
  const { t, i18n } = useTranslation();
  const [membership, setMembership] = useState(null);
  const [plans, setPlans] = useState([]);
  const [visits, setVisits] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);
  const [isPlansOpen, setIsPlansOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [payWithPoints, setPayWithPoints] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [currentVisitDuration, setCurrentVisitDuration] = useState(0);

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
        
        // Calculate current visit duration
        if (activeVisit) {
          const checkInTime = new Date(activeVisit.check_in_time);
          const now = new Date();
          const diffMinutes = Math.floor((now - checkInTime) / 60000);
          setCurrentVisitDuration(diffMinutes);
        }
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
        setCurrentVisitDuration(0);
        toast.success(t('membershipCard.checkInSuccess'));
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.detail || t('membershipCard.errorCheckIn'));
      }
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error(t('membershipCard.errorCheckIn'));
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
        setCurrentVisitDuration(0);
        toast.success(t('membershipCard.checkOutSuccess'));
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.detail || t('membershipCard.errorCheckOut'));
      }
    } catch (error) {
      console.error('Error checking out:', error);
      toast.error(t('membershipCard.errorCheckOut'));
    }
  };

  const purchaseMembership = async (planId, usePoints = false) => {
    setPurchasing(true);
    try {
      const res = await fetch(`${API_URL}/api/memberships/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plan_id: planId,
          pay_with_points: usePoints
        })
      });

      if (res.ok) {
        toast.success(t('membershipCard.purchaseSuccess'));
        setIsPlansOpen(false);
        setSelectedPlan(null);
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.detail || t('membershipCard.errorPurchase'));
      }
    } catch (error) {
      console.error('Error purchasing membership:', error);
      toast.error(t('membershipCard.errorPurchase'));
    } finally {
      setPurchasing(false);
    }
  };

  const openPurchaseDialog = (plan) => {
    setSelectedPlan(plan);
    setPayWithPoints(false);
  };

  const getLocalizedText = (obj) => {
    if (!obj) return '';
    return obj[lang] || obj.es || obj.en || Object.values(obj)[0] || '';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const locale = lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : 'es-PA';
    return new Date(dateStr).toLocaleDateString(locale, { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const locale = lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : 'es-PA';
    return new Date(dateStr).toLocaleTimeString(locale, { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

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
                {t('membershipCard.title')}
              </CardTitle>
              <CardDescription className={membership ? 'text-indigo-100' : ''}>
                {t('membershipCard.subtitle')}
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
                    <span>{t('membershipCard.visitsRemaining')}</span>
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
                {t('membershipCard.validUntil')}: {formatDate(membership.end_date)}
              </div>

              {/* Check-in/out Button */}
              <div className="pt-4">
                {checkedIn ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-green-300">
                        <MapPin className="h-4 w-4 animate-pulse" />
                        {t('membershipCard.currentlyIn')}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-indigo-100">
                        <Timer className="h-4 w-4" />
                        {currentVisitDuration} {t('membershipCard.minutes')}
                      </div>
                    </div>
                    <Button 
                      variant="secondary" 
                      className="w-full"
                      onClick={handleCheckOut}
                      data-testid="checkout-btn"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {t('membershipCard.checkOut')}
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
                    {t('membershipCard.checkIn')}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <CreditCard className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">{t('membershipCard.noMembership')}</p>
              <Dialog open={isPlansOpen} onOpenChange={setIsPlansOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="get-membership-btn">
                    <Award className="h-4 w-4 mr-2" />
                    {t('membershipCard.getMembership')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{t('membershipCard.availablePlans')}</DialogTitle>
                    <DialogDescription>{t('membershipCard.selectPlan')}</DialogDescription>
                  </DialogHeader>
                  
                  {/* Selected Plan Purchase Dialog */}
                  {selectedPlan ? (
                    <div className="space-y-6 py-4">
                      <Card className="border-2 border-primary">
                        <CardContent className="pt-6">
                          <h3 className="font-semibold text-xl">
                            {getLocalizedText(selectedPlan.name)}
                          </h3>
                          <p className="text-muted-foreground mt-1">
                            {getLocalizedText(selectedPlan.description)}
                          </p>
                          
                          <div className="mt-4 space-y-2 text-sm">
                            {selectedPlan.total_visits && (
                              <p>• {selectedPlan.total_visits} {t('membershipCard.visitsIncluded')}</p>
                            )}
                            <p>• {selectedPlan.duration_days} {t('membershipCard.daysValid')}</p>
                            {selectedPlan.bonus_points > 0 && (
                              <p className="text-purple-600">• +{selectedPlan.bonus_points} ChipiPoints bonus</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Payment Options */}
                      <div className="space-y-4">
                        <Label className="font-semibold">{t('membershipCard.paymentMethod')}</Label>
                        
                        {/* Pay with Points option */}
                        {selectedPlan.price_in_points > 0 && (
                          <div 
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              payWithPoints ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20' : 'border-muted'
                            }`}
                            onClick={() => setPayWithPoints(true)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Sparkles className="h-5 w-5 text-purple-600" />
                                <div>
                                  <p className="font-medium">{t('membershipCard.payWithPoints')}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {t('membershipCard.youHave')}: {walletBalance?.chipipoints || 0} ChipiPoints
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-bold text-purple-600">
                                  {selectedPlan.price_in_points} pts
                                </p>
                                {(walletBalance?.chipipoints || 0) < selectedPlan.price_in_points && (
                                  <p className="text-xs text-red-500">{t('membershipCard.notEnoughPoints')}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Pay with Cash option */}
                        <div 
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            !payWithPoints ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-muted'
                          }`}
                          onClick={() => setPayWithPoints(false)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Wallet className="h-5 w-5 text-green-600" />
                              <div>
                                <p className="font-medium">{t('membershipCard.payWithCash')}</p>
                                <p className="text-sm text-muted-foreground">{t('membershipCard.cashOrCardAtClub')}</p>
                              </div>
                            </div>
                            <p className="text-xl font-bold text-green-600">${selectedPlan.price}</p>
                          </div>
                        </div>
                      </div>

                      <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setSelectedPlan(null)}>
                          {t('common.cancel')}
                        </Button>
                        <Button 
                          onClick={() => purchaseMembership(selectedPlan.plan_id, payWithPoints)}
                          disabled={purchasing || (payWithPoints && (walletBalance?.chipipoints || 0) < selectedPlan.price_in_points)}
                        >
                          {purchasing ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          {t('membershipCard.confirmPurchase')}
                        </Button>
                      </DialogFooter>
                    </div>
                  ) : (
                    /* Plans Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                      {plans.filter(p => p.is_active).map((plan) => (
                        <Card 
                          key={plan.plan_id}
                          className={`cursor-pointer hover:border-primary transition-colors ${
                            plan.is_featured ? 'border-2 border-primary' : ''
                          }`}
                          data-testid={`plan-${plan.plan_id}`}
                          onClick={() => openPurchaseDialog(plan)}
                        >
                          <CardContent className="pt-6">
                            {plan.is_featured && (
                              <Badge className="mb-2">{t('membershipCard.featured')}</Badge>
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
                                  {plan.total_visits} {t('membershipCard.visitsRemaining').toLowerCase()}
                                </div>
                              )}
                              {plan.membership_type === 'unlimited' && (
                                <div className="flex items-center gap-2 text-sm">
                                  <RefreshCw className="h-4 w-4" />
                                  {t('membershipCard.unlimited')}
                                </div>
                              )}
                              {plan.bonus_points > 0 && (
                                <div className="flex items-center gap-2 text-sm text-purple-600">
                                  <Award className="h-4 w-4" />
                                  +{plan.bonus_points} {t('membershipCard.bonus')} {t('membership.planTypes.credits10') ? 'points' : 'points'}
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4" />
                                {plan.duration_days} {t('membershipCard.daysValid')}
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-2xl font-bold">${plan.price}</span>
                                {plan.price_in_points > 0 && (
                                  <span className="text-sm text-purple-600 ml-2">
                                    o {plan.price_in_points} pts
                                  </span>
                                )}
                              </div>
                              <Button 
                                size="sm"
                                data-testid={`buy-${plan.plan_id}`}
                              >
                                {t('membershipCard.buy')}
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
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
            {t('membershipCard.statistics')}
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="history-tab">
            <History className="h-4 w-4 mr-2" />
            {t('membershipCard.recentVisits')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold text-primary">{stats?.total_visits || 0}</p>
                  <p className="text-sm text-muted-foreground">{t('membershipCard.totalVisits')}</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">{stats?.visits_this_month || 0}</p>
                  <p className="text-sm text-muted-foreground">{t('membershipCard.thisMonth')}</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">
                    {stats?.avg_duration_minutes || 0}
                    <span className="text-lg">{t('membershipCard.minutes')}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">{t('membershipCard.avgDuration')}</p>
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
                  {t('membershipCard.noVisits')}
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
                            {visit.duration_minutes} {t('membershipCard.minutes')}
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
