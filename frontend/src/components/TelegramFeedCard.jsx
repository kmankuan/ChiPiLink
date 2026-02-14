/**
 * TelegramFeedCard — Landing page preview of the Telegram community channel.
 * Shows latest posts with photo/video thumbnails and inline video modal.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Heart, ChevronRight, Play, X, Film, FileText, Image as ImageIcon } from 'lucide-react';

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

function mediaUrl(fileId) {
  return `${API_URL}/api/community-v2/feed/media/${fileId}`;
}

function getMediaInfo(post) {
  if (!post.media || post.media.length === 0) return null;
  const photo = post.media.find(m => m.type === 'photo');
  const video = post.media.find(m => m.type === 'video');
  const animation = post.media.find(m => m.type === 'animation');
  const doc = post.media.find(m => m.type === 'document');
  if (video) return { kind: 'video', thumbId: video.thumb_file_id || null, fileId: video.file_id, duration: video.duration };
  if (animation) return { kind: 'animation', thumbId: null, fileId: animation.file_id };
  if (photo) return { kind: 'photo', fileId: photo.file_id };
  if (doc) return { kind: 'document', fileName: doc.file_name };
  return null;
}

function fallbackText(media) {
  if (!media) return 'New post';
  switch (media.kind) {
    case 'video': return 'Shared a video';
    case 'animation': return 'Shared a GIF';
    case 'photo': return 'Shared a photo';
    case 'document': return `Shared: ${media.fileName || 'file'}`;
    default: return 'New post';
  }
}

function formatDuration(sec) {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function PostRow({ post, onVideoPlay }) {
  const media = getMediaInfo(post);
  const thumbSrc = media?.kind === 'photo' ? mediaUrl(media.fileId)
    : media?.kind === 'video' && media.thumbId ? mediaUrl(media.thumbId)
    : null;

  const isPlayable = media?.kind === 'video' || media?.kind === 'animation';

  const handleThumbClick = () => {
    if (isPlayable && media?.fileId) onVideoPlay(media.fileId, post.text);
  };

  return (
    <div
      className="flex gap-3 items-start py-3 border-b last:border-b-0"
      style={{ borderColor: 'rgba(0,0,0,0.06)' }}
      data-testid={`telegram-post-${post.telegram_msg_id}`}
    >
      {/* Thumbnail */}
      {thumbSrc ? (
        <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer" onClick={handleThumbClick}>
          <img src={thumbSrc} alt="" className="w-full h-full object-cover" loading="lazy" />
          {isPlayable && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <Play className="h-5 w-5 text-white fill-white" />
              {media.duration > 0 && (
                <span className="absolute bottom-0.5 right-1 text-[8px] text-white font-bold bg-black/50 px-1 rounded">
                  {formatDuration(media.duration)}
                </span>
              )}
            </div>
          )}
        </div>
      ) : media?.kind === 'video' ? (
        <div
          className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center cursor-pointer"
          style={{ background: '#1a1a2e' }}
          onClick={handleThumbClick}
          data-testid="video-thumb-placeholder"
        >
          <Play className="h-5 w-5 text-white/70 fill-white/70" />
        </div>
      ) : media?.kind === 'animation' ? (
        <div
          className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center cursor-pointer"
          style={{ background: '#1e293b' }}
          onClick={handleThumbClick}
        >
          <Film className="h-5 w-5 text-white/60" />
        </div>
      ) : media?.kind === 'document' ? (
        <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: '#f0f4f8' }}>
          <FileText className="h-5 w-5" style={{ color: '#64748b' }} />
        </div>
      ) : (
        <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: '#f5ede0' }}>
          <MessageCircle className="h-5 w-5" style={{ color: '#c4b5a0' }} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug line-clamp-2" style={{ color: '#2d2217' }}>
          {post.text || fallbackText(media)}
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

function VideoModal({ fileId, caption, onClose }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      data-testid="video-modal"
    >
      <div
        className="relative w-[90vw] max-w-lg rounded-2xl overflow-hidden bg-black"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition"
          data-testid="video-modal-close"
        >
          <X className="h-4 w-4" />
        </button>
        <video
          ref={videoRef}
          src={mediaUrl(fileId)}
          controls
          autoPlay
          playsInline
          className="w-full max-h-[70vh] object-contain"
          data-testid="video-modal-player"
        />
        {caption && (
          <div className="px-4 py-3 bg-black/90">
            <p className="text-white text-xs leading-snug line-clamp-3">{caption}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TelegramFeedCard() {
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [videoModal, setVideoModal] = useState(null);
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
    <>
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
              <PostRow
                key={post.telegram_msg_id}
                post={post}
                onVideoPlay={(fileId, caption) => setVideoModal({ fileId, caption })}
              />
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

      {/* Video Modal */}
      {videoModal && (
        <VideoModal
          fileId={videoModal.fileId}
          caption={videoModal.caption}
          onClose={() => setVideoModal(null)}
        />
      )}
    </>
  );
}
