/**
 * MediaPlayer — Auto-playing photo/video slideshow with smart layout
 *
 * Admin-configurable: dots, shuffle, swipe lock, video handling, fit mode
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
  dot_style: 'auto',
  shuffle: false,
  disable_swipe: false,
  video_autoplay: true,
  video_max_duration_ms: 30000,
  fit_mode: 'smart',
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

/* Detect portrait/landscape for each image URL */
function useImageOrientations(items) {
  const [ori, setOri] = useState({});
  const imageUrls = useMemo(() => (items || []).filter(it => it.type === 'image').map(it => it.url), [items]);
  const allLoaded = imageUrls.length > 0 && imageUrls.every(u => ori[u] !== undefined);

  useEffect(() => {
    if (!imageUrls.length) return;
    imageUrls.forEach(url => {
      if (ori[url] !== undefined) return;
      const img = new window.Image();
      img.onload = () => setOri(p => ({ ...p, [url]: img.naturalHeight > img.naturalWidth ? 'portrait' : 'landscape' }));
      img.onerror = () => setOri(p => ({ ...p, [url]: 'landscape' }));
      img.src = url;
    });
  }, [imageUrls]);
  return { orientations: ori, allLoaded };
}

/* In smart mode, collect ALL portrait images and pair them, then interleave with others */
function buildSlides(items, orientations, fitMode) {
  if (fitMode !== 'smart' || !items.length) return items.map(it => ({ kind: 'single', items: [it] }));

  // Separate portraits from non-portraits
  const portraits = [];
  const others = [];
  items.forEach(it => {
    if (it.type === 'image' && orientations[it.url] === 'portrait') portraits.push(it);
    else others.push(it);
  });

  // Pair all portrait images (regardless of original position)
  const pairedSlides = [];
  for (let i = 0; i + 1 < portraits.length; i += 2) {
    pairedSlides.push({ kind: 'pair', items: [portraits[i], portraits[i + 1]] });
  }
  if (portraits.length % 2 === 1) {
    pairedSlides.push({ kind: 'single', items: [portraits[portraits.length - 1]] });
  }

  // Non-portrait items as single slides
  const otherSlides = others.map(it => ({ kind: 'single', items: [it] }));

  // Interleave: distribute portrait pairs evenly among other slides
  if (!pairedSlides.length) return otherSlides;
  if (!otherSlides.length) return pairedSlides;

  const result = [];
  const step = Math.max(1, Math.floor(otherSlides.length / pairedSlides.length));
  let pi = 0;
  for (let i = 0; i < otherSlides.length; i++) {
    result.push(otherSlides[i]);
    if ((i + 1) % step === 0 && pi < pairedSlides.length) result.push(pairedSlides[pi++]);
  }
  while (pi < pairedSlides.length) result.push(pairedSlides[pi++]);

  return result;
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

  /* Fetch config */
  useEffect(() => {
    fetch(`${API_URL}/api/showcase/media-player`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.items?.length > 0) setConfig({ ...DEFAULT_CONFIG, ...data });
        else setConfig(DEFAULT_CONFIG);
        setLoaded(true);
      })
      .catch(() => { setConfig(DEFAULT_CONFIG); setLoaded(true); });
  }, []);

  const items = useMemo(() => {
    const raw = config?.items || [];
    if (!raw.length) return raw;
    return config?.shuffle ? shuffleArray(raw) : raw;
  }, [config?.items, config?.shuffle]);

  const intervalMs    = config?.interval_ms || 5000;
  const showDots      = config?.show_dots !== false;
  const dotStyle      = config?.dot_style || 'auto';
  const videoAutoplay = config?.video_autoplay !== false;
  const videoMaxMs    = config?.video_max_duration_ms || 30000;
  const disableSwipe  = config?.disable_swipe === true;
  const fitMode       = config?.fit_mode || 'cover';

  const orientations = useImageOrientations(fitMode === 'smart' ? items : []);
  const slides = useMemo(() => buildSlides(items, orientations, fitMode), [items, orientations, fitMode]);

  const effectiveDotStyle = useMemo(() => {
    if (!showDots || dotStyle === 'none') return 'none';
    if (dotStyle === 'auto') return slides.length > 10 ? 'progress_bar' : 'dots';
    return dotStyle;
  }, [showDots, dotStyle, slides.length]);

  const slide   = slides[current] || slides[0];
  const isVideo = slide?.items?.[0]?.type === 'video';
  const first   = slide?.items?.[0];

  /* Auto-advance (images only — videos advance via onEnded or safety timer) */
  useEffect(() => {
    if (!loaded || slides.length <= 1 || !playing) return;
    if (isVideo && videoAutoplay && !videoError) return;
    timerRef.current = setTimeout(() => {
      slideDir.current = 1; setSlideKey(k => k + 1);
      setCurrent(p => (p + 1) % slides.length);
    }, intervalMs);
    return () => clearTimeout(timerRef.current);
  }, [current, loaded, slides.length, intervalMs, playing, isVideo, videoAutoplay, videoError]);

  /* Video safety timer */
  useEffect(() => {
    if (!loaded || !isVideo || !videoAutoplay) return;
    clearTimeout(videoTimerRef.current);
    videoTimerRef.current = setTimeout(() => {
      slideDir.current = 1; setSlideKey(k => k + 1);
      setCurrent(p => (p + 1) % slides.length);
    }, videoMaxMs);
    return () => clearTimeout(videoTimerRef.current);
  }, [current, loaded, isVideo, videoAutoplay, videoMaxMs, slides.length]);

  const goTo = useCallback((dir) => {
    if (disableSwipe) return;
    clearTimeout(timerRef.current); clearTimeout(videoTimerRef.current);
    slideDir.current = dir; setSlideKey(k => k + 1); setVideoError(false);
    setCurrent(p => (p + dir + slides.length) % slides.length);
  }, [slides.length, disableSwipe]);

  /* Touch swipe — disabled when disable_swipe is on */
  const touchX = useRef(null);
  const onTouchStart = useCallback(e => { if (!disableSwipe) touchX.current = e.touches[0].clientX; }, [disableSwipe]);
  const onTouchEnd = useCallback(e => {
    if (disableSwipe || touchX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(diff) > 50) goTo(diff < 0 ? 1 : -1);
    touchX.current = null;
  }, [goTo, disableSwipe]);

  const handleVideoEnd = useCallback(() => {
    clearTimeout(videoTimerRef.current);
    if (slides.length > 1) { slideDir.current = 1; setSlideKey(k => k + 1); setCurrent(p => (p + 1) % slides.length); }
  }, [slides.length]);

  const handleVideoError = useCallback(() => {
    setVideoError(true);
    setTimeout(() => {
      if (slides.length > 1) { slideDir.current = 1; setSlideKey(k => k + 1); setCurrent(p => (p + 1) % slides.length); }
    }, 2000);
  }, [slides.length]);

  /* Called when video data is ready — triggers play with muted=true for autoplay policy */
  const handleVideoReady = useCallback(() => {
    const v = videoRef.current;
    if (!v || !playing || !videoAutoplay) return;
    v.muted = true;
    const p = v.play();
    if (p?.catch) p.catch(() => { if (v) { v.muted = true; v.play().catch(() => setVideoError(true)); } });
  }, [playing, videoAutoplay]);

  useEffect(() => { if (videoRef.current) videoRef.current.muted = muted; }, [muted]);
  useEffect(() => { setVideoError(false); }, [current]);

  /* Parallax */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const fn = () => {
      const r = el.getBoundingClientRect();
      setParallaxY(((r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight) * -20);
    };
    window.addEventListener('scroll', fn, { passive: true }); fn();
    return () => window.removeEventListener('scroll', fn);
  }, [loaded]);

  if (!loaded || slides.length === 0) return null;

  const imgObjFit = fitMode === 'contain' ? 'object-contain' : (fitMode === 'smart' ? 'object-contain' : 'object-cover');
  const needBlurBg = fitMode !== 'cover';

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-none sm:rounded-2xl overflow-hidden bg-black group"
      style={{ aspectRatio: '16/9' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      data-testid="media-player"
    >
      {/* Slide content */}
      <div key={slideKey} className="absolute inset-0" style={{ animation: `mp-slide-${slideDir.current > 0 ? 'l' : 'r'} .35s ease-out` }}>
        {isVideo ? (
          <>
            <video
              ref={videoRef}
              key={first.url}
              src={first.url}
              muted
              playsInline
              preload="auto"
              loop={slides.length === 1}
              onLoadedData={handleVideoReady}
              onCanPlay={handleVideoReady}
              onEnded={handleVideoEnd}
              onError={handleVideoError}
              className="w-full h-full object-cover"
              data-testid="media-video"
            />
            {videoError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <p className="text-white/70 text-xs">Video unavailable — skipping...</p>
              </div>
            )}
          </>
        ) : slide?.kind === 'pair' ? (
          <div className="absolute inset-0 flex" data-testid="media-pair">
            {slide.items.map((img, idx) => (
              <div key={idx} className="relative flex-1 overflow-hidden">
                <div className="absolute inset-0 scale-110 blur-xl opacity-40" style={{ backgroundImage: `url(${img.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <img src={img.url} alt={img.caption || ''} className="relative w-full h-full object-contain mp-fade" />
                {idx === 0 && <div className="absolute right-0 top-0 bottom-0 w-px bg-white/10" />}
              </div>
            ))}
          </div>
        ) : (
          <>
            {needBlurBg && <div className="absolute inset-0 scale-110 blur-xl opacity-30" style={{ backgroundImage: `url(${first.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
            <img key={first.url} src={first.url} alt={first.caption || ''} className={`relative w-full h-full ${imgObjFit} mp-fade`} data-testid="media-image" />
          </>
        )}
      </div>

      {/* Gradient for controls */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Caption */}
      {first?.caption && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent" style={{ transform: `translateY(${parallaxY * .5}px)` }}>
          <p className="text-white text-xs sm:text-sm font-bold" data-testid="media-caption">
            {first.caption}
            {slide?.kind === 'pair' && slide.items[1]?.caption && <span className="text-white/60 ml-2">| {slide.items[1].caption}</span>}
          </p>
        </div>
      )}

      {/* Controls */}
      {config?.show_controls && (
        <div className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ transform: `translateY(${parallaxY * .3}px)` }}>
          <div className="flex items-center gap-2">
            <button onClick={() => setPlaying(!playing)} className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition" data-testid="media-play-pause">
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            {isVideo && (
              <button onClick={() => setMuted(!muted)} className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition" data-testid="media-mute">
                {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
          {slides.length > 1 && !disableSwipe && (
            <div className="flex items-center gap-1.5">
              <button onClick={() => goTo(-1)} className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition" data-testid="media-prev"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-white text-[10px] font-bold min-w-[32px] text-center">{current + 1}/{slides.length}</span>
              <button onClick={() => goTo(1)} className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition" data-testid="media-next"><ChevronRight className="h-4 w-4" /></button>
            </div>
          )}
        </div>
      )}

      {/* Dots / Progress */}
      {slides.length > 1 && effectiveDotStyle !== 'none' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2" style={{ transform: `translateX(-50%) translateY(${parallaxY * -.4}px)` }}>
          {effectiveDotStyle === 'dots' && (
            <div className="flex gap-1">
              {slides.map((_, i) => (
                <button key={i} onClick={() => { if (!disableSwipe) { setVideoError(false); setCurrent(i); setSlideKey(k => k + 1); } }}
                  className={`rounded-full transition-all duration-300 ${i === current ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'} ${disableSwipe ? 'pointer-events-none' : ''}`}
                  data-testid={`media-dot-${i}`} />
              ))}
            </div>
          )}
          {effectiveDotStyle === 'progress_bar' && (
            <div className="w-32 sm:w-48 h-1 rounded-full bg-white/20 overflow-hidden" data-testid="media-progress-bar">
              <div className="h-full rounded-full bg-white transition-all duration-300" style={{ width: `${((current + 1) / slides.length) * 100}%` }} />
            </div>
          )}
          {effectiveDotStyle === 'counter' && (
            <div className="px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm" data-testid="media-counter">
              <span className="text-white text-[10px] font-bold">{current + 1} / {slides.length}</span>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes mp-fade { from { opacity:0; transform:scale(1.02) } to { opacity:1; transform:scale(1) } }
        .mp-fade { animation: mp-fade .6s ease-out; }
        @keyframes mp-slide-l { from { opacity:0; transform:translateX(30px) } to { opacity:1; transform:translateX(0) } }
        @keyframes mp-slide-r { from { opacity:0; transform:translateX(-30px) } to { opacity:1; transform:translateX(0) } }
      `}</style>
    </div>
  );
}
