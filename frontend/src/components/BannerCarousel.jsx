/**
 * BannerCarousel — Rotating ad/banner container
 * Supports two types:
 * 1. Image banners: image with optional overlay text and click link
 * 2. Text banners: Facebook-style colored text cards with rich content
 * Auto-rotates, responsive, admin-configurable.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FONT_SIZES = { sm: 'text-sm', md: 'text-base', lg: 'text-lg', xl: 'text-xl' };

const DEFAULT_BANNERS = [
  {
    banner_id: 'default_1',
    type: 'text',
    text: 'Welcome to ChiPi Link Community! Join us for weekend tournaments.',
    bg_color: '#C8102E',
    bg_gradient: 'linear-gradient(135deg, #C8102E 0%, #8B0000 100%)',
    text_color: '#ffffff',
    font_size: 'lg',
    link_url: '/comunidad',
  },
  {
    banner_id: 'default_2',
    type: 'image',
    image_url: 'https://static.prod-images.emergentagent.com/jobs/4a122f12-33f9-4f93-9123-84c6a2cb3907/images/5040d9d6499bad13e30dd00fe426cdce65332c563ef20104137ceb126b095e4b.png',
    link_url: '/pinpanclub',
    overlay_text: 'PinPanClub — New Season Starting!',
  },
  {
    banner_id: 'default_3',
    type: 'text',
    text: 'Chinese New Year Festival — Special menu & cultural activities for the whole family.',
    bg_color: '#d97706',
    bg_gradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    text_color: '#ffffff',
    font_size: 'lg',
    link_url: '/eventos',
  },
];

export default function BannerCarousel() {
  const [banners, setBanners] = useState([]);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const slideDir = useRef(1);
  const [slideKey, setSlideKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_URL}/api/showcase/banners`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setBanners(data.length > 0 ? data : DEFAULT_BANNERS))
      .catch(() => setBanners(DEFAULT_BANNERS));
  }, []);

  const activeBanners = banners.length > 0 ? banners : DEFAULT_BANNERS;

  // Auto-rotate
  useEffect(() => {
    if (activeBanners.length <= 1 || paused) return;
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % activeBanners.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [activeBanners.length, paused]);

  const go = useCallback((dir) => {
    slideDir.current = dir;
    setSlideKey(k => k + 1);
    setCurrent(prev => (prev + dir + activeBanners.length) % activeBanners.length);
  }, [activeBanners.length]);

  // Touch-swipe support
  const touchStartX = useRef(null);
  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) go(diff < 0 ? 1 : -1);
    touchStartX.current = null;
  }, [go]);

  const banner = activeBanners[current];

  return (
    <div
      className="group relative w-full overflow-hidden rounded-2xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      data-testid="banner-carousel"
      style={{ minHeight: '80px' }}
    >
      {/* Banner content */}
      <div
        key={slideKey}
        className="relative"
        style={{ animation: `banner-slide-${slideDir.current > 0 ? 'left' : 'right'} 0.35s cubic-bezier(0.25,0.46,0.45,0.94)` }}
      >
        {banner.type === 'image' ? (
          <ImageBanner banner={banner} navigate={navigate} />
        ) : (
          <TextBanner banner={banner} navigate={navigate} />
        )}
      </div>

      {/* Navigation arrows — bottom corners, very subtle */}
      {activeBanners.length > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            className="absolute left-1.5 bottom-1.5 w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-white/40 active:bg-black/20 transition-all"
            data-testid="banner-prev"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button
            onClick={() => go(1)}
            className="absolute right-1.5 bottom-1.5 w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-white/40 active:bg-black/20 transition-all"
            data-testid="banner-next"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </>
      )}

      {/* Dots */}
      {activeBanners.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {activeBanners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'
              }`}
              data-testid={`banner-dot-${i}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ImageBanner({ banner, navigate }) {
  const handleClick = () => {
    if (banner.link_url) {
      if (banner.link_url.startsWith('http')) {
        window.open(banner.link_url, '_blank');
      } else {
        navigate(banner.link_url);
      }
    }
  };

  return (
    <div
      onClick={banner.link_url ? handleClick : undefined}
      className={`relative aspect-[3.5/1] sm:aspect-[4/1] overflow-hidden rounded-2xl ${banner.link_url ? 'cursor-pointer' : ''}`}
      data-testid="banner-image"
    >
      <img
        src={banner.image_url}
        alt={banner.overlay_text || 'Banner'}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {banner.overlay_text && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
          <p className="text-white font-bold text-xs sm:text-sm tracking-tight leading-snug max-w-[80%]">
            {banner.overlay_text}
          </p>
          {banner.link_url && (
            <ExternalLink className="h-3 w-3 text-white/60 ml-1 flex-shrink-0" />
          )}
        </div>
      )}
    </div>
  );
}

function TextBanner({ banner, navigate }) {
  const bgStyle = {};
  if (banner.bg_gradient) {
    bgStyle.background = banner.bg_gradient;
  } else if (banner.bg_color) {
    bgStyle.backgroundColor = banner.bg_color;
  }
  if (banner.bg_image_url) {
    bgStyle.backgroundImage = `url(${banner.bg_image_url})`;
    bgStyle.backgroundSize = 'cover';
    bgStyle.backgroundPosition = 'center';
  }

  const handleClick = () => {
    if (banner.link_url) {
      if (banner.link_url.startsWith('http')) {
        window.open(banner.link_url, '_blank');
      } else {
        navigate(banner.link_url);
      }
    }
  };

  return (
    <>
    <div
      onClick={banner.link_url ? handleClick : undefined}
      className={`relative rounded-2xl overflow-hidden px-5 py-5 sm:py-6 flex items-center justify-center min-h-[80px] ${banner.link_url ? 'cursor-pointer' : ''}`}
      style={bgStyle}
      data-testid="banner-text"
    >
      {banner.bg_image_url && (
        <div className="absolute inset-0 bg-black/30" />
      )}
      <p
        className={`relative ${FONT_SIZES[banner.font_size] || 'text-base'} font-bold text-center leading-snug tracking-tight max-w-lg`}
        style={{ color: banner.text_color || '#fff' }}
      >
        {banner.text}
      </p>
    </div>
  );
}
