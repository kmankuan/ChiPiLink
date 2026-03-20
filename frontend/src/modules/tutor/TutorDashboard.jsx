/**
 * Tutor Dashboard — Student list, quick actions, stats
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { GraduationCap, Users, Plus, Search, Settings, Bot, BookOpen, ChevronRight, MessageCircle, Calendar } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function TutorDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.is_admin || (() => { try { const t = localStorage.getItem('auth_token'); return t && JSON.parse(atob(t.split('.')[1])).is_admin; } catch { return false; } })();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('auth_token')}` };
    fetch(`${API}/api/tutor/students`, { headers })
      .then(r => r.ok ? r.json() : []).then(setStudents).catch(() => []).finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? students.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()) || s.grade?.toLowerCase().includes(search.toLowerCase()))
    : students;

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #FBF7F0 0%, #F5EDE0 100%)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }} className="px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-white" />
              <h1 className="text-lg font-bold text-white">ChiPi Tutor</h1>
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <Button size="sm" variant="ghost" className="text-white/80 text-xs" onClick={() => navigate('/admin')}>
                  ← Admin
                </Button>
              )}
              <Button size="sm" variant="ghost" className="text-white/80 text-xs" onClick={() => navigate('/tutor/schedule')}>
                <Calendar className="h-3.5 w-3.5 mr-1" /> Schedule
              </Button>
              <Button size="sm" variant="ghost" className="text-white/80 text-xs" onClick={() => navigate('/tutor/board-mapper')}>
                <Settings className="h-3.5 w-3.5 mr-1" /> Config
              </Button>
            </div>
          </div>
          <p className="text-green-200 text-xs mt-1">{students.length} students · AI-powered tutoring</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Search + Add */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..." className="pl-9 h-10" />
          </div>
          <Button className="h-10 bg-green-600 hover:bg-green-700 text-white" onClick={() => navigate('/tutor/student/new')}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>

        {/* Student Cards */}
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading...</p>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <GraduationCap className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium mb-1">{search ? 'No students found' : 'No students yet'}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search ? 'Try a different search' : 'Add students manually or sync from Monday.com board'}
              </p>
              {!search && (
                <div className="flex gap-2 justify-center">
                  <Button size="sm" onClick={() => navigate('/tutor/student/new')}><Plus className="h-3.5 w-3.5 mr-1" /> Add Student</Button>
                  <Button size="sm" variant="outline" onClick={() => navigate('/tutor/board-mapper')}>Sync from Monday</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(s => (
              <Card key={s.student_id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/tutor/student/${s.student_id}`)}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm shrink-0">
                      {(s.name || '?')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{s.name}</span>
                        <Badge variant="outline" className="text-[9px] h-4 shrink-0">{s.grade || '?'}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        <span>{s.school || 'No school'}</span>
                        {s.parent?.name && <><span>·</span><span>Parent: {s.parent.name} ({s.parent.language})</span></>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); navigate(`/tutor/student/${s.student_id}/chat`); }}>
                        <Bot className="h-3.5 w-3.5 text-green-600" />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
