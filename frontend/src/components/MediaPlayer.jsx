/**
 * MediaPlayer — Auto-playing photo/video slideshow
 * Displays media items from Google Photos albums or manual URLs.
 * Images cycle with smooth transitions, videos autoplay muted.
 * Hero-sized card with rounded corners and responsive design.
 *
 * Admin-configurable: dots, shuffle, video handling, interval, etc.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, Volume2, VolumeX, Image } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DEFAULT_CONFIG = {
  autoplay: true,
  interval_ms: 5000,
  loop: true,
  show_controls: true,
  show_dots: true,
  dot_style: 'auto',   // 'auto' | 'dots' | 'progress_bar' | 'counter' | 'none'
  shuffle: false,
  video_autoplay: true,
  video_max_duration_ms: 30000, // max time to show a video before advancing
  items: [],
};

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MediaPlayer() {
  const [config, setConfig] = useState(null);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const videoTimerRef = useRef(null);
  const slideDir = useRef(1);
  const [slideKey, setSlideKey] = useState(0);
  const containerRef = useRef(null);
  const [parallaxY, setParallaxY] = useState(0);

  useEffect(() => {
    fetch(`${API_URL}/api/showcase/media-player`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.items && data.items.length > 0) {
          setConfig({ ...DEFAULT_CONFIG, ...data });
        } else {
          setConfig(DEFAULT_CONFIG);
        }
        setLoaded(true);
      })
      .catch(() => {
        setConfig(DEFAULT_CONFIG);
        setLoaded(true);
      });
  }, []);

  // Shuffled items (memoized, only shuffle once on load)
  const items = useMemo(() => {
    const raw = config?.items || [];
    if (!raw.length) return raw;
    if (config?.shuffle) return shuffleArray(raw);
    return raw;
  }, [config?.items, config?.shuffle]);

  const intervalMs = config?.interval_ms || 5000;
  const showDots = config?.show_dots !== false;
  const dotStyle = config?.dot_style || 'auto';
  const videoAutoplay = config?.video_autoplay !== false;
  const videoMaxMs = config?.video_max_duration_ms || 30000;

  // Resolve dot display mode
  const effectiveDotStyle = useMemo(() => {
    if (!showDots || dotStyle === 'none') return 'none';
    if (dotStyle === 'auto') return items.length > 10 ? 'progress_bar' : 'dots';
    return dotStyle;
  }, [showDots, dotStyle, items.length]);

  // Auto-advance for images
  useEffect(() => {
    if (!loaded || items.length <= 1 || !playing) return;
    const item = items[current];
    if (item?.type === 'video' && videoAutoplay && !videoError) return; // videos advance on ended or max timer

    timerRef.current = setTimeout(() => {
      slideDir.current = 1;
      setSlideKey(k => k + 1);
      setCurrent(prev => (prev + 1) % items.length);
    }, intervalMs);

    return () => clearTimeout(timerRef.current);
  }, [current, loaded, items, intervalMs, playing, videoAutoplay, videoError]);

  // Video max duration safety timer
  useEffect(() => {
    if (!loaded || items.length === 0) return;
    const item = items[current];
    if (item?.type !== 'video' || !videoAutoplay) return;

    clearTimeout(videoTimerRef.current);
    videoTimerRef.current = setTimeout(() => {
      // Force advance if video runs too long
      slideDir.current = 1;
      setSlideKey(k => k + 1);
      setCurrent(prev => (prev + 1) % items.length);
    }, videoMaxMs);

    return () => clearTimeout(videoTimerRef.current);
  }, [current, loaded, items, videoAutoplay, videoMaxMs]);

  const goTo = useCallback((dir) => {
    clearTimeout(timerRef.current);
    clearTimeout(videoTimerRef.current);
    slideDir.current = dir;
    setSlideKey(k => k + 1);
    setVideoError(false);
    setCurrent(prev => (prev + dir + items.length) % items.length);
  }, [items.length]);

  // Touch-swipe support
  const touchStartX = useRef(null);
  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) goTo(diff < 0 ? 1 : -1);
    touchStartX.current = null;
  }, [goTo]);

  const handleVideoEnd = useCallback(() => {
    clearTimeout(videoTimerRef.current);
    if (items.length > 1) {
      slideDir.current = 1;
      setSlideKey(k => k + 1);
      setCurrent(prev => (prev + 1) % items.length);
    }
  }, [items.length]);

  const handleVideoError = useCallback(() => {
    setVideoError(true);
    // Skip to next after a brief delay
    setTimeout(() => {
      if (items.length > 1) {
        slideDir.current = 1;
        setSlideKey(k => k + 1);
        setCurrent(prev => (prev + 1) % items.length);
      }
    }, 2000);
  }, [items.length]);

  // Sync video element
  useEffect(() => {
    setVideoError(false);
    if (videoRef.current) {
      videoRef.current.muted = muted;
      if (playing && videoAutoplay) {
        videoRef.current.play().catch(() => setVideoError(true));
      } else {
        videoRef.current.pause();
      }
    }
  }, [current, muted, playing, videoAutoplay]);

  // Parallax scroll effect
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      const viewH = window.innerHeight;
      const center = rect.top + rect.height / 2;
      const offset = (center - viewH / 2) / viewH;
      setParallaxY(offset * -20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loaded]);

  if (!loaded || items.length === 0) return null;

  const item = items[current];

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-none sm:rounded-2xl overflow-hidden bg-black/5 group"
      style={{ aspectRatio: '16/9' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      data-testid="media-player"
    >
      {/* Media content */}
      <div
        key={slideKey}
        className="absolute inset-0"
        style={{ animation: `media-slide-${slideDir.current > 0 ? 'left' : 'right'} 0.35s cubic-bezier(0.25,0.46,0.45,0.94)` }}
      >
        {item.type === 'video' ? (
          <video
            ref={videoRef}
            key={item.url}
            src={item.url}
            autoPlay={videoAutoplay}
            muted={muted}
            playsInline
            loop={items.length === 1}
            onEnded={handleVideoEnd}
            onError={handleVideoError}
            className="w-full h-full object-cover"
            data-testid="media-video"
          />
        ) : (
          <img
            key={item.url}
            src={item.url}
            alt={item.caption || 'Media'}
            className="w-full h-full object-cover animate-fade-in"
            data-testid="media-image"
          />
        )}
        {/* Video error overlay */}
        {item.type === 'video' && videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <p className="text-white/70 text-xs">Video unavailable — skipping...</p>
          </div>
        )}
      </div>

      {/* Gradient overlay for controls */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Caption — with parallax */}
      {item.caption && (
        <div
          className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent transition-transform duration-100"
          style={{ transform: `translateY(${parallaxY * 0.5}px)` }}
        >
          <p className="text-white text-xs sm:text-sm font-bold tracking-tight" data-testid="media-caption">
            {item.caption}
          </p>
        </div>
      )}

      {/* Controls — show on hover/touch */}
      {config?.show_controls && (
        <div
          className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ transform: `translateY(${parallaxY * 0.3}px)` }}
        >
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button
              onClick={() => setPlaying(!playing)}
              className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition"
              data-testid="media-play-pause"
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            {/* Mute toggle for videos */}
            {item.type === 'video' && (
              <button
                onClick={() => setMuted(!muted)}
                className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition"
                data-testid="media-mute"
              >
                {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>

          {/* Nav arrows */}
          {items.length > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => goTo(-1)}
                className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition"
                data-testid="media-prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-white text-[10px] font-bold min-w-[32px] text-center">
                {current + 1}/{items.length}
              </span>
              <button
                onClick={() => goTo(1)}
                className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition"
                data-testid="media-next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Dots / Progress Indicator */}
      {items.length > 1 && effectiveDotStyle !== 'none' && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 transition-transform duration-100"
          style={{ transform: `translateX(-50%) translateY(${parallaxY * -0.4}px)` }}
        >
          {effectiveDotStyle === 'dots' && (
            <div className="flex gap-1">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setVideoError(false); setCurrent(i); setSlideKey(k => k + 1); }}
                  className={`rounded-full transition-all duration-300 ${
                    i === current ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'
                  }`}
                  data-testid={`media-dot-${i}`}
                />
              ))}
            </div>
          )}
          {effectiveDotStyle === 'progress_bar' && (
            <div className="w-32 sm:w-48 h-1 rounded-full bg-white/20 overflow-hidden" data-testid="media-progress-bar">
              <div
                className="h-full rounded-full bg-white transition-all duration-300"
                style={{ width: `${((current + 1) / items.length) * 100}%` }}
              />
            </div>
          )}
          {effectiveDotStyle === 'counter' && (
            <div className="px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm" data-testid="media-counter">
              <span className="text-white text-[10px] font-bold">
                {current + 1} / {items.length}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
          <Image className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-xs opacity-50">No media added yet</p>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(1.02); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.6s ease-out; }
        @keyframes media-slide-left {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes media-slide-right {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
