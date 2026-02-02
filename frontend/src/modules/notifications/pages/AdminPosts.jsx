/**
 * AdminPosts - Post/announcement administration panel
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileText, Plus, Edit2, Trash2, Send, Clock, Eye, 
  RefreshCw, ArrowLeft, Search, MoreVertical
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import PostEditor from '../components/PostEditor';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AdminPosts() {
  const { t, i18n } = useTranslation();
  const { isAdmin, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    title: { es: '', en: '', zh: '' },
    summary: { es: '', en: '', zh: '' },
    content_blocks: [],
    cover_image: '',
    category_id: 'cat_announcements',
    tags: [],
    target_audience: 'all',
    send_notification: true,
    scheduled_at: ''
  });

  const token = localStorage.getItem('auth_token');
  const lang = i18n.language || 'es';

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [postsRes, catsRes] = await Promise.all([
        fetch(`${API_URL}/api/notifications/posts?limit=100`, { headers }),
        fetch(`${API_URL}/api/notifications/categories`, { headers })
      ]);

      if (postsRes.ok) {
        const data = await postsRes.json();
        setPosts(data.posts || []);
      }

      if (catsRes.ok) {
        const data = await catsRes.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLocalizedText = (obj) => {
    if (!obj) return '';
    return obj[lang] || obj.es || obj.en || '';
  };

  const openEditor = (post = null) => {
    if (post) {
      setEditingPost(post);
      setFormData({
        title: post.title || { es: '', en: '', zh: '' },
        summary: post.summary || { es: '', en: '', zh: '' },
        content_blocks: post.content_blocks || [],
        cover_image: post.cover_image || '',
        category_id: post.category_id || 'cat_announcements',
        tags: post.tags || [],
        target_audience: post.target_audience || 'all',
        send_notification: true,
        scheduled_at: ''
      });
    } else {
      setEditingPost(null);
      setFormData({
        title: { es: '', en: '', zh: '' },
        summary: { es: '', en: '', zh: '' },
        content_blocks: [],
        cover_image: '',
        category_id: 'cat_announcements',
        tags: [],
        target_audience: 'all',
        send_notification: true,
        scheduled_at: ''
      });
    }
    setIsEditorOpen(true);
  };

  const savePost = async (publish = false) => {
    try {
      const url = editingPost
        ? `${API_URL}/api/notifications/posts/${editingPost.post_id}`
        : `${API_URL}/api/notifications/posts`;

      const res = await fetch(url, {
        method: editingPost ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          status: publish ? 'published' : 'draft'
        })
      });

      if (res.ok) {
        toast.success(publish ? t('notifications.postEditor.published') : t('notifications.postEditor.saved'));
        setIsEditorOpen(false);
        fetchData();
      } else {
        toast.error(t('notifications.postEditor.error'));
      }
    } catch (error) {
      toast.error(t('notifications.postEditor.error'));
    }
  };

  const deletePost = async (postId) => {
    if (!window.confirm(t('notifications.confirmDelete'))) return;

    try {
      const res = await fetch(`${API_URL}/api/notifications/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success(t('notifications.delete'));
        fetchData();
      }
    } catch (error) {
      toast.error(t('notifications.error'));
    }
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

  const filteredPosts = posts.filter(post => {
    if (activeTab === 'drafts') return post.status === 'draft';
    if (activeTab === 'published') return post.status === 'published';
    if (activeTab === 'scheduled') return post.status === 'scheduled';
    return true;
  }).filter(post => {
    if (!searchQuery) return true;
    const title = getLocalizedText(post.title).toLowerCase();
    return title.includes(searchQuery.toLowerCase());
  });

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
            <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
            <h2 className="text-2xl font-bold">{t('admin.accessDenied')}</h2>
            <p className="text-muted-foreground">{t('admin.adminOnly')}</p>
            <Button onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back')}
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background" data-testid="admin-posts">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <FileText className="h-8 w-8" />
                {t('notifications.posts')}
              </h1>
              <p className="text-muted-foreground">{t('notifications.postEditor.title')}</p>
            </div>
            <Button onClick={() => openEditor()}>
              <Plus className="h-4 w-4 mr-2" />
              {t('notifications.postEditor.newPost')}
            </Button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">{t('common.all')}</TabsTrigger>
              <TabsTrigger value="drafts">{t('notifications.postEditor.saveDraft')}</TabsTrigger>
              <TabsTrigger value="published">{t('notifications.sent')}</TabsTrigger>
              <TabsTrigger value="scheduled">{t('notifications.pending')}</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredPosts.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{t('notifications.noNotifications')}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredPosts.map((post) => (
                    <Card key={post.post_id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {post.cover_image && (
                            <img
                              src={post.cover_image}
                              alt=""
                              className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-semibold truncate">
                                  {getLocalizedText(post.title)}
                                </h3>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {getLocalizedText(post.summary)}
                                </p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditor(post)}>
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    {t('common.edit')}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => deletePost(post.post_id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t('common.delete')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                                {post.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(post.created_at)}
                              </span>
                              {post.views > 0 && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Eye className="h-3 w-3" /> {post.views}
                                </span>
                              )}
                            </div>
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
      </div>

      {/* Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPost ? t('notifications.postEditor.editPost') : t('notifications.postEditor.newPost')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Title in all languages */}
            <div className="space-y-2">
              <Label>{t('notifications.postEditor.postTitle')}</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-xs text-muted-foreground">{t('notifications.categoryManager.spanish')}</span>
                  <Input
                    value={formData.title.es}
                    onChange={(e) => setFormData({
                      ...formData,
                      title: { ...formData.title, es: e.target.value }
                    })}
                    placeholder="Título"
                  />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">{t('notifications.categoryManager.english')}</span>
                  <Input
                    value={formData.title.en}
                    onChange={(e) => setFormData({
                      ...formData,
                      title: { ...formData.title, en: e.target.value }
                    })}
                    placeholder="Title"
                  />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">{t('notifications.categoryManager.chinese')}</span>
                  <Input
                    value={formData.title.zh}
                    onChange={(e) => setFormData({
                      ...formData,
                      title: { ...formData.title, zh: e.target.value }
                    })}
                    placeholder="标题"
                  />
                </div>
              </div>
            </div>

            {/* Cover Image */}
            <div className="space-y-2">
              <Label>{t('notifications.postEditor.coverImage')}</Label>
              <Input
                value={formData.cover_image}
                onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                placeholder={t('postEditor.urlPlaceholder')}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>{t('notifications.postEditor.category')}</Label>
              <Select
                value={formData.category_id}
                onValueChange={(v) => setFormData({ ...formData, category_id: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.category_id} value={cat.category_id}>
                      {cat.icon} {getLocalizedText(cat.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Content Blocks */}
            <div className="space-y-2">
              <Label>{t('notifications.postEditor.postContent')}</Label>
              <PostEditor
                blocks={formData.content_blocks}
                onChange={(blocks) => setFormData({ ...formData, content_blocks: blocks })}
                lang={lang}
              />
            </div>

            {/* Send notification toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <Label>{t('notifications.sendNotification')}</Label>
              <Switch
                checked={formData.send_notification}
                onCheckedChange={(checked) => setFormData({ ...formData, send_notification: checked })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="outline" onClick={() => savePost(false)}>
              <Clock className="h-4 w-4 mr-2" />
              {t('notifications.postEditor.saveDraft')}
            </Button>
            <Button onClick={() => savePost(true)}>
              <Send className="h-4 w-4 mr-2" />
              {t('notifications.postEditor.publish')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
