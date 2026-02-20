/**
 * StatusAnimation — Global shared resource for animated status indicators.
 * Used by landing pages and the admin LayoutPreview panel.
 *
 * Usage:
 *   import { StatusAnimation, ANIMATION_OPTIONS } from '@/components/ui/StatusAnimation';
 *   <StatusAnimation type="building_bars" color="#f59e0b" />
 *
 * Keyframes are injected once into <head> on first mount.
 */
import { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import {
  ProgressIcon,
  PROGRESS_THEMES,
  PROGRESS_LEVELS,
  isProgressAnimation,
  parseProgressAnimation,
  getProgressAnimationType,
} from '@/components/ui/ProgressIcons';

/* ═══════════════ CSS KEYFRAMES (injected once) ═══════════════ */
const STATUS_KEYFRAMES = `
@keyframes building { 0%, 100% { transform: scaleY(0.6); opacity: 0.6; } 50% { transform: scaleY(1); opacity: 1; } }
@keyframes blocks { 0% { transform: scaleY(0.3); opacity: 0.4; } 50% { transform: scaleY(1.2); opacity: 1; } 100% { transform: scaleY(0.3); opacity: 0.4; } }
@keyframes wave { 0%, 100% { transform: scaleY(0.5); } 50% { transform: scaleY(1.4); } }
@keyframes hammer { 0% { transform: rotate(0deg); } 100% { transform: rotate(-30deg); } }
@keyframes rocket { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes statusBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
@keyframes statusPulse { 0%, 100% { transform: scale(0.8); opacity: 0.5; } 50% { transform: scale(1.2); opacity: 1; } }
@keyframes lanternGlow { 0%, 100% { filter: brightness(0.8); transform: rotate(-3deg); } 50% { filter: brightness(1.3); transform: rotate(3deg); } }
@keyframes dragonFloat { 0% { transform: translateX(-2px) translateY(0); } 25% { transform: translateX(2px) translateY(-1px); } 50% { transform: translateX(0px) translateY(-2px); } 75% { transform: translateX(-1px) translateY(-1px); } 100% { transform: translateX(-2px) translateY(0); } }
@keyframes craneHook { 0%, 100% { transform: rotate(-8deg); } 50% { transform: rotate(8deg); } }
@keyframes bambooGrow { 0% { transform: scaleY(0); opacity: 0; } 60% { transform: scaleY(1); opacity: 1; } 100% { transform: scaleY(1); opacity: 1; } }
@keyframes fireworkBurst { 0% { transform: scale(0); opacity: 1; } 50% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(0.6); opacity: 0; } }
@keyframes typingCursor { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
@keyframes dataOrbit { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes progressFill { 0% { width: 0%; } 80% { width: 100%; } 100% { width: 100%; opacity: 0.5; } }
@keyframes templeStack { 0% { transform: translateY(4px); opacity: 0; } 40% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(0); opacity: 1; } }
@keyframes sparkleRotate { 0% { transform: rotate(0deg) scale(0.8); opacity: 0.6; } 50% { transform: rotate(180deg) scale(1.2); opacity: 1; } 100% { transform: rotate(360deg) scale(0.8); opacity: 0.6; } }
@keyframes codingType { 0%, 100% { width: 0; } 50% { width: 100%; } }
@keyframes codingScreenGlow { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
@keyframes personBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1px); } }
@keyframes buildFloor { 0% { transform: scaleY(0); opacity: 0; } 50% { transform: scaleY(1); opacity: 1; } 100% { transform: scaleY(1); opacity: 1; } }
@keyframes buildCraneSwing { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
@keyframes buildProgress { 0% { height: 0%; } 85% { height: 100%; } 100% { height: 100%; } }
`;

let statusKeyframesInjected = false;
function injectStatusKeyframes() {
  if (statusKeyframesInjected) return;
  const style = document.createElement('style');
  style.id = 'status-animation-keyframes';
  style.textContent = STATUS_KEYFRAMES;
  document.head.appendChild(style);
  statusKeyframesInjected = true;
}

/* ═══════════════ LOTTIE ANIMATION LOADER ═══════════════ */
export function LottieAnimation({ url, size = 24 }) {
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

/* ═══════════════ PROGRESS ANIMATION OPTIONS ═══════════════ */
const PROGRESS_ANIM_OPTIONS = Object.entries(PROGRESS_THEMES).flatMap(([themeKey, themeData]) =>
  PROGRESS_LEVELS.map(level => ({
    value: getProgressAnimationType(level.key, themeKey),
    label: `${themeData.levels[level.key]?.label || level.label} (${themeData.name})`,
    group: themeData.name,
  }))
);

/* ═══════════════ ANIMATION OPTIONS (dropdown list) ═══════════════ */
export const ANIMATION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'building_bars', label: 'Building Bars' },
  { value: 'pulse', label: 'Pulse Glow' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'spinner', label: 'Spinner' },
  { value: 'blocks', label: 'Stacking Blocks' },
  { value: 'hammer', label: 'Hammer' },
  { value: 'wrench', label: 'Wrench Spin' },
  { value: 'rocket', label: 'Rocket' },
  { value: 'wave', label: 'Wave' },
  { value: 'lantern', label: 'Lantern (Chinese)' },
  { value: 'dragon', label: 'Dragon (Chinese)' },
  { value: 'bamboo', label: 'Bamboo Growth' },
  { value: 'temple', label: 'Temple / Pagoda' },
  { value: 'sparkle', label: 'Sparkle' },
  { value: 'crane', label: 'Crane' },
  { value: 'coding', label: 'Coding' },
  { value: 'data_sync', label: 'Data Sync' },
  { value: 'fireworks', label: 'Fireworks' },
  { value: 'progress_bar', label: 'Progress Bar' },
  { value: 'coding_scene', label: 'Person Coding (Scene)' },
  { value: 'building_progress', label: 'Building Progress 0-100%' },
  ...PROGRESS_ANIM_OPTIONS,
  { value: 'lottie_url', label: 'Lottie Animation (URL)' },
  { value: 'custom_gif', label: 'Custom GIF/Image' },
];

