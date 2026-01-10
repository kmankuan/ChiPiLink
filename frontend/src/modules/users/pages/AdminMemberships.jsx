/**
 * AdminMemberships - Panel de administración de membresías
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  CreditCard, Users, MapPin, Settings, Plus, Edit2, Trash2, 
  RefreshCw, ArrowLeft, Search, Gift, Clock, Check, X,
  DollarSign, Award, Calendar, Ticket
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AdminMemberships() {
  const { i18n } = useTranslation();
  const { isAdmin, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('plans');
  const [plans, setPlans] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  
  // Form states
  const [planForm, setPlanForm] = useState({
    name: { es: '', en: '', zh: '' },
    description: { es: '', en: '', zh: '' },
    membership_type: 'visits',
    price: 0,
    price_in_points: 0,
    total_visits: null,
    duration_days: 30,
    bonus_points: 0,
    is_featured: false,
    auto_renew: false
  });
  
  const [grantForm, setGrantForm] = useState({
    user_id: '',
    plan_id: '',
    sponsor_note: ''
  });

  const token = localStorage.getItem('auth_token');
  const lang = i18n.language || 'es';

  const texts = {
    es: {
      title: 'Gestión de Membresías',
      subtitle: 'Administra planes, membresías y visitas',
      plans: 'Planes',
      currentVisitors: 'En el Club',
      memberships: 'Membresías',
      newPlan: 'Nuevo Plan',
      editPlan: 'Editar Plan',
      grantMembership: 'Otorgar Membresía',
      planName: 'Nombre del Plan',
      description: 'Descripción',
      type: 'Tipo',
      visits: 'Visitas',
      unlimited: 'Ilimitado',
      trial: 'Prueba',
      courtesy: 'Cortesía',
      price: 'Precio',
      priceInPoints: 'Precio en Puntos',
      totalVisits: 'Total de Visitas',
      durationDays: 'Duración (días)',
      bonusPoints: 'Puntos Bonus',
      featured: 'Destacado',
      autoRenew: 'Renovación Automática',
      save: 'Guardar',
      cancel: 'Cancelar',
      active: 'Activo',
      inactive: 'Inactivo',
      noVisitors: 'No hay visitantes actualmente',
      checkOutUser: 'Registrar Salida',
      userId: 'ID de Usuario',
      selectPlan: 'Seleccionar Plan',
      note: 'Nota',
      grant: 'Otorgar',
      back: 'Volver',
      spanish: 'Español',
      english: 'Inglés',
      chinese: 'Chino',
      delete: 'Eliminar',
      confirmDelete: '¿Eliminar este plan?',
      planCreated: 'Plan creado',
      planUpdated: 'Plan actualizado',
      planDeleted: 'Plan eliminado',
      membershipGranted: 'Membresía otorgada',
      checkoutSuccess: 'Salida registrada',
      initialize: 'Inicializar Planes',
      initialized: 'Planes inicializados'
    },
    en: {
      title: 'Membership Management',
      subtitle: 'Manage plans, memberships and visits',
      plans: 'Plans',
      currentVisitors: 'At Club',
      memberships: 'Memberships',
      newPlan: 'New Plan',
      editPlan: 'Edit Plan',
      grantMembership: 'Grant Membership',
      planName: 'Plan Name',
      description: 'Description',
      type: 'Type',
      visits: 'Visits',
      unlimited: 'Unlimited',
      trial: 'Trial',
      courtesy: 'Courtesy',
      price: 'Price',
      priceInPoints: 'Price in Points',
      totalVisits: 'Total Visits',
      durationDays: 'Duration (days)',
      bonusPoints: 'Bonus Points',
      featured: 'Featured',
      autoRenew: 'Auto Renew',
      save: 'Save',
      cancel: 'Cancel',
      active: 'Active',
      inactive: 'Inactive',
      noVisitors: 'No current visitors',
      checkOutUser: 'Check Out User',
      userId: 'User ID',
      selectPlan: 'Select Plan',
      note: 'Note',
      grant: 'Grant',
      back: 'Back',
      spanish: 'Spanish',
      english: 'English',
      chinese: 'Chinese',
      delete: 'Delete',
      confirmDelete: 'Delete this plan?',
      planCreated: 'Plan created',
      planUpdated: 'Plan updated',
      planDeleted: 'Plan deleted',
      membershipGranted: 'Membership granted',
      checkoutSuccess: 'Check out successful',
      initialize: 'Initialize Plans',
      initialized: 'Plans initialized'
    },
    zh: {
      title: '会员管理',
      subtitle: '管理计划、会员资格和访问',
      plans: '计划',
      currentVisitors: '在俱乐部',
      memberships: '会员资格',
      newPlan: '新计划',
      editPlan: '编辑计划',
      grantMembership: '授予会员资格',
      planName: '计划名称',
      description: '描述',
      type: '类型',
      visits: '访问',
      unlimited: '无限',
      trial: '试用',
      courtesy: '礼遇',
      price: '价格',
      priceInPoints: '积分价格',
      totalVisits: '总访问次数',
      durationDays: '持续时间（天）',
      bonusPoints: '奖励积分',
      featured: '推荐',
      autoRenew: '自动续费',
      save: '保存',
      cancel: '取消',
      active: '活跃',
      inactive: '非活跃',
      noVisitors: '目前没有访客',
      checkOutUser: '签退用户',
      userId: '用户ID',
      selectPlan: '选择计划',
      note: '备注',
      grant: '授予',
      back: '返回',
      spanish: '西班牙语',
      english: '英语',
      chinese: '中文',
      delete: '删除',
      confirmDelete: '删除此计划？',
      planCreated: '计划已创建',
      planUpdated: '计划已更新',
      planDeleted: '计划已删除',
      membershipGranted: '会员资格已授予',
      checkoutSuccess: '签退成功',
      initialize: '初始化计划',
      initialized: '计划已初始化'
    }
  };

  const txt = texts[lang] || texts.es;

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      if (activeTab === 'plans') {
        const res = await fetch(`${API_URL}/api/memberships/plans?active_only=false`, { headers });
        if (res.ok) {
          const data = await res.json();
          setPlans(data.plans || []);
        }
      } else if (activeTab === 'visitors') {
        const res = await fetch(`${API_URL}/api/memberships/visits/current`, { headers });
        if (res.ok) {
          const data = await res.json();
          setVisitors(data.visitors || []);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetPlanForm = () => {
    setPlanForm({
      name: { es: '', en: '', zh: '' },
      description: { es: '', en: '', zh: '' },
      membership_type: 'visits',
      price: 0,
      price_in_points: 0,
      total_visits: null,
      duration_days: 30,
      bonus_points: 0,
      is_featured: false,
      auto_renew: false
    });
    setEditingPlan(null);
  };

  const openPlanDialog = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({
        name: plan.name || { es: '', en: '', zh: '' },
        description: plan.description || { es: '', en: '', zh: '' },
        membership_type: plan.membership_type || 'visits',
        price: plan.price || 0,
        price_in_points: plan.price_in_points || 0,
        total_visits: plan.total_visits,
        duration_days: plan.duration_days || 30,
        bonus_points: plan.bonus_points || 0,
        is_featured: plan.is_featured || false,
        auto_renew: plan.auto_renew || false
      });
    } else {
      resetPlanForm();
    }
    setIsPlanDialogOpen(true);
  };

  const handleSavePlan = async () => {
    if (!planForm.name.es) {
      toast.error('El nombre en español es requerido');
      return;
    }

    try {
      const url = editingPlan
        ? `${API_URL}/api/memberships/plans/${editingPlan.plan_id}`
        : `${API_URL}/api/memberships/plans`;
      
      const method = editingPlan ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(planForm)
      });

      if (res.ok) {
        toast.success(editingPlan ? txt.planUpdated : txt.planCreated);
        setIsPlanDialogOpen(false);
        resetPlanForm();
        fetchData();
      }
    } catch (error) {
      toast.error('Error saving plan');
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!confirm(txt.confirmDelete)) return;

    try {
      const res = await fetch(`${API_URL}/api/memberships/plans/${planId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success(txt.planDeleted);
        fetchData();
      }
    } catch (error) {
      toast.error('Error deleting plan');
    }
  };

  const handleInitializePlans = async () => {
    try {
      const res = await fetch(`${API_URL}/api/memberships/plans/initialize`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success(txt.initialized);
        fetchData();
      }
    } catch (error) {
      toast.error('Error initializing plans');
    }
  };

  const handleGrantMembership = async () => {
    if (!grantForm.user_id || !grantForm.plan_id) {
      toast.error('User ID and Plan are required');
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/api/memberships/admin/grant?user_id=${grantForm.user_id}&plan_id=${grantForm.plan_id}&sponsor_note=${grantForm.sponsor_note}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (res.ok) {
        toast.success(txt.membershipGranted);
        setIsGrantDialogOpen(false);
        setGrantForm({ user_id: '', plan_id: '', sponsor_note: '' });
      }
    } catch (error) {
      toast.error('Error granting membership');
    }
  };

  const handleCheckOutVisitor = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/api/memberships/admin/checkout/${userId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success(txt.checkoutSuccess);
        fetchData();
      }
    } catch (error) {
      toast.error('Error checking out user');
    }
  };

  const getLocalizedText = (obj) => {
    if (!obj) return '';
    return obj[lang] || obj.es || obj.en || Object.values(obj)[0] || '';
  };

  const getMembershipTypeBadge = (type) => {
    const colors = {
      visits: 'bg-blue-100 text-blue-800',
      unlimited: 'bg-green-100 text-green-800',
      trial: 'bg-yellow-100 text-yellow-800',
      courtesy: 'bg-purple-100 text-purple-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <CreditCard className="h-16 w-16 mx-auto text-muted-foreground" />
            <h2 className="text-2xl font-bold">Acceso denegado</h2>
            <Button onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {txt.back}
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background" data-testid="admin-memberships">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <Button variant="ghost" className="mb-4" onClick={() => window.history.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {txt.back}
              </Button>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <CreditCard className="h-8 w-8" />
                {txt.title}
              </h1>
              <p className="text-muted-foreground">{txt.subtitle}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsGrantDialogOpen(true)}>
                <Gift className="h-4 w-4 mr-2" />
                {txt.grantMembership}
              </Button>
              <Button onClick={() => openPlanDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                {txt.newPlan}
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="plans" data-testid="plans-tab">
                <Ticket className="h-4 w-4 mr-2" />
                {txt.plans}
              </TabsTrigger>
              <TabsTrigger value="visitors" data-testid="visitors-tab">
                <MapPin className="h-4 w-4 mr-2" />
                {txt.currentVisitors} ({visitors.length})
              </TabsTrigger>
            </TabsList>

            {/* Plans Tab */}
            <TabsContent value="plans">
              {loading ? (
                <div className="flex justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : plans.length === 0 ? (
                <Card>
                  <CardContent className="pt-12 pb-12 text-center">
                    <Ticket className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                    <h3 className="text-lg font-medium">No hay planes</h3>
                    <p className="text-muted-foreground mb-4">Crea tu primer plan o inicializa los planes por defecto</p>
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" onClick={handleInitializePlans}>
                        {txt.initialize}
                      </Button>
                      <Button onClick={() => openPlanDialog()}>
                        <Plus className="h-4 w-4 mr-2" />
                        {txt.newPlan}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plans.map((plan) => (
                    <Card 
                      key={plan.plan_id}
                      className={`${!plan.is_active ? 'opacity-60' : ''} ${plan.is_featured ? 'border-2 border-primary' : ''}`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              {getLocalizedText(plan.name)}
                            </CardTitle>
                            <CardDescription className="line-clamp-2">
                              {getLocalizedText(plan.description)}
                            </CardDescription>
                          </div>
                          {plan.is_featured && (
                            <Badge className="bg-yellow-500">⭐</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Badge className={getMembershipTypeBadge(plan.membership_type)}>
                              {plan.membership_type}
                            </Badge>
                            <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                              {plan.is_active ? txt.active : txt.inactive}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              ${plan.price}
                            </div>
                            {plan.total_visits && (
                              <div className="flex items-center gap-1">
                                <Ticket className="h-4 w-4 text-muted-foreground" />
                                {plan.total_visits} visitas
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {plan.duration_days} días
                            </div>
                            {plan.bonus_points > 0 && (
                              <div className="flex items-center gap-1">
                                <Award className="h-4 w-4 text-purple-500" />
                                +{plan.bonus_points} pts
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => openPlanDialog(plan)}
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              {txt.editPlan}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeletePlan(plan.plan_id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Current Visitors Tab */}
            <TabsContent value="visitors">
              {loading ? (
                <div className="flex justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : visitors.length === 0 ? (
                <Card>
                  <CardContent className="pt-12 pb-12 text-center">
                    <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                    <h3 className="text-lg font-medium">{txt.noVisitors}</h3>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {visitors.map((visitor) => (
                    <Card key={visitor.visit_id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Avatar>
                              <AvatarFallback>{visitor.user_id?.charAt(0)?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{visitor.user_id}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                Entrada: {new Date(visitor.check_in_time).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-green-600">
                              <MapPin className="h-3 w-3 mr-1 animate-pulse" />
                              En el club
                            </Badge>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleCheckOutVisitor(visitor.user_id)}
                            >
                              {txt.checkOutUser}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Plan Dialog */}
        <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPlan ? txt.editPlan : txt.newPlan}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Names */}
              <div className="space-y-3">
                <Label className="font-semibold">{txt.planName}</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">{txt.spanish}</Label>
                    <Input
                      value={planForm.name.es}
                      onChange={(e) => setPlanForm(prev => ({
                        ...prev,
                        name: { ...prev.name, es: e.target.value }
                      }))}
                      placeholder="Nombre"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{txt.english}</Label>
                    <Input
                      value={planForm.name.en}
                      onChange={(e) => setPlanForm(prev => ({
                        ...prev,
                        name: { ...prev.name, en: e.target.value }
                      }))}
                      placeholder="Name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{txt.chinese}</Label>
                    <Input
                      value={planForm.name.zh}
                      onChange={(e) => setPlanForm(prev => ({
                        ...prev,
                        name: { ...prev.name, zh: e.target.value }
                      }))}
                      placeholder="名称"
                    />
                  </div>
                </div>
              </div>

              {/* Descriptions */}
              <div className="space-y-3">
                <Label className="font-semibold">{txt.description}</Label>
                <div className="grid grid-cols-3 gap-3">
                  <Textarea
                    value={planForm.description.es}
                    onChange={(e) => setPlanForm(prev => ({
                      ...prev,
                      description: { ...prev.description, es: e.target.value }
                    }))}
                    placeholder="Descripción"
                    rows={2}
                  />
                  <Textarea
                    value={planForm.description.en}
                    onChange={(e) => setPlanForm(prev => ({
                      ...prev,
                      description: { ...prev.description, en: e.target.value }
                    }))}
                    placeholder="Description"
                    rows={2}
                  />
                  <Textarea
                    value={planForm.description.zh}
                    onChange={(e) => setPlanForm(prev => ({
                      ...prev,
                      description: { ...prev.description, zh: e.target.value }
                    }))}
                    placeholder="描述"
                    rows={2}
                  />
                </div>
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label>{txt.type}</Label>
                <Select 
                  value={planForm.membership_type}
                  onValueChange={(v) => setPlanForm(prev => ({ ...prev, membership_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visits">{txt.visits}</SelectItem>
                    <SelectItem value="unlimited">{txt.unlimited}</SelectItem>
                    <SelectItem value="trial">{txt.trial}</SelectItem>
                    <SelectItem value="courtesy">{txt.courtesy}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Price & Points */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{txt.price} (USD)</Label>
                  <Input
                    type="number"
                    value={planForm.price}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{txt.priceInPoints}</Label>
                  <Input
                    type="number"
                    value={planForm.price_in_points}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, price_in_points: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              {/* Visits & Duration */}
              <div className="grid grid-cols-2 gap-4">
                {planForm.membership_type === 'visits' && (
                  <div className="space-y-2">
                    <Label>{txt.totalVisits}</Label>
                    <Input
                      type="number"
                      value={planForm.total_visits || ''}
                      onChange={(e) => setPlanForm(prev => ({ ...prev, total_visits: parseInt(e.target.value) || null }))}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>{txt.durationDays}</Label>
                  <Input
                    type="number"
                    value={planForm.duration_days}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, duration_days: parseInt(e.target.value) || 30 }))}
                  />
                </div>
              </div>

              {/* Bonus Points */}
              <div className="space-y-2">
                <Label>{txt.bonusPoints}</Label>
                <Input
                  type="number"
                  value={planForm.bonus_points}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, bonus_points: parseInt(e.target.value) || 0 }))}
                />
              </div>

              {/* Toggles */}
              <div className="flex gap-8">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={planForm.is_featured}
                    onCheckedChange={(v) => setPlanForm(prev => ({ ...prev, is_featured: v }))}
                  />
                  <Label>{txt.featured}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={planForm.auto_renew}
                    onCheckedChange={(v) => setPlanForm(prev => ({ ...prev, auto_renew: v }))}
                  />
                  <Label>{txt.autoRenew}</Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPlanDialogOpen(false)}>
                {txt.cancel}
              </Button>
              <Button onClick={handleSavePlan}>
                {txt.save}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Grant Membership Dialog */}
        <Dialog open={isGrantDialogOpen} onOpenChange={setIsGrantDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{txt.grantMembership}</DialogTitle>
              <DialogDescription>Otorgar membresía de cortesía a un usuario</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{txt.userId}</Label>
                <Input
                  value={grantForm.user_id}
                  onChange={(e) => setGrantForm(prev => ({ ...prev, user_id: e.target.value }))}
                  placeholder="cliente_xxx o email"
                />
              </div>
              
              <div className="space-y-2">
                <Label>{txt.selectPlan}</Label>
                <Select 
                  value={grantForm.plan_id}
                  onValueChange={(v) => setGrantForm(prev => ({ ...prev, plan_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={txt.selectPlan} />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.filter(p => p.is_active).map((plan) => (
                      <SelectItem key={plan.plan_id} value={plan.plan_id}>
                        {getLocalizedText(plan.name)} - ${plan.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>{txt.note}</Label>
                <Textarea
                  value={grantForm.sponsor_note}
                  onChange={(e) => setGrantForm(prev => ({ ...prev, sponsor_note: e.target.value }))}
                  placeholder="Nota de cortesía..."
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsGrantDialogOpen(false)}>
                {txt.cancel}
              </Button>
              <Button onClick={handleGrantMembership}>
                <Gift className="h-4 w-4 mr-2" />
                {txt.grant}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
