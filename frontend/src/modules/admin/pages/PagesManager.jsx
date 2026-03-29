import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout, Plus, Settings2, Globe, EyeOff, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function PagesManager() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      // For now, we fetch the known ones. In a full implementation, we'd have a backend list endpoint.
      // But we can simulate a list response by fetching landing and sport_dashboard manually.
      
      const p1 = await fetch(`${API}/api/admin/pages/landing`, { headers: { Authorization: `Bearer ${token}` } }).then(r=>r.ok?r.json():null);
      const p2 = await fetch(`${API}/api/admin/pages/sport_dashboard`, { headers: { Authorization: `Bearer ${token}` } }).then(r=>r.ok?r.json():null);
      
      const list = [];
      if (p1) list.push(p1);
      if (p2) list.push(p2);
      
      setPages(list);
    } catch (e) {
      toast.error('Failed to load pages');
    } finally {
      setLoading(false);
    }
  };

  const createPage = async (pageId, titulo) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API}/api/admin/pages/${pageId}/blocks?tipo=text`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success(`Created ${pageId}`);
        fetchPages();
      }
    } catch (e) {
      toast.error('Creation failed');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pages Manager</h2>
          <p className="text-muted-foreground">Manage your app's dynamic pages and dashboards</p>
        </div>
        <Button onClick={() => {
            const name = prompt("Enter new page ID (e.g., custom_dashboard):");
            if (name) createPage(name, name);
        }} className="gap-2">
          <Plus className="h-4 w-4" /> New Page
        </Button>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-muted/20 animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map(page => (
            <Card key={page.page_id} className="group hover:border-primary transition-colors">
              <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Layout className="h-4 w-4 text-primary" />
                    {page.titulo || page.page_id}
                  </CardTitle>
                  <CardDescription className="font-mono text-xs">/{page.page_id}</CardDescription>
                </div>
                <Badge variant={page.publicada ? "default" : "secondary"} className="gap-1">
                  {page.publicada ? <Globe className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {page.publicada ? 'Published' : 'Draft'}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <span>{page.bloques?.length || 0} active widgets</span>
                </div>
                <div className="flex gap-2">
                  <Button className="w-full gap-2" onClick={() => navigate(`/admin/pages/${page.page_id}`)}>
                    <Edit3 className="h-4 w-4" /> Edit Page Layout
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