/* ═══════════════ MAIN COMPONENT ═══════════════ */
/**
 * @param {string}  type    - Animation key (e.g. 'building_bars', 'pulse', 'lottie_url')
 * @param {string}  color   - CSS color for theming
 * @param {string}  gifUrl  - URL for custom_gif or lottie_url types
 * @param {number}  scale   - Size multiplier (1 = landing, ~1.3 = admin preview)
 */
export function StatusAnimation({ type, color, gifUrl, scale = 1 }) {
  useEffect(() => { injectStatusKeyframes(); }, []);

  const c = color || '#f59e0b';

  switch (type) {
    case 'building_bars':
      return (
        <div className="flex gap-[2px] items-end" style={{ height: 8 * scale }}>
          {[4,7,5,4].map((h,i) => (
            <span key={i} className="rounded-sm" style={{ width: 3 * scale, background: `${c}cc`, height: `${h * scale}px`, animation: `building 0.5s ease-in-out ${i*100}ms infinite` }} />
          ))}
        </div>
      );
    case 'blocks':
      return (
        <div className="flex gap-[1px] items-end" style={{ height: 10 * scale }}>
          {[3,5,7,4,6].map((h,i) => (
            <span key={i} className="rounded-sm" style={{ width: 2.5 * scale, background: `${c}cc`, height: `${h * scale}px`, animation: `blocks 1.2s ease ${i*150}ms infinite` }} />
          ))}
        </div>
      );
    case 'pulse':
      return <div className="rounded-full" style={{ width: 12 * scale, height: 12 * scale, background: c, animation: 'statusPulse 1.5s ease-in-out infinite' }} />;
    case 'bounce':
      return <div className="rounded-full" style={{ width: 10 * scale, height: 10 * scale, background: c, animation: 'statusBounce 0.6s ease-in-out infinite' }} />;
    case 'spinner':
      return <div className="rounded-full border-transparent" style={{ width: 12 * scale, height: 12 * scale, borderWidth: 2 * scale, borderTopColor: c, animation: 'spin 0.8s linear infinite' }} />;
    case 'hammer':
      return <span className="inline-block" style={{ fontSize: 10 * scale, animation: 'hammer 0.6s ease-in-out infinite alternate', transformOrigin: 'bottom right' }}>&#128296;</span>;
    case 'wrench':
      return <span className="inline-block" style={{ fontSize: 10 * scale, animation: 'spin 2s linear infinite' }}>&#128295;</span>;
    case 'rocket':
      return <span className="inline-block" style={{ fontSize: 10 * scale, animation: 'rocket 1s ease-in-out infinite' }}>&#128640;</span>;
    case 'wave':
      return (
        <div className="flex gap-[1px] items-center" style={{ height: 8 * scale }}>
          {[0,1,2,3,4].map(i => (
            <span key={i} className="rounded-full" style={{ width: 2 * scale, background: `${c}cc`, height: 6 * scale, animation: `wave 1s ease-in-out ${i*120}ms infinite` }} />
          ))}
        </div>
      );

    case 'lantern':
      return <span className="inline-block" style={{ fontSize: 12 * scale, animation: 'lanternGlow 2s ease-in-out infinite', transformOrigin: 'top center' }}>&#127982;</span>;
    case 'dragon':
      return <span className="inline-block" style={{ fontSize: 12 * scale, animation: 'dragonFloat 2.5s ease-in-out infinite' }}>&#128009;</span>;
    case 'crane':
      return (
        <div className="relative" style={{ width: 20 * scale, height: 12 * scale }}>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2" style={{ width: 2 * scale, height: 12 * scale, background: `${c}99` }} />
          <div className="absolute top-0 left-1/2 -translate-x-1/2" style={{ width: 16 * scale, height: 2 * scale, background: `${c}cc`, transformOrigin: 'center', animation: 'craneHook 2s ease-in-out infinite' }} />
          <div className="absolute top-[2px] right-0" style={{ width: 1.5 * scale, height: 4 * scale, background: c, animation: 'statusBounce 1s ease-in-out infinite' }} />
        </div>
      );
    case 'bamboo':
      return (
        <div className="flex items-end" style={{ height: 12 * scale, gap: 3 * scale }}>
          {[0,1,2].map(i => (
            <div key={i} className="flex flex-col items-center gap-[1px]">
              <span className="rounded-full" style={{ width: 2 * scale, background: '#22c55e', height: `${(6+i*2) * scale}px`, animation: `bambooGrow 2s ease-out ${i*400}ms infinite`, transformOrigin: 'bottom' }} />
              <span className="rounded-full" style={{ width: 4 * scale, height: 1.5 * scale, background: '#16a34a80' }} />
            </div>
          ))}
        </div>
      );
    case 'fireworks':
      return (
        <div className="relative" style={{ width: 20 * scale, height: 12 * scale }}>
          {[0,1,2,3,4,5].map(i => {
            const angle = i * 60;
            const rad = angle * Math.PI / 180;
            const x = 10 * scale + Math.cos(rad) * 6 * scale;
            const y = 6 * scale + Math.sin(rad) * 5 * scale;
            return <span key={i} className="absolute rounded-full" style={{
              left: `${x}px`, top: `${y}px`,
              width: 2 * scale, height: 2 * scale,
              background: i % 2 === 0 ? '#ef4444' : '#f59e0b',
              animation: `fireworkBurst 1.5s ease-out ${i*100}ms infinite`,
            }} />;
          })}
          <span className="absolute rounded-full" style={{ left: 9 * scale, top: 5 * scale, width: 3 * scale, height: 3 * scale, background: c, animation: 'statusPulse 1.5s ease-in-out infinite' }} />
        </div>
      );
    case 'coding':
      return (
        <div className="flex items-center gap-[1px]" style={{ height: 8 * scale }}>
          <span className="font-mono font-bold" style={{ fontSize: 7 * scale, color: `${c}cc` }}>&lt;/&gt;</span>
          <span className="ml-[1px]" style={{ width: 1.5 * scale, height: 6 * scale, background: c, animation: 'typingCursor 0.8s step-end infinite' }} />
        </div>
      );
    case 'data_sync':
      return (
        <div className="relative" style={{ width: 14 * scale, height: 14 * scale }}>
          <div className="absolute inset-0 rounded-full border-transparent" style={{ borderWidth: 1.5 * scale, borderTopColor: c, borderRightColor: `${c}60`, animation: 'dataOrbit 1.2s linear infinite' }} />
          <div className="absolute rounded-full" style={{ inset: 3 * scale, background: `${c}40` }} />
        </div>
      );
    case 'progress_bar':
      return (
        <div className="rounded-full overflow-hidden" style={{ width: 20 * scale, height: 3 * scale, background: `${c}25` }}>
          <div className="h-full rounded-full" style={{ background: c, animation: 'progressFill 2.5s ease-in-out infinite' }} />
        </div>
      );
    case 'temple':
      return (
        <div className="flex flex-col items-center gap-0">
          <span className="rounded-t-sm" style={{ width: 12 * scale, height: 2 * scale, background: `${c}bb`, animation: 'templeStack 2s ease-out 0ms infinite' }} />
          <span style={{ width: 16 * scale, height: 2 * scale, background: `${c}99`, animation: 'templeStack 2s ease-out 300ms infinite' }} />
          <span className="rounded-b-sm" style={{ width: 20 * scale, height: 2 * scale, background: `${c}77`, animation: 'templeStack 2s ease-out 600ms infinite' }} />
        </div>
      );
    case 'sparkle':
      return (
        <div className="relative flex items-center justify-center" style={{ width: 16 * scale, height: 12 * scale }}>
          <span className="inline-block" style={{ fontSize: 9 * scale, color: c, animation: 'sparkleRotate 2s linear infinite' }}>&#10024;</span>
          <span className="absolute -right-0.5 top-0" style={{ fontSize: 5 * scale, color: `${c}80`, animation: 'sparkleRotate 3s linear 0.5s infinite' }}>&#10024;</span>
        </div>
      );
    case 'coding_scene':
      return (
        <div className="relative" style={{ width: 32 * scale, height: 20 * scale, animation: 'personBob 2s ease-in-out infinite' }}>
          <div className="absolute rounded-full" style={{ left: 5 * scale, top: 0, width: 4 * scale, height: 4 * scale, background: c }} />
          <div className="absolute rounded-sm" style={{ left: 5.5 * scale, top: 4 * scale, width: 3 * scale, height: 4 * scale, background: `${c}cc` }} />
          <div className="absolute rounded-sm" style={{ left: 10 * scale, top: 5 * scale, width: 10 * scale, height: 1.5 * scale, background: `${c}88` }} />
          <div className="absolute rounded-t-sm overflow-hidden" style={{ left: 10 * scale, top: 1 * scale, width: 10 * scale, height: 4 * scale, background: '#1a1a2e', border: `0.5px solid ${c}44` }}>
            <div className="absolute rounded-full" style={{ left: 1, top: 0.5, height: 1, background: '#4ade80', animation: 'codingType 1.5s ease-in-out infinite', width: 6 * scale }} />
            <div className="absolute rounded-full" style={{ left: 1, top: 2, height: 1, background: '#60a5fa', animation: 'codingType 1.8s ease-in-out 0.3s infinite', width: 4 * scale }} />
          </div>
          <div className="absolute rounded-full" style={{ left: 12 * scale, top: 0, width: 6 * scale, height: 6 * scale, background: `${c}15`, animation: 'codingScreenGlow 2s ease-in-out infinite' }} />
          <div className="absolute" style={{ bottom: 0, left: 2 * scale, width: 22 * scale, height: 1, background: `${c}44` }} />
        </div>
      );
    case 'building_progress':
      return (
        <div className="relative" style={{ width: 28 * scale, height: 24 * scale }}>
          <div className="absolute rounded-t-sm overflow-hidden" style={{ bottom: 0, left: 2 * scale, width: 12 * scale, height: 16 * scale, border: `0.5px solid ${c}44`, borderBottom: 'none' }}>
            <div className="absolute bottom-0 left-0 w-full" style={{ background: `${c}55`, animation: 'buildProgress 3s ease-in-out infinite' }} />
            {[0,1,2,3].map(i => (
              <div key={i} className="absolute w-full" style={{ height: 0.5, bottom: `${i * 25}%`, background: `${c}33` }} />
            ))}
            {[0,1,2].map(row => (
              [0,1].map(col => (
                <div key={`${row}-${col}`} className="absolute rounded-[0.5px]" style={{
                  width: 2 * scale, height: 2 * scale,
                  bottom: `${10 + row * 30}%`,
                  left: `${25 + col * 40}%`,
                  background: `${c}66`,
                  animation: `buildFloor 3s ease-out ${(2-row) * 0.8}s infinite`,
                  transformOrigin: 'bottom'
                }} />
              ))
            ))}
          </div>
          <div className="absolute" style={{ top: 0, right: 2 * scale, transformOrigin: 'bottom center', animation: 'buildCraneSwing 2s ease-in-out infinite' }}>
            <div style={{ width: 1.5 * scale, height: 10 * scale, background: `${c}88` }} />
            <div className="absolute" style={{ top: 0, left: -3 * scale, width: 6 * scale, height: 1, background: `${c}66` }} />
          </div>
          <div className="absolute font-bold font-mono" style={{ bottom: -1, right: 0, fontSize: 5 * scale, color: c, animation: 'codingScreenGlow 3s ease-in-out infinite' }}>%</div>
        </div>
      );

    case 'lottie_url':
      return gifUrl ? <LottieAnimation url={gifUrl} size={24 * scale} /> : <span className="text-muted-foreground" style={{ fontSize: 6 * scale }}>No URL</span>;
    case 'custom_gif':
      return gifUrl ? <img src={gifUrl} alt="" className="object-contain" style={{ width: 24 * scale, height: 24 * scale }} /> : null;
    default:
      if (isProgressAnimation(type)) {
        const parsed = parseProgressAnimation(type);
        if (parsed) return <ProgressIcon level={parsed.level} theme={parsed.theme} size={20 * scale} color={color} />;
      }
      return null;
  }
}
