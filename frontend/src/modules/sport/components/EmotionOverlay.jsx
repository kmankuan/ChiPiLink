/**
 * EmotionOverlay — Template-based personalized stickers
 * Shows player photo inside emotion frame overlay.
 * Falls back to Lottie animation or CSS if no photo.
 * Admin can customize sticker URLs in settings.
 */
import { useState, useEffect, useRef } from 'react';

// Default emotion configs with CSS fallbacks
const EMOTIONS = {
  streak_3: {
    label: 'On Fire!',
    emoji: '🔥',
    frame: 'radial-gradient(circle, rgba(239,68,68,0.3) 0%, transparent 70%)',
    frameColor: '#ef4444',
    particles: '🔥',
    anim: 'animate-bounce',
  },
  streak_5: {
    label: 'Dragon Mode!',
    emoji: '🐉',
    frame: 'radial-gradient(circle, rgba(234,88,12,0.4) 0%, transparent 70%)',
    frameColor: '#ea580c',
    particles: '⭐',
    anim: 'animate-pulse',
  },
  streak_break: {
    label: 'Streak Broken!',
    emoji: '💥',
    frame: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)',
    frameColor: '#3b82f6',
    particles: '💢',
    anim: 'animate-ping',
  },
  deuce: {
    label: 'Deuce!',
    emoji: '⚡',
    frame: 'radial-gradient(circle, rgba(234,179,8,0.3) 0%, transparent 70%)',
    frameColor: '#eab308',
    particles: '⚡',
    anim: 'animate-pulse',
  },
  match_point: {
    label: 'Match Point!',
    emoji: '🏮',
    frame: 'radial-gradient(circle, rgba(220,38,38,0.3) 0%, transparent 70%)',
    frameColor: '#dc2626',
    particles: '🏮',
    anim: 'animate-pulse',
  },
  winner: {
    label: 'Champion!',
    emoji: '🏆',
    frame: 'radial-gradient(circle, rgba(34,197,94,0.4) 0%, transparent 70%)',
    frameColor: '#22c55e',
    particles: '🎉',
    anim: 'animate-bounce',
  },
  comeback: {
    label: 'Comeback!',
    emoji: '🌊',
    frame: 'radial-gradient(circle, rgba(6,182,212,0.3) 0%, transparent 70%)',
    frameColor: '#06b6d4',
    particles: '💪',
    anim: 'animate-bounce',
  },
  perfect_set: {
    label: 'Perfect!',
    emoji: '🏴',
    frame: 'radial-gradient(circle, rgba(184,134,11,0.4) 0%, transparent 70%)',
    frameColor: '#B8860B',
    particles: '🌟',
    anim: 'animate-pulse',
  },
  upset: {
    label: 'Upset!',
    emoji: '😱',
    frame: 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)',
    frameColor: '#a855f7',
    particles: '❗',
    anim: 'animate-bounce',
  },
};

function Particles({ emoji, count = 8 }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="absolute text-2xl animate-ping"
          style={{
            left: `${10 + Math.random() * 80}%`,
            top: `${10 + Math.random() * 80}%`,
            animationDelay: `${i * 0.15}s`,
            animationDuration: `${1 + Math.random()}s`,
            opacity: 0.6,
          }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}

export default function EmotionOverlay({ emotion, settings, side = 'center', playerPhoto }) {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    if (!emotion) return;
    const config = EMOTIONS[emotion.type] || EMOTIONS.streak_3;
    // Check for admin custom sticker URL
    const customUrl = settings?.emotions?.[emotion.type]?.gif_url;
    setCurrent({ ...config, type: emotion.type, customUrl, playerPhoto: playerPhoto || null });
    setVisible(true);
    const duration = config.duration || 3000;
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [emotion, settings, playerPhoto]);

  if (!visible || !current) return null;

  const isCenter = !side || side === 'center' || current.type === 'deuce' || current.type === 'winner';
  const posClass = isCenter
    ? 'items-center justify-center'
    : side === 'left'
      ? 'items-center justify-start pl-8'
      : 'items-center justify-end pr-8';

  return (
    <div className={`fixed inset-0 z-50 flex ${posClass} pointer-events-none`}>
      {/* Background glow */}
      <div className="absolute inset-0" style={{ background: current.frame }} />
      
      {/* Particles */}
      <Particles emoji={current.particles} />
      
      {/* Main sticker */}
      <div className={`relative z-10 text-center ${current.anim}`}>
        {/* Custom GIF/sticker if admin uploaded */}
        {current.customUrl ? (
          <img src={current.customUrl} alt={current.label} className="w-36 h-36 mx-auto mb-2" />
        ) : (
          <div className="relative">
            {/* Player photo in emotion frame */}
            {current.playerPhoto ? (
              <div className="relative mx-auto mb-2">
                <img 
                  src={current.playerPhoto} 
                  alt="" 
                  className="w-28 h-28 rounded-full object-cover mx-auto"
                  style={{ border: `4px solid ${current.frameColor}`, boxShadow: `0 0 30px ${current.frameColor}60` }}
                />
                <span className="absolute -bottom-2 -right-2 text-4xl">{current.emoji}</span>
              </div>
            ) : (
              /* No photo — show big emoji */
              <div className="text-7xl mb-2">{current.emoji}</div>
            )}
          </div>
        )}
        
        {/* Label */}
        <div 
          className="text-2xl font-black tracking-wide"
          style={{ color: current.frameColor, textShadow: `0 0 20px ${current.frameColor}60` }}
        >
          {current.label}
        </div>
      </div>
    </div>
  );
}
