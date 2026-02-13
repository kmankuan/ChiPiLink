/**
 * CommunityFeedModule — Telegram Channel Feed
 * Displays posts from a private Telegram channel with likes and comments.
 * Includes admin visibility controls.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Heart, MessageCircle, Send, Loader2, ChevronDown,
  Image as ImageIcon, Play, FileText, RefreshCw,
  Eye, EyeOff, Shield, Settings, Users, Check
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ─── Visibility Admin Panel ─────────────────────────────────
function VisibilityPanel({ token }) {
  const [visibility, setVisibility] = useState('all_users');
  const [allowedRoles, setAllowedRoles] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/api/community-v2/feed/admin/visibility`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => {
      setVisibility(r.data.visibility || 'all_users');
      setAllowedRoles(r.data.allowed_roles || []);
      setAvailableRoles(r.data.available_roles || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const save = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/community-v2/feed/admin/visibility`, {
        visibility,
        allowed_roles: allowedRoles,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Visibility settings saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const toggleRole = (roleId) => {
    setAllowedRoles(prev =>
      prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]
    );
  };

  const modeLabel = { all_users: 'All Users', admin_only: 'Admins Only', specific_roles: 'Specific Roles' };
  const modeIcon = { all_users: Eye, admin_only: Shield, specific_roles: Users };

  if (loading) return null;

  return (
    <Card className="border-dashed" data-testid="visibility-panel">
      <CardContent className="p-3">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setOpen(!open)} data-testid="visibility-toggle">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Feed Visibility</span>
            <Badge variant="outline" className="text-[10px] gap-1">
              {(() => { const Icon = modeIcon[visibility]; return <Icon className="h-2.5 w-2.5" />; })()}
              {modeLabel[visibility]}
            </Badge>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>

        {open && (
          <div className="mt-3 space-y-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground">Control which users can see the Telegram community feed.</p>

            {/* Mode Selector */}
            <div className="grid sm:grid-cols-3 gap-2">
              {(['all_users', 'admin_only', 'specific_roles']).map(mode => {
                const Icon = modeIcon[mode];
                const isActive = visibility === mode;
                return (
                  <label
                    key={mode}
                    className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                      isActive ? 'border-primary bg-primary/5' : 'hover:bg-accent/30'
                    }`}
                    data-testid={`visibility-mode-${mode}`}
                  >
                    <input type="radio" name="visibility" value={mode} checked={isActive}
                      onChange={() => setVisibility(mode)} className="sr-only" />
                    <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="text-xs font-semibold">{modeLabel[mode]}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {mode === 'all_users' && 'Everyone who is logged in'}
                        {mode === 'admin_only' && 'Only administrators'}
                        {mode === 'specific_roles' && 'Select which roles can view'}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Role Selection */}
            {visibility === 'specific_roles' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold">Allowed Roles</p>
                {availableRoles.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No roles configured. Create roles in "Roles & Permissions".</p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-2">
                    {availableRoles.map(role => {
                      const checked = allowedRoles.includes(role.role_id);
                      return (
                        <label
                          key={role.role_id}
                          className={`flex items-center gap-2 p-2 border rounded-md cursor-pointer text-xs transition-colors ${
                            checked ? 'border-primary bg-primary/5' : 'hover:bg-accent/30'
                          }`}
                          data-testid={`role-${role.role_id}`}
                        >
                          <input type="checkbox" checked={checked} onChange={() => toggleRole(role.role_id)} className="rounded" />
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color || '#6366f1' }} />
                            <span className="font-medium">{role.name}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <Button size="sm" onClick={save} disabled={saving} data-testid="save-visibility-btn">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                Save
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PostCard({ post, token, onUpdate }) {
  const [liked, setLiked] = useState(post.liked_by_me || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);

  const handleLike = async () => {
    try {
      const res = await axios.post(
        `${API_URL}/api/community-v2/feed/posts/${post.telegram_msg_id}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLiked(res.data.liked);
      setLikesCount(prev => res.data.liked ? prev + 1 : prev - 1);
    } catch {
      toast.error('Error toggling like');
    }
  };

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const res = await axios.get(
        `${API_URL}/api/community-v2/feed/posts/${post.telegram_msg_id}/comments`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments(res.data.comments || []);
    } catch {
      toast.error('Error loading comments');
    } finally {
      setLoadingComments(false);
    }
  };

  const handleToggleComments = () => {
    if (!showComments) fetchComments();
    setShowComments(!showComments);
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setSending(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/community-v2/feed/posts/${post.telegram_msg_id}/comments`,
        { text: commentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments(prev => [...prev, res.data.comment]);
      setCommentText('');
    } catch {
      toast.error('Error sending comment');
    } finally {
      setSending(false);
    }
  };

  const mediaUrl = (fileId) => `${API_URL}/api/community-v2/feed/media/${fileId}`;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card className="overflow-hidden" data-testid={`post-card-${post.telegram_msg_id}`}>
      {/* Media */}
      {post.media?.length > 0 && (
        <div className="relative bg-black">
          {post.media.map((m, i) => (
            <div key={i}>
              {m.type === 'photo' && (
                <img
                  src={mediaUrl(m.file_id)}
                  alt=""
                  className="w-full max-h-[500px] object-contain"
                  loading="lazy"
                />
              )}
              {m.type === 'video' && (
                <video
                  controls
                  className="w-full max-h-[500px]"
                  poster={m.thumb_file_id ? mediaUrl(m.thumb_file_id) : undefined}
                >
                  <source src={mediaUrl(m.file_id)} />
                </video>
              )}
              {m.type === 'animation' && (
                <video autoPlay loop muted playsInline className="w-full max-h-[500px]">
                  <source src={mediaUrl(m.file_id)} />
                </video>
              )}
              {m.type === 'document' && (
                <div className="flex items-center gap-3 p-4 bg-muted">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{m.file_name || 'Document'}</p>
                    <p className="text-xs text-muted-foreground">{m.mime_type}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <CardContent className="p-4 space-y-3">
        {/* Text */}
        {post.text && (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{post.text}</p>
        )}

        {/* Date */}
        <p className="text-xs text-muted-foreground">{formatDate(post.date)}</p>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-1 border-t">
          <Button
            variant="ghost" size="sm"
            className={`gap-1.5 ${liked ? 'text-red-500' : 'text-muted-foreground'}`}
            onClick={handleLike}
            data-testid={`like-btn-${post.telegram_msg_id}`}
          >
            <Heart className={`h-4 w-4 ${liked ? 'fill-red-500' : ''}`} />
            {likesCount > 0 && <span className="text-xs">{likesCount}</span>}
          </Button>

          <Button
            variant="ghost" size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={handleToggleComments}
            data-testid={`comments-btn-${post.telegram_msg_id}`}
          >
            <MessageCircle className="h-4 w-4" />
            {(post.comments_count || 0) > 0 && <span className="text-xs">{post.comments_count}</span>}
          </Button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="space-y-3 pt-2 border-t">
            {loadingComments ? (
              <div className="flex justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <>
                {comments.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">{t("community.noComments")}</p>
                )}
                {comments.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-primary">
                        {(c.user_name || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs">
                        <span className="font-medium">{c.user_name || 'User'}</span>
                        <span className="text-muted-foreground ml-2">{formatDate(c.created_at)}</span>
                      </p>
                      <p className="text-sm">{c.text}</p>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Comment Input */}
            <div className="flex gap-2">
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="text-sm h-8"
                onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                data-testid={`comment-input-${post.telegram_msg_id}`}
              />
              <Button
                size="sm" className="h-8 px-3"
                onClick={handleSendComment}
                disabled={sending || !commentText.trim()}
                data-testid={`send-comment-${post.telegram_msg_id}`}
              >
                {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


export default function CommunityFeedModule() {
  const { t } = useTranslation();
  const token = localStorage.getItem('auth_token');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check access + admin status
  useEffect(() => {
    axios.get(`${API_URL}/api/community-v2/feed/access`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => {
      setIsAdmin(r.data.is_admin || false);
      if (!r.data.has_access) setAccessDenied(true);
    }).catch(() => {});
  }, [token]);

  const fetchPosts = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/community-v2/feed/posts`, {
        params: { page: pageNum, limit: 20 },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.access_denied) {
        setAccessDenied(true);
        setPosts([]);
        setTotal(0);
        return;
      }
      const newPosts = res.data.posts || [];
      setPosts(prev => append ? [...prev, ...newPosts] : newPosts);
      setTotal(res.data.total || 0);
      setHasMore(newPosts.length === 20);
    } catch {
      toast.error('Error loading feed');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { if (!accessDenied) fetchPosts(); }, [fetchPosts, accessDenied]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, true);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Admin Visibility Controls */}
      {isAdmin && <VisibilityPanel token={token} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("community.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {total > 0 ? `${total} posts from our channel` : 'Stay connected with the community'}
          </p>
        </div>
        {!accessDenied && (
          <Button variant="outline" size="sm" onClick={() => { setPage(1); fetchPosts(1); }}
            data-testid="refresh-feed-btn" className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        )}
      </div>

      {/* Access Denied Message */}
      {accessDenied && !isAdmin && (
        <Card data-testid="access-denied-card">
          <CardContent className="py-16 text-center space-y-3">
            <EyeOff className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <p className="font-medium">{t("community.accessDenied", "Feed restricted")}</p>
              <p className="text-sm text-muted-foreground">
                {t("community.accessDeniedDesc", "This feed is currently restricted. Contact an administrator for access.")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feed */}
      {!accessDenied && (
        <>
          {loading ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{t("community.loadingFeed")}</p>
            </div>
          ) : posts.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center space-y-3">
                <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <p className="font-medium">{t("community.noPosts")}</p>
                  <p className="text-sm text-muted-foreground">
                    Content from the Telegram channel will appear here once synced.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {posts.map((post) => (
                <PostCard key={post.telegram_msg_id} post={post} token={token} />
              ))}

              {hasMore && (
                <div className="flex justify-center py-4">
                  <Button variant="outline" onClick={loadMore} className="gap-2" data-testid="load-more-btn">
                    <ChevronDown className="h-4 w-4" /> Load More
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
