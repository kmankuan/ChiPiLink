/**
 * CommunityFeedModule — Telegram Channel Feed
 * Displays posts from a private Telegram channel with likes and comments.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Heart, MessageCircle, Send, Loader2, ChevronDown,
  Image as ImageIcon, Play, FileText, RefreshCw
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

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

  const mediaUrl = (fileId) => `${API_URL}/api/community-v2/feed/media/${fileId}?token=${token}`;

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
                  <p className="text-xs text-muted-foreground text-center py-2">No comments yet</p>
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
  const token = localStorage.getItem('auth_token');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/community-v2/feed/posts`, {
        params: { page: pageNum, limit: 20 },
        headers: { Authorization: `Bearer ${token}` }
      });
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

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, true);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Community</h1>
          <p className="text-sm text-muted-foreground">
            {total > 0 ? `${total} posts from our channel` : 'Stay connected with the community'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setPage(1); fetchPosts(1); }}
          data-testid="refresh-feed-btn" className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading feed...</p>
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <p className="font-medium">No posts yet</p>
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
    </div>
  );
}
