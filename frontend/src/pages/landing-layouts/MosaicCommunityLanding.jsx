/**
 * MosaicCommunityLanding — "Mosaic Community"
 * A culturally rich, non-traditional layout that blends:
 * - Professional ping-pong & chess
 * - Kids playing and learning
 * - Chinese, Panamanian, and Christian cultural elements
 *
 * NO hero section. Uses a mosaic grid of visual blocks
 * with cultural icon navigation. Feels like an art gallery
 * meets community bulletin board.
 */
import { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useLandingImages } from '@/hooks/useLandingImages';
import { useLayoutIcons } from '@/hooks/useLayoutIcons';
import Lottie from 'lottie-react';
import BannerCarousel from '@/components/BannerCarousel';
import MediaPlayer from '@/components/MediaPlayer';
import TelegramFeedCard from '@/components/TelegramFeedCard';
import MondayBoardWidget from '@/components/MondayBoardWidget';
import ModuleStatusBadge from '@/components/ui/ModuleStatusBadge';
import { DEFAULT_MODULE_STATUS } from '@/config/moduleStatus';
import {
  Store, Trophy, Zap, Calendar, Image, Users,
  ArrowRight, LogIn, BookOpen, Heart, Music,
  Gamepad2, GraduationCap, Globe, ChevronRight,
  Rss, Clock, Star, Crown, Flame, Sun, Moon, Coffee,
  Utensils, Palette, Camera, MapPin, Flag, Anchor, Ship,
  Shirt, Dumbbell, Target, Medal, Swords, Dice1,
  Baby, School, Sparkles, Gem, Flower2, Cross,
  MessageCircle, ShoppingBag, Wallet, Bell, Home,
  Search, Settings, Play, Monitor, Smartphone, Tv,
  Headphones, Mic, Church
} from 'lucide-react';

// Lucide icon catalog for dynamic rendering
const ICON_CATALOG = {
  Store, Trophy, Zap, Calendar, Image, Users, Heart, Globe,
  GraduationCap, Gamepad2, Music, BookOpen, Church, Crown,
  Flame, Star, Sun, Moon, Coffee, Utensils, Palette, Camera,
  MapPin, Flag, Anchor, Ship, Shirt, Dumbbell, Target, Medal,
  Swords, Dice1, Baby, School, Sparkles, Gem, Flower2, Cross,
  MessageCircle, Rss, ShoppingBag, Wallet, Bell, Home, Search,
  Settings, Play, Monitor, Smartphone, Tv, Headphones, Mic
};

// Default mosaic images — overridable from admin
const MOSAIC_DEFAULTS = {
  mosaic_pingpong_chess: 'https://static.prod-images.emergentagent.com/jobs/4a122f12-33f9-4f93-9123-84c6a2cb3907/images/5040d9d6499bad13e30dd00fe426cdce65332c563ef20104137ceb126b095e4b.png',
  mosaic_kids_learning: 'https://static.prod-images.emergentagent.com/jobs/4a122f12-33f9-4f93-9123-84c6a2cb3907/images/3eaf9b70f2c8a242db6fd32a793b16c215104f30755b70c8b63aa38dd331f753.png',
  mosaic_culture: 'https://static.prod-images.emergentagent.com/jobs/4a122f12-33f9-4f93-9123-84c6a2cb3907/images/535181b7a5a2144892c75ca15c73f9320f5739017de399d05ced0e60170f39e7.png',
  mosaic_gathering: 'https://static.prod-images.emergentagent.com/jobs/4a122f12-33f9-4f93-9123-84c6a2cb3907/images/0416cce781984810906e615303474bfe2089c65f53db816a6bf448f34cbd3bda.png',
};

// Default nav icons when no backend config is available
const DEFAULT_NAV_ICONS = [
  { key: 'pinpan', label: 'PinPan', to: '', type: 'lucide', icon: 'Gamepad2', accent: '#d97706', accent_bg: '#FFF7ED', status: 'building' },
  { key: 'tienda', label: 'Tienda', to: '', type: 'lucide', icon: 'Store', accent: '#059669', accent_bg: '#ECFDF5', status: 'building' },
  { key: 'ranking', label: 'Ranking', to: '', type: 'lucide', icon: 'Trophy', accent: '#C8102E', accent_bg: '#FFF1F2', status: 'building' },
  { key: 'aprender', label: 'Aprender', to: '', type: 'lucide', icon: 'GraduationCap', accent: '#7c3aed', accent_bg: '#F5F3FF', status: 'building' },
  { key: 'cultura', label: 'Cultura', to: '', type: 'lucide', icon: 'Globe', accent: '#0284c7', accent_bg: '#F0F9FF', status: 'building' },
  { key: 'fe', label: 'Fe', to: '', type: 'lucide', icon: 'Heart', accent: '#ec4899', accent_bg: '#FDF2F8', status: 'building' },
];

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-PA', { day: 'numeric', month: 'short' });
}

