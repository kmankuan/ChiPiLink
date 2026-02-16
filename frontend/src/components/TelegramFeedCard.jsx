/**
 * TelegramFeedCard — Landing page Telegram feed with horizontal scroll.
 * Supports configurable card size, truncated descriptions, "See more" modal,
 * and "Load older" posts.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MessageCircle, Heart, ChevronRight, ChevronLeft, Play, X,
  Film, FileText, Image as ImageIcon, ChevronDown, Loader2, Pause, ExternalLink, Link2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'now';
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
  if (media.length > 1) return `Album (${media.length})`;
  switch (first.type) {
    case 'video': return 'Video';
    case 'animation': return 'GIF';
    case 'photo': return 'Photo';
    case 'document': return first.file_name || 'File';
    default: return 'New post';
  }
}

/* ────────── Horizontal Post Card ────────── */

function HorizontalPostCard({ post, cardWidth, cardHeight, maxLines, onOpenDetail, onOpenGallery }) {
  const media = post.media || [];
  const firstMedia = media[0] || null;
  const isAlbum = media.length > 1;
  const isPlayable = firstMedia?.type === 'video' || firstMedia?.type === 'animation';
  const thumbSrc = firstMedia?.type === 'photo'
    ? mediaUrl(firstMedia.file_id)
    : firstMedia?.thumb_file_id
      ? mediaUrl(firstMedia.thumb_file_id)
      : null;

  const imageHeight = Math.round(cardHeight * 0.55);
  const text = post.text || fallbackText(media);

  const handleMediaClick = (e) => {
    e.stopPropagation();
    if (media.length > 0) {
      onOpenGallery(media, 0, post.text);
    }
  };

  // Get thumb src for any media item
  const getThumb = (item) => {
    if (item?.type === 'photo') return mediaUrl(item.file_id);
    if (item?.thumb_file_id) return mediaUrl(item.thumb_file_id);
    return null;
  };

  return (
    <div
      className="flex-shrink-0 snap-start rounded-xl overflow-hidden cursor-pointer group transition-shadow hover:shadow-md"
      style={{
        width: cardWidth,
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.07)',
      }}
      onClick={() => onOpenDetail(post)}
      data-testid={`h-post-${post.telegram_msg_id}`}
    >
      {/* Media area */}
      <div
        className="relative overflow-hidden bg-neutral-100"
        style={{ height: imageHeight }}
        onClick={handleMediaClick}
      >
        {isAlbum ? (
          /* Album grid: show 2-4 thumbnails */
          <div className="w-full h-full grid gap-[1px]" style={{
            gridTemplateColumns: media.length >= 3 ? '1fr 1fr' : '1fr 1fr',
            gridTemplateRows: media.length >= 3 ? '1fr 1fr' : '1fr',
          }}>
            {media.slice(0, 4).map((item, idx) => {
              const src = getThumb(item);
              const isItemVideo = item?.type === 'video' || item?.type === 'animation';
              // First item spans full left column for 3+ items
              const span = idx === 0 && media.length >= 3 ? { gridRow: '1 / -1' } : {};
              return (
                <div key={idx} className="relative overflow-hidden bg-neutral-200" style={span}>
                  {src ? (
                    <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : isItemVideo ? (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: '#1a1a2e' }}>
                      <Play className="h-4 w-4 text-white/60 fill-white/60" />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: '#f0f4f8' }}>
                      <ImageIcon className="h-4 w-4 text-slate-400" />
                    </div>
                  )}
                  {isItemVideo && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-black/40 flex items-center justify-center">
                        <Play className="h-2.5 w-2.5 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                  )}
                  {/* Extra count overlay on last visible cell */}
                  {idx === 3 && media.length > 4 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white text-sm font-bold">+{media.length - 4}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : thumbSrc ? (
          <img
            src={thumbSrc}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : firstMedia?.type === 'video' || firstMedia?.type === 'animation' ? (
          <div className="w-full h-full flex items-center justify-center" style={{ background: '#1a1a2e' }}>
            <Play className="h-8 w-8 text-white/50 fill-white/50" />
          </div>
        ) : firstMedia?.type === 'document' ? (
          <div className="w-full h-full flex items-center justify-center" style={{ background: '#f0f4f8' }}>
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: '#f5ede0' }}>
            <MessageCircle className="h-8 w-8" style={{ color: '#c4b5a0' }} />
          </div>
        )}

        {/* Video play overlay (single media only) */}
        {!isAlbum && isPlayable && thumbSrc && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <Play className="h-4 w-4 text-white fill-white ml-0.5" />
            </div>
          </div>
        )}

        {/* Duration badge */}
        {isPlayable && firstMedia?.duration > 0 && (
          <span className="absolute bottom-1.5 right-1.5 text-[9px] text-white font-bold bg-black/60 px-1.5 py-0.5 rounded">
            {formatDuration(firstMedia.duration)}
          </span>
        )}
      </div>

      {/* Content area — compact, no fixed min-height */}
      <div className="p-2.5">
        <p
          className="text-xs leading-snug"
          style={{
            color: '#2d2217',
            display: '-webkit-box',
            WebkitLineClamp: maxLines,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {text}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[9px]" style={{ color: '#b8956a' }}>
            {formatTimeAgo(post.date)}
          </span>
          {post.likes_count > 0 && (
            <span className="text-[9px] flex items-center gap-0.5" style={{ color: '#b8956a' }}>
              <Heart className="h-2.5 w-2.5" /> {post.likes_count}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────── Post Detail Modal ────────── */

function PostDetailModal({ post, onClose }) {
  const { t } = useTranslation();
  const media = post?.media || [];
  const [currentMedia, setCurrentMedia] = useState(0);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!post) return null;

  const item = media[currentMedia];
  const isVideo = item?.type === 'video' || item?.type === 'animation';
  const src = item?.file_id ? mediaUrl(item.file_id) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      data-testid="post-detail-modal"
    >
      <div
        className="relative bg-white rounded-2xl overflow-hidden max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          data-testid="modal-close-btn"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Media */}
        {media.length > 0 && (
          <div className="relative bg-black aspect-video flex items-center justify-center flex-shrink-0">
            {isVideo && src ? (
              <video
                key={`v-${currentMedia}`}
                src={src}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
                data-testid="modal-video"
              />
            ) : src ? (
              <img
                key={`i-${currentMedia}`}
                src={src}
                alt=""
                className="w-full h-full object-contain"
                data-testid="modal-image"
              />
            ) : (
              <div className="text-white/40 text-sm">No preview</div>
            )}

            {/* Nav arrows */}
            {currentMedia > 0 && (
              <button
                onClick={() => setCurrentMedia(c => c - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"
                data-testid="modal-prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {currentMedia < media.length - 1 && (
              <button
                onClick={() => setCurrentMedia(c => c + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"
                data-testid="modal-next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            {/* Dots */}
            {media.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {media.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentMedia(i)}
                    className={`rounded-full transition-all ${i === currentMedia ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Text content */}
        <div className="p-5 overflow-y-auto flex-1">
          {post.text && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#2d2217' }}>
              {post.text}
            </p>
          )}
          <div className="flex items-center gap-3 mt-3 pt-3 border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
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
    </div>
  );
}

/* ────────── Media Gallery Modal ────────── */

function MediaGalleryModal({ media, startIndex, caption, onClose }) {
  const [current, setCurrent] = useState(startIndex || 0);
  const [autoPlay, setAutoPlay] = useState(true);
  const hasAdvancedRef = useRef(false);
  const timerRef = useRef(null);

  const item = media[current];
  const isVideo = item?.type === 'video' || item?.type === 'animation';
  const isLast = current >= media.length - 1;
  const total = media.length;

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && !isLast) setCurrent(c => c + 1);
      if (e.key === 'ArrowLeft' && current > 0) setCurrent(c => c - 1);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [current, isLast, onClose]);

  useEffect(() => { hasAdvancedRef.current = false; }, [current]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!isVideo && autoPlay && total > 1) {
      timerRef.current = setTimeout(() => {
        if (isLast) onClose(); else setCurrent(c => c + 1);
      }, 4000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, isVideo, autoPlay, isLast, total, onClose]);

  const handleVideoEnded = () => {
    if (!hasAdvancedRef.current) {
      hasAdvancedRef.current = true;
      if (isLast) onClose(); else setCurrent(c => c + 1);
    }
  };

  const src = item?.file_id ? mediaUrl(item.file_id) : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" data-testid="media-gallery-modal">
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 z-10">
        <span className="text-white/70 text-xs font-medium">{current + 1} / {total}</span>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white"
          data-testid="gallery-close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 relative flex items-center justify-center overflow-hidden" onClick={() => !isVideo && setAutoPlay(a => !a)}>
        {isVideo && src ? (
          <video key={`v-${current}`} src={src} controls autoPlay playsInline onEnded={handleVideoEnded} className="w-full h-full object-contain" data-testid="gallery-video" />
        ) : src ? (
          <img key={`i-${current}`} src={src} alt="" className="w-full h-full object-contain" data-testid="gallery-image" />
        ) : (
          <div className="text-white/40 text-sm">No preview</div>
        )}
        {current > 0 && (
          <button onClick={(e) => { e.stopPropagation(); setCurrent(c => c - 1); }} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white" data-testid="gallery-prev">
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {!isLast && (
          <button onClick={(e) => { e.stopPropagation(); setCurrent(c => c + 1); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white" data-testid="gallery-next">
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
      {caption && (
        <div className="px-4 py-3 bg-black/90">
          <p className="text-white text-xs leading-snug line-clamp-3">{caption}</p>
        </div>
      )}
      {total > 1 && (
        <div className="flex justify-center gap-1.5 pb-4 pt-2 bg-black/90">
          {media.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} className={`rounded-full transition-all ${i === current ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/30'}`} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ────────── Horizontal Feed Container ────────── */

function HorizontalFeedContainer({ container, onOpenGallery }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const scrollRef = useRef(null);
  const autoplayTimerRef = useRef(null);
  const progressRef = useRef(null);
  const [detailPost, setDetailPost] = useState(null);
  const [posts, setPosts] = useState(container.posts || []);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState((container.total_posts || 0) > (container.posts || []).length);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isAutoplay, setIsAutoplay] = useState(container.autoplay !== false);
  const [isPaused, setIsPaused] = useState(false);

  const {
    title = 'Community Channel',
    subtitle = 'Latest updates',
    bg_color = '#ffffff',
    accent_color = '#C8102E',
    header_bg = '#E8F4FE',
    icon_color = '#0088cc',
    card_width = 220,
    card_height = 300,
    description_max_lines = 2,
    autoplay_interval = 4,
    cta_link = '/comunidad',
    show_post_count = true,
    show_autoplay_btn = false,
    show_see_all_btn = false,
    header_links = [],
    total_posts = 0,
    container_id,
    channel_id,
  } = container;

  const intervalMs = (autoplay_interval || 4) * 1000;
  const imageHeight = Math.round(card_height * 0.55);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    return () => el.removeEventListener('scroll', updateScrollState);
  }, [updateScrollState, posts]);

  // Autoplay: scroll one card to the right every interval
  useEffect(() => {
    if (!isAutoplay || isPaused || posts.length <= 1) {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
      return;
    }

    autoplayTimerRef.current = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 10;
      if (atEnd) {
        // Loop back to start
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: card_width + 12, behavior: 'smooth' });
      }
    }, intervalMs);

    return () => { if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current); };
  }, [isAutoplay, isPaused, posts.length, card_width, intervalMs]);

  // Progress bar animation
  useEffect(() => {
    const bar = progressRef.current;
    if (!bar) return;
    if (!isAutoplay || isPaused || posts.length <= 1) {
      bar.style.animation = 'none';
      bar.style.width = '0%';
      return;
    }
    bar.style.animation = 'none';
    // Force reflow
    void bar.offsetWidth;
    bar.style.animation = `feedAutoplayProgress ${intervalMs}ms linear infinite`;
  }, [isAutoplay, isPaused, posts.length, intervalMs]);

  const handleMouseEnter = () => { if (isAutoplay) setIsPaused(true); };
  const handleMouseLeave = () => { if (isAutoplay) setIsPaused(false); };

  const toggleAutoplay = () => {
    setIsAutoplay(prev => !prev);
    setIsPaused(false);
  };

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = dir === 'left' ? -(card_width + 12) * 2 : (card_width + 12) * 2;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const loadOlder = async () => {
    setLoadingMore(true);
    try {
      const limit = container.post_limit || 10;
      const url = new URL(`${API_URL}/api/community-v2/feed/public/recent`);
      url.searchParams.set('limit', limit);
      if (channel_id) url.searchParams.set('channel_id', channel_id);

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const existingIds = new Set(posts.map(p => p.telegram_msg_id));
        const newPosts = (data.posts || []).filter(p => !existingIds.has(p.telegram_msg_id));
        if (newPosts.length > 0) {
          setPosts(prev => [...prev, ...newPosts]);
        }
        setHasMore(newPosts.length > 0);
      }
    } catch {
      /* ignore */
    }
    setLoadingMore(false);
  };

  return (
    <div
      className="rounded-none sm:rounded-2xl overflow-hidden"
      style={{ background: bg_color, border: '1px solid rgba(0,0,0,0.06)' }}
      data-testid={`telegram-feed-card${container_id ? `-${container_id}` : ''}`}
    >
      {/* Autoplay progress bar */}
      <style>{`
        @keyframes feedAutoplayProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
      {isAutoplay && posts.length > 1 && (
        <div className="h-[2px] w-full bg-transparent relative overflow-hidden">
          <div
            ref={progressRef}
            className="h-full absolute left-0 top-0"
            style={{ background: accent_color, opacity: isPaused ? 0.3 : 0.6 }}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
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
        <div className="flex items-center gap-2">
          {/* Autoplay toggle - hidden by default, admin-configurable */}
          {show_autoplay_btn && posts.length > 1 && (
            <button
              onClick={toggleAutoplay}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold transition-colors"
              style={{
                background: isAutoplay ? `${accent_color}12` : 'rgba(0,0,0,0.04)',
                color: isAutoplay ? accent_color : '#b8956a',
              }}
              data-testid="autoplay-toggle-btn"
              title={isAutoplay ? t('telegramFeed.autoplayOn', 'Autoplay on') : t('telegramFeed.autoplayOff', 'Autoplay off')}
            >
              {isAutoplay ? (
                <><Play className="h-2.5 w-2.5 fill-current" /> Auto</>
              ) : (
                <><Pause className="h-2.5 w-2.5" /> Off</>
              )}
            </button>
          )}
          {/* Admin-configurable link buttons */}
          {header_links.length > 0 && header_links.map((link, idx) => {
            const isExternal = link.url?.startsWith('http');
            return (
              <button
                key={idx}
                onClick={() => isExternal ? window.open(link.url, '_blank') : navigate(link.url)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold transition-all hover:opacity-80"
                style={{ background: `${accent_color}10`, color: accent_color }}
                data-testid={`header-link-${idx}`}
              >
                {isExternal ? <ExternalLink className="h-2.5 w-2.5" /> : <Link2 className="h-2.5 w-2.5" />}
                {link.label}
              </button>
            );
          })}
          {/* See all - hidden by default, admin-configurable */}
          {show_see_all_btn && (
            <button
              onClick={() => navigate(cta_link)}
              className="text-[10px] font-bold flex items-center gap-0.5 transition-all hover:gap-1.5"
              style={{ color: accent_color }}
              data-testid="telegram-see-all"
            >
              {t('telegramFeed.seeAll', 'See all')} <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Scroll Area */}
      <div
        className="relative group/scroll"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center opacity-0 group-hover/scroll:opacity-100 transition-opacity"
            data-testid="scroll-left-btn"
          >
            <ChevronLeft className="h-4 w-4 text-neutral-700" />
          </button>
        )}

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center opacity-0 group-hover/scroll:opacity-100 transition-opacity"
            data-testid="scroll-right-btn"
          >
            <ChevronRight className="h-4 w-4 text-neutral-700" />
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto px-4 pb-4 pt-1 scroll-smooth snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          data-testid="horizontal-scroll-area"
        >
          <style>{`[data-testid="horizontal-scroll-area"]::-webkit-scrollbar { display: none; }`}</style>

          {posts.length === 0 ? (
            <div className="flex items-center justify-center w-full py-8">
              <div className="text-center">
                <ImageIcon className="h-8 w-8 mx-auto mb-2" style={{ color: '#d4c5b0' }} />
                <p className="text-xs" style={{ color: '#b8956a' }}>{t('telegramFeed.noPosts', 'No posts yet')}</p>
              </div>
            </div>
          ) : (
            <>
              {posts.map(post => (
                <HorizontalPostCard
                  key={post.telegram_msg_id}
                  post={post}
                  cardWidth={card_width}
                  cardHeight={card_height}
                  maxLines={description_max_lines}
                  onOpenDetail={setDetailPost}
                  onOpenGallery={onOpenGallery}
                />
              ))}

              {/* Load older button */}
              {hasMore && (
                <div
                  className="flex-shrink-0 snap-start rounded-xl flex items-center justify-center cursor-pointer transition-colors hover:bg-neutral-50"
                  style={{
                    width: Math.round(card_width * 0.5),
                    height: imageHeight + 60,
                    border: '1px dashed rgba(0,0,0,0.12)',
                  }}
                  onClick={loadOlder}
                  data-testid="load-older-btn"
                >
                  {loadingMore ? (
                    <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#b8956a' }} />
                  ) : (
                    <div className="text-center px-2">
                      <ChevronDown className="h-5 w-5 mx-auto mb-1" style={{ color: '#b8956a' }} />
                      <span className="text-[10px] font-bold" style={{ color: '#8B6914' }}>
                        {t('telegramFeed.loadOlder', 'Load older')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {detailPost && (
        <PostDetailModal
          post={detailPost}
          onClose={() => setDetailPost(null)}
        />
      )}
    </div>
  );
}

/* ────────── Vertical Feed (Legacy) ────────── */

function PostRow({ post, onVideoPlay, onOpenGallery }) {
  const media = post.media || [];
  const firstMedia = media[0] || null;
  const thumbSrc = firstMedia?.type === 'photo'
    ? mediaUrl(firstMedia.file_id)
    : firstMedia?.thumb_file_id ? mediaUrl(firstMedia.thumb_file_id) : null;
  const isPlayable = firstMedia?.type === 'video' || firstMedia?.type === 'animation';

  return (
    <div
      className="flex gap-3 items-start py-3 border-b last:border-b-0"
      style={{ borderColor: 'rgba(0,0,0,0.06)' }}
      data-testid={`telegram-post-${post.telegram_msg_id}`}
    >
      {thumbSrc ? (
        <div className="relative w-[72px] h-[72px] rounded-lg overflow-hidden flex-shrink-0 cursor-pointer" onClick={() => onOpenGallery(media, 0, post.text)}>
          <img src={thumbSrc} alt="" className="w-full h-full object-cover" loading="lazy" />
          {isPlayable && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <Play className="h-5 w-5 text-white fill-white" />
            </div>
          )}
        </div>
      ) : (
        <div className="w-[72px] h-[72px] rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: '#f5ede0' }}>
          <MessageCircle className="h-5 w-5" style={{ color: '#c4b5a0' }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug line-clamp-2" style={{ color: '#2d2217' }}>
          {post.text || fallbackText(media)}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[10px]" style={{ color: '#b8956a' }}>{formatTimeAgo(post.date)}</span>
          {post.likes_count > 0 && (
            <span className="text-[10px] flex items-center gap-0.5" style={{ color: '#b8956a' }}>
              <Heart className="h-2.5 w-2.5" /> {post.likes_count}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function VerticalFeedContainer({ container, onOpenGallery }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    title = 'Community Channel',
    subtitle = 'Latest updates',
    posts = [],
    total_posts = 0,
    bg_color = '#ffffff',
    accent_color = '#0088cc',
    header_bg = '#E8F4FE',
    icon_color = '#0088cc',
    show_footer = true,
    cta_text = 'Open Community Feed',
    cta_link = '/comunidad',
    show_post_count = true,
    container_id,
  } = container;

  return (
    <div
      className="rounded-none sm:rounded-2xl overflow-hidden shadow-sm"
      style={{ background: bg_color, border: '1px solid rgba(0,0,0,0.06)' }}
      data-testid={`telegram-feed-card${container_id ? `-${container_id}` : ''}`}
    >
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
          {t('telegramFeed.seeAll', 'See all')} <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <div className="px-4 pb-3">
        {posts.length === 0 ? (
          <div className="py-8 text-center">
            <ImageIcon className="h-8 w-8 mx-auto mb-2" style={{ color: '#d4c5b0' }} />
            <p className="text-xs" style={{ color: '#b8956a' }}>{t('telegramFeed.noPosts', 'No posts yet')}</p>
          </div>
        ) : (
          posts.map(post => (
            <PostRow
              key={post.telegram_msg_id}
              post={post}
              onVideoPlay={(fileId, caption) => onOpenGallery([{ type: 'video', file_id: fileId }], 0, caption)}
              onOpenGallery={(media, idx, caption) => onOpenGallery(media, idx, caption)}
            />
          ))
        )}
      </div>
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

/* ────────── Main Export ────────── */

export default function TelegramFeedCard() {
  const [containers, setContainers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [galleryModal, setGalleryModal] = useState(null);

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

  const openGallery = (media, startIndex, caption) => {
    setGalleryModal({ media, startIndex, caption });
  };

  return (
    <>
      <div className="space-y-4" data-testid="telegram-feed-section">
        {containers.map((container, idx) => {
          const layoutMode = container.layout_mode || 'horizontal';
          if (layoutMode === 'vertical') {
            return (
              <VerticalFeedContainer
                key={container.container_id || idx}
                container={container}
                onOpenGallery={openGallery}
              />
            );
          }
          return (
            <HorizontalFeedContainer
              key={container.container_id || idx}
              container={container}
              onOpenGallery={openGallery}
            />
          );
        })}
      </div>

      {galleryModal && (
        <MediaGalleryModal
          media={galleryModal.media}
          startIndex={galleryModal.startIndex}
          caption={galleryModal.caption}
          onClose={() => setGalleryModal(null)}
        />
      )}
    </>
  );
}
