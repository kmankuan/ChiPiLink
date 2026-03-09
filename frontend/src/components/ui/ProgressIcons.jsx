/**
 * ProgressIcons — Core shared resource for progress-level status icons
 * Chinese-themed animated indicators for Starting → Advanced → Complete
 * 
 * Usage: import { ProgressIcon, PROGRESS_THEMES } from '@/components/ui/ProgressIcons';
 *        <ProgressIcon level="starting" theme="journey" size={24} />
 *
 * Levels: starting (0-25%), developing (25-50%), advancing (50-75%), mastering (75-95%), complete (100%)
 * Themes: journey (nature), architecture (buildings), celestial (sky/stars), calligraphy (ink/brush)
 * Renderers: css (default), lottie (requires lottie-react)
 */
import { useEffect, useState } from 'react';

/* ═══════════════ PROGRESS LEVELS ═══════════════ */
export const PROGRESS_LEVELS = [
  { key: 'starting',   label: 'Starting',   range: '0-25%',   order: 0 },
  { key: 'developing', label: 'Developing', range: '25-50%',  order: 1 },
  { key: 'advancing',  label: 'Advancing',  range: '50-75%',  order: 2 },
  { key: 'mastering',  label: 'Mastering',  range: '75-95%',  order: 3 },
  { key: 'complete',   label: 'Complete',   range: '100%',    order: 4 },
];

/* ═══════════════ THEMES ═══════════════ */
export const PROGRESS_THEMES = {
  journey: {
    name: 'Chinese Journey',
    description: 'Nature path from seedling to phoenix',
    levels: {
      starting:   { label: 'Seedling',  color: '#86efac' },
      developing: { label: 'Bamboo',    color: '#22c55e' },
      advancing:  { label: 'Lotus',     color: '#ec4899' },
      mastering:  { label: 'Dragon',    color: '#f59e0b' },
      complete:   { label: 'Phoenix',   color: '#ef4444' },
    },
  },
  architecture: {
    name: 'Chinese Architecture',
    description: 'Building from foundation to golden palace',
    levels: {
      starting:   { label: 'Foundation', color: '#a3a3a3' },
      developing: { label: 'Pillars',    color: '#78716c' },
      advancing:  { label: 'Temple',     color: '#dc2626' },
      mastering:  { label: 'Pagoda',     color: '#f59e0b' },
      complete:   { label: 'Palace',     color: '#eab308' },
    },
  },
  celestial: {
    name: 'Celestial Path',
    description: 'Sky journey from new moon to full sun',
    levels: {
      starting:   { label: 'New Moon',     color: '#64748b' },
      developing: { label: 'Crescent',     color: '#94a3b8' },
      advancing:  { label: 'Half Moon',    color: '#e2e8f0' },
      mastering:  { label: 'Full Moon',    color: '#fbbf24' },
      complete:   { label: 'Golden Sun',   color: '#f59e0b' },
    },
  },
  calligraphy: {
    name: 'Ink & Brush',
    description: 'Calligraphy mastery from first stroke to masterpiece',
    levels: {
      starting:   { label: 'First Stroke',  color: '#d4d4d4' },
      developing: { label: 'Characters',    color: '#a3a3a3' },
      advancing:  { label: 'Flowing Ink',   color: '#525252' },
      mastering:  { label: 'Seal Script',   color: '#dc2626' },
      complete:   { label: 'Masterpiece',   color: '#b91c1c' },
    },
  },
};

