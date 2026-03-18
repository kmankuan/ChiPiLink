/**
 * Momentum Graph — Mirrored bar chart showing point-by-point flow
 * Bars go UP for player A, DOWN for player B
 */
export default function MomentumGraph({ points = [], height = 60 }) {
  if (points.length === 0) return null;

  const maxBars = 30;
  const visible = points.slice(-maxBars);
  const barW = 100 / Math.max(visible.length, 1);
  const mid = height / 2;

  return (
    <div className="w-full rounded-lg overflow-hidden bg-white/5" style={{ height }}>
      <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        {/* Center line */}
        <line x1="0" y1={mid} x2="100" y2={mid} stroke="rgba(255,255,255,0.15)" strokeWidth="0.3" />
        
        {visible.map((pt, i) => {
          const isA = pt.scored_by === 'a';
          const streak = pt.streak || 1;
          const barH = Math.min(mid - 2, 4 + streak * 3);
          const opacity = 0.4 + Math.min(streak * 0.15, 0.6);
          const x = i * barW;

          // Color based on streak
          let color;
          if (streak >= 5) color = isA ? '#ef4444' : '#3b82f6';  // Red/Blue intense
          else if (streak >= 3) color = isA ? '#f97316' : '#06b6d4';  // Orange/Cyan
          else color = isA ? '#fbbf24' : '#818cf8';  // Yellow/Purple

          return (
            <rect
              key={i}
              x={x + barW * 0.1}
              y={isA ? mid - barH : mid}
              width={barW * 0.8}
              height={barH}
              fill={color}
              opacity={opacity}
              rx="0.5"
            />
          );
        })}
      </svg>
    </div>
  );
}
