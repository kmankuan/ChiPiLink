import { Button } from '@/components/ui/button';
import { Plus, Zap, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

export default function SportQuickActionsWidget({ config }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  
  // Ensure we only show if logged in, unless public is explicitly true
  if (!user && !config?.visibility?.public) {
    return null; 
  }

  const isAdmin = user?.is_admin;
  const canReferee = isAdmin || hasPermission('sport.referee');

  return (
    <div className="grid grid-cols-3 gap-2">
      {config?.show_record_match !== false && (
        <Button className="h-14 rounded-xl text-white font-bold text-xs flex-col gap-1 hover:brightness-110 transition-all" 
          style={{ background: '#C8102E' }}
          onClick={() => navigate('/sport/match/new')}>
          <Plus className="h-4 w-4" /> Record Match
        </Button>
      )}
      
      {config?.show_referee !== false && (
        <Button className="h-14 rounded-xl text-white font-bold text-xs flex-col gap-1 hover:brightness-110 transition-all" 
          style={{ background: '#2d2217' }}
          onClick={() => navigate('/sport/live/new')}>
          <Zap className="h-4 w-4" /> Referee
        </Button>
      )}
      
      {config?.show_stream !== false && canReferee && (
        <Button className="h-14 rounded-xl text-white font-bold text-xs flex-col gap-1 hover:brightness-110 transition-all" 
          style={{ background: '#7c3aed' }}
          onClick={() => navigate('/sport/live/new?stream=1')}>
          <Radio className="h-4 w-4" /> Stream
        </Button>
      )}
    </div>
  );
}
