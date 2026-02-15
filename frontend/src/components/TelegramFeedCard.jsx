/**
 * TelegramFeedCard — Landing page feed showing Telegram channel posts.
 * Supports album/carousel view for media groups, configurable container UI,
 * and multi-container rendering for different channels.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle, Heart, ChevronRight, Play, X,
  Film, FileText, Image as ImageIcon
} from 'lucide-react';

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

function formatDuration(sec) {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fallbackText(media) {
  if (!media || media.length === 0) return 'New post';
  const first = media[0];
  if (media.length > 1) return `Album (${media.length} items)`;
  switch (first.type) {
    case 'video': return 'Shared a video';
    case 'animation': return 'Shared a GIF';
    case 'photo': return 'Shared a photo';
    case 'document': return `Shared: ${first.file_name || 'file'}`;
    default: return 'New post';
  }
}

/* ────────────────── Media Thumbnail Grid ────────────────── */

function MediaGrid({ media, onVideoPlay, compact = false }) {
  if (!media || media.length === 0) return null;

  const size = compact ? 'w-14 h-14' : 'w-[72px] h-[72px]';

  return (
    <div className="flex gap-1 flex-shrink-0" data-testid="media-grid">
      {media.map((item, idx) => (
        <MediaThumb key={idx} item={item} onVideoPlay={onVideoPlay} size={size} />
      ))}
    </div>
  );
}

function MediaThumb({ item, onVideoPlay, size = 'w-20 h-20' }) {
  const isVideo = item?.type === 'video' || item?.type === 'animation';
  const thumbSrc = item?.type === 'photo'
    ? mediaUrl(item.file_id)
    : item?.thumb_file_id
    ? mediaUrl(item.thumb_file_id)
    : null;

  const handleClick = () => {
    if (isVideo && item?.file_id) onVideoPlay(item.file_id);
  };

  return (
    <div
      className={`relative ${size} rounded-lg overflow-hidden bg-black/5 cursor-pointer flex-shrink-0`}
      onClick={handleClick}
      data-testid="media-thumb"
    >
      {thumbSrc ? (
        <img src={thumbSrc} alt="" className="w-full h-full object-cover" loading="lazy" />
      ) : isVideo ? (
        <div className="w-full h-full flex items-center justify-center" style={{ background: '#1a1a2e' }}>
          <Play className="h-5 w-5 text-white/60 fill-white/60" />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center" style={{ background: '#f0f4f8' }}>
          <ImageIcon className="h-5 w-5 text-slate-400" />
        </div>
      )}
      {isVideo && (
        <>
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <Play className="h-3 w-3 text-white fill-white ml-0.5" />
            </div>
          </div>
          {item.duration > 0 && (
            <span className="absolute bottom-0.5 right-0.5 text-[7px] text-white font-bold bg-black/60 px-1 py-0.5 rounded">
              {formatDuration(item.duration)}
            </span>
          )}
        </>
      )}
    </div>
  );
}

/* ────────────────── Post Row ────────────────── */

function PostRow({ post, onVideoPlay, accentColor }) {
  const media = post.media || [];
  const isAlbum = post.is_album && media.length > 1;

  if (isAlbum) {
    return (
      <div
        className="py-3 border-b last:border-b-0"
        style={{ borderColor: 'rgba(0,0,0,0.06)' }}
        data-testid={`telegram-post-${post.telegram_msg_id}`}
      >
        <div className="flex gap-2.5 items-start">
          <MediaGrid media={media} onVideoPlay={(fileId) => onVideoPlay(fileId, post.text)} />
          <div className="flex-1 min-w-0">
            {post.text && (
              <p className="text-sm leading-snug" style={{ color: '#2d2217' }}>
                {post.text}
              </p>
            )}
            <PostMeta post={post} />
          </div>
        </div>
      </div>
    );
  }

  // Single media or text-only post
  const firstMedia = media[0] || null;
  const thumbSrc = firstMedia?.type === 'photo' ? mediaUrl(firstMedia.file_id)
    : firstMedia?.type === 'video' && firstMedia.thumb_file_id ? mediaUrl(firstMedia.thumb_file_id)
    : null;
  const isPlayable = firstMedia?.type === 'video' || firstMedia?.type === 'animation';

  const handleThumbClick = () => {
    if (isPlayable && firstMedia?.file_id) onVideoPlay(firstMedia.file_id, post.text);
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
              {firstMedia.duration > 0 && (
                <span className="absolute bottom-0.5 right-1 text-[8px] text-white font-bold bg-black/50 px-1 rounded">
                  {formatDuration(firstMedia.duration)}
                </span>
              )}
            </div>
          )}
        </div>
      ) : firstMedia?.type === 'video' ? (
        <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center cursor-pointer" style={{ background: '#1a1a2e' }} onClick={handleThumbClick}>
          <Play className="h-5 w-5 text-white/70 fill-white/70" />
        </div>
      ) : firstMedia?.type === 'animation' ? (
        <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center cursor-pointer" style={{ background: '#1e293b' }} onClick={handleThumbClick}>
          <Film className="h-5 w-5 text-white/60" />
        </div>
      ) : firstMedia?.type === 'document' ? (
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
        <PostMeta post={post} />
      </div>
    </div>
  );
}

