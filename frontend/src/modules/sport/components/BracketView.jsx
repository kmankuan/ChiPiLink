/**
 * BracketView — Challonge-style elimination bracket tree
 * Renders rounds as columns with match cards connected by lines
 * Mobile: horizontally scrollable
 */
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, ChevronRight } from 'lucide-react';

function MatchCard({ match, onReport, isAdmin }) {
  const pa = match.player_a;
  const pb = match.player_b;
  const isComplete = match.status === 'completed' || match.status === 'bye';
  const isWaiting = match.status === 'waiting';
  const isPending = match.status === 'pending';

  return (
    <div className={`rounded-lg border text-xs w-44 shrink-0 overflow-hidden transition-all ${
      isComplete ? 'border-green-500/30 bg-green-500/5' :
      isPending ? 'border-yellow-500/30 bg-yellow-500/5' :
      'border-white/10 bg-white/5'
    }`}>
      {/* Player A */}
      <div className={`flex items-center justify-between px-2 py-1.5 ${
        match.winner_id === pa?.player_id ? 'bg-green-500/10 font-bold' : ''
      }`}>
        <div className="flex items-center gap-1 min-w-0">
          {pa?.seed && <span className="text-[9px] text-white/30 w-3">{pa.seed}</span>}
          <span className={`truncate ${match.winner_id === pa?.player_id ? 'text-green-400' : 'text-white/70'}`}>
            {pa?.nickname || (isWaiting ? '...' : 'BYE')}
          </span>
        </div>
        {isComplete && match.score && <span className="text-white/50 font-mono">{match.score.split('-')[0]}</span>}
      </div>
      {/* Divider */}
      <div className="h-px bg-white/10" />
      {/* Player B */}
      <div className={`flex items-center justify-between px-2 py-1.5 ${
        match.winner_id === pb?.player_id ? 'bg-green-500/10 font-bold' : ''
      }`}>
        <div className="flex items-center gap-1 min-w-0">
          {pb?.seed && <span className="text-[9px] text-white/30 w-3">{pb.seed}</span>}
          <span className={`truncate ${match.winner_id === pb?.player_id ? 'text-green-400' : 'text-white/70'}`}>
            {pb?.nickname || (isWaiting ? '...' : 'BYE')}
          </span>
        </div>
        {isComplete && match.score && <span className="text-white/50 font-mono">{match.score.split('-')[1]}</span>}
      </div>
      {/* Report button */}
      {isPending && isAdmin && pa && pb && (
        <button className="w-full py-1 text-[9px] text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 text-center"
          onClick={() => onReport(match)}>
          Report Result
        </button>
      )}
    </div>
  );
}

export default function BracketView({ rounds = [], onReport, isAdmin = false }) {
  if (!rounds.length) return null;

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-6 min-w-max px-2">
        {rounds.map((round, ri) => {
          const spacing = Math.pow(2, ri);  // Increasing vertical spacing per round
          return (
            <div key={round.round} className="flex flex-col items-center">
              {/* Round header */}
              <div className="text-[10px] text-white/40 font-bold mb-2 text-center whitespace-nowrap">
                {round.name}
              </div>
              {/* Matches */}
              <div className="flex flex-col justify-around flex-1" style={{ gap: `${spacing * 16}px` }}>
                {round.matches.map(match => (
                  <MatchCard key={match.match_id} match={match} onReport={onReport} isAdmin={isAdmin} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
