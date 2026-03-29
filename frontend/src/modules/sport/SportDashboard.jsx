/**
 * Sport Dashboard — Universal Page Engine Version
 * Shows: dynamic blocks fetched from backend page config
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';
import WidgetRenderer from './components/widgets/WidgetRenderer';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function SportDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.is_admin;
  
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPage = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/public/pages/sport_dashboard`);
      if (res.ok) {
        const data = await res.json();
        setPageData(data);
      }
    } catch (e) {
      console.error('Failed to load sport dashboard page config', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage();
  }, []);

  // Sort blocks by 'orden'
  const blocks = pageData?.bloques 
    ? [...pageData.bloques].sort((a, b) => (a.orden || 0) - (b.orden || 0))
    : [];

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #FBF7F0 0%, #F5EDE0 100%)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #C8102E 0%, #8B0000 100%)' }} className="px-4 py-4 sticky top-0 z-10 shadow-md">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏓</span>
              <h1 className="text-lg font-bold text-white">{pageData?.titulo || t('sport.title', 'Sport Dashboard')}</h1>
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="bg-black/20 text-white hover:bg-black/40 hover:text-white text-xs gap-1 h-8 rounded-lg" 
                  onClick={() => navigate('/admin/pages/sport_dashboard')}
                >
                  <Settings2 className="h-3.5 w-3.5" /> Edit Dashboard
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-black/5 animate-pulse rounded-xl" />)}
          </div>
        ) : blocks.length > 0 ? (
          blocks.map(block => (
            <WidgetRenderer key={block.bloque_id} block={block} />
          ))
        ) : (
          <div className="text-center py-12 px-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/50">
            <p className="text-sm text-amber-800 font-medium mb-2">Dashboard Not Configured</p>
            {isAdmin ? (
              <Button onClick={() => navigate('/admin/pages/sport_dashboard')} size="sm" className="bg-amber-600 hover:bg-amber-700">
                <Settings2 className="h-4 w-4 mr-2" /> Build Dashboard
              </Button>
            ) : (
              <p className="text-xs text-amber-700">The administrator hasn't added any widgets here yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