/* ═══════════════ CSS KEYFRAMES (injected once) ═══════════════ */
const KEYFRAMES = `
@keyframes sproutGrow { 0%,100% { transform: scaleY(0.7); } 50% { transform: scaleY(1); } }
@keyframes bambooSway { 0%,100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
@keyframes lotusBloom { 0%,100% { transform: scale(0.85) rotate(-5deg); } 50% { transform: scale(1) rotate(5deg); } }
@keyframes dragonFly { 0% { transform: translateX(-1px) translateY(1px); } 25% { transform: translateX(1px) translateY(-1px); } 50% { transform: translateX(1px) translateY(1px); } 75% { transform: translateX(-1px) translateY(-1px); } 100% { transform: translateX(-1px) translateY(1px); } }
@keyframes phoenixRise { 0%,100% { transform: translateY(0) scale(1); filter: brightness(1); } 50% { transform: translateY(-2px) scale(1.1); filter: brightness(1.3); } }
@keyframes stonePlace { 0%,100% { opacity: 0.7; } 50% { opacity: 1; } }
@keyframes pillarRise { 0% { transform: scaleY(0.5); } 50% { transform: scaleY(1); } 100% { transform: scaleY(0.5); } }
@keyframes templeGlow { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.2); } }
@keyframes pagodaFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-1px); } }
@keyframes palaceShine { 0%,100% { filter: brightness(1) drop-shadow(0 0 0 transparent); } 50% { filter: brightness(1.2) drop-shadow(0 0 3px #fbbf2480); } }
@keyframes moonGlow { 0%,100% { opacity: 0.6; box-shadow: 0 0 2px transparent; } 50% { opacity: 1; box-shadow: 0 0 4px currentColor; } }
@keyframes crescentPulse { 0%,100% { transform: rotate(-15deg) scale(0.9); } 50% { transform: rotate(-15deg) scale(1); } }
@keyframes halfMoonSpin { 0%,100% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes sunRays { 0%,100% { transform: rotate(0deg); filter: brightness(1); } 50% { transform: rotate(180deg); filter: brightness(1.3); } }
@keyframes inkDrip { 0% { transform: scaleY(0.3); opacity: 0.3; } 50% { transform: scaleY(1); opacity: 1; } 100% { transform: scaleY(0.3); opacity: 0.3; } }
@keyframes brushStroke { 0% { width: 0; } 50% { width: 100%; } 100% { width: 0; } }
@keyframes sealStamp { 0%,80% { transform: scale(1); } 90% { transform: scale(1.15); } 100% { transform: scale(1); } }
@keyframes masterShine { 0%,100% { background-position: -100% 0; } 50% { background-position: 200% 0; } }
`;

let keyframesInjected = false;
function injectKeyframes() {
  if (keyframesInjected) return;
  const style = document.createElement('style');
  style.textContent = KEYFRAMES;
  document.head.appendChild(style);
  keyframesInjected = true;
}

/* ═══════════════ JOURNEY THEME RENDERERS ═══════════════ */

function JourneySeedling({ size, color }) {
  const s = size * 0.6;
  return (
    <div className="flex flex-col items-center" style={{ width: size, height: size }}>
      <div style={{ width: s * 0.15, height: s * 0.5, background: '#22c55e', borderRadius: 2, transformOrigin: 'bottom', animation: 'sproutGrow 2s ease-in-out infinite' }} />
      <div style={{ display: 'flex', gap: 1, marginTop: -2 }}>
        <div style={{ width: s * 0.25, height: s * 0.15, background: '#4ade80', borderRadius: '50% 0 50% 50%', transform: 'rotate(-30deg)' }} />
        <div style={{ width: s * 0.25, height: s * 0.15, background: '#4ade80', borderRadius: '0 50% 50% 50%', transform: 'rotate(30deg)' }} />
      </div>
      <div style={{ width: s * 0.5, height: 1, background: '#92400e60', borderRadius: 1, marginTop: 1 }} />
    </div>
  );
}

