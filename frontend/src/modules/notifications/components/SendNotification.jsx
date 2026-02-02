/**
 * SendNotification - Admin component to send notifications
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Users, User, Bell, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SendNotification({ token }) {
  const { t, i18n } = useTranslation();
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

  useEffect(() => {
    fetchCategories();
  }, [token]);

  const fetchCategories = async () => {
    setLoading(true);
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

  const getLocalizedText = (obj) => {
    if (!obj) return '';
    return obj[lang] || obj.es || obj.en || '';
  };

  const sendNotification = async () => {
    if (!formData.categoryId) {
      toast.error(t('notifications.sendNotification.selectCategoryFirst'));
      return;
    }
    if (!formData.title) {
      toast.error(t('notifications.sendNotification.enterTitle'));
      return;
    }
    if (!formData.body) {
      toast.error(t('notifications.sendNotification.enterBody'));
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const payload = {
        category_id: formData.categoryId,
        title: formData.title,
        body: formData.body,
        image_url: formData.imageUrl || null,
        action_url: formData.actionUrl || null,
        target_type: formData.targetType,
        user_id: formData.targetType === 'user' ? formData.userId : null
      };

      const res = await fetch(`${API_URL}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(t('notifications.sendNotification.sent'));
        setResult(data);
        // Reset form
        setFormData({
          ...formData,
          title: '',
          body: '',
          imageUrl: '',
          actionUrl: ''
        });
      } else {
        toast.error(data.detail || t('notifications.sendNotification.error'));
      }
    } catch (error) {
      toast.error(t('notifications.sendNotification.error'));
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
    <Card data-testid="send-notification">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          {t('notifications.sendNotification.title')}
        </CardTitle>
        <CardDescription>{t('notifications.sendNotification.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Target Audience */}
        <div className="space-y-3">
          <Label>{t('notifications.sendNotification.recipientType')}</Label>
          <RadioGroup
            value={formData.targetType}
            onValueChange={(v) => setFormData({ ...formData, targetType: v })}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all" className="flex items-center gap-2 cursor-pointer">
                <Users className="h-4 w-4" />
                {t('notifications.sendNotification.allUsers')}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="user" id="user" />
              <Label htmlFor="user" className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                {t('notifications.sendNotification.specificUsers')}
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* User ID (if specific user) */}
        {formData.targetType === 'user' && (
          <div className="space-y-2">
            <Label>User ID</Label>
            <Input
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              placeholder="user_abc123..."
            />
          </div>
        )}

        {/* Category */}
        <div className="space-y-2">
          <Label>{t('notifications.sendNotification.selectCategory')}</Label>
          <Select
            value={formData.categoryId}
            onValueChange={(v) => setFormData({ ...formData, categoryId: v })}
          >
            <SelectTrigger data-testid="category-select">
              <SelectValue placeholder={t('notifications.sendNotification.selectCategory')} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.category_id} value={cat.category_id}>
                  <span className="flex items-center gap-2">
                    {cat.icon} {getLocalizedText(cat.name)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label>{t('notifications.sendNotification.messageTitle')}</Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder={t('notifications.sendNotification.titlePlaceholder')}
            data-testid="title-input"
          />
        </div>

        {/* Body */}
        <div className="space-y-2">
          <Label>{t('notifications.sendNotification.messageBody')}</Label>
          <Textarea
            value={formData.body}
            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
            placeholder={t('notifications.sendNotification.bodyPlaceholder')}
            rows={4}
            data-testid="body-input"
          />
        </div>

        {/* Action URL */}
        <div className="space-y-2">
          <Label>{t('notifications.sendNotification.actionUrl')}</Label>
          <Input
            value={formData.actionUrl}
            onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
            placeholder={t('notifications.sendNotification.actionUrlPlaceholder')}
          />
        </div>

        {/* Result */}
        {result && (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <Check className="h-5 w-5" />
              <span className="font-medium">{t('notifications.sendNotification.sent')}</span>
            </div>
            {result.sent_count !== undefined && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                {t('notifications.sent')}: {result.sent_count}
              </p>
            )}
          </div>
        )}

        {/* Send Button */}
        <Button
          onClick={sendNotification}
          disabled={sending}
          className="w-full"
          data-testid="send-btn"
        >
          {sending ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              {t('notifications.sendNotification.sending')}
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              {t('notifications.sendNotification.send')}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
