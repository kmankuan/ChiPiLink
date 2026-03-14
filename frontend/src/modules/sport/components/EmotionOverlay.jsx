/**
 * EmotionOverlay — Lottie + Template + Particles
 * Priority: 1) Admin custom GIF/Lottie URL 2) Lottie default 3) Template with player photo 4) CSS fallback
 * Shows on the scoring player's side with particles.
 */
import { useState, useEffect } from 'react';
import Lottie from 'lottie-react';

// Free Lottie animation URLs (hosted on lottie CDN)
const LOTTIE_URLS = {
  streak_3: 'https://lottie.host/2ef5e84f-1833-4191-b7e0-e2a4fa0e7b95/mPBz4Bz7JQ.json',  // fire
  streak_5: 'https://lottie.host/e4aec39f-07db-4a3d-a271-7aad9c0f2a7a/7WRxVKOOaM.json',  // dragon/power
  streak_break: 'https://lottie.host/e89a1feb-58c8-4c3e-8069-05ba4ed0bc34/qiFxAYJMJ7.json', // explosion
  deuce: 'https://lottie.host/2e5dd6e7-a2ea-4b73-81d4-de2d2e4b3078/F7xKyT8iOf.json',  // lightning
  match_point: 'https://lottie.host/a6e0c892-70b4-4a7e-b3f5-20b62bd9ea08/I4yBhsYFQ3.json', // alert
  winner: 'https://lottie.host/87dc32ff-5dc1-488f-ad47-e12a1437e06d/aN2KklFwBG.json', // celebration/trophy
  comeback: 'https://lottie.host/2ef5e84f-1833-4191-b7e0-e2a4fa0e7b95/mPBz4Bz7JQ.json', // fire (reuse)
  perfect_set: 'https://lottie.host/87dc32ff-5dc1-488f-ad47-e12a1437e06d/aN2KklFwBG.json', // celebration
  upset: 'https://lottie.host/e89a1feb-58c8-4c3e-8069-05ba4ed0bc34/qiFxAYJMJ7.json', // explosion
};

const EMOTION_CONFIG = {
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

function LottiePlayer({ url }) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!url) return;
    fetch(url).then(r => r.ok ? r.json() : null).then(d => { if (d) setData(d); else setFailed(true); }).catch(() => setFailed(true));
  }, [url]);

  if (failed || !data) return null;
  return <Lottie animationData={data} loop={true} style={{ width: 160, height: 160 }} />;
}

export default function EmotionOverlay({ emotion, settings, side = 'center', playerPhoto }) {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    if (!emotion) return;
    const config = EMOTION_CONFIG[emotion.type] || EMOTION_CONFIG.streak_3;
    const adminCustom = settings?.emotions?.[emotion.type]?.gif_url;
    const lottieUrl = adminCustom || LOTTIE_URLS[emotion.type];
    setCurrent({ ...config, type: emotion.type, lottieUrl, adminCustom, playerPhoto });
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), config.duration || 3000);
    return () => clearTimeout(timer);
  }, [emotion, settings, playerPhoto]);

  if (!visible || !current) return null;

  const isCenter = !side || side === 'center' || current.type === 'deuce' || current.type === 'winner';
  const posClass = isCenter ? 'items-center justify-center' : side === 'left' ? 'items-center justify-start pl-6' : 'items-center justify-end pr-6';

  return (
    <div className={`fixed inset-0 z-50 flex ${posClass} pointer-events-none`}>
      {/* Background glow */}
      <div className="absolute inset-0" style={{ background: `radial-gradient(circle, ${current.color}30 0%, transparent 70%)` }} />
      
      <Particles emoji={current.particles} />
      
      <div className="relative z-10 text-center">
        {/* Admin custom GIF override */}
        {current.adminCustom ? (
          <img src={current.adminCustom} alt={current.label} className="w-40 h-40 mx-auto mb-2 object-contain" />
        ) : (
          <div className="relative">
            {/* Try Lottie first */}
            <div className="mx-auto" style={{ width: 160, height: 160 }}>
              <LottiePlayer url={current.lottieUrl} />
            </div>
            
            {/* Player photo overlay on the Lottie */}
            {current.playerPhoto && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <img src={current.playerPhoto} alt="" className="w-16 h-16 rounded-full object-cover"
                  style={{ border: `3px solid ${current.color}`, boxShadow: `0 0 20px ${current.color}60` }} />
              </div>
            )}
          </div>
        )}
        
        {/* Label */}
        <div className="text-2xl font-black mt-1" style={{ color: current.color, textShadow: `0 0 20px ${current.color}60` }}>
          {current.emoji} {current.label}
        </div>
      </div>
    </div>
  );
}