function JourneyBamboo({ size, color }) {
  return (
    <div className="flex gap-[2px] items-end" style={{ width: size, height: size, justifyContent: 'center', animation: 'bambooSway 3s ease-in-out infinite' }}>
      {[0.5, 0.8, 0.65].map((h, i) => (
        <div key={i} className="flex flex-col items-center" style={{ gap: 1 }}>
          <div style={{ width: 2.5, height: size * h, background: '#22c55e', borderRadius: 1 }} />
          {[0.3, 0.6].map((p, j) => (
            <div key={j} style={{ position: 'absolute', bottom: `${p * 100}%`, width: 4, height: 1, background: '#16a34a80', borderRadius: 1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function JourneyLotus({ size, color }) {
  const petals = 5;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size, animation: 'lotusBloom 3s ease-in-out infinite' }}>
      {Array.from({ length: petals }).map((_, i) => {
        const angle = (i * 360) / petals - 90;
        return (
          <div key={i} style={{
            position: 'absolute',
            width: size * 0.25,
            height: size * 0.4,
            background: `${color || '#ec4899'}${i % 2 === 0 ? 'cc' : '99'}`,
            borderRadius: '50% 50% 50% 50%',
            transform: `rotate(${angle}deg) translateY(-${size * 0.15}px)`,
            transformOrigin: 'bottom center',
          }} />
        );
      })}
      <div style={{ width: size * 0.2, height: size * 0.2, background: '#fbbf24', borderRadius: '50%', zIndex: 1 }} />
    </div>
  );
}

function JourneyDragon({ size, color }) {
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'dragonFly 2s ease-in-out infinite' }}>
      <span style={{ fontSize: size * 0.7, lineHeight: 1 }}>&#128009;</span>
    </div>
  );
}

function JourneyPhoenix({ size, color }) {
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'phoenixRise 2s ease-in-out infinite' }}>
      <svg width={size * 0.8} height={size * 0.8} viewBox="0 0 24 24" fill="none">
        <path d="M12 2C7 2 3 7 6 12C3 10 2 14 4 16C6 18 9 17 10 16C10 19 12 22 12 22C12 22 14 19 14 16C15 17 18 18 20 16C22 14 21 10 18 12C21 7 17 2 12 2Z" fill={color || '#ef4444'} fillOpacity="0.8" />
        <path d="M12 6C10 8 10 11 12 13C14 11 14 8 12 6Z" fill="#fbbf24" fillOpacity="0.9" />
      </svg>
    </div>
  );
}

/* ═══════════════ ARCHITECTURE THEME RENDERERS ═══════════════ */

function ArchFoundation({ size, color }) {
  const c = color || '#a3a3a3';
  return (
    <div className="relative flex items-end justify-center" style={{ width: size, height: size }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: size * 0.2, height: size * 0.15, background: `${c}${80 + i * 15}`, margin: '0 1px', borderRadius: '1px 1px 0 0', animation: `stonePlace 2s ease-in-out ${i * 300}ms infinite` }} />
      ))}
      <div style={{ position: 'absolute', bottom: 0, width: size * 0.8, height: 2, background: `${c}60`, borderRadius: 1 }} />
    </div>
  );
}

function ArchPillars({ size, color }) {
  const c = color || '#78716c';
  return (
    <div className="flex items-end justify-center gap-[2px]" style={{ width: size, height: size }}>
      {[0.5, 0.7, 0.7, 0.5].map((h, i) => (
        <div key={i} style={{ width: 2.5, height: size * h, background: `${c}cc`, borderRadius: '1px 1px 0 0', transformOrigin: 'bottom', animation: `pillarRise 2.5s ease-in-out ${i * 200}ms infinite` }} />
      ))}
      <div style={{ position: 'absolute', bottom: 0, width: size * 0.7, height: 1.5, background: `${c}80` }} />
    </div>
  );
}

function ArchTemple({ size, color }) {
  const c = color || '#dc2626';
  return (
    <div className="relative flex flex-col items-center justify-end" style={{ width: size, height: size, animation: 'templeGlow 3s ease-in-out infinite' }}>
      {/* Roof */}
      <div style={{ width: size * 0.8, height: size * 0.15, background: c, borderRadius: '2px 2px 0 0', clipPath: 'polygon(10% 100%, 0% 0%, 100% 0%, 90% 100%)' }} />
      {/* Body */}
      <div style={{ width: size * 0.6, height: size * 0.3, background: `${c}88`, display: 'flex', justifyContent: 'center', gap: 2 }}>
        {[0, 1].map(i => <div key={i} style={{ width: 2, height: '100%', background: `${c}cc` }} />)}
      </div>
      {/* Base */}
      <div style={{ width: size * 0.75, height: size * 0.08, background: `${c}66` }} />
    </div>
  );
}

function ArchPagoda({ size, color }) {
  const c = color || '#f59e0b';
  return (
    <div className="flex flex-col items-center justify-end" style={{ width: size, height: size, animation: 'pagodaFloat 2.5s ease-in-out infinite' }}>
      {[0.3, 0.45, 0.55, 0.65].map((w, i) => (
        <div key={i} style={{ width: size * w, height: size * 0.12, background: `${c}${99 - i * 15}`, marginTop: i === 0 ? 0 : -1, borderRadius: '1px 1px 0 0', clipPath: 'polygon(5% 100%, 0% 0%, 100% 0%, 95% 100%)' }} />
      ))}
      <div style={{ width: 1.5, height: size * 0.15, background: c, marginTop: -1 }} />
    </div>
  );
}

