/**
 * AdminPosts - Panel de administración de posts/anuncios
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileText, Plus, Edit2, Trash2, Send, Clock, Eye, Heart, 
  RefreshCw, ArrowLeft, Search, Filter, MoreVertical
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
  const { i18n } = useTranslation();
  const { isAdmin, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
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

  const texts = {
    es: {
      title: 'Gestión de Posts',
      subtitle: 'Crea y administra anuncios y contenido',
      newPost: 'Nuevo Post',
      all: 'Todos',
      drafts: 'Borradores',
      published: 'Publicados',
      scheduled: 'Programados',
      edit: 'Editar',
      delete: 'Eliminar',
      publish: 'Publicar',
      schedule: 'Programar',
      postTitle: 'Título',
      postSummary: 'Resumen',
      content: 'Contenido',
      coverImage: 'Imagen de portada',
      category: 'Categoría',
      tags: 'Etiquetas',
      sendNotification: 'Enviar notificación',
      scheduleDate: 'Fecha programada',
      save: 'Guardar borrador',
      publishNow: 'Publicar ahora',
      cancel: 'Cancelar',
      created: 'Post creado',
      updated: 'Post actualizado',
      deleted: 'Post eliminado',
      confirmDelete: '¿Eliminar este post?',
      noPosts: 'No hay posts',
      createFirst: 'Crea tu primer post',
      back: 'Volver',
      spanish: 'ES',
      english: 'EN',
      chinese: 'ZH',
      views: 'vistas',
      likes: 'likes',
      status: {
        draft: 'Borrador',
        scheduled: 'Programado',
        sent: 'Publicado',
        deleted: 'Eliminado'
      }
    },
    en: {
      title: 'Post Management',
      subtitle: 'Create and manage announcements and content',
      newPost: 'New Post',
      all: 'All',
      drafts: 'Drafts',
      published: 'Published',
      scheduled: 'Scheduled',
      edit: 'Edit',
      delete: 'Delete',
      publish: 'Publish',
      schedule: 'Schedule',
      postTitle: 'Title',
      postSummary: 'Summary',
      content: 'Content',
      coverImage: 'Cover image',
      category: 'Category',
      tags: 'Tags',
      sendNotification: 'Send notification',
      scheduleDate: 'Schedule date',
      save: 'Save draft',
      publishNow: 'Publish now',
      cancel: 'Cancel',
      created: 'Post created',
      updated: 'Post updated',
      deleted: 'Post deleted',
      confirmDelete: 'Delete this post?',
      noPosts: 'No posts',
      createFirst: 'Create your first post',
      back: 'Back',
      spanish: 'ES',
      english: 'EN',
      chinese: 'ZH',
      views: 'views',
      likes: 'likes',
      status: {
        draft: 'Draft',
        scheduled: 'Scheduled',
        sent: 'Published',
        deleted: 'Deleted'
      }
    },
    zh: {
      title: '帖子管理',
      subtitle: '创建和管理公告和内容',
      newPost: '新帖子',
      all: '全部',
      drafts: '草稿',
      published: '已发布',
      scheduled: '已计划',
      edit: '编辑',
      delete: '删除',
      publish: '发布',
      schedule: '计划',
      postTitle: '标题',
      postSummary: '摘要',
      content: '内容',
      coverImage: '封面图片',
      category: '分类',
      tags: '标签',
      sendNotification: '发送通知',
      scheduleDate: '计划日期',
      save: '保存草稿',
      publishNow: '立即发布',
      cancel: '取消',
      created: '帖子已创建',
      updated: '帖子已更新',
      deleted: '帖子已删除',
      confirmDelete: '删除此帖子？',
      noPosts: '没有帖子',
      createFirst: '创建您的第一个帖子',
      back: '返回',
      spanish: '西',
      english: '英',
      chinese: '中',
      views: '浏览',
      likes: '喜欢',
      status: {
        draft: '草稿',
        scheduled: '已计划',
        sent: '已发布',
        deleted: '已删除'
      }
    }
  };

  const txt = texts[lang] || texts.es;

  useEffect(() => {
    if (token) {
      fetchPosts();
      fetchCategories();
    }
  }, [token, activeTab]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/posts/admin/all?limit=100`;
      if (activeTab === 'drafts') url += '&status=draft';
      else if (activeTab === 'published') url += '&status=sent';
      else if (activeTab === 'scheduled') url += '&status=scheduled';

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

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
    }
  };

  const resetForm = () => {
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
    setEditingPost(null);
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
        send_notification: post.send_notification ?? true,
        scheduled_at: post.scheduled_at || ''
      });
    } else {
      resetForm();
    }
    setIsEditorOpen(true);
  };

  const handleSave = async (publish = false) => {
    if (!formData.title.es) {
      toast.error('El título en español es requerido');
      return;
    }

    try {
      let url, method;
      
      if (editingPost) {
        url = `${API_URL}/api/posts/admin/${editingPost.post_id}`;
        method = 'PUT';
      } else {
        url = `${API_URL}/api/posts/admin/create`;
        method = 'POST';
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const data = await res.json();
        
        if (publish && data.post?.post_id) {
          await fetch(`${API_URL}/api/posts/admin/${data.post.post_id}/publish?send_notification=${formData.send_notification}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
        }

        toast.success(editingPost ? txt.updated : txt.created);
        setIsEditorOpen(false);
        resetForm();
        fetchPosts();
      }
    } catch (error) {
      toast.error('Error saving post');
    }
  };

  const handlePublish = async (postId) => {
    try {
      const res = await fetch(`${API_URL}/api/posts/admin/${postId}/publish`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Post publicado');
        fetchPosts();
      }
    } catch (error) {
      toast.error('Error publishing post');
    }
  };

  const handleDelete = async (postId) => {
    if (!confirm(txt.confirmDelete)) return;

    try {
      const res = await fetch(`${API_URL}/api/posts/admin/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success(txt.deleted);
        fetchPosts();
      }
    } catch (error) {
      toast.error('Error deleting post');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const locale = lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : 'es-PA';
    return date.toLocaleDateString(locale, { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'secondary',
      scheduled: 'outline',
      sent: 'default',
      deleted: 'destructive'
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {txt.status[status] || status}
      </Badge>
    );
  };

  const filteredPosts = posts.filter(post => {
    if (!searchQuery) return true;
    const title = post.title?.[lang] || post.title?.es || '';
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
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
      <div className="min-h-screen bg-background" data-testid="admin-posts">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <Button 
                variant="ghost" 
                className="mb-4"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {txt.back}
              </Button>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <FileText className="h-8 w-8" />
                {txt.title}
              </h1>
              <p className="text-muted-foreground">{txt.subtitle}</p>
            </div>
            <Button onClick={() => openEditor()} data-testid="new-post-btn">
              <Plus className="h-4 w-4 mr-2" />
              {txt.newPost}
            </Button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar posts..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="all">{txt.all}</TabsTrigger>
              <TabsTrigger value="drafts">{txt.drafts}</TabsTrigger>
              <TabsTrigger value="published">{txt.published}</TabsTrigger>
              <TabsTrigger value="scheduled">{txt.scheduled}</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredPosts.length === 0 ? (
                <Card>
                  <CardContent className="pt-12 pb-12 text-center">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                    <h3 className="text-lg font-medium">{txt.noPosts}</h3>
                    <p className="text-muted-foreground mb-4">{txt.createFirst}</p>
                    <Button onClick={() => openEditor()}>
                      <Plus className="h-4 w-4 mr-2" />
                      {txt.newPost}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredPosts.map((post) => (
                    <Card key={post.post_id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-4">
                          {/* Cover Image */}
                          {post.cover_image && (
                            <img 
                              src={post.cover_image} 
                              alt="" 
                              className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                            />
                          )}
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-semibold line-clamp-1">
                                  {post.title?.[lang] || post.title?.es || 'Sin título'}
                                </h3>
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                  {post.summary?.[lang] || post.summary?.es || ''}
                                </p>
                              </div>
                              {getStatusBadge(post.status)}
                            </div>
                            
                            {/* Meta */}
                            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(post.created_at)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {post.views || 0} {txt.views}
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="h-3 w-3" />
                                {post.likes || 0} {txt.likes}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditor(post)}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                {txt.edit}
                              </DropdownMenuItem>
                              {post.status === 'draft' && (
                                <DropdownMenuItem onClick={() => handlePublish(post.post_id)}>
                                  <Send className="h-4 w-4 mr-2" />
                                  {txt.publish}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDelete(post.post_id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {txt.delete}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Post Editor Dialog */}
        <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPost ? txt.edit : txt.newPost}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Title (multi-language) */}
              <div className="space-y-3">
                <Label className="font-semibold">{txt.postTitle}</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">{txt.spanish}</Label>
                    <Input
                      value={formData.title.es}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        title: { ...prev.title, es: e.target.value }
                      }))}
                      placeholder="Título"
                      data-testid="post-title-es"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{txt.english}</Label>
                    <Input
                      value={formData.title.en}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        title: { ...prev.title, en: e.target.value }
                      }))}
                      placeholder="Title"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{txt.chinese}</Label>
                    <Input
                      value={formData.title.zh}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        title: { ...prev.title, zh: e.target.value }
                      }))}
                      placeholder="标题"
                    />
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-3">
                <Label className="font-semibold">{txt.postSummary}</Label>
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    value={formData.summary.es}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      summary: { ...prev.summary, es: e.target.value }
                    }))}
                    placeholder="Resumen"
                  />
                  <Input
                    value={formData.summary.en}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      summary: { ...prev.summary, en: e.target.value }
                    }))}
                    placeholder="Summary"
                  />
                  <Input
                    value={formData.summary.zh}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      summary: { ...prev.summary, zh: e.target.value }
                    }))}
                    placeholder="摘要"
                  />
                </div>
              </div>

              {/* Cover Image */}
              <div className="space-y-2">
                <Label>{txt.coverImage}</Label>
                <Input
                  value={formData.cover_image}
                  onChange={(e) => setFormData(prev => ({ ...prev, cover_image: e.target.value }))}
                  placeholder="https://..."
                />
                {formData.cover_image && (
                  <img 
                    src={formData.cover_image} 
                    alt="" 
                    className="max-h-32 rounded-lg object-cover"
                  />
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>{txt.category}</Label>
                <Select 
                  value={formData.category_id}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, category_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
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

              {/* Content Editor */}
              <div className="space-y-2">
                <Label className="font-semibold">{txt.content}</Label>
                <PostEditor 
                  blocks={formData.content_blocks}
                  onChange={(blocks) => setFormData(prev => ({ ...prev, content_blocks: blocks }))}
                  lang={lang}
                />
              </div>

              {/* Send Notification Toggle */}
              <div className="flex items-center justify-between">
                <Label>{txt.sendNotification}</Label>
                <Switch
                  checked={formData.send_notification}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, send_notification: v }))}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
                {txt.cancel}
              </Button>
              <Button variant="secondary" onClick={() => handleSave(false)}>
                {txt.save}
              </Button>
              <Button onClick={() => handleSave(true)} data-testid="publish-post-btn">
                <Send className="h-4 w-4 mr-2" />
                {txt.publishNow}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
