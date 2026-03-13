/**
 * Emotion Overlay — Shows GIF/sticker animations for game events
 * Streak fire, dragon mode, deuce lightning, winner fireworks, etc.
 */
import { useState, useEffect } from 'react';

const EMOTION_STYLES = {
  streak_3: { label: '🔥 On Fire!', bg: 'rgba(239,68,68,0.15)', color: '#ef4444', anim: 'animate-bounce' },
  streak_5: { label: '🐉 Dragon Mode!', bg: 'rgba(234,88,12,0.2)', color: '#ea580c', anim: 'animate-pulse' },
  streak_break: { label: '💥 Streak Broken!', bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', anim: 'animate-ping' },
  deuce: { label: '⚡ Deuce!', bg: 'rgba(234,179,8,0.2)', color: '#eab308', anim: 'animate-pulse' },
  match_point: { label: '🏰 Match Point!', bg: 'rgba(220,38,38,0.2)', color: '#dc2626', anim: 'animate-pulse' },
  winner: { label: '🎆 Winner!', bg: 'rgba(34,197,94,0.2)', color: '#22c55e', anim: 'animate-bounce' },
  comeback: { label: '🌊 Comeback!', bg: 'rgba(6,182,212,0.2)', color: '#06b6d4', anim: 'animate-bounce' },
  perfect_set: { label: '🏴 Perfect Set!', bg: 'rgba(184,134,11,0.3)', color: '#B8860B', anim: 'animate-pulse' },
  upset: { label: '😱 Upset!', bg: 'rgba(168,85,247,0.2)', color: '#a855f7', anim: 'animate-bounce' },
};

export default function EmotionOverlay({ emotion, settings }) {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    if (!emotion) return;
    const style = EMOTION_STYLES[emotion.type] || EMOTION_STYLES.streak_3;
    // Check if admin uploaded custom GIF
    const customGif = settings?.emotions_triggered?.find(e => e.type === emotion.type)?.gif_url;
    setCurrent({ ...style, gif: customGif, type: emotion.type, player: emotion.player });
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [emotion, settings]);

  if (!visible || !current) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none" style={{ background: current.bg }}>
      <div className={`text-center ${current.anim}`}>
        {current.gif ? (
          <img src={current.gif} alt={current.label} className="w-32 h-32 mx-auto mb-2" />
        ) : (
          <div className="text-6xl mb-2">{current.label.split(' ')[0]}</div>
        )}
        <div className="text-2xl font-black tracking-wide" style={{ color: current.color, textShadow: `0 0 20px ${current.color}40` }}>
          {current.label}
        </div>
      </div>
    </div>
  );
}
