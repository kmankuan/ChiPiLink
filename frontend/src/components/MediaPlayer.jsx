/**
 * MediaPlayer — Auto-playing photo/video slideshow
 * Displays media items from Google Photos albums or manual URLs.
 * Images cycle with smooth transitions, videos autoplay muted.
 * Hero-sized card with rounded corners and responsive design.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, Volume2, VolumeX, Maximize, Image } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function MediaPlayer() {
  const [config, setConfig] = useState(null);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const videoRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    fetch(`${API_URL}/api/showcase/media-player`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.items && data.items.length > 0) {
          setConfig(data);
          setLoaded(true);
        }
      })
      .catch(() => {});
  }, []);

  const items = config?.items || [];
  const intervalMs = config?.interval_ms || 5000;

  // Auto-advance for images
  useEffect(() => {
    if (!loaded || items.length <= 1 || !playing) return;
    const item = items[current];
    if (item?.type === 'video') return; // videos advance on ended

    timerRef.current = setTimeout(() => {
      setCurrent(prev => (prev + 1) % items.length);
    }, intervalMs);

    return () => clearTimeout(timerRef.current);
  }, [current, loaded, items, intervalMs, playing]);

  const goTo = useCallback((dir) => {
    clearTimeout(timerRef.current);
    setCurrent(prev => (prev + dir + items.length) % items.length);
  }, [items.length]);

  const handleVideoEnd = useCallback(() => {
    if (items.length > 1) {
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

  if (!loaded || items.length === 0) return null;

  const item = items[current];

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden bg-black/5 group"
      style={{ aspectRatio: '16/9' }}
      data-testid="media-player"
    >
      {/* Media content */}
      <div className="absolute inset-0">
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

      {/* Caption */}
      {item.caption && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
          <p className="text-white text-xs sm:text-sm font-bold tracking-tight" data-testid="media-caption">
            {item.caption}
          </p>
        </div>
      )}

      {/* Controls — show on hover */}
      {config?.show_controls && (
        <div className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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

      {/* Progress dots */}
      {items.length > 1 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1">
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
      `}</style>
    </div>
  );
}