function ArchPalace({ size, color }) {
  const c = color || '#eab308';
  return (
    <div className="relative flex flex-col items-center justify-end" style={{ width: size, height: size, animation: 'palaceShine 3s ease-in-out infinite' }}>
      {/* Main roof */}
      <div style={{ width: size * 0.9, height: size * 0.18, background: c, borderRadius: '2px 2px 0 0', clipPath: 'polygon(8% 100%, 0% 0%, 50% -20%, 100% 0%, 92% 100%)' }} />
      {/* Upper body */}
      <div style={{ width: size * 0.7, height: size * 0.25, background: `${c}88`, display: 'flex', justifyContent: 'space-evenly', alignItems: 'center' }}>
        {[0, 1, 2].map(i => <div key={i} style={{ width: 2, height: '70%', background: `${c}cc`, borderRadius: 0.5 }} />)}
      </div>
      {/* Lower roof */}
      <div style={{ width: size * 0.85, height: size * 0.1, background: `${c}bb`, clipPath: 'polygon(5% 100%, 0% 0%, 100% 0%, 95% 100%)' }} />
      {/* Base */}
      <div style={{ width: size * 0.95, height: size * 0.08, background: `${c}66` }} />
    </div>
  );
}

/* ═══════════════ CELESTIAL THEME RENDERERS ═══════════════ */

function CelestialNewMoon({ size, color }) {
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: size * 0.5, height: size * 0.5, borderRadius: '50%', border: `1.5px solid ${color || '#64748b'}`, opacity: 0.6, animation: 'moonGlow 3s ease-in-out infinite' }} />
    </div>
  );
}

function CelestialCrescent({ size, color }) {
  const c = color || '#94a3b8';
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'crescentPulse 3s ease-in-out infinite' }}>
      <div style={{ width: size * 0.5, height: size * 0.5, borderRadius: '50%', background: c, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -2, right: -2, width: size * 0.4, height: size * 0.5, borderRadius: '50%', background: '#1e293b' }} />
      </div>
    </div>
  );
}

function CelestialHalfMoon({ size, color }) {
  const c = color || '#e2e8f0';
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: size * 0.5, height: size * 0.5, borderRadius: '50%', background: `linear-gradient(90deg, ${c} 50%, transparent 50%)`, border: `1px solid ${c}60`, animation: 'moonGlow 2.5s ease-in-out infinite' }} />
    </div>
  );
}

function CelestialFullMoon({ size, color }) {
  const c = color || '#fbbf24';
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: size * 0.55, height: size * 0.55, borderRadius: '50%', background: c, boxShadow: `0 0 ${size * 0.3}px ${c}60`, animation: 'moonGlow 2s ease-in-out infinite' }} />
    </div>
  );
}

function CelestialSun({ size, color }) {
  const c = color || '#f59e0b';
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'sunRays 8s linear infinite' }}>
      <div style={{ position: 'relative', width: size * 0.4, height: size * 0.4, borderRadius: '50%', background: c, boxShadow: `0 0 ${size * 0.4}px ${c}80` }}>
        {[0, 45, 90, 135].map(a => (
          <div key={a} style={{ position: 'absolute', top: '50%', left: '50%', width: size * 0.7, height: 1.5, background: `${c}60`, transform: `translate(-50%, -50%) rotate(${a}deg)`, borderRadius: 1 }} />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ CALLIGRAPHY THEME RENDERERS ═══════════════ */

function CalligraphyStroke({ size, color }) {
  return (
    <div className="relative" style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: size * 0.6, height: 2, background: color || '#d4d4d4', borderRadius: 1, transformOrigin: 'left', animation: 'brushStroke 2s ease-in-out infinite', overflow: 'hidden' }}>
        <div style={{ width: '100%', height: '100%', background: `linear-gradient(90deg, transparent, ${color || '#d4d4d4'})` }} />
      </div>
    </div>
  );
}

function CalligraphyChars({ size, color }) {
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: size * 0.5, fontWeight: 900, color: color || '#a3a3a3', fontFamily: 'serif', animation: 'inkDrip 2.5s ease-in-out infinite' }}>&#23383;</span>
    </div>
  );
}

function CalligraphyInk({ size, color }) {
  const c = color || '#525252';
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'end', justifyContent: 'center', gap: 1 }}>
      {[0.3, 0.5, 0.7, 0.4, 0.6].map((h, i) => (
        <div key={i} style={{ width: 2, height: size * h, background: c, borderRadius: '1px 1px 0 0', transformOrigin: 'bottom', animation: `inkDrip 2s ease-in-out ${i * 200}ms infinite` }} />
      ))}
    </div>
  );
}

