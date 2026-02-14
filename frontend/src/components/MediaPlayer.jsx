/**
 * MediaPlayer — Auto-playing photo/video slideshow
 * Displays media items from Google Photos albums or manual URLs.
 * Images cycle with smooth transitions, videos autoplay muted.
 * Hero-sized card with rounded corners and responsive design.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, Volume2, VolumeX, Maximize, Image } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DEFAULT_MEDIA_ITEMS = [
  {
    item_id: 'default_1',
    type: 'image',
    url: 'https://static.prod-images.emergentagent.com/jobs/4a122f12-33f9-4f93-9123-84c6a2cb3907/images/5040d9d6499bad13e30dd00fe426cdce65332c563ef20104137ceb126b095e4b.png',
    caption: 'PinPanClub Training Day',
  },
  {
    item_id: 'default_2',
    type: 'image',
    url: 'https://static.prod-images.emergentagent.com/jobs/4a122f12-33f9-4f93-9123-84c6a2cb3907/images/3eaf9b70f2c8a242db6fd32a793b16c215104f30755b70c8b63aa38dd331f753.png',
    caption: 'Kids Learning Together',
  },
  {
    item_id: 'default_3',
    type: 'image',
    url: 'https://static.prod-images.emergentagent.com/jobs/4a122f12-33f9-4f93-9123-84c6a2cb3907/images/535181b7a5a2144892c75ca15c73f9320f5739017de399d05ced0e60170f39e7.png',
    caption: 'Chinese-Panamanian Heritage',
  },
  {
    item_id: 'default_4',
    type: 'image',
    url: 'https://static.prod-images.emergentagent.com/jobs/4a122f12-33f9-4f93-9123-84c6a2cb3907/images/0416cce781984810906e615303474bfe2089c65f53db816a6bf448f34cbd3bda.png',
    caption: 'Community Gathering',
  },
];

const DEFAULT_CONFIG = {
  autoplay: true,
  interval_ms: 5000,
  loop: true,
  show_controls: true,
  items: DEFAULT_MEDIA_ITEMS,
};

export default function MediaPlayer() {
  const [config, setConfig] = useState(null);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const slideDir = useRef(1);
  const [slideKey, setSlideKey] = useState(0);
  const containerRef = useRef(null);
  const [parallaxY, setParallaxY] = useState(0);

  useEffect(() => {
    fetch(`${API_URL}/api/showcase/media-player`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.items && data.items.length > 0) {
          setConfig(data);
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

  const items = config?.items || [];
  const intervalMs = config?.interval_ms || 5000;

  // Auto-advance for images
  useEffect(() => {
    if (!loaded || items.length <= 1 || !playing) return;
    const item = items[current];
    if (item?.type === 'video') return; // videos advance on ended

    timerRef.current = setTimeout(() => {
      slideDir.current = 1;
      setSlideKey(k => k + 1);
      setCurrent(prev => (prev + 1) % items.length);
    }, intervalMs);

    return () => clearTimeout(timerRef.current);
  }, [current, loaded, items, intervalMs, playing]);

  const goTo = useCallback((dir) => {
    clearTimeout(timerRef.current);
    slideDir.current = dir;
    setSlideKey(k => k + 1);
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
    if (items.length > 1) {
      slideDir.current = 1;
      setSlideKey(k => k + 1);
      setCurrent(prev => (prev + 1) % items.length);
    }
  }, [items.length]);

  // Sync video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
      if (playing) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [current, muted, playing]);

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
      className="relative w-full rounded-2xl overflow-hidden bg-black/5 group"
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
            autoPlay
            muted={muted}
            playsInline
            loop={items.length === 1}
            onEnded={handleVideoEnd}
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

      {/* Controls — show on hover, with parallax */}
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

      {/* Progress dots — with parallax */}
      {items.length > 1 && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1 transition-transform duration-100"
          style={{ transform: `translateX(-50%) translateY(${parallaxY * -0.4}px)` }}
        >
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current ? 'w-5 h-1 bg-white' : 'w-1 h-1 bg-white/40'
              }`}
            />
          ))}
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
