/**
 * Student Detail — Profile, agent config, knowledge sources, chat
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Bot, GraduationCap, BookOpen, Brain, Globe, FileText, Plus, RefreshCw, Trash2, Send } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function StudentDetail() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const [student, setStudent] = useState(null);
  const [agent, setAgent] = useState(null);
  const [knowledge, setKnowledge] = useState([]);
  const [tab, setTab] = useState('agent');
  const [newUrl, setNewUrl] = useState('');
  const [newNote, setNewNote] = useState('');
  const [rebuilding, setRebuilding] = useState(false);
  const [readingSchool, setReadingSchool] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAll = () => {
    Promise.all([
      fetch(`${API}/api/tutor/students/${studentId}`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`${API}/api/tutor/students/${studentId}/agent`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`${API}/api/tutor/students/${studentId}/knowledge`, { headers }).then(r => r.ok ? r.json() : []),
    ]).then(([s, a, k]) => { setStudent(s); setAgent(a); setKnowledge(k); }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, [studentId]);

  const updateAgent = async (data) => {
    const r = await fetch(`${API}/api/tutor/students/${studentId}/agent`, { method: 'PUT', headers, body: JSON.stringify(data) });
    if (r.ok) { const a = await r.json(); setAgent(a); toast.success('Agent updated'); }
  };

  const rebuildPrompt = async () => {
    setRebuilding(true);
    const r = await fetch(`${API}/api/tutor/students/${studentId}/agent/rebuild`, { method: 'POST', headers });
    if (r.ok) { const d = await r.json(); toast.success(`Prompt rebuilt: ${d.prompt_tokens} tokens, ${d.knowledge_items} sources`); fetchAll(); }
    setRebuilding(false);
  };

  const readSchool = async () => {
    setReadingSchool(true);
    try {
      const r = await fetch(`${API}/api/tutor/students/${studentId}/read-school`, { method: 'POST', headers, body: JSON.stringify({}) });
      if (r.ok) {
        const d = await r.json();
        const itemCount = d.items?.length || 0;
        const errors = d.errors?.length || 0;
        toast.success(`School read: ${itemCount} items found${errors ? `, ${errors} errors` : ''}`);
        fetchAll();
      } else {
        const e = await r.json();
        toast.error(e.detail || 'Failed to read school platform');
      }
    } catch (e) { toast.error('Error reading school'); }
    setReadingSchool(false);
  };

  const addUrl = async () => {
    if (!newUrl) return;
    const r = await fetch(`${API}/api/tutor/students/${studentId}/knowledge/url`, { method: 'POST', headers, body: JSON.stringify({ url: newUrl }) });
    if (r.ok) { toast.success('URL added + AI processed'); setNewUrl(''); fetchAll(); }
    else toast.error('Failed to process URL');
  };

  const addNote = async () => {
    if (!newNote) return;
    await fetch(`${API}/api/tutor/students/${studentId}/knowledge/note`, { method: 'POST', headers, body: JSON.stringify({ note: newNote }) });
    toast.success('Note added'); setNewNote(''); fetchAll();
  };

  if (loading || !student) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#FBF7F0' }}><span className="text-muted-foreground">Loading...</span></div>;

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #FBF7F0 0%, #F5EDE0 100%)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }} className="px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" size="sm" className="text-white mb-1" onClick={() => navigate('/tutor')}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold">{(student.name||'?')[0]}</div>
            <div>
              <h1 className="text-lg font-bold text-white">{student.name}</h1>
              <div className="flex items-center gap-2 text-green-200 text-xs">
                <span>{student.grade}</span><span>·</span><span>{student.school}</span>
                {student.parent?.name && <><span>·</span><span>{student.parent.name} ({student.parent.language})</span></>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Quick actions */}
        <div className="flex gap-2 mb-4">
          <Button size="sm" className="flex-1 bg-green-600 text-white" onClick={() => navigate(`/tutor/student/${studentId}/chat`)}>
            <Bot className="h-3.5 w-3.5 mr-1" /> Chat with Agent
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/tutor/student/${studentId}/worksheets`)}>
            <BookOpen className="h-3.5 w-3.5 mr-1" /> Worksheets
          </Button>
        </div>
        <div className="flex gap-2 mb-4">
          <Button size="sm" variant="outline" className="flex-1" onClick={rebuildPrompt} disabled={rebuilding}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${rebuilding ? 'animate-spin' : ''}`} /> Rebuild Agent
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={readSchool} disabled={readingSchool}>
            <Globe className={`h-3.5 w-3.5 mr-1 ${readingSchool ? 'animate-spin' : ''}`} /> {readingSchool ? 'Reading...' : 'Read School'}
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full mb-3">
            <TabsTrigger value="agent" className="flex-1 text-xs gap-1"><Brain className="h-3 w-3" /> Agent</TabsTrigger>
            <TabsTrigger value="knowledge" className="flex-1 text-xs gap-1"><BookOpen className="h-3 w-3" /> Knowledge ({knowledge.length})</TabsTrigger>
            <TabsTrigger value="info" className="flex-1 text-xs gap-1"><GraduationCap className="h-3 w-3" /> Info</TabsTrigger>
          </TabsList>

          {/* Agent Tab */}
          <TabsContent value="agent">
            <div className="space-y-3">
              {/* Modes */}
              <Card><CardContent className="p-3">
                <h4 className="text-xs font-bold mb-2">Agent Modes</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(agent?.modes || {}).map(([k, v]) => (
                    <button key={k} className={`px-2 py-1 rounded text-[10px] ${v ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}
                      onClick={() => updateAgent({ [`modes.${k}`]: !v })}>
                      {v ? '✅' : '⚪'} {k.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </CardContent></Card>

              {/* Custom prompt */}
              <Card><CardContent className="p-3">
                <h4 className="text-xs font-bold mb-2">Custom Instructions</h4>
                <Textarea value={agent?.system_prompt_custom || ''} onChange={e => setAgent(prev => ({ ...prev, system_prompt_custom: e.target.value }))}
                  placeholder="Add specific instructions for this student's agent..." className="text-xs min-h-[80px]" />
                <Button size="sm" className="mt-2 w-full" onClick={() => updateAgent({ system_prompt_custom: agent?.system_prompt_custom || '' })}>
                  Save Instructions
                </Button>
              </CardContent></Card>

              {/* Learning profile */}
              <Card><CardContent className="p-3">
                <h4 className="text-xs font-bold mb-2">Learning Profile</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-[10px]">Style</Label>
                    <select className="w-full h-8 rounded border text-xs px-2" value={agent?.learning_style || 'visual'}
                      onChange={e => updateAgent({ learning_style: e.target.value })}>
                      <option value="visual">Visual</option><option value="reading">Reading</option>
                      <option value="hands_on">Hands-on</option><option value="auditory">Auditory</option>
                    </select>
                  </div>
                  <div><Label className="text-[10px]">Personality</Label>
                    <select className="w-full h-8 rounded border text-xs px-2" value={agent?.personality || 'friendly_encouraging'}
                      onChange={e => updateAgent({ personality: e.target.value })}>
                      <option value="friendly_encouraging">Friendly</option><option value="strict_focused">Strict</option>
                      <option value="fun_gamified">Fun/Games</option><option value="calm_patient">Calm/Patient</option>
                    </select>
                  </div>
                </div>
                <div className="mt-2"><Label className="text-[10px]">Interests (comma separated)</Label>
                  <Input value={(agent?.interests || []).join(', ')} className="h-8 text-xs"
                    onChange={e => updateAgent({ interests: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    placeholder="ping pong, pizza, games..." />
                </div>
              </CardContent></Card>

              {/* Auto prompt preview */}
              {agent?.system_prompt_auto && (
                <Card><CardContent className="p-3">
                  <h4 className="text-xs font-bold mb-1">Auto-Generated Prompt ({agent.prompt_tokens} tokens)</h4>
                  <p className="text-[10px] text-muted-foreground mb-1">Last rebuilt: {agent.last_rebuilt ? new Date(agent.last_rebuilt).toLocaleString() : 'Never'}</p>
                  <div className="bg-muted/30 rounded p-2 text-[10px] max-h-40 overflow-y-auto whitespace-pre-wrap font-mono">
                    {agent.system_prompt_auto.substring(0, 1000)}{agent.system_prompt_auto.length > 1000 ? '...' : ''}
                  </div>
                </CardContent></Card>
              )}
            </div>
          </TabsContent>

          {/* Knowledge Tab */}
          <TabsContent value="knowledge">
            <div className="space-y-3">
              {/* Add URL */}
              <Card><CardContent className="p-3">
                <h4 className="text-xs font-bold mb-2"><Globe className="h-3 w-3 inline mr-1" /> Add URL</h4>
                <div className="flex gap-1">
                  <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://school.edu/curriculum..." className="h-8 text-xs flex-1" />
                  <Button size="sm" className="h-8" onClick={addUrl}><Plus className="h-3 w-3" /></Button>
                </div>
                <p className="text-[9px] text-muted-foreground mt-1">AI reads the page and extracts educational content</p>
              </CardContent></Card>

              {/* Add Note */}
              <Card><CardContent className="p-3">
                <h4 className="text-xs font-bold mb-2"><FileText className="h-3 w-3 inline mr-1" /> Add Note</h4>
                <div className="flex gap-1">
                  <Input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Kevin learns best with diagrams..." className="h-8 text-xs flex-1" />
                  <Button size="sm" className="h-8" onClick={addNote}><Plus className="h-3 w-3" /></Button>
                </div>
              </CardContent></Card>

              {/* Knowledge items */}
              <Card><CardContent className="p-2">
                <h4 className="text-xs font-bold mb-2">Knowledge Base ({knowledge.length} items)</h4>
                {knowledge.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground text-xs">No knowledge sources yet. Add URLs or notes above.</p>
                ) : (
                  <div className="space-y-1">
                    {knowledge.map(k => (
                      <div key={k.knowledge_id} className="p-2 rounded bg-muted/30 text-[10px]">
                        <div className="flex items-center gap-1 mb-0.5">
                          <Badge variant="outline" className="text-[8px] h-4">{k.source_type}</Badge>
                          {k.source && k.source !== 'admin' && <span className="text-muted-foreground truncate">{k.source}</span>}
                        </div>
                        <p className="text-foreground">{k.content?.substring(0, 150)}{(k.content?.length || 0) > 150 ? '...' : ''}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent></Card>
            </div>
          </TabsContent>

          {/* Info Tab */}
          <TabsContent value="info">
            <Card><CardContent className="p-3 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-[10px]">Name</Label><p className="font-medium">{student.name}</p></div>
                <div><Label className="text-[10px]">Grade</Label><p className="font-medium">{student.grade || '—'}</p></div>
                <div><Label className="text-[10px]">School</Label><p className="font-medium">{student.school || '—'}</p></div>
                <div><Label className="text-[10px]">Platform</Label><p className="font-medium">{student.school_platform || '—'}</p></div>
                <div><Label className="text-[10px]">Parent</Label><p className="font-medium">{student.parent?.name || '—'} ({student.parent?.language})</p></div>
                <div><Label className="text-[10px]">Membership</Label><p className="font-medium">{student.membership_type}</p></div>
                <div><Label className="text-[10px]">Monday Board</Label><p className="font-medium font-mono">{student.monday_board_id || '—'}</p></div>
                <div><Label className="text-[10px]">Status</Label><Badge className="bg-green-100 text-green-700 text-[9px]">{student.status}</Badge></div>
              </div>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