function CalligraphySeal({ size, color }) {
  const c = color || '#dc2626';
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'sealStamp 3s ease-in-out infinite' }}>
      <div style={{ width: size * 0.55, height: size * 0.55, border: `2px solid ${c}`, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.3, color: c, fontWeight: 900, fontFamily: 'serif' }}>&#21360;</span>
      </div>
    </div>
  );
}

function CalligraphyMaster({ size, color }) {
  const c = color || '#b91c1c';
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: size * 0.65, height: size * 0.65, border: `2px solid ${c}`, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, #fef3c7 0%, #fffbeb 50%, #fef3c7 100%)`, backgroundSize: '200% 100%', animation: 'masterShine 3s linear infinite' }}>
        <span style={{ fontSize: size * 0.35, color: c, fontWeight: 900, fontFamily: 'serif' }}>&#36947;</span>
      </div>
    </div>
  );
}

/* ═══════════════ RENDERER MAP ═══════════════ */

const RENDERERS = {
  journey: {
    starting: JourneySeedling,
    developing: JourneyBamboo,
    advancing: JourneyLotus,
    mastering: JourneyDragon,
    complete: JourneyPhoenix,
  },
  architecture: {
    starting: ArchFoundation,
    developing: ArchPillars,
    advancing: ArchTemple,
    mastering: ArchPagoda,
    complete: ArchPalace,
  },
  celestial: {
    starting: CelestialNewMoon,
    developing: CelestialCrescent,
    advancing: CelestialHalfMoon,
    mastering: CelestialFullMoon,
    complete: CelestialSun,
  },
  calligraphy: {
    starting: CalligraphyStroke,
    developing: CalligraphyChars,
    advancing: CalligraphyInk,
    mastering: CalligraphySeal,
    complete: CalligraphyMaster,
  },
};

/* ═══════════════ MAIN COMPONENT ═══════════════ */

export function ProgressIcon({ level = 'starting', theme = 'journey', size = 24, color }) {
  useEffect(() => { injectKeyframes(); }, []);

  const themeData = PROGRESS_THEMES[theme] || PROGRESS_THEMES.journey;
  const levelData = themeData.levels[level] || themeData.levels.starting;
  const Renderer = RENDERERS[theme]?.[level] || RENDERERS.journey.starting;
  const finalColor = color || levelData.color;

  return <Renderer size={size} color={finalColor} />;
}

/* ═══════════════ LOTTIE PROGRESS ICON ═══════════════ */

export function LottieProgressIcon({ url, size = 24, fallbackLevel = 'starting', fallbackTheme = 'journey' }) {
  const [animData, setAnimData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) return;
    fetch(url)
      .then(r => r.json())
      .then(setAnimData)
      .catch(() => setError(true));
  }, [url]);

  if (error || !url) {
    return <ProgressIcon level={fallbackLevel} theme={fallbackTheme} size={size} />;
  }

  if (!animData) {
    return <div style={{ width: size, height: size, borderRadius: '50%', background: '#f1f5f9', animation: 'statusPulse 1.5s ease-in-out infinite' }} />;
  }

  // Dynamic import of Lottie
  try {
    const Lottie = require('lottie-react').default;
    return <Lottie animationData={animData} loop autoplay style={{ width: size, height: size }} />;
  } catch {
    return <ProgressIcon level={fallbackLevel} theme={fallbackTheme} size={size} />;
  }
}

/* ═══════════════ PREVIEW COMPONENT (for admin) ═══════════════ */

export function ProgressIconPreview({ theme = 'journey', size = 32 }) {
  return (
    <div className="flex items-center gap-3">
      {PROGRESS_LEVELS.map(l => (
        <div key={l.key} className="flex flex-col items-center gap-1">
          <ProgressIcon level={l.key} theme={theme} size={size} />
          <span className="text-[8px] text-muted-foreground">{l.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════ STATUS ANIMATION ADAPTER ═══════════════ */
// Returns a StatusAnimation-compatible renderer for use in existing icon_statuses system
export function getProgressAnimationType(level, theme = 'journey') {
  return `progress_${theme}_${level}`;
}

export function isProgressAnimation(type) {
  return type?.startsWith('progress_');
}

export function parseProgressAnimation(type) {
  if (!type?.startsWith('progress_')) return null;
  const parts = type.replace('progress_', '').split('_');
  // Handle theme names with underscores (like 'calligraphy')
  const level = parts.pop();
  const theme = parts.join('_') || 'journey';
  return { theme, level };
}
