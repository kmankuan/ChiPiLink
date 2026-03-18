/**
 * EmotionOverlay — Clean, reliable emotion stickers
 * Priority: 1) Admin custom GIF/Lottie URL 2) Player photo template 3) Emoji fallback
 * Particles + glow effects on all modes.
 */
import { useState, useEffect } from 'react';

const EMOTIONS = {
  streak_3:     { label: 'On Fire!', emoji: '🔥', color: '#ef4444', particles: '🔥', duration: 2500 },
  streak_5:     { label: 'Dragon Mode!', emoji: '🐉', color: '#ea580c', particles: '⭐', duration: 3000 },
  streak_break: { label: 'Streak Broken!', emoji: '💥', color: '#3b82f6', particles: '💢', duration: 2000 },
  deuce:        { label: 'Deuce!', emoji: '⚡', color: '#eab308', particles: '⚡', duration: 2000 },
  match_point:  { label: 'Match Point!', emoji: '🏮', color: '#dc2626', particles: '🏮', duration: 2500 },
  winner:       { label: 'Champion!', emoji: '🏆', color: '#22c55e', particles: '🎉', duration: 4000 },
  comeback:     { label: 'Comeback!', emoji: '🌊', color: '#06b6d4', particles: '💪', duration: 3000 },
  perfect_set:  { label: 'Perfect!', emoji: '🏯', color: '#B8860B', particles: '🌟', duration: 3500 },
  upset:        { label: 'Upset!', emoji: '😱', color: '#a855f7', particles: '❗', duration: 2500 },
};

function Particles({ emoji, count = 10 }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="absolute animate-ping text-xl"
          style={{
            left: `${5 + Math.random() * 90}%`, top: `${5 + Math.random() * 90}%`,
            animationDelay: `${i * 0.12}s`, animationDuration: `${0.8 + Math.random() * 1.2}s`, opacity: 0.7,
          }}>
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
    const adminGif = settings?.emotions?.[emotion.type]?.gif_url;
    setCurrent({ ...config, type: emotion.type, adminGif, playerPhoto });
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), config.duration || 3000);
    return () => clearTimeout(timer);
  }, [emotion, settings, playerPhoto]);

  if (!visible || !current) return null;

  const isCenter = !side || side === 'center' || current.type === 'deuce' || current.type === 'winner';
  const posClass = isCenter ? 'items-center justify-center' : side === 'left' ? 'items-center justify-start pl-6' : 'items-center justify-end pr-6';

  return (
    <div className={`fixed inset-0 z-50 flex ${posClass} pointer-events-none`}>
      {/* Glow */}
      <div className="absolute inset-0" style={{ background: `radial-gradient(circle, ${current.color}30 0%, transparent 70%)` }} />
      
      <Particles emoji={current.particles} />
      
      <div className="relative z-10 text-center animate-bounce">
        {/* Layer 1: Admin custom GIF */}
        {current.adminGif ? (
          <img src={current.adminGif} alt={current.label} className="w-40 h-40 mx-auto mb-2 object-contain" />
        ) : current.playerPhoto ? (
          /* Layer 2: Player photo in emotion frame */
          <div className="relative mx-auto mb-2">
            <img src={current.playerPhoto} alt=""
              className="w-28 h-28 rounded-full object-cover mx-auto"
              style={{ border: `5px solid ${current.color}`, boxShadow: `0 0 40px ${current.color}60, 0 0 80px ${current.color}30` }}
            />
            <span className="absolute -bottom-3 -right-3 text-5xl drop-shadow-lg">{current.emoji}</span>
            <span className="absolute -top-2 -left-2 text-3xl drop-shadow-lg animate-pulse">{current.emoji}</span>
          </div>
        ) : (
          /* Layer 3: Big emoji */
          <div className="text-8xl mb-2 drop-shadow-lg">{current.emoji}</div>
        )}
        
        <div className="text-2xl font-black" style={{ color: current.color, textShadow: `0 0 20px ${current.color}60, 0 2px 10px rgba(0,0,0,0.5)` }}>
          {current.label}
        </div>
      </div>
    </div>
  );
}
