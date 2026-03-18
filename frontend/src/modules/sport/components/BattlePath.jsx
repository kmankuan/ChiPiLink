/**
 * BattlePath — Visual victory climb for 2 players
 * Each point = one step up toward the trophy. Streaks glow. Winner celebrates.
 * 
 * Compact mode: for referee panel (short)
 * Full mode: for TV (tall, detailed)
 */

const GOAL_ICONS = { trophy: '🏆', dragon: '🐉', lantern: '🏮', star: '⭐', crown: '👑' };

function PlayerPath({ nickname, photo, score, maxScore, side, isServing, streak, isWinner }) {
  const progress = Math.min(score / Math.max(maxScore, 1), 1);
  const isLeft = side === 'left';
  const barColor = isLeft ? '#ef4444' : '#3b82f6';
  const glowColor = isLeft ? 'rgba(239,68,68,0.4)' : 'rgba(59,130,246,0.4)';
  
  // Streak intensity
  const streakGlow = streak >= 5 ? '0 0 20px' : streak >= 3 ? '0 0 12px' : '0 0 0px';
  const streakScale = streak >= 5 ? 1.15 : streak >= 3 ? 1.08 : 1;

  return (
    <div className={`flex flex-col items-center flex-1 ${isLeft ? '' : ''}`}>
      {/* Player name + service */}
      <div className="text-center mb-1">
        <span className="text-white/50 text-[10px] font-medium">{nickname}</span>
        {isServing && <span className="text-yellow-400 text-[8px] ml-1">🏓</span>}
      </div>

      {/* The path — vertical bar with player climbing */}
      <div className="relative w-12 flex-1 flex flex-col justify-end items-center">
        {/* Background track */}
        <div className="absolute inset-x-0 bottom-0 top-0 rounded-full bg-white/5" />
        
        {/* Progress fill */}
        <div 
          className="absolute inset-x-0 bottom-0 rounded-full transition-all duration-500"
          style={{ 
            height: `${progress * 100}%`, 
            background: `linear-gradient(to top, ${barColor}, ${barColor}80)`,
            boxShadow: `${streakGlow} ${glowColor}`,
          }} 
        />

        {/* Step markers */}
        {Array.from({ length: maxScore + 1 }).map((_, i) => (
          <div 
            key={i} 
            className="absolute w-full flex justify-center"
            style={{ bottom: `${(i / maxScore) * 100}%` }}
          >
            <div className={`w-1.5 h-0.5 rounded-full ${i <= score ? 'bg-white/30' : 'bg-white/5'}`} />
          </div>
        ))}

        {/* Player position (avatar or circle) */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 transition-all duration-500 z-10"
          style={{ 
            bottom: `calc(${progress * 100}% - 14px)`,
            transform: `translateX(-50%) scale(${streakScale})`,
          }}
        >
          {photo ? (
            <img src={photo} className="w-7 h-7 rounded-full object-cover border-2" 
              style={{ borderColor: barColor, boxShadow: `${streakGlow} ${glowColor}` }} alt="" />
          ) : (
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white"
              style={{ background: barColor, boxShadow: `${streakGlow} ${glowColor}` }}>
              {(nickname || '?')[0]}
            </div>
          )}
          {/* Score label */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-white/60">
            {score}
          </div>
        </div>

        {/* Winner celebration */}
        {isWinner && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 animate-bounce text-lg">
            🎉
          </div>
        )}
      </div>
    </div>
  );
}

export default function BattlePath({ 
  scoreA = 0, scoreB = 0, maxScore = 11, 
  playerA = {}, playerB = {}, 
  server = 'a', streakA = 0, streakB = 0,
  winner = null, swapped = false,
  goalIcon = 'trophy', mode = 'compact' // compact | full
}) {
  const leftScore = swapped ? scoreB : scoreA;
  const rightScore = swapped ? scoreA : scoreB;
  const leftPlayer = swapped ? playerB : playerA;
  const rightPlayer = swapped ? playerA : playerB;
  const leftStreak = swapped ? streakB : streakA;
  const rightStreak = swapped ? streakA : streakB;
  const leftServing = (swapped ? 'b' : 'a') === server;
  const rightServing = (swapped ? 'a' : 'b') === server;
  const leftWon = winner === (swapped ? 'b' : 'a');
  const rightWon = winner === (swapped ? 'a' : 'b');
  
  const icon = GOAL_ICONS[goalIcon] || '🏆';
  const height = mode === 'full' ? 'h-64' : 'h-24';

  return (
    <div className={`flex items-stretch gap-3 ${height}`}>
      {/* Left player path */}
      <PlayerPath 
        nickname={leftPlayer.nickname} photo={leftPlayer.photo_url}
        score={leftScore} maxScore={maxScore} side="left"
        isServing={leftServing} streak={leftStreak} isWinner={leftWon}
      />

      {/* Center — trophy goal */}
      <div className="flex flex-col items-center justify-between w-8 shrink-0">
        <div className="text-center">
          <span className={`text-lg ${winner ? 'animate-bounce' : ''}`}>{icon}</span>
          <span className="block text-[7px] text-white/20">{maxScore}</span>
        </div>
        <div className="flex-1 flex items-center">
          <div className="w-px h-full bg-white/5" />
        </div>
        <span className="text-[7px] text-white/20">0</span>
      </div>

      {/* Right player path */}
      <PlayerPath 
        nickname={rightPlayer.nickname} photo={rightPlayer.photo_url}
        score={rightScore} maxScore={maxScore} side="right"
        isServing={rightServing} streak={rightStreak} isWinner={rightWon}
      />
    </div>
  );
}
