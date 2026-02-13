/**
 * BannerCarousel — Rotating ad/banner container
 * Supports two types:
 * 1. Image banners: image with optional overlay text and click link
 * 2. Text banners: Facebook-style colored text cards with rich content
 * Auto-rotates, responsive, admin-configurable.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FONT_SIZES = { sm: 'text-sm', md: 'text-base', lg: 'text-lg', xl: 'text-xl' };

export default function BannerCarousel() {
  const [banners, setBanners] = useState([]);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_URL}/api/showcase/banners`)
      .then(r => r.ok ? r.json() : [])
      .then(setBanners)
      .catch(() => {});
  }, []);

  // Auto-rotate
  useEffect(() => {
    if (banners.length <= 1 || paused) return;
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % banners.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [banners.length, paused]);

  const go = useCallback((dir) => {
    setCurrent(prev => (prev + dir + banners.length) % banners.length);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const banner = banners[current];

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      data-testid="banner-carousel"
      style={{ minHeight: '80px' }}
    >
      {/* Banner content */}
      <div className="relative transition-all duration-500 ease-out">
        {banner.type === 'image' ? (
          <ImageBanner banner={banner} navigate={navigate} />
        ) : (
          <TextBanner banner={banner} navigate={navigate} />
        )}
      </div>

      {/* Navigation arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/40 transition-all"
            data-testid="banner-prev"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/40 transition-all"
            data-testid="banner-next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {/* Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {banners.map((_, i) => (
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
