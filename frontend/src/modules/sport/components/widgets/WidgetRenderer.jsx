import { lazy, Suspense } from 'react';
import { Layers } from 'lucide-react';

const SportLeagueLeaderboardWidget = lazy(() => import('./SportLeagueLeaderboardWidget'));
const SportRecentMatchesWidget = lazy(() => import('./SportRecentMatchesWidget'));
const SportQuickActionsWidget = lazy(() => import('./SportQuickActionsWidget'));
const SportLiveMatchesWidget = lazy(() => import('./SportLiveMatchesWidget'));
const SportNavRowWidget = lazy(() => import('./SportNavRowWidget'));
const SportTopPlayersWidget = lazy(() => import('./SportTopPlayersWidget'));

export default function WidgetRenderer({ block }) {
  if (!block || !block.tipo) return null;
  
  // Visibility check: If block is strictly unpublished, we don't render it.
  // (In admin edit mode, it would be rendered with a faded overlay, but this is the public renderer)
  if (block.publicado === false) return null;

  const Fallback = () => (
    <div className="p-4 border border-dashed rounded-lg text-center text-xs text-muted-foreground bg-gray-50">
      <Layers className="h-4 w-4 mx-auto mb-1 opacity-50" />
      Unknown widget type: {block.tipo}
    </div>
  );

  return (
    <div className="mb-4" data-block-id={block.bloque_id}>
      <Suspense fallback={<div className="h-20 animate-pulse bg-muted/50 rounded-xl" />}>
        {block.tipo === 'sport_league_leaderboard' && <SportLeagueLeaderboardWidget config={block.config} />}
        {block.tipo === 'sport_recent_matches' && <SportRecentMatchesWidget config={block.config} />}
        {block.tipo === 'sport_quick_actions' && <SportQuickActionsWidget config={block.config} />}
        {block.tipo === 'sport_live_matches' && <SportLiveMatchesWidget config={block.config} />}
        {block.tipo === 'sport_nav_row' && <SportNavRowWidget config={block.config} />}
        {block.tipo === 'sport_top_players' && <SportTopPlayersWidget config={block.config} />}
        
        {/* If standard Landing Page widgets (hero, features, text, etc) are needed here, 
            they can be imported and added to the switch statement */}
            
        {![
          'sport_league_leaderboard', 'sport_recent_matches', 'sport_quick_actions',
          'sport_live_matches', 'sport_nav_row', 'sport_top_players'
        ].includes(block.tipo) && <Fallback />}
      </Suspense>
    </div>
  );
}