function PostMeta({ post }) {
  return (
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
  );
}

/* ────────────────── Video Modal ────────────────── */

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

/* ────────────────── Single Feed Container ────────────────── */

function FeedContainer({ container, onVideoPlay }) {
  const navigate = useNavigate();
  const {
    title = 'Community Channel',
    subtitle = 'Latest updates',
    posts = [],
    total_posts = 0,
    bg_color = '#ffffff',
    accent_color = '#0088cc',
    header_bg = '#E8F4FE',
    icon_color = '#0088cc',
    card_style = 'compact',
    show_footer = true,
    cta_text = 'Open Community Feed',
    cta_link = '/comunidad',
    border_radius = '2xl',
    show_post_count = true,
    container_id,
  } = container;

  const radiusClass = `rounded-none sm:${border_radius === '2xl' ? 'rounded-2xl' : border_radius === 'xl' ? 'rounded-xl' : border_radius === 'lg' ? 'rounded-lg' : border_radius === 'none' ? 'rounded-none' : 'rounded-2xl'}`;

  return (
    <div
      className={`${radiusClass} overflow-hidden shadow-sm`}
      style={{ background: bg_color, border: '1px solid rgba(0,0,0,0.06)' }}
      data-testid={`telegram-feed-card${container_id ? `-${container_id}` : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: header_bg }}>
            <MessageCircle className="h-4 w-4" style={{ color: icon_color }} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight" style={{ color: '#2d2217' }}>{title}</h3>
            <p className="text-[10px]" style={{ color: '#b8956a' }}>
              {show_post_count && total_posts > 0 ? `${total_posts} posts` : subtitle}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate(cta_link)}
          className="text-[10px] font-bold flex items-center gap-0.5 transition-all hover:gap-1.5"
          style={{ color: accent_color }}
          data-testid="telegram-see-all"
        >
          See all <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Posts */}
      <div className="px-4 pb-3">
        {posts.length === 0 ? (
          <div className="py-8 text-center">
            <ImageIcon className="h-8 w-8 mx-auto mb-2" style={{ color: '#d4c5b0' }} />
            <p className="text-xs" style={{ color: '#b8956a' }}>Channel posts will appear here</p>
          </div>
        ) : card_style === 'expanded' ? (
          posts.map(post => (
            <ExpandedPostRow
              key={post.telegram_msg_id}
              post={post}
              onVideoPlay={(fileId, caption) => onVideoPlay(fileId, caption)}
              accentColor={accent_color}
            />
          ))
        ) : (
          posts.map(post => (
            <PostRow
              key={post.telegram_msg_id}
              post={post}
              onVideoPlay={(fileId, caption) => onVideoPlay(fileId, caption)}
              accentColor={accent_color}
            />
          ))
        )}
      </div>

      {/* Footer CTA */}
      {show_footer && posts.length > 0 && (
        <button
          onClick={() => navigate(cta_link)}
          className="w-full py-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-1"
          style={{ background: '#f5ede0', color: '#8B6914' }}
          data-testid="telegram-open-feed"
        >
          {cta_text} <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/* ────────────────── Expanded Post Style ────────────────── */

function ExpandedPostRow({ post, onVideoPlay, accentColor }) {
  const media = post.media || [];

  return (
    <div
      className="py-3 border-b last:border-b-0"
      style={{ borderColor: 'rgba(0,0,0,0.06)' }}
      data-testid={`telegram-post-${post.telegram_msg_id}`}
    >
      <div className="flex gap-2.5 items-start">
        {media.length > 0 && (
          <MediaGrid media={media} onVideoPlay={(fileId) => onVideoPlay(fileId, post.text)} />
        )}
        <div className="flex-1 min-w-0">
          {post.text && (
            <p className="text-sm leading-snug" style={{ color: '#2d2217' }}>
              {post.text}
            </p>
          )}
          <PostMeta post={post} />
        </div>
      </div>
    </div>
  );
}

/* ────────────────── Main Export: Multi-Container Feed ────────────────── */

export default function TelegramFeedCard() {
  const [containers, setContainers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [videoModal, setVideoModal] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/community-v2/feed/public/containers`)
      .then(r => r.ok ? r.json() : { containers: [] })
      .then(data => {
        setContainers(data.containers || []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) return null;
  if (containers.length === 0) return null;

  return (
    <>
      <div className="space-y-4" data-testid="telegram-feed-section">
        {containers.map((container, idx) => (
          <FeedContainer
            key={container.container_id || idx}
            container={container}
            onVideoPlay={(fileId, caption) => setVideoModal({ fileId, caption })}
          />
        ))}
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