// Cultural icon button used for navigation — supports Lucide icons or custom images
// Now includes dynamic status indicator with multiple animation types and custom GIF support
function CulturalNav({ icon: Icon, label, to, accent, accentBg, imageUrl, status = 'building', statusAnimation, statusGifUrl, statusColor, statusLabel }) {
  const navigate = useNavigate();
  const hasLink = to && to.trim() !== '';
  
  const handleClick = () => {
    if (hasLink) {
      navigate(to);
    }
  };

  const anim = statusAnimation || (status === 'building' ? 'building_bars' : status === 'coming_soon' ? 'pulse' : status === 'maintenance' ? 'wrench' : 'none');
  const sColor = statusColor || (status === 'building' ? '#f59e0b' : status === 'coming_soon' ? '#3b82f6' : status === 'maintenance' ? '#ef4444' : '#22c55e');
  const isReady = status === 'ready' && anim === 'none';

  return (
    <button
      onClick={handleClick}
      disabled={!hasLink}
      className={`group flex flex-col items-center gap-1 transition-transform ${hasLink ? 'active:scale-95 cursor-pointer' : 'cursor-default'}`}
      data-testid={`cultural-nav-${label.toLowerCase().replace(/\s/g, '-')}`}
    >
      {/* Icon container with internal status indicator */}
      <div
        className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 overflow-hidden ${hasLink ? 'group-hover:scale-110 group-hover:shadow-lg' : 'grayscale-[30%]'}`}
        style={{ background: accentBg, boxShadow: `0 4px 14px ${accent}30` }}
      >
        {/* Icon (shifted up if animation below) */}
        <div className={`flex items-center justify-center ${!isReady ? '-mt-1' : ''}`}>
          {imageUrl ? (
            <img src={imageUrl} alt={label} className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
          ) : (
            <Icon className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: accent }} />
          )}
        </div>
        
        {/* Status animations (inside icon box at bottom) */}
        {!isReady && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
            <StatusAnimation type={anim} color={sColor} gifUrl={statusGifUrl} />
          </div>
        )}
      </div>
      
      {/* Label below icon */}
      <span className="text-[10px] sm:text-xs font-bold tracking-tight" style={{ color: '#5a4a3a' }}>
        {label}
      </span>
      
      {/* Status label if custom */}
      {statusLabel && (
        <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full -mt-0.5" style={{ background: `${sColor}18`, color: sColor }}>
          {statusLabel}
        </span>
      )}
      
      {/* All animation keyframes */}
      <style>{`
        @keyframes building {
          0%, 100% { transform: scaleY(0.6); opacity: 0.6; }
          50% { transform: scaleY(1); opacity: 1; }
        }
        @keyframes blocks {
          0% { transform: scaleY(0.3); opacity: 0.4; }
          50% { transform: scaleY(1.2); opacity: 1; }
          100% { transform: scaleY(0.3); opacity: 0.4; }
        }
        @keyframes wave {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1.4); }
        }
        @keyframes hammer {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-30deg); }
        }
        @keyframes rocket {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes statusBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes statusPulse {
          0%, 100% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes lanternGlow {
          0%, 100% { filter: brightness(0.8); transform: rotate(-3deg); }
          50% { filter: brightness(1.3); transform: rotate(3deg); }
        }
        @keyframes dragonFloat {
          0% { transform: translateX(-2px) translateY(0); }
          25% { transform: translateX(2px) translateY(-1px); }
          50% { transform: translateX(0px) translateY(-2px); }
          75% { transform: translateX(-1px) translateY(-1px); }
          100% { transform: translateX(-2px) translateY(0); }
        }
        @keyframes craneHook {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(8deg); }
        }
        @keyframes bambooGrow {
          0% { transform: scaleY(0); opacity: 0; }
          60% { transform: scaleY(1); opacity: 1; }
          100% { transform: scaleY(1); opacity: 1; }
        }
        @keyframes fireworkBurst {
          0% { transform: scale(0); opacity: 1; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.6); opacity: 0; }
        }
        @keyframes typingCursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes dataOrbit {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes progressFill {
          0% { width: 0%; }
          80% { width: 100%; }
          100% { width: 100%; opacity: 0.5; }
        }
        @keyframes templeStack {
          0% { transform: translateY(4px); opacity: 0; }
          40% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes sparkleRotate {
          0% { transform: rotate(0deg) scale(0.8); opacity: 0.6; }
          50% { transform: rotate(180deg) scale(1.2); opacity: 1; }
          100% { transform: rotate(360deg) scale(0.8); opacity: 0.6; }
        }
        @keyframes codingType {
          0%, 100% { width: 0; }
          50% { width: 100%; }
        }
        @keyframes codingScreenGlow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes personBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1px); }
        }
        @keyframes buildFloor {
          0% { transform: scaleY(0); opacity: 0; }
          50% { transform: scaleY(1); opacity: 1; }
          100% { transform: scaleY(1); opacity: 1; }
        }
        @keyframes buildCraneSwing {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        @keyframes buildProgress {
          0% { height: 0%; }
          85% { height: 100%; }
          100% { height: 100%; }
        }
      `}</style>
    </button>
  );
}

// Lottie animation loader — fetches JSON from URL and renders via lottie-react
function LottieAnimation({ url, size = 24 }) {
  const [animData, setAnimData] = useState(null);
  useEffect(() => {
    if (!url) return;
    fetch(url)
      .then(r => r.json())
      .then(setAnimData)
      .catch(() => setAnimData(null));
  }, [url]);
  if (!animData) return <div className="w-3 h-3 rounded-full border border-current animate-spin" />;
  return <Lottie animationData={animData} loop autoplay style={{ width: size, height: size }} />;
}

// Animation renderer used inside icon and in admin preview
function StatusAnimation({ type, color, gifUrl }) {
  const c = color || '#f59e0b';
  switch (type) {
    case 'building_bars':
      return (
        <div className="flex gap-[2px] items-end h-2">
          {[4,7,5,4].map((h,i) => (
            <span key={i} className="w-[3px] rounded-sm" style={{ background: `${c}cc`, height: `${h}px`, animation: `building 0.5s ease-in-out ${i*100}ms infinite` }} />
          ))}
        </div>
      );
    case 'blocks':
      return (
        <div className="flex gap-[1px] items-end h-2.5">
          {[3,5,7,4,6].map((h,i) => (
            <span key={i} className="w-[2.5px] rounded-sm" style={{ background: `${c}cc`, height: `${h}px`, animation: `blocks 1.2s ease ${i*150}ms infinite` }} />
          ))}
        </div>
      );
    case 'pulse':
      return <div className="w-3 h-3 rounded-full" style={{ background: c, animation: 'statusPulse 1.5s ease-in-out infinite' }} />;
    case 'bounce':
      return <div className="w-2.5 h-2.5 rounded-full" style={{ background: c, animation: 'statusBounce 0.6s ease-in-out infinite' }} />;
    case 'spinner':
      return <div className="w-3 h-3 rounded-full border-[2px] border-transparent" style={{ borderTopColor: c, animation: 'spin 0.8s linear infinite' }} />;
    case 'hammer':
      return <span className="text-[10px] inline-block" style={{ animation: 'hammer 0.6s ease-in-out infinite alternate', transformOrigin: 'bottom right' }}>&#128296;</span>;
    case 'wrench':
      return <span className="text-[10px] inline-block" style={{ animation: 'spin 2s linear infinite' }}>&#128295;</span>;
    case 'rocket':
      return <span className="text-[10px] inline-block" style={{ animation: 'rocket 1s ease-in-out infinite' }}>&#128640;</span>;
    case 'wave':
      return (
        <div className="flex gap-[1px] items-center h-2">
          {[0,1,2,3,4].map(i => (
            <span key={i} className="w-[2px] rounded-full" style={{ background: `${c}cc`, height: '6px', animation: `wave 1s ease-in-out ${i*120}ms infinite` }} />
          ))}
        </div>
      );

    /* ── NEW: Chinese / Construction / Tech / Celebration / Progress ── */

    case 'lantern':
      return <span className="text-[12px] inline-block" style={{ animation: 'lanternGlow 2s ease-in-out infinite', transformOrigin: 'top center' }}>&#127982;</span>;

    case 'dragon':
      return <span className="text-[12px] inline-block" style={{ animation: 'dragonFloat 2.5s ease-in-out infinite' }}>&#128009;</span>;

    case 'crane':
      return (
        <div className="relative w-5 h-3">
          <div className="absolute bottom-0 left-1/2 w-[2px] h-3 -translate-x-1/2" style={{ background: `${c}99` }} />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-[2px]" style={{ background: `${c}cc`, transformOrigin: 'center', animation: 'craneHook 2s ease-in-out infinite' }} />
          <div className="absolute top-[2px] right-0 w-[1.5px] h-[4px]" style={{ background: c, animation: 'statusBounce 1s ease-in-out infinite' }} />
        </div>
      );

    case 'bamboo':
      return (
        <div className="flex gap-[3px] items-end h-3">
          {[0,1,2].map(i => (
            <div key={i} className="flex flex-col items-center gap-[1px]">
              <span className="w-[2px] rounded-full" style={{ background: '#22c55e', height: `${6+i*2}px`, animation: `bambooGrow 2s ease-out ${i*400}ms infinite`, transformOrigin: 'bottom' }} />
              <span className="w-[4px] h-[1.5px] rounded-full" style={{ background: '#16a34a80' }} />
            </div>
          ))}
        </div>
      );

    case 'fireworks':
      return (
        <div className="relative w-5 h-3">
          {[0,1,2,3,4,5].map(i => {
            const angle = i * 60;
            const rad = angle * Math.PI / 180;
            const x = 10 + Math.cos(rad) * 6;
            const y = 6 + Math.sin(rad) * 5;
            return <span key={i} className="absolute w-[2px] h-[2px] rounded-full" style={{
              left: `${x}px`, top: `${y}px`,
              background: i % 2 === 0 ? '#ef4444' : '#f59e0b',
              animation: `fireworkBurst 1.5s ease-out ${i*100}ms infinite`,
            }} />;
          })}
          <span className="absolute left-[9px] top-[5px] w-[3px] h-[3px] rounded-full" style={{ background: c, animation: 'statusPulse 1.5s ease-in-out infinite' }} />
        </div>
      );

    case 'coding':
      return (
        <div className="flex items-center gap-[1px] h-2">
          <span className="text-[7px] font-mono font-bold" style={{ color: `${c}cc` }}>&lt;/&gt;</span>
          <span className="w-[1.5px] h-[6px] ml-[1px]" style={{ background: c, animation: 'typingCursor 0.8s step-end infinite' }} />
        </div>
      );

    case 'data_sync':
      return (
        <div className="relative w-3.5 h-3.5">
          <div className="absolute inset-0 rounded-full border-[1.5px] border-transparent" style={{ borderTopColor: c, borderRightColor: `${c}60`, animation: 'dataOrbit 1.2s linear infinite' }} />
          <div className="absolute inset-[3px] rounded-full" style={{ background: `${c}40` }} />
        </div>
      );

    case 'progress_bar':
      return (
        <div className="w-5 h-[3px] rounded-full overflow-hidden" style={{ background: `${c}25` }}>
          <div className="h-full rounded-full" style={{ background: c, animation: 'progressFill 2.5s ease-in-out infinite' }} />
        </div>
      );

    case 'temple':
      return (
        <div className="flex flex-col items-center gap-0">
          <span className="w-3 h-[2px] rounded-t-sm" style={{ background: `${c}bb`, animation: 'templeStack 2s ease-out 0ms infinite' }} />
          <span className="w-4 h-[2px]" style={{ background: `${c}99`, animation: 'templeStack 2s ease-out 300ms infinite' }} />
          <span className="w-5 h-[2px] rounded-b-sm" style={{ background: `${c}77`, animation: 'templeStack 2s ease-out 600ms infinite' }} />
        </div>
      );

    case 'sparkle':
      return (
        <div className="relative w-4 h-3 flex items-center justify-center">
          <span className="text-[9px] inline-block" style={{ color: c, animation: 'sparkleRotate 2s linear infinite' }}>&#10024;</span>
          <span className="absolute -right-0.5 top-0 text-[5px]" style={{ color: `${c}80`, animation: 'sparkleRotate 3s linear 0.5s infinite' }}>&#10024;</span>
        </div>
      );

    /* ── Coding Scene: person at laptop ── */
    case 'coding_scene':
      return (
        <div className="relative w-8 h-5" style={{ animation: 'personBob 2s ease-in-out infinite' }}>
          {/* Person head */}
          <div className="absolute left-[5px] top-0 w-[4px] h-[4px] rounded-full" style={{ background: c }} />
          {/* Person body */}
          <div className="absolute left-[5.5px] top-[4px] w-[3px] h-[4px] rounded-sm" style={{ background: `${c}cc` }} />
          {/* Laptop base */}
          <div className="absolute left-[10px] top-[5px] w-[10px] h-[1.5px] rounded-sm" style={{ background: `${c}88` }} />
          {/* Laptop screen */}
          <div className="absolute left-[10px] top-[1px] w-[10px] h-[4px] rounded-t-sm overflow-hidden" style={{ background: '#1a1a2e', border: `0.5px solid ${c}44` }}>
            {/* Code lines typing */}
            <div className="absolute left-[1px] top-[0.5px] h-[1px] rounded-full" style={{ background: '#4ade80', animation: 'codingType 1.5s ease-in-out infinite', width: '6px' }} />
            <div className="absolute left-[1px] top-[2px] h-[1px] rounded-full" style={{ background: '#60a5fa', animation: 'codingType 1.8s ease-in-out 0.3s infinite', width: '4px' }} />
          </div>
          {/* Screen glow */}
          <div className="absolute left-[12px] top-[0px] w-[6px] h-[6px] rounded-full" style={{ background: `${c}15`, animation: 'codingScreenGlow 2s ease-in-out infinite' }} />
          {/* Desk */}
          <div className="absolute bottom-0 left-[2px] w-[22px] h-[1px]" style={{ background: `${c}44` }} />
        </div>
      );

    /* ── Building Progress: 0% to 100% ── */
    case 'building_progress':
      return (
        <div className="relative w-7 h-6">
          {/* Building outline */}
          <div className="absolute bottom-0 left-[2px] w-[12px] h-[16px] rounded-t-sm overflow-hidden" style={{ border: `0.5px solid ${c}44`, borderBottom: 'none' }}>
            {/* Fill progress */}
            <div className="absolute bottom-0 left-0 w-full" style={{ background: `${c}55`, animation: 'buildProgress 3s ease-in-out infinite' }} />
            {/* Floor lines */}
            {[0,1,2,3].map(i => (
              <div key={i} className="absolute w-full h-[0.5px]" style={{ bottom: `${i * 25}%`, background: `${c}33` }} />
            ))}
            {/* Windows */}
            {[0,1,2].map(row => (
              [0,1].map(col => (
                <div key={`${row}-${col}`} className="absolute w-[2px] h-[2px] rounded-[0.5px]" style={{ 
                  bottom: `${10 + row * 30}%`, 
                  left: `${25 + col * 40}%`,
                  background: `${c}66`,
                  animation: `buildFloor 3s ease-out ${(2-row) * 0.8}s infinite`,
                  transformOrigin: 'bottom'
                }} />
              ))
            ))}
          </div>
          {/* Mini crane */}
          <div className="absolute top-0 right-[2px]" style={{ transformOrigin: 'bottom center', animation: 'buildCraneSwing 2s ease-in-out infinite' }}>
            <div className="w-[1.5px] h-[10px]" style={{ background: `${c}88` }} />
            <div className="absolute top-0 left-[-3px] w-[6px] h-[1px]" style={{ background: `${c}66` }} />
          </div>
          {/* Progress percentage text */}
          <div className="absolute bottom-[-1px] right-0 text-[5px] font-bold font-mono" style={{ color: c, animation: 'codingScreenGlow 3s ease-in-out infinite' }}>
            %
          </div>
        </div>
      );

    /* ── Lottie URL animation ── */
    case 'lottie_url':
      return gifUrl ? <LottieAnimation url={gifUrl} size={24} /> : <span className="text-[6px] text-muted-foreground">No URL</span>;

    case 'custom_gif':
      return gifUrl ? <img src={gifUrl} alt="" className="w-6 h-6 object-contain" /> : null;
    default:
      return null;
  }
}

// Mosaic tile — image-backed block
function MosaicTile({ image, title, subtitle, onClick, span = '', testId, overlay = 'from-black/60 to-transparent', badge }) {
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-xl active:scale-[0.98] text-left ${span}`}
      data-testid={testId}
    >
      <img src={image} alt={title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
      <div className={`absolute inset-0 bg-gradient-to-t ${overlay}`} />
      <div className="relative h-full flex flex-col justify-end p-4 sm:p-5">
        {badge && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm text-white w-fit mb-2">
            {badge}
          </span>
        )}
        <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight leading-tight">{title}</h3>
        {subtitle && <p className="text-[10px] sm:text-xs text-white/60 mt-0.5">{subtitle}</p>}
      </div>
    </button>
  );
}

