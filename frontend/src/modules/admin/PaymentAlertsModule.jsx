import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Loader2, CheckCircle, XCircle, Clock, AlertTriangle,
  Plus, Search, Mail, DollarSign, Filter, Settings,
  ListChecks, Eye, ChevronDown, ChevronRight, Trash2,
  Shield, Zap, RefreshCw, Play, FileText, LayoutGrid
} from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const API = process.env.REACT_APP_BACKEND_URL;
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem('auth_token')}` });

// ─── Stats Banner ───────────────────────────────────────────
function StatsBanner() {
  const [stats, setStats] = useState(null);
  useEffect(() => { axios.get(`${API}/api/wallet-topups/stats`, { headers: hdrs() }).then(r => setStats(r.data)).catch(() => {}); }, []);
  if (!stats) return null;
  const cards = [
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
    { label: 'Total Approved', value: `$${stats.total_approved_amount.toLocaleString()}`, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/5' },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {cards.map(c => (
        <Card key={c.label} className={c.bg}>
          <CardContent className="p-3 flex items-center gap-3">
            <c.icon className={`h-5 w-5 ${c.color} shrink-0`} />
            <div><p className="text-lg font-bold">{c.value}</p><p className="text-[10px] text-muted-foreground">{c.label}</p></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Pending Queue Tab ──────────────────────────────────────
function PendingQueueTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ amount: '', sender_name: '', bank_reference: '', target_user_email: '', notes: '' });

  const fetchItems = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/api/wallet-topups/pending?status=${filter}`, { headers: hdrs() })
      .then(r => setItems(r.data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const approve = async (id) => {
    try {
      const r = await axios.put(`${API}/api/wallet-topups/pending/${id}/approve`, {}, { headers: hdrs() });
      toast.success(r.data.credited ? 'Approved & wallet credited' : 'Approved (no user linked)');
      fetchItems();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const reject = async (id) => {
    try {
      await axios.put(`${API}/api/wallet-topups/pending/${id}/reject`, { reason: rejectNotes }, { headers: hdrs() });
      toast.success('Rejected');
      setRejectNotes('');
      setExpandedId(null);
      fetchItems();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const createManual = async () => {
    if (!createForm.amount || parseFloat(createForm.amount) <= 0) { toast.error('Valid amount required'); return; }
    try {
      await axios.post(`${API}/api/wallet-topups/pending`, {
        ...createForm,
        amount: parseFloat(createForm.amount),
        source: 'manual',
      }, { headers: hdrs() });
      toast.success('Pending top-up created');
      setShowCreate(false);
      setCreateForm({ amount: '', sender_name: '', bank_reference: '', target_user_email: '', notes: '' });
      fetchItems();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const statusBadge = (status) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400',
      approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400',
    };
    return <Badge className={`text-[10px] ${styles[status] || ''}`}>{status}</Badge>;
  };

  const riskBadge = (risk) => {
    if (!risk || risk === 'clear') return <Badge variant="outline" className="text-[9px] border-emerald-300 text-emerald-700">No Risk</Badge>;
    if (risk === 'duplicate') return <Badge className="text-[9px] bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400">DUPLICATE</Badge>;
    if (risk === 'potential_duplicate') return <Badge className="text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">POTENTIAL DUPLICATE</Badge>;
    if (risk === 'low_risk') return <Badge className="text-[9px] bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400">Low Risk</Badge>;
    return null;
  };

  const filtered = items.filter(i =>
    !search || i.sender_name?.toLowerCase().includes(search.toLowerCase()) ||
    i.bank_reference?.toLowerCase().includes(search.toLowerCase()) ||
    i.target_user_email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto mt-8" />;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-xs w-48" data-testid="topup-search" />
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)} className="h-9 px-2 text-xs border rounded-md bg-background" data-testid="topup-status-filter">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)} data-testid="create-topup-btn">
          <Plus className="h-3.5 w-3.5 mr-1" /> Manual Entry
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">Create Manual Pending Top-up</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input placeholder="Amount *" type="number" value={createForm.amount} onChange={e => setCreateForm(f => ({ ...f, amount: e.target.value }))} className="h-9 text-sm" data-testid="create-amount" />
              <Input placeholder="Sender name" value={createForm.sender_name} onChange={e => setCreateForm(f => ({ ...f, sender_name: e.target.value }))} className="h-9 text-sm" data-testid="create-sender" />
              <Input placeholder="Bank reference" value={createForm.bank_reference} onChange={e => setCreateForm(f => ({ ...f, bank_reference: e.target.value }))} className="h-9 text-sm" />
              <Input placeholder="Target user email" value={createForm.target_user_email} onChange={e => setCreateForm(f => ({ ...f, target_user_email: e.target.value }))} className="h-9 text-sm" data-testid="create-target-email" />
            </div>
            <Textarea placeholder="Notes" value={createForm.notes} onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="text-sm" />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button size="sm" onClick={createManual} data-testid="submit-create-topup">Create</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items List */}
      {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">No top-ups found.</div>}
      <div className="space-y-2">
        {filtered.map(item => (
          <Card key={item.id} className={`overflow-hidden ${item.status === 'pending' ? 'border-amber-200 dark:border-amber-800' : ''}`} data-testid={`topup-${item.id}`}>
            <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
              {expandedId === item.id ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold">${item.amount?.toLocaleString()}</span>
                  {statusBadge(item.status)}
                  {riskBadge(item.risk_level)}
                  <Badge variant="outline" className="text-[9px]">{item.source || 'manual'}</Badge>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                  {item.sender_name && <span>From: {item.sender_name}</span>}
                  {item.bank_reference && <span>Ref: {item.bank_reference}</span>}
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                </div>
              </div>
              {item.status === 'pending' && (
                <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={() => approve(item.id)} data-testid={`approve-${item.id}`}>
                    <CheckCircle className="h-3 w-3 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50" onClick={() => { setExpandedId(item.id); }} data-testid={`reject-btn-${item.id}`}>
                    <XCircle className="h-3 w-3 mr-1" /> Reject
                  </Button>
                </div>
              )}
            </div>

            {/* Expanded Details */}
            {expandedId === item.id && (
              <CardContent className="border-t bg-muted/30 p-3 space-y-2">
                <div className="grid sm:grid-cols-2 gap-2 text-xs">
                  <div><span className="font-semibold">Target User:</span> {item.target_user_email || item.target_user_id || 'Not linked'}</div>
                  <div><span className="font-semibold">Currency:</span> {item.currency}</div>
                  {item.email_from && <div><span className="font-semibold">Email From:</span> {item.email_from}</div>}
                  {item.email_subject && <div><span className="font-semibold">Email Subject:</span> {item.email_subject}</div>}
                  {item.reviewed_by && <div><span className="font-semibold">Reviewed by:</span> {item.reviewed_by} at {new Date(item.reviewed_at).toLocaleString()}</div>}
                  {item.reject_reason && <div className="text-red-600"><span className="font-semibold">Reject reason:</span> {item.reject_reason}</div>}
                  {item.notes && <div><span className="font-semibold">Notes:</span> {item.notes}</div>}
                </div>
                {/* Warning Details */}
                {item.warning_text && item.risk_level !== 'clear' && (
                  <div className="mt-2 p-2 rounded border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {item.warning_text}</p>
                    {item.dedup_warnings?.map((w, i) => <p key={i} className="text-[10px] text-amber-700 dark:text-amber-500 mt-0.5">{w}</p>)}
                  </div>
                )}
                {item.email_body_preview && (
                  <div className="mt-2">
                    <p className="text-[10px] font-semibold text-muted-foreground mb-1">Email Preview:</p>
                    <pre className="text-[10px] bg-background p-2 rounded border whitespace-pre-wrap max-h-32 overflow-auto">{item.email_body_preview}</pre>
                  </div>
                )}
                {item.ai_parsed_data && Object.keys(item.ai_parsed_data).length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] font-semibold text-muted-foreground mb-1">AI Parsed Data:</p>
                    <pre className="text-[10px] bg-background p-2 rounded border">{JSON.stringify(item.ai_parsed_data, null, 2)}</pre>
                  </div>
                )}
                {item.status === 'pending' && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                    <Input placeholder="Rejection reason..." value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} className="h-8 text-xs flex-1" data-testid="reject-reason-input" />
                    <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => reject(item.id)} data-testid={`confirm-reject-${item.id}`}>
                      Confirm Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Rules Config Tab ───────────────────────────────────────
function RulesConfigTab() {
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSender, setNewSender] = useState('');
  const [newMust, setNewMust] = useState('');
  const [newMustNot, setNewMustNot] = useState('');

  useEffect(() => { axios.get(`${API}/api/wallet-topups/rules`, { headers: hdrs() }).then(r => setRules(r.data)).catch(() => setRules({ ...defaultRules })).finally(() => setLoading(false)); }, []);

  const defaultRules = { sender_whitelist: [], must_contain_keywords: [], must_not_contain_keywords: [], amount_auto_approve_threshold: 0, amount_max_threshold: 10000, enabled: true };

  const save = async () => {
    setSaving(true);
    try {
      const r = await axios.put(`${API}/api/wallet-topups/rules`, rules, { headers: hdrs() });
      setRules(r.data);
      toast.success('Rules saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const addToList = (field, value, setter) => {
    if (!value.trim()) return;
    setRules(r => ({ ...r, [field]: [...(r[field] || []), value.trim()] }));
    setter('');
  };

  const removeFromList = (field, index) => {
    setRules(r => ({ ...r, [field]: r[field].filter((_, i) => i !== index) }));
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto mt-8" />;
  if (!rules) return null;

  return (
    <div className="space-y-4" data-testid="rules-config">
      {/* Master toggle */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Email Rules Engine</p>
            <p className="text-xs text-muted-foreground">Enable or disable automatic email filtering</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={rules.enabled} onChange={e => setRules(r => ({ ...r, enabled: e.target.checked }))} className="rounded" />
            <span className="text-xs font-medium">{rules.enabled ? 'Enabled' : 'Disabled'}</span>
          </label>
        </CardContent>
      </Card>

      {/* Sender Whitelist */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-emerald-500" /> Sender Whitelist</CardTitle>
          <p className="text-xs text-muted-foreground">Only process emails from these senders (leave empty to accept all)</p>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          <div className="flex gap-2">
            <Input placeholder="e.g. alerts@banconacional.com" value={newSender} onChange={e => setNewSender(e.target.value)} onKeyDown={e => e.key === 'Enter' && addToList('sender_whitelist', newSender, setNewSender)} className="h-8 text-xs flex-1" data-testid="add-sender-input" />
            <Button size="sm" className="h-8" onClick={() => addToList('sender_whitelist', newSender, setNewSender)} data-testid="add-sender-btn">Add</Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {(rules.sender_whitelist || []).map((s, i) => (
              <Badge key={i} variant="secondary" className="text-xs gap-1">{s}<button onClick={() => removeFromList('sender_whitelist', i)}><Trash2 className="h-2.5 w-2.5" /></button></Badge>
            ))}
            {(!rules.sender_whitelist || rules.sender_whitelist.length === 0) && <span className="text-[10px] text-muted-foreground">No senders configured (all accepted)</span>}
          </div>
        </CardContent>
      </Card>

      {/* Must Contain Keywords */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2"><Filter className="h-4 w-4 text-sky-500" /> Must Contain Keywords</CardTitle>
          <p className="text-xs text-muted-foreground">Email must contain at least one of these keywords to be processed</p>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          <div className="flex gap-2">
            <Input placeholder='e.g. "transfer received"' value={newMust} onChange={e => setNewMust(e.target.value)} onKeyDown={e => e.key === 'Enter' && addToList('must_contain_keywords', newMust, setNewMust)} className="h-8 text-xs flex-1" data-testid="add-must-input" />
            <Button size="sm" className="h-8" onClick={() => addToList('must_contain_keywords', newMust, setNewMust)}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {(rules.must_contain_keywords || []).map((k, i) => (
              <Badge key={i} variant="secondary" className="text-xs gap-1 bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400">{k}<button onClick={() => removeFromList('must_contain_keywords', i)}><Trash2 className="h-2.5 w-2.5" /></button></Badge>
            ))}
            {(!rules.must_contain_keywords || rules.must_contain_keywords.length === 0) && <span className="text-[10px] text-muted-foreground">No keywords (all emails accepted)</span>}
          </div>
        </CardContent>
      </Card>

      {/* Must NOT Contain */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /> Must NOT Contain Keywords</CardTitle>
          <p className="text-xs text-muted-foreground">Reject emails containing any of these keywords</p>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          <div className="flex gap-2">
            <Input placeholder='e.g. "failed", "reversed"' value={newMustNot} onChange={e => setNewMustNot(e.target.value)} onKeyDown={e => e.key === 'Enter' && addToList('must_not_contain_keywords', newMustNot, setNewMustNot)} className="h-8 text-xs flex-1" data-testid="add-mustnot-input" />
            <Button size="sm" className="h-8" onClick={() => addToList('must_not_contain_keywords', newMustNot, setNewMustNot)}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {(rules.must_not_contain_keywords || []).map((k, i) => (
              <Badge key={i} variant="secondary" className="text-xs gap-1 bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400">{k}<button onClick={() => removeFromList('must_not_contain_keywords', i)}><Trash2 className="h-2.5 w-2.5" /></button></Badge>
            ))}
            {(!rules.must_not_contain_keywords || rules.must_not_contain_keywords.length === 0) && <span className="text-[10px] text-muted-foreground">No reject keywords</span>}
          </div>
        </CardContent>
      </Card>

      {/* Amount Thresholds */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4 text-amber-500" /> Amount Thresholds</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Auto-approve if amount below ($0 = always require approval)</label>
              <Input type="number" value={rules.amount_auto_approve_threshold || 0} onChange={e => setRules(r => ({ ...r, amount_auto_approve_threshold: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm" data-testid="auto-approve-threshold" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Max amount (reject if above)</label>
              <Input type="number" value={rules.amount_max_threshold || 10000} onChange={e => setRules(r => ({ ...r, amount_max_threshold: parseFloat(e.target.value) || 10000 }))} className="h-8 text-sm" data-testid="max-threshold" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} data-testid="save-rules-btn">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
          Save Rules
        </Button>
      </div>
    </div>
  );
}

// ─── Settings Tab ───────────────────────────────────────────
function SettingsTab() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gmailStatus, setGmailStatus] = useState(null);
  const [checkingGmail, setCheckingGmail] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [pollingStatus, setPollingStatus] = useState(null);

  useEffect(() => {
    axios.get(`${API}/api/wallet-topups/settings`, { headers: hdrs() }).then(r => setSettings(r.data)).catch(() => setSettings({})).finally(() => setLoading(false));
    axios.get(`${API}/api/wallet-topups/polling/status`, { headers: hdrs() }).then(r => setPollingStatus(r.data)).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const r = await axios.put(`${API}/api/wallet-topups/settings`, settings, { headers: hdrs() });
      setSettings(r.data);
      toast.success('Settings saved');
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const checkGmail = async () => {
    setCheckingGmail(true);
    try {
      const r = await axios.get(`${API}/api/wallet-topups/gmail/status`, { headers: hdrs() });
      setGmailStatus(r.data);
      if (r.data.connected) toast.success(`Gmail connected: ${r.data.email}`);
      else toast.error(r.data.error || 'Connection failed');
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    finally { setCheckingGmail(false); }
  };

  const scanNow = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const r = await axios.post(`${API}/api/wallet-topups/gmail/process`, { limit: 20 }, { headers: hdrs() });
      setScanResult(r.data);
      if (r.data.created > 0) toast.success(`Found ${r.data.created} new payment(s)!`);
      else toast.info(`Scanned ${r.data.processed} emails, no new payments found`);
    } catch (e) { toast.error(e.response?.data?.detail || 'Scan failed'); }
    finally { setScanning(false); }
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto mt-8" />;
  if (!settings) return null;

  return (
    <div className="space-y-4" data-testid="topup-settings">
      {/* Gmail Connection */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2"><Mail className="h-4 w-4 text-red-500" /> Gmail Connection</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-3">
          <div className="flex items-center gap-3">
            {gmailStatus?.connected || settings.gmail_connected ? (
              <div className="flex items-center gap-2 flex-1">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium">Connected: {gmailStatus?.email || settings.gmail_email}</span>
                {gmailStatus?.total_emails !== undefined && <Badge variant="outline" className="text-[10px]">{gmailStatus.total_emails} emails in inbox</Badge>}
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm">Not connected yet</span>
              </div>
            )}
            <Button size="sm" variant="outline" onClick={checkGmail} disabled={checkingGmail} className="text-xs h-8" data-testid="check-gmail-btn">
              {checkingGmail ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Test Connection
            </Button>
          </div>
          {gmailStatus?.error && <p className="text-xs text-red-600">{gmailStatus.error}</p>}
        </CardContent>
      </Card>

      {/* Scan Now */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2"><Play className="h-4 w-4 text-emerald-500" /> Scan Emails Now</CardTitle>
          <p className="text-xs text-muted-foreground">Manually trigger email scan — fetches recent emails, parses with AI, applies rules</p>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-3">
          <Button onClick={scanNow} disabled={scanning} data-testid="scan-now-btn">
            {scanning ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Mail className="h-4 w-4 mr-1" />}
            {scanning ? 'Scanning...' : 'Scan Gmail Inbox'}
          </Button>
          {scanResult && (
            <Card className="bg-muted/30">
              <CardContent className="p-3">
                <div className="flex gap-4 text-xs mb-2">
                  <span>Processed: <strong>{scanResult.processed}</strong></span>
                  <span className="text-emerald-600">Created: <strong>{scanResult.created}</strong></span>
                  <span className="text-muted-foreground">Skipped: <strong>{scanResult.skipped}</strong></span>
                  <span className="text-red-600">Rejected: <strong>{scanResult.rejected}</strong></span>
                  {scanResult.errors > 0 && <span className="text-amber-600">Errors: <strong>{scanResult.errors}</strong></span>}
                </div>
                {scanResult.details?.length > 0 && (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {scanResult.details.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] py-0.5">
                        <Badge variant="outline" className={`text-[9px] w-14 justify-center ${d.result === 'created' ? 'border-emerald-300 text-emerald-700' : d.result === 'rejected' ? 'border-red-300 text-red-700' : 'border-slate-300 text-slate-600'}`}>
                          {d.result}
                        </Badge>
                        <span className="truncate flex-1">{d.subject || '(no subject)'}</span>
                        {d.reason && <span className="text-muted-foreground truncate max-w-40">{d.reason}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Polling Mode */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-sky-500" /> Email Checking Mode</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-3">
          <div className="flex gap-3">
            {[
              { value: 'realtime', label: 'Real-time', desc: 'Auto-scan every N minutes in background' },
              { value: 'manual', label: 'Manual', desc: 'Only scan on demand' },
            ].map(opt => (
              <label key={opt.value} className={`flex-1 p-3 border rounded-lg cursor-pointer transition-colors ${settings.polling_mode === opt.value ? 'border-primary bg-primary/5' : 'hover:bg-accent/30'}`}>
                <input type="radio" name="polling_mode" value={opt.value} checked={settings.polling_mode === opt.value} onChange={e => setSettings(s => ({ ...s, polling_mode: e.target.value }))} className="sr-only" />
                <p className="text-xs font-semibold">{opt.label}</p>
                <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
              </label>
            ))}
          </div>
          {settings.polling_mode === 'realtime' && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Check every (minutes)</label>
              <Input type="number" min={1} max={60} value={settings.polling_interval_minutes || 5} onChange={e => setSettings(s => ({ ...s, polling_interval_minutes: parseInt(e.target.value) || 5 }))} className="h-8 text-sm w-32" data-testid="polling-interval" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Options */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2"><Settings className="h-4 w-4 text-muted-foreground" /> Processing Options</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={settings.auto_process !== false} onChange={e => setSettings(s => ({ ...s, auto_process: e.target.checked }))} className="rounded" />
            <div>
              <p className="text-xs font-semibold">Auto-process detected emails</p>
              <p className="text-[10px] text-muted-foreground">Automatically parse and create pending top-ups from matching emails</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={settings.require_approval !== false} onChange={e => setSettings(s => ({ ...s, require_approval: e.target.checked }))} className="rounded" />
            <div>
              <p className="text-xs font-semibold">Require admin approval</p>
              <p className="text-[10px] text-muted-foreground">All top-ups require manual approval before crediting wallet (recommended)</p>
            </div>
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} data-testid="save-settings-btn">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}

// ─── Processing Log Tab ─────────────────────────────────────
function ProcessingLogTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { axios.get(`${API}/api/wallet-topups/gmail/processed?limit=50`, { headers: hdrs() }).then(r => setItems(r.data.items)).catch(() => setItems([])).finally(() => setLoading(false)); }, []);

  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto mt-8" />;

  const resultBadge = (r) => {
    const styles = {
      created_pending: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400',
      rejected_by_rules: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400',
      skipped_not_transaction: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    };
    return <Badge className={`text-[9px] ${styles[r] || ''}`}>{r?.replace(/_/g, ' ')}</Badge>;
  };

  return (
    <div className="space-y-2" data-testid="processing-log">
      <p className="text-xs text-muted-foreground">{items.length} processed emails</p>
      {items.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">No emails processed yet. Use "Scan Gmail Inbox" in Settings to start.</div>}
      {items.map((item, i) => (
        <Card key={i}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              {resultBadge(item.result)}
              <span className="text-xs text-muted-foreground">{new Date(item.processed_at).toLocaleString()}</span>
              {item.reason && <span className="text-[10px] text-muted-foreground">- {item.reason}</span>}
            </div>
            {item.parsed_data && (
              <div className="text-[10px] text-muted-foreground mt-1">
                {item.parsed_data.amount > 0 && <span className="mr-3">Amount: ${item.parsed_data.amount}</span>}
                {item.parsed_data.sender_name && <span className="mr-3">From: {item.parsed_data.sender_name}</span>}
                {item.parsed_data.confidence > 0 && <span>Confidence: {item.parsed_data.confidence}%</span>}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Monday.com Config Tab ──────────────────────────────────
function MondayConfigTab() {
  const [config, setConfig] = useState(null);
  const [boards, setBoards] = useState([]);
  const [columns, setColumns] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connStatus, setConnStatus] = useState(null);
  const [loadingCols, setLoadingCols] = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/wallet-topups/monday/config`, { headers: hdrs() }).then(r => setConfig(r.data)).catch(() => {}),
      axios.get(`${API}/api/wallet-topups/monday/boards`, { headers: hdrs() }).then(r => setBoards(r.data.boards || [])).catch(() => setBoards([])),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (config?.board_id) loadColumns(config.board_id);
  }, [config?.board_id]);

  const loadColumns = async (boardId) => {
    if (!boardId) return;
    setLoadingCols(true);
    try {
      const r = await axios.get(`${API}/api/wallet-topups/monday/boards/${boardId}/columns`, { headers: hdrs() });
      setColumns(r.data.columns || []);
      setGroups(r.data.groups || []);
    } catch { setColumns([]); setGroups([]); }
    finally { setLoadingCols(false); }
  };

  const testConn = async () => {
    setTesting(true);
    try {
      const r = await axios.post(`${API}/api/wallet-topups/monday/test`, {}, { headers: hdrs() });
      setConnStatus(r.data);
      if (r.data.connected) toast.success(`Connected: ${r.data.user} (${r.data.account})`);
      else toast.error(r.data.error || 'Connection failed');
    } catch (e) { toast.error('Failed'); }
    finally { setTesting(false); }
  };

  const selectBoard = async (boardId) => {
    const board = boards.find(b => b.id === boardId);
    setConfig(c => ({ ...c, board_id: boardId, board_name: board?.name || '' }));
    if (boardId) loadColumns(boardId);
  };

  const setMapping = (field, colId) => {
    setConfig(c => ({ ...c, column_mapping: { ...c.column_mapping, [field]: colId } }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const r = await axios.put(`${API}/api/wallet-topups/monday/config`, config, { headers: hdrs() });
      setConfig(r.data);
      toast.success('Monday.com configuration saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto mt-8" />;
  if (!config) return null;

  const mappingFields = [
    { key: 'amount', label: 'Amount', desc: 'Column for the transaction amount' },
    { key: 'sender_name', label: 'Sender Name', desc: 'Who sent the payment' },
    { key: 'status', label: 'Status', desc: 'Pending/Approved/Rejected status' },
    { key: 'warning', label: 'Warning/Risk', desc: 'Duplicate detection warning level' },
    { key: 'bank_reference', label: 'Bank Reference', desc: 'Transaction reference number' },
    { key: 'email_date', label: 'Email Date & Time', desc: 'When the email was received' },
    { key: 'source', label: 'Source', desc: 'gmail / manual' },
    { key: 'confidence', label: 'AI Confidence', desc: 'How confident the AI parsing was' },
  ];

  return (
    <div className="space-y-4" data-testid="monday-config">
      {/* Connection Test */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <img src="https://cdn.monday.com/images/favicon-v2/32.png" alt="" className="h-4 w-4" />
            Monday.com Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="flex items-center gap-3">
            {connStatus?.connected ? (
              <div className="flex items-center gap-2 flex-1">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span className="text-sm">Connected: {connStatus.user} ({connStatus.account})</span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground flex-1">Click "Test" to verify connection</span>
            )}
            <Button size="sm" variant="outline" onClick={testConn} disabled={testing} className="text-xs h-8" data-testid="test-monday-btn">
              {testing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Test
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enable Toggle */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Sync to Monday.com Board</p>
            <p className="text-xs text-muted-foreground">Create items on Monday.com when payment alerts are detected</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={config.enabled} onChange={e => setConfig(c => ({ ...c, enabled: e.target.checked }))} className="rounded" />
            <span className="text-xs font-medium">{config.enabled ? 'Enabled' : 'Disabled'}</span>
          </label>
        </CardContent>
      </Card>

      {/* Board Selection */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Select Board</CardTitle>
          <p className="text-xs text-muted-foreground">Choose which Monday.com board to sync payment alerts to</p>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          <select
            value={config.board_id || ''}
            onChange={e => selectBoard(e.target.value)}
            className="h-9 w-full px-3 text-sm border rounded-md bg-background"
            data-testid="select-board"
          >
            <option value="">-- Select a board --</option>
            {boards.map(b => <option key={b.id} value={b.id}>{b.name} (ID: {b.id})</option>)}
          </select>
          {config.board_id && config.board_name && (
            <p className="text-xs text-muted-foreground">Selected: <strong>{config.board_name}</strong></p>
          )}
        </CardContent>
      </Card>

      {/* Group Selection */}
      {config.board_id && groups.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Select Group (Optional)</CardTitle>
            <p className="text-xs text-muted-foreground">Which group on the board should items be created in?</p>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <select
              value={config.group_id || ''}
              onChange={e => setConfig(c => ({ ...c, group_id: e.target.value }))}
              className="h-9 w-full px-3 text-sm border rounded-md bg-background"
              data-testid="select-group"
            >
              <option value="">-- Default (first group) --</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </CardContent>
        </Card>
      )}

      {/* Column Mapping */}
      {config.board_id && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Column Mapping</CardTitle>
            <p className="text-xs text-muted-foreground">Map payment alert fields to Monday.com board columns</p>
            {loadingCols && <Loader2 className="h-3 w-3 animate-spin" />}
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-3">
              {mappingFields.map(field => (
                <div key={field.key} className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="sm:w-40 shrink-0">
                    <p className="text-xs font-semibold">{field.label}</p>
                    <p className="text-[10px] text-muted-foreground">{field.desc}</p>
                  </div>
                  <select
                    value={config.column_mapping?.[field.key] || ''}
                    onChange={e => setMapping(field.key, e.target.value)}
                    className="h-8 flex-1 px-2 text-xs border rounded-md bg-background"
                    data-testid={`map-${field.key}`}
                  >
                    <option value="">-- Not mapped --</option>
                    {columns.map(c => (
                      <option key={c.id} value={c.id}>{c.title} ({c.type})</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Post Email as Update */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold">Post email summary as item Update</p>
            <p className="text-[10px] text-muted-foreground">The full email content and risk assessment will be posted as a comment on the Monday.com item</p>
          </div>
          <input type="checkbox" checked={config.post_email_as_update !== false} onChange={e => setConfig(c => ({ ...c, post_email_as_update: e.target.checked }))} className="rounded" />
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} data-testid="save-monday-config-btn">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
          Save Configuration
        </Button>
      </div>
    </div>
  );
}

// ─── Main Module ────────────────────────────────────────────
export default function PaymentAlertsModule() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4" data-testid="payment-alerts-module">
      <StatsBanner />
      <Tabs defaultValue="pending">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="pending" className="gap-1.5 text-xs" data-testid="tab-pending">
            <ListChecks className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('paymentAlerts.tabs.pending', 'Pending Queue')}</span>
            <span className="sm:hidden">Queue</span>
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5 text-xs" data-testid="tab-rules">
            <Filter className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('paymentAlerts.tabs.rules', 'Email Rules')}</span>
            <span className="sm:hidden">Rules</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 text-xs" data-testid="tab-settings">
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('paymentAlerts.tabs.settings', 'Settings')}</span>
            <span className="sm:hidden">Config</span>
          </TabsTrigger>
          <TabsTrigger value="log" className="gap-1.5 text-xs" data-testid="tab-log">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('paymentAlerts.tabs.log', 'Processing Log')}</span>
            <span className="sm:hidden">Log</span>
          </TabsTrigger>
          <TabsTrigger value="monday" className="gap-1.5 text-xs" data-testid="tab-monday">
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('paymentAlerts.tabs.monday', 'Monday.com Config')}</span>
            <span className="sm:hidden">Monday</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending"><PendingQueueTab /></TabsContent>
        <TabsContent value="rules"><RulesConfigTab /></TabsContent>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
        <TabsContent value="log"><ProcessingLogTab /></TabsContent>
        <TabsContent value="monday"><MondayConfigTab /></TabsContent>
      </Tabs>
    </div>
  );
}
