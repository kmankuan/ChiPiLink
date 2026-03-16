/**
 * Board Mapper — Configure which Monday.com columns map to student data
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Save, RefreshCw, Database, Download } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

const COLUMN_FIELDS = [
  { key: 'student_name', label: 'Student Name', required: true },
  { key: 'grade', label: 'Grade' },
  { key: 'school', label: 'School' },
  { key: 'parent_name', label: 'Parent Name' },
  { key: 'parent_phone', label: 'Parent Phone' },
  { key: 'parent_language', label: 'Parent Language' },
  { key: 'membership_type', label: 'Membership Type' },
  { key: 'school_platform', label: 'School Platform' },
];

export default function BoardMapper() {
  const navigate = useNavigate();
  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const [boardId, setBoardId] = useState('');
  const [columns, setColumns] = useState([]);
  const [columnMap, setColumnMap] = useState({});
  const [mappings, setMappings] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/tutor/board-mappings`, { headers }).then(r => r.ok ? r.json() : []).then(m => {
      setMappings(m);
      if (m.length > 0) { setBoardId(m[0].board_id); setColumnMap(m[0].column_map || {}); }
    }).catch(() => {});
  }, []);

  const fetchColumns = async () => {
    if (!boardId) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/hub/monday/stats`, { headers });
      // Fetch board columns via the Monday proxy
      const cr = await fetch(`${API}/api/sysbook/monday-config/boards`, { headers });
      if (cr.ok) {
        const boards = await cr.json();
        // Try to get columns for specific board
        const colR = await fetch(`${API}/api/hub/connections`, { headers });
      }
    } catch {} finally { setLoading(false); }
    // For now, let admin type column IDs manually
    toast.info('Enter Monday.com column IDs manually. Find them in Monday board settings.');
  };

  const saveMapping = async () => {
    const r = await fetch(`${API}/api/tutor/board-mappings`, {
      method: 'POST', headers,
      body: JSON.stringify({ board_id: boardId, board_type: 'student', column_map: columnMap }),
    });
    if (r.ok) toast.success('Board mapping saved');
    else toast.error('Failed to save');
  };

  const syncStudents = async () => {
    if (!boardId) { toast.error('Set board ID first'); return; }
    setSyncing(true);
    try {
      const r = await fetch(`${API}/api/tutor/sync-from-monday/${boardId}`, { method: 'POST', headers });
      if (r.ok) { const d = await r.json(); toast.success(`Synced ${d.synced} students from ${d.total_items} items`); }
      else { const e = await r.json(); toast.error(e.detail || 'Sync failed'); }
    } catch { toast.error('Error'); }
    finally { setSyncing(false); }
  };

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #FBF7F0 0%, #F5EDE0 100%)' }}>
      <div style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }} className="px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-white" onClick={() => navigate('/tutor')}><ArrowLeft className="h-4 w-4" /></Button>
          <Database className="h-5 w-5 text-white" />
          <h1 className="text-base font-bold text-white">Monday.com Board Mapper</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Board ID */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Student Inscription Board</CardTitle>
            <CardDescription className="text-xs">Connect your Monday.com board to auto-import students</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Board ID</Label>
              <Input value={boardId} onChange={e => setBoardId(e.target.value)} placeholder="e.g. 18399650704" className="h-9 font-mono" />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium">Column Mapping</p>
              <p className="text-[9px] text-muted-foreground">Enter the Monday.com column ID for each field. Find column IDs in Board settings → Columns.</p>
              {COLUMN_FIELDS.map(f => (
                <div key={f.key} className="flex items-center gap-2">
                  <Label className="text-[10px] w-28 shrink-0">{f.label} {f.required && <span className="text-red-500">*</span>}</Label>
                  <Input value={columnMap[f.key] || ''} onChange={e => setColumnMap(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder="column_id" className="h-7 text-xs font-mono flex-1" />
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={saveMapping}><Save className="h-3.5 w-3.5 mr-1" /> Save Mapping</Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={syncStudents} disabled={syncing}>
                <Download className={`h-3.5 w-3.5 mr-1 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Syncing...' : 'Sync Students'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Existing mappings */}
        {mappings.length > 0 && (
          <Card>
            <CardContent className="p-3">
              <h4 className="text-xs font-bold mb-2">Saved Mappings</h4>
              {mappings.map(m => (
                <div key={m.mapping_id} className="flex items-center justify-between py-1 text-xs">
                  <span className="font-mono">{m.board_id}</span>
                  <Badge variant="outline" className="text-[9px]">{m.board_type}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
