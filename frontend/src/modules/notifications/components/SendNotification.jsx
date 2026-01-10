/**
 * SendNotification - Componente para enviar notificaciones (Admin)
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Users, User, Bell, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SendNotification({ token }) {
  const { i18n } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  
  const [formData, setFormData] = useState({
    targetType: 'all',
    userId: '',
    categoryId: '',
    title: '',
    body: '',
    imageUrl: '',
    actionUrl: ''
  });

  const lang = i18n.language || 'es';

  const texts = {
    es: {
      title: 'Enviar Notificación',
      subtitle: 'Envía notificaciones push a usuarios',
      targetAudience: 'Audiencia',
      allUsers: 'Todos los usuarios',
      specificUser: 'Usuario específico',
      userId: 'ID del usuario',
      category: 'Categoría',
      selectCategory: 'Selecciona categoría',
      notificationTitle: 'Título',
      notificationBody: 'Mensaje',
      imageUrl: 'URL de imagen (opcional)',
      actionUrl: 'URL de acción (opcional)',
      send: 'Enviar Notificación',
      sending: 'Enviando...',
      success: 'Notificación enviada',
      error: 'Error al enviar',
      sentTo: 'Enviado a',
      users: 'usuarios',
      failed: 'Fallidos'
    },
    en: {
      title: 'Send Notification',
      subtitle: 'Send push notifications to users',
      targetAudience: 'Audience',
      allUsers: 'All users',
      specificUser: 'Specific user',
      userId: 'User ID',
      category: 'Category',
      selectCategory: 'Select category',
      notificationTitle: 'Title',
      notificationBody: 'Message',
      imageUrl: 'Image URL (optional)',
      actionUrl: 'Action URL (optional)',
      send: 'Send Notification',
      sending: 'Sending...',
      success: 'Notification sent',
      error: 'Error sending',
      sentTo: 'Sent to',
      users: 'users',
      failed: 'Failed'
    },
    zh: {
      title: '发送通知',
      subtitle: '向用户发送推送通知',
      targetAudience: '目标受众',
      allUsers: '所有用户',
      specificUser: '特定用户',
      userId: '用户ID',
      category: '分类',
      selectCategory: '选择分类',
      notificationTitle: '标题',
      notificationBody: '消息',
      imageUrl: '图片URL（可选）',
      actionUrl: '操作URL（可选）',
      send: '发送通知',
      sending: '发送中...',
      success: '通知已发送',
      error: '发送错误',
      sentTo: '已发送到',
      users: '用户',
      failed: '失败'
    }
  };

  const txt = texts[lang] || texts.es;

  useEffect(() => {
    fetchCategories();
  }, [token]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/api/notifications/categories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!formData.categoryId || !formData.title || !formData.body) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    if (formData.targetType === 'user' && !formData.userId) {
      toast.error('Ingresa el ID del usuario');
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const endpoint = formData.targetType === 'all' 
        ? `${API_URL}/api/notifications/admin/send/bulk`
        : `${API_URL}/api/notifications/admin/send`;

      const payload = formData.targetType === 'all'
        ? {
            send_to_all: true,
            category_id: formData.categoryId,
            title: formData.title,
            body: formData.body,
            image_url: formData.imageUrl || null,
            action_url: formData.actionUrl || null
          }
        : {
            user_id: formData.userId,
            category_id: formData.categoryId,
            title: formData.title,
            body: formData.body,
            image_url: formData.imageUrl || null,
            action_url: formData.actionUrl || null
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      setResult(data);

      if (data.success || data.sent > 0) {
        toast.success(txt.success);
      } else {
        toast.error(data.reason || txt.error);
      }
    } catch (error) {
      toast.error(txt.error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="send-notification">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            {txt.title}
          </CardTitle>
          <CardDescription>{txt.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Target Audience */}
          <div className="space-y-3">
            <Label className="font-semibold">{txt.targetAudience}</Label>
            <RadioGroup
              value={formData.targetType}
              onValueChange={(v) => setFormData(prev => ({ ...prev, targetType: v }))}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="flex items-center gap-2 cursor-pointer">
                  <Users className="h-4 w-4" />
                  {txt.allUsers}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="user" id="user" />
                <Label htmlFor="user" className="flex items-center gap-2 cursor-pointer">
                  <User className="h-4 w-4" />
                  {txt.specificUser}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* User ID (if specific user) */}
          {formData.targetType === 'user' && (
            <div className="space-y-2">
              <Label>{txt.userId}</Label>
              <Input
                value={formData.userId}
                onChange={(e) => setFormData(prev => ({ ...prev, userId: e.target.value }))}
                placeholder="user_xxx..."
                data-testid="user-id-input"
              />
            </div>
          )}

          {/* Category */}
          <div className="space-y-2">
            <Label>{txt.category}</Label>
            <Select 
              value={formData.categoryId}
              onValueChange={(v) => setFormData(prev => ({ ...prev, categoryId: v }))}
            >
              <SelectTrigger data-testid="category-select">
                <SelectValue placeholder={txt.selectCategory} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.category_id} value={cat.category_id}>
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      {cat.name?.[lang] || cat.name?.es}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>{txt.notificationTitle} *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Título de la notificación"
              data-testid="notification-title"
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label>{txt.notificationBody} *</Label>
            <Textarea
              value={formData.body}
              onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
              placeholder="Mensaje de la notificación"
              className="min-h-[100px]"
              data-testid="notification-body"
            />
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <Label>{txt.imageUrl}</Label>
            <Input
              value={formData.imageUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          {/* Action URL */}
          <div className="space-y-2">
            <Label>{txt.actionUrl}</Label>
            <Input
              value={formData.actionUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, actionUrl: e.target.value }))}
              placeholder="/mi-cuenta"
            />
          </div>

          {/* Send Button */}
          <Button 
            onClick={handleSend} 
            disabled={sending}
            className="w-full"
            data-testid="send-notification-btn"
          >
            {sending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {txt.sending}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {txt.send}
              </>
            )}
          </Button>

          {/* Result */}
          {result && (
            <Card className={result.success || result.sent > 0 ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-red-500 bg-red-50 dark:bg-red-950/20'}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  {result.success || result.sent > 0 ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <div>
                    {result.sent !== undefined && (
                      <p className="font-medium">
                        {txt.sentTo}: {result.sent} {txt.users}
                      </p>
                    )}
                    {result.failed > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {txt.failed}: {result.failed}
                      </p>
                    )}
                    {result.reason && (
                      <p className="text-sm text-red-600">{result.reason}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
