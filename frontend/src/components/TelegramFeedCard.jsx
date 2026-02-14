/**
 * TelegramFeedCard — Landing page preview of the Telegram community channel.
 * Shows latest posts in a compact, scrollable card.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Heart, ChevronRight, Image as ImageIcon } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function PostRow({ post }) {
  const mediaUrl = (fileId) => `${API_URL}/api/community-v2/feed/media/${fileId}`;
  const hasPhoto = post.media?.some(m => m.type === 'photo');
  const photoFile = hasPhoto ? post.media.find(m => m.type === 'photo')?.file_id : null;

  return (
    <div
      className="flex gap-3 items-start py-3 border-b last:border-b-0"
      style={{ borderColor: 'rgba(0,0,0,0.06)' }}
      data-testid={`telegram-post-${post.telegram_msg_id}`}
    >
      {/* Thumbnail */}
      {photoFile ? (
        <img
          src={mediaUrl(photoFile)}
          alt=""
          className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: '#f5ede0' }}>
          <MessageCircle className="h-5 w-5" style={{ color: '#c4b5a0' }} />
        </div>
      )}
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug line-clamp-2" style={{ color: '#2d2217' }}>
          {post.text || (hasPhoto ? 'Shared a photo' : 'New post')}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[10px]" style={{ color: '#b8956a' }}>
            {formatTimeAgo(post.date)}
          </span>
          {post.likes_count > 0 && (
            <span className="text-[10px] flex items-center gap-0.5" style={{ color: '#b8956a' }}>
              <Heart className="h-2.5 w-2.5" /> {post.likes_count}
            </span>
          )}
          {post.comments_count > 0 && (
            <span className="text-[10px] flex items-center gap-0.5" style={{ color: '#b8956a' }}>
              <MessageCircle className="h-2.5 w-2.5" /> {post.comments_count}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TelegramFeedCard() {
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_URL}/api/community-v2/feed/public/recent?limit=5`)
      .then(r => r.ok ? r.json() : { posts: [], total: 0 })
      .then(data => {
        setPosts(data.posts || []);
        setTotal(data.total || 0);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-sm"
      style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}
      data-testid="telegram-feed-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#E8F4FE' }}>
            <MessageCircle className="h-4 w-4" style={{ color: '#0088cc' }} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight" style={{ color: '#2d2217' }}>Community Channel</h3>
            <p className="text-[10px]" style={{ color: '#b8956a' }}>
              {total > 0 ? `${total} posts` : 'Latest updates'}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/comunidad')}
          className="text-[10px] font-bold flex items-center gap-0.5 transition-all hover:gap-1.5"
          style={{ color: '#0088cc' }}
          data-testid="telegram-see-all"
        >
          See all <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Posts list */}
      <div className="px-4 pb-3">
        {posts.length === 0 ? (
          <div className="py-8 text-center">
            <ImageIcon className="h-8 w-8 mx-auto mb-2" style={{ color: '#d4c5b0' }} />
            <p className="text-xs" style={{ color: '#b8956a' }}>Channel posts will appear here</p>
          </div>
        ) : (
          posts.map(post => (
            <PostRow key={post.telegram_msg_id} post={post} />
          ))
        )}
      </div>

      {/* Footer CTA */}
      {posts.length > 0 && (
        <button
          onClick={() => navigate('/comunidad')}
          className="w-full py-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-1"
          style={{ background: '#f5ede0', color: '#8B6914' }}
          data-testid="telegram-open-feed"
        >
          Open Community Feed <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
