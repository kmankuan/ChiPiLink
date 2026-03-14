/**
 * Point Flow — Shows who scored each point as colored dots on a timeline
 * Much clearer than mirrored bars. Red dots = Player A, Blue dots = Player B
 * Streaks visible as consecutive same-color dots
 */
export default function PointFlow({ points = [], playerA = 'A', playerB = 'B', swapped = false }) {
  if (points.length === 0) return null;

  const maxVisible = 30;
  const visible = points.slice(-maxVisible);

  return (
    <div className="w-full">
      {/* Labels */}
      <div className="flex justify-between text-[8px] text-white/30 mb-0.5 px-0.5">
        <span>{swapped ? playerB : playerA}</span>
        <span>{swapped ? playerA : playerB}</span>
      </div>
      {/* Dots */}
      <div className="flex items-center gap-[2px] justify-center">
        {visible.map((pt, i) => {
          const isA = swapped ? pt.scored_by === 'b' : pt.scored_by === 'a';
          const streak = pt.streak || 1;
          const size = streak >= 5 ? 'w-3 h-3' : streak >= 3 ? 'w-2.5 h-2.5' : 'w-2 h-2';
          const glow = streak >= 5 ? 'shadow-lg' : streak >= 3 ? 'shadow-md' : '';
          return (
            <div
              key={i}
              className={`${size} rounded-full transition-all ${glow}`}
              style={{
                backgroundColor: isA ? '#ef4444' : '#3b82f6',
                opacity: 0.5 + Math.min(streak * 0.1, 0.5),
                boxShadow: streak >= 3 ? `0 0 ${streak * 2}px ${isA ? '#ef4444' : '#3b82f6'}40` : 'none',
              }}
              title={`P${pt.num}: ${pt.scored_by === 'a' ? playerA : playerB} (${pt.score_after?.a}-${pt.score_after?.b})`}
            />
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex justify-center gap-4 mt-1">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <span className="text-[8px] text-white/30">{swapped ? playerB : playerA}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <span className="text-[8px] text-white/30">{swapped ? playerA : playerB}</span>
        </div>
      </div>
    </div>
  );
}
