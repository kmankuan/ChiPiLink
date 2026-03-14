/**
 * PointFlow — Visual timeline of points with emotion indicators
 * Shows on each player's side. Dots grow with streaks, emotions show as special markers.
 */
export default function PointFlow({ points = [], playerA = 'A', playerB = 'B', swapped = false }) {
  if (points.length === 0) return null;

  const maxVisible = 30;
  const visible = points.slice(-maxVisible);

  const EMOTION_MARKERS = {
    streak_3: '🔥', streak_5: '🐉', streak_break: '💥',
    deuce: '⚡', match_point: '🏮', winner: '🏆',
    comeback: '🌊', perfect_set: '🏯', upset: '😱',
  };

  // Split points by player
  const leftSide = swapped ? 'b' : 'a';
  const rightSide = swapped ? 'a' : 'b';
  const leftName = swapped ? playerB : playerA;
  const rightName = swapped ? playerA : playerB;

  return (
    <div className="w-full space-y-1">
      {/* Player A (left) flow */}
      <div className="flex items-center gap-1">
        <span className="text-[8px] text-red-400/60 w-8 text-right shrink-0">{leftName?.substring(0, 4)}</span>
        <div className="flex items-center gap-[2px] flex-1 min-w-0">
          {visible.map((pt, i) => {
            const isMine = pt.scored_by === leftSide;
            const streak = pt.streak || 1;
            const emotions = pt.emotions || [];
            const emoMarker = emotions.length > 0 ? EMOTION_MARKERS[emotions[0]] : null;

            if (!isMine) return <div key={i} className="w-1 h-1 rounded-full bg-white/5" />;

            return (
              <div key={i} className="flex flex-col items-center" title={`P${pt.num}: ${pt.score_after?.a}-${pt.score_after?.b}`}>
                {emoMarker && <span className="text-[6px] leading-none">{emoMarker}</span>}
                <div
                  className="rounded-full bg-red-400 transition-all"
                  style={{
                    width: Math.min(4 + streak * 1.5, 12),
                    height: Math.min(4 + streak * 1.5, 12),
                    opacity: 0.4 + Math.min(streak * 0.12, 0.6),
                    boxShadow: streak >= 3 ? `0 0 ${streak * 2}px rgba(239,68,68,0.4)` : 'none',
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Player B (right) flow */}
      <div className="flex items-center gap-1">
        <span className="text-[8px] text-blue-400/60 w-8 text-right shrink-0">{rightName?.substring(0, 4)}</span>
        <div className="flex items-center gap-[2px] flex-1 min-w-0">
          {visible.map((pt, i) => {
            const isMine = pt.scored_by === rightSide;
            const streak = pt.streak || 1;
            const emotions = pt.emotions || [];
            const emoMarker = emotions.length > 0 ? EMOTION_MARKERS[emotions[0]] : null;

            if (!isMine) return <div key={i} className="w-1 h-1 rounded-full bg-white/5" />;

            return (
              <div key={i} className="flex flex-col items-center" title={`P${pt.num}: ${pt.score_after?.a}-${pt.score_after?.b}`}>
                {emoMarker && <span className="text-[6px] leading-none">{emoMarker}</span>}
                <div
                  className="rounded-full bg-blue-400 transition-all"
                  style={{
                    width: Math.min(4 + streak * 1.5, 12),
                    height: Math.min(4 + streak * 1.5, 12),
                    opacity: 0.4 + Math.min(streak * 0.12, 0.6),
                    boxShadow: streak >= 3 ? `0 0 ${streak * 2}px rgba(59,130,246,0.4)` : 'none',
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
