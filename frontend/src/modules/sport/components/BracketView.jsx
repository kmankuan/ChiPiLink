/**
 * BracketView — Challonge-style bracket tree
 * Supports: Single Elimination, Double Elimination (winners + losers bracket)
 * Mobile: horizontally scrollable
 */
import { Badge } from '@/components/ui/badge';
import { Trophy } from 'lucide-react';

function MatchCard({ match, onReport, isAdmin }) {
  const pa = match.player_a;
  const pb = match.player_b;
  const isComplete = match.status === 'completed' || match.status === 'bye';
  const isPending = match.status === 'pending';
  const isWaiting = match.status === 'waiting';

  return (
    <div className={`rounded-lg border text-xs w-40 shrink-0 overflow-hidden transition-all ${
      isComplete ? 'border-green-500/30 bg-green-500/5' :
      isPending ? 'border-yellow-500/30 bg-yellow-500/5 shadow-sm shadow-yellow-500/10' :
      'border-white/10 bg-white/5'
    }`}>
      {/* Player A */}
      <div className={`flex items-center justify-between px-2 py-1.5 ${
        match.winner_id === pa?.player_id ? 'bg-green-500/10' : ''
      }`}>
        <div className="flex items-center gap-1 min-w-0">
          {pa?.seed && <span className="text-[8px] text-white/30 w-3">{pa.seed}</span>}
          <span className={`truncate text-[11px] ${
            match.winner_id === pa?.player_id ? 'text-green-400 font-bold' : 
            isComplete && match.winner_id !== pa?.player_id ? 'text-white/30 line-through' : 'text-white/70'
          }`}>
            {pa?.nickname || (isWaiting ? '...' : 'BYE')}
          </span>
        </div>
        {isComplete && match.score && (
          <span className="text-white/50 font-mono text-[10px]">{match.score.split('-')[0]}</span>
        )}
      </div>
      <div className="h-px bg-white/10" />
      {/* Player B */}
      <div className={`flex items-center justify-between px-2 py-1.5 ${
        match.winner_id === pb?.player_id ? 'bg-green-500/10' : ''
      }`}>
        <div className="flex items-center gap-1 min-w-0">
          {pb?.seed && <span className="text-[8px] text-white/30 w-3">{pb.seed}</span>}
          <span className={`truncate text-[11px] ${
            match.winner_id === pb?.player_id ? 'text-green-400 font-bold' : 
            isComplete && match.winner_id !== pb?.player_id ? 'text-white/30 line-through' : 'text-white/70'
          }`}>
            {pb?.nickname || (isWaiting ? '...' : 'BYE')}
          </span>
        </div>
        {isComplete && match.score && (
          <span className="text-white/50 font-mono text-[10px]">{match.score.split('-')[1]}</span>
        )}
      </div>
      {/* Report button for admin */}
      {isPending && isAdmin && pa && pb && (
        <button className="w-full py-1 text-[9px] text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 text-center"
          onClick={() => onReport(match)}>
          Report Result
        </button>
      )}
      {/* Third place indicator */}
      {match.is_third_place && (
        <div className="text-center py-0.5 bg-amber-500/10 text-amber-400 text-[8px]">🥉 3rd Place</div>
      )}
      {/* Grand final indicator */}
      {match.is_grand_final && (
        <div className="text-center py-0.5 bg-yellow-500/10 text-yellow-400 text-[8px]">🏆 Grand Final</div>
      )}
    </div>
  );
}

function BracketColumn({ round, roundIndex, totalRounds, onReport, isAdmin }) {
  const spacing = Math.pow(2, roundIndex);
  const isFinal = round.name?.includes('Final');
  const isThird = round.name?.includes('Third');
  const isSemi = round.name?.includes('Semi');

  return (
    <div className="flex flex-col items-center min-w-[160px]">
      {/* Round header */}
      <div className={`text-[10px] font-bold mb-2 text-center whitespace-nowrap px-2 py-0.5 rounded-full ${
        isFinal ? 'bg-yellow-500/20 text-yellow-400' :
        isThird ? 'bg-amber-500/20 text-amber-400' :
        isSemi ? 'bg-purple-500/20 text-purple-300' :
        'text-white/40'
      }`}>
        {round.name}
        {round.bracket && <span className="text-[8px] ml-1 opacity-60">({round.bracket})</span>}
      </div>
      {/* Matches */}
      <div className="flex flex-col justify-around flex-1" style={{ gap: `${Math.min(spacing * 12, 80)}px` }}>
        {round.matches.map(match => (
          <MatchCard key={match.match_id} match={match} onReport={onReport} isAdmin={isAdmin} />
        ))}
      </div>
    </div>
  );
}

export default function BracketView({ rounds = [], onReport, isAdmin = false }) {
  if (!rounds.length) return null;

  // Separate winners, losers, and final brackets for double elimination
  const winnersRounds = rounds.filter(r => !r.bracket || r.bracket === 'winners');
  const losersRounds = rounds.filter(r => r.bracket === 'losers');
  const finalRounds = rounds.filter(r => r.bracket === 'final');
  const hasDoubleElim = losersRounds.length > 0;

  return (
    <div className="space-y-4">
      {/* Winners bracket (or single elimination) */}
      {hasDoubleElim && (
        <div className="text-[10px] font-bold text-green-400 flex items-center gap-1">
          <Trophy className="h-3 w-3" /> Winners Bracket
        </div>
      )}
      <div className="overflow-x-auto pb-3">
        <div className="flex gap-4 min-w-max px-1">
          {winnersRounds.map((round, i) => (
            <BracketColumn key={round.round} round={round} roundIndex={i} totalRounds={winnersRounds.length} onReport={onReport} isAdmin={isAdmin} />
          ))}
          {/* Final rounds inline */}
          {finalRounds.map((round, i) => (
            <BracketColumn key={round.round} round={round} roundIndex={winnersRounds.length + i} totalRounds={winnersRounds.length + finalRounds.length} onReport={onReport} isAdmin={isAdmin} />
          ))}
        </div>
      </div>

      {/* Losers bracket */}
      {hasDoubleElim && losersRounds.length > 0 && (
        <>
          <div className="text-[10px] font-bold text-red-400 flex items-center gap-1">
            <span>↓</span> Losers Bracket
          </div>
          <div className="overflow-x-auto pb-3">
            <div className="flex gap-4 min-w-max px-1">
              {losersRounds.map((round, i) => (
                <BracketColumn key={round.round} round={round} roundIndex={i} totalRounds={losersRounds.length} onReport={onReport} isAdmin={isAdmin} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
