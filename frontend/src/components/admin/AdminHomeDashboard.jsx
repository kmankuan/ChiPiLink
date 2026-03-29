/**
 * Admin Dashboard - Universal Page Engine rendered dashboard
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import WidgetRenderer from '@/modules/sport/components/widgets/WidgetRenderer';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function AdminHomeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.is_admin;
  
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPage = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/public/pages/admin_home`);
      if (res.ok) {
        const data = await res.json();
        setPageData(data);
      }
    } catch (e) {
      console.error('Failed to load admin_home config', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage();
  }, []);

  const blocks = pageData?.bloques 
    ? [...pageData.bloques].sort((a, b) => (a.orden || 0) - (b.orden || 0))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{pageData?.titulo || 'Admin Dashboard'}</h2>
          <p className="text-muted-foreground">Overview of your app's core metrics and activity.</p>
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/pages/admin_home')} className="gap-2">
            <Settings2 className="h-4 w-4" /> Customize Dashboard
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-muted/20 animate-pulse rounded-xl" />)}
        </div>
      ) : blocks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* A simple auto-grid based on index, for a real builder you'd want grid-span config */}
          {blocks.map((block, idx) => (
            <div key={block.bloque_id} className="col-span-12 md:col-span-12">
              <WidgetRenderer block={block} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 px-4 rounded-xl border border-dashed bg-muted/10">
          <p className="text-sm font-medium mb-2">Welcome to your customizable Admin Dashboard</p>
          <Button onClick={() => navigate('/admin/pages/admin_home')} size="sm">
            <Settings2 className="h-4 w-4 mr-2" /> Start Building
          </Button>
        </div>
      )}
    </div>
  );
}
