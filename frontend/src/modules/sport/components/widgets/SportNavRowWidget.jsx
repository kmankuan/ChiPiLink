import { Button } from '@/components/ui/button';
import { Trophy, Medal, Users, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useTranslation } from 'react-i18next';

export default function SportNavRowWidget({ config }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  const isAdmin = user?.is_admin;
  const canReferee = isAdmin || hasPermission('sport.referee');

  return (
    <div className="flex gap-2 flex-wrap">
      {config?.show_rankings !== false && (
        <Button variant="outline" size="sm" className="flex-1 rounded-full text-xs shadow-sm bg-white" onClick={() => navigate('/sport/rankings')}>
          <Trophy className="h-3.5 w-3.5 mr-1" /> {t('sport.rankings')}
        </Button>
      )}
      
      {config?.show_leagues !== false && (
        <Button variant="outline" size="sm" className="flex-1 rounded-full text-xs shadow-sm bg-white" onClick={() => navigate('/sport/leagues')}>
          <Medal className="h-3.5 w-3.5 mr-1" /> {t('sport.leagues')}
        </Button>
      )}
      
      {config?.show_players !== false && (
        <Button variant="outline" size="sm" className="flex-1 rounded-full text-xs shadow-sm bg-white" onClick={() => navigate('/sport/players')}>
          <Users className="h-3.5 w-3.5 mr-1" /> {t('sport.players')}
        </Button>
      )}
      
      {config?.show_tournaments !== false && canReferee && (
        <Button variant="outline" size="sm" className="flex-1 rounded-full text-xs border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 shadow-sm" onClick={() => navigate('/sport/tournament/new')}>
          <Award className="h-3.5 w-3.5 mr-1" /> Tournament
        </Button>
      )}
      
      {config?.show_fame !== false && (
        <Button variant="outline" size="sm" className="rounded-full text-xs border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 shadow-sm" onClick={() => navigate('/sport/hall-of-fame')}>
          <Trophy className="h-3.5 w-3.5 mr-1" /> Fame
        </Button>
      )}
    </div>
  );
}