// Info card — flat colored block
function InfoCard({ icon: Icon, title, desc, accent, accentBg, onClick, testId }) {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 hover:shadow-md active:scale-[0.98]"
      style={{ background: accentBg, border: `1px solid ${accent}20` }}
      data-testid={testId}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${accent}20` }}>
        <Icon className="h-5 w-5" style={{ color: accent }} />
      </div>
      <h4 className="text-sm font-bold tracking-tight mb-1" style={{ color: '#2d2217' }}>{title}</h4>
      <p className="text-[10px] leading-relaxed" style={{ color: '#8b7b6b' }}>{desc}</p>
      <ChevronRight className="absolute top-5 right-4 h-4 w-4 transition-colors" style={{ color: `${accent}40` }} />
    </button>
  );
}

export default function MosaicCommunityLanding({ communityData, moduleStatuses }) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const landingImages = useLandingImages();
  const dynamicIcons = useLayoutIcons('mosaic_community');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t1);
  }, []);

  // Merge mosaic-specific images with landing images
  const img = {
    ...MOSAIC_DEFAULTS,
    ...landingImages,
    mosaic_pingpong_chess: landingImages.mosaic_pingpong_chess || MOSAIC_DEFAULTS.mosaic_pingpong_chess,
    mosaic_kids_learning: landingImages.mosaic_kids_learning || MOSAIC_DEFAULTS.mosaic_kids_learning,
    mosaic_culture: landingImages.mosaic_culture || MOSAIC_DEFAULTS.mosaic_culture,
    mosaic_gathering: landingImages.mosaic_gathering || MOSAIC_DEFAULTS.mosaic_gathering,
  };

  const destacados = communityData?.destacados || [];
  const noticias = communityData?.noticias || [];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #FBF7F0 0%, #F5EDE0 100%)' }} data-testid="mosaic-landing">

      {/* ═══ BANNER CAROUSEL — Ad/announcement container (replaces brand header) ═══ */}
      <header
        className={`px-0 pt-0 pb-0 transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        data-testid="mosaic-header"
      >
        <BannerCarousel />
      </header>

      {/* ═══ CULTURAL ICON NAV — dynamic from admin config ═══ */}
      <nav
        className={`px-4 sm:px-8 pt-3 pb-1 max-w-7xl mx-auto transition-all duration-700 delay-100 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        data-testid="cultural-nav"
      >
        <div className="flex justify-between sm:justify-start sm:gap-6 overflow-x-auto scrollbar-hide">
          {(dynamicIcons.length > 0 ? dynamicIcons : DEFAULT_NAV_ICONS).map((ic, i) => {
            const IconComponent = ICON_CATALOG[ic.icon] || Gamepad2;
            return (
              <CulturalNav
                key={ic.key || i}
                icon={IconComponent}
                label={ic.label}
                to={ic.to || ''}
                accent={ic.accent}
                accentBg={ic.accent_bg}
                imageUrl={ic.type === 'image' ? ic.image_url : null}
                status={ic.status || 'building'}
                statusAnimation={ic.status_animation}
                statusGifUrl={ic.status_gif_url}
                statusColor={ic.status_color}
                statusLabel={ic.status_label}
              />
            );
          })}
        </div>
      </nav>

      {/* ═══ MEDIA PLAYER — Google Photos album slideshow ═══ */}
      <section
        className={`px-0 sm:px-8 pt-1 pb-0 max-w-7xl mx-auto transition-all duration-700 delay-150 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        data-testid="media-player-section"
      >
        <MediaPlayer />
      </section>

      {/* ═══ TELEGRAM FEED — Community channel preview ═══ */}
      <section
        className={`px-0 sm:px-8 pb-3 max-w-7xl mx-auto transition-all duration-700 delay-200 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        data-testid="telegram-feed-section"
      >
        <TelegramFeedCard />
      </section>

      {/* ═══ ACTIVITY RIBBON — latest posts as horizontal scroll ═══ */}
      {destacados.length > 0 && (
        <section
          className={`py-6 sm:py-8 transition-all duration-700 delay-300 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          data-testid="mosaic-activity"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#C8102E' }} />
                <h2 className="text-base sm:text-lg font-black tracking-tight" style={{ color: '#2d2217' }}>
                  {t('landing.happening', 'Happening Now')}
                </h2>
              </div>
              <button
                onClick={() => navigate('/comunidad')}
                className="text-xs font-bold flex items-center gap-1 hover:gap-2 transition-all"
                style={{ color: '#C8102E' }}
                data-testid="mosaic-see-all"
              >
                {t('common.viewAll', 'View all')} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-3 px-4 sm:px-8 scrollbar-hide snap-x snap-mandatory max-w-7xl mx-auto">
            {destacados.slice(0, 6).map((post) => (
              <button
                key={post.post_id}
                onClick={() => navigate(`/comunidad/post/${post.post_id}`)}
                className="snap-start flex-shrink-0 w-56 sm:w-64 group"
                data-testid={`mosaic-post-${post.post_id}`}
              >
                <div className="rounded-2xl overflow-hidden shadow-sm hover:shadow-md border transition-shadow duration-300" style={{ background: '#fff', borderColor: 'rgba(0,0,0,0.05)' }}>
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={post.imagen_portada || img.mosaic_culture}
                      alt={post.titulo}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {post.categoria && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm text-white" style={{ background: 'rgba(200,16,46,0.7)' }}>
                        {post.categoria}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className="text-xs font-bold line-clamp-2 tracking-tight mb-1" style={{ color: '#2d2217' }}>{post.titulo}</h4>
                    <span className="text-[10px] flex items-center gap-1" style={{ color: '#b8956a' }}>
                      <Clock className="h-2.5 w-2.5" />{formatDate(post.fecha_publicacion)}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ═══ NEWS LIST — compact ═══ */}
      {noticias.length > 0 && (
        <section
          className={`py-4 sm:py-6 px-4 sm:px-8 max-w-7xl mx-auto transition-all duration-700 delay-400 ease-out ${visible ? 'opacity-100' : 'opacity-0'}`}
          data-testid="mosaic-news"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base sm:text-lg font-black tracking-tight" style={{ color: '#2d2217' }}>
              {t('landing.news.title', 'News')}
            </h2>
            <button
              onClick={() => navigate('/comunidad/noticias')}
              className="text-xs font-bold flex items-center gap-1"
              style={{ color: '#C8102E' }}
              data-testid="mosaic-news-all"
            >
              {t('common.viewAll', 'View all')} <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-sm divide-y" style={{ background: '#fff', borderColor: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.05)' }}>
            {noticias.slice(0, 4).map(post => (
              <button
                key={post.post_id}
                onClick={() => navigate(`/comunidad/post/${post.post_id}`)}
                className="flex items-start gap-3 px-4 py-3 w-full text-left hover:bg-black/[0.02] transition-colors"
                data-testid={`mosaic-news-${post.post_id}`}
              >
                <img
                  src={post.imagen_portada || img.mosaic_gathering}
                  alt={post.titulo}
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold line-clamp-2 tracking-tight mb-0.5" style={{ color: '#2d2217' }}>{post.titulo}</h4>
                  <span className="text-[10px] flex items-center gap-1" style={{ color: '#b8956a' }}>
                    <Clock className="h-2.5 w-2.5" />{formatDate(post.fecha_publicacion)}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 mt-1" style={{ color: '#ddd' }} />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ═══ MONDAY.COM BOARD WIDGET — replaces CTA when configured ═══ */}
      <section
        className={`px-0 sm:px-8 max-w-7xl mx-auto transition-all duration-700 delay-500 ease-out ${visible ? 'opacity-100' : 'opacity-0'}`}
        data-testid="monday-widget-section"
      >
        <MondayBoardWidget />
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-6 px-4 sm:px-8" data-testid="mosaic-footer">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-xs font-bold tracking-tight" style={{ color: '#c4b5a0' }}>ChiPi Link</p>
          <p className="text-[10px] tracking-wider uppercase" style={{ color: '#d4c5b0' }}>
            {t('landing.footer', 'Connecting communities since 2024')}
          </p>
        </div>
      </footer>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
