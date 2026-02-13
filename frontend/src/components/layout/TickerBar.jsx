/**
 * TickerBar — Replaces traditional header with activity feed + sponsor banners.
 * Sticky top bar that scrolls through live app activities.
 * Shows sponsor banners at configurable intervals.
 * Fully configurable from admin panel.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Trophy, UserPlus, ShoppingBag, MessageCircle, Wallet,
  Megaphone, Zap, Star, ChevronRight, X
} from 'lucide-react';

const ICON_MAP = {
  'trophy': Trophy, 'user-plus': UserPlus, 'shopping-bag': ShoppingBag,
  'message-circle': MessageCircle, 'wallet': Wallet, 'megaphone': Megaphone,
  'zap': Zap, 'star': Star
};

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function TickerBar() {
  const location = useLocation();
  const [feed, setFeed] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef(null);
  const activityCountRef = useRef(0);

  // Fetch ticker feed
  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const res = await fetch(`${API_URL}/api/ticker/feed`);
        if (res.ok) {
          const data = await res.json();
          setFeed(data);
        }
      } catch (e) {
        console.warn('Ticker feed unavailable');
      }
    };
    fetchFeed();
    const interval = setInterval(fetchFeed, 60000);
    return () => clearInterval(interval);
  }, []);

  // Build display items (activities + sponsors interleaved)
  const displayItems = useCallback(() => {
    if (!feed?.enabled || !feed.activities?.length) return [];
    const items = [];
    const freq = feed.config?.sponsor_frequency || 5;
    const sponsors = feed.sponsors || [];
    let sponsorIdx = 0;

    feed.activities.forEach((activity, i) => {
      items.push({ ...activity, _type: 'activity' });
      if (sponsors.length > 0 && (i + 1) % freq === 0) {
        items.push({ ...sponsors[sponsorIdx % sponsors.length], _type: 'sponsor' });
        sponsorIdx++;
      }
    });
    return items;
  }, [feed]);

  const items = displayItems();

  // Auto-rotate
  useEffect(() => {
    if (!items.length || isPaused) return;
    const interval = feed?.config?.rotation_interval_ms || 4000;
    timerRef.current = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % items.length);
        setIsTransitioning(false);
      }, 300);
    }, interval);
    return () => clearInterval(timerRef.current);
  }, [items.length, isPaused, feed?.config?.rotation_interval_ms]);

  // Check page visibility
  const shouldShow = useCallback(() => {
    if (!feed?.enabled || dismissed) return false;
    const path = location.pathname;
    const hideOn = feed.config?.hide_on_pages || [];
    if (hideOn.some(p => path.startsWith(p))) return false;
    const showOn = feed.config?.show_on_pages || ['*'];
    if (showOn.includes('*')) return true;
    return showOn.some(p => path.startsWith(p));
  }, [feed, location.pathname, dismissed]);

  if (!shouldShow() || !items.length) return null;

  const current = items[currentIndex % items.length] || items[0];
  const style = feed?.config?.style || {};
  const bgColor = style.bg_color || '#1A1A1A';
  const textColor = style.text_color || '#FFFFFF';
  const accentColor = style.accent_color || '#C8102E';
  const height = style.height_px || 36;

  const Icon = ICON_MAP[current.icon] || Megaphone;

  return (
    <div
      className="ticker-bar sticky top-0 z-[60] w-full flex items-center justify-center overflow-hidden select-none"
      style={{ background: bgColor, color: textColor, height: `${height}px`, fontSize: `${style.font_size_px || 12}px` }}
      onMouseEnter={() => feed?.config?.pause_on_hover && setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      data-testid="ticker-bar"
    >
      {/* Progress dots */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1">
        {items.slice(0, Math.min(items.length, 8)).map((_, i) => (
          <span
            key={i}
            className="w-1 h-1 rounded-full transition-all duration-300"
            style={{
              background: i === currentIndex % Math.min(items.length, 8) ? accentColor : `${textColor}30`,
              transform: i === currentIndex % Math.min(items.length, 8) ? 'scale(1.5)' : 'scale(1)'
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div
        className={`flex items-center gap-2 px-8 transition-all duration-300 ${isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
      >
        {current._type === 'sponsor' ? (
          // Sponsor banner
          <a
            href={current.link_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            style={{ color: current.text_color || textColor }}
            data-testid="ticker-sponsor"
          >
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider" style={{ background: accentColor, color: '#fff' }}>
              Ad
            </span>
            {current.image_url && (
              <img src={current.image_url} alt={current.name} className="h-5 rounded" />
            )}
            <span className="font-semibold">{current.label || current.name}</span>
            <ChevronRight className="h-3 w-3 opacity-50" />
          </a>
        ) : (
          // Activity item
          <div className="flex items-center gap-2" data-testid="ticker-activity">
            <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: current.color || accentColor }} />
            <span className="font-medium truncate max-w-[280px] sm:max-w-none">{current.text}</span>
          </div>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors"
        style={{ color: `${textColor}60` }}
        data-testid="ticker-dismiss"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
