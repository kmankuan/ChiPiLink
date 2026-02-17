/**
 * StudentsTab — Unified Students + Access Requests management
 * Clean rewrite: single file, no redundancy
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Users, Search, Loader2, RefreshCw, Lock, Unlock, GraduationCap, Eye, ShoppingCart,
  ArrowUpDown, ArrowUp, ArrowDown, MessageCircle, LayoutGrid, List, X, Check, Clock,
  Info, AlertCircle, CheckCircle2, XCircle, ChevronDown, Clipboard
} from 'lucide-react';
import { usePagination } from '@/hooks/usePagination';
import { TablePagination } from '@/components/shared/TablePagination';
import CrmChat from '@/components/chat/CrmChat';

const API = process.env.REACT_APP_BACKEND_URL;

/* ─── i18n constants ─── */
const REJECT_REASONS = {
  en: [
    { id: 'not_enrolled', label: 'Student not enrolled', reason: 'The student is not currently enrolled in our system.' },
    { id: 'wrong_school', label: 'Wrong school', reason: 'The student is registered at a different school.' },
    { id: 'wrong_grade', label: 'Incorrect grade', reason: 'The grade level does not match our records.' },
    { id: 'duplicate', label: 'Duplicate request', reason: 'A request for this student already exists.' },
    { id: 'incomplete', label: 'Incomplete info', reason: 'The request is missing required information.' },
    { id: 'other', label: 'Other (custom)', reason: '' }
  ],
  es: [
    { id: 'not_enrolled', label: 'No esta matriculado', reason: 'El estudiante no esta matriculado actualmente en nuestro sistema.' },
    { id: 'wrong_school', label: 'Colegio incorrecto', reason: 'El estudiante esta registrado en otro colegio.' },
    { id: 'wrong_grade', label: 'Grado incorrecto', reason: 'El nivel de grado no coincide con nuestros registros.' },
    { id: 'duplicate', label: 'Solicitud duplicada', reason: 'Ya existe una solicitud para este estudiante.' },
    { id: 'incomplete', label: 'Info incompleta', reason: 'La solicitud carece de informacion requerida.' },
    { id: 'other', label: 'Otro (personalizado)', reason: '' }
  ]
};

const T = {
  en: {
    approve: 'Approve', reject: 'Reject', markInReview: 'Mark In Review', requestInfo: 'Request Info',
    approveTitle: 'Approve Request', rejectTitle: 'Reject Request', infoTitle: 'Request Information',
    adminNotes: 'Admin Notes (optional)', adminNotesPlaceholder: 'Internal notes (not visible to user)',
    selectReason: 'Select a reason', rejectionReasonPlaceholder: 'Explain why the request was rejected (optional)',
    infoMessage: 'Information Required', infoMessagePlaceholder: 'What information does the user need to provide?',
    confirm: 'Confirm', cancel: 'Cancel', noRequests: 'No requests found',
    allSchools: 'All Schools',
    statusLabels: { pending: 'Pending', in_review: 'In Review', approved: 'Approved', rejected: 'Rejected', info_required: 'Info Required' },
    toasts: { approved: 'Request approved', rejected: 'Request rejected', inReview: 'Marked as in review', infoRequested: 'Information requested' },
    school: 'School', year: 'Year', grade: 'Grade', requestedBy: 'Requested By',
    pending: 'Pending', inReview: 'In Review', all: 'All',
    students: 'Students', requests: 'Requests', refresh: 'Refresh',
  },
  es: {
    approve: 'Aprobar', reject: 'Rechazar', markInReview: 'Marcar En Revision', requestInfo: 'Pedir Info',
    approveTitle: 'Aprobar Solicitud', rejectTitle: 'Rechazar Solicitud', infoTitle: 'Solicitar Informacion',
    adminNotes: 'Notas Internas (opcional)', adminNotesPlaceholder: 'Notas internas (no visible para el usuario)',
    selectReason: 'Selecciona un motivo', rejectionReasonPlaceholder: 'Explica por que se rechazo (opcional)',
    infoMessage: 'Informacion Requerida', infoMessagePlaceholder: 'Que informacion necesita proporcionar el usuario?',
    confirm: 'Confirmar', cancel: 'Cancelar', noRequests: 'No se encontraron solicitudes',
    allSchools: 'Todos los Colegios',
    statusLabels: { pending: 'Pendiente', in_review: 'En Revision', approved: 'Aprobado', rejected: 'Rechazado', info_required: 'Info Requerida' },
    toasts: { approved: 'Solicitud aprobada', rejected: 'Solicitud rechazada', inReview: 'Marcada como en revision', infoRequested: 'Informacion solicitada' },
    school: 'Colegio', year: 'Ano', grade: 'Grado', requestedBy: 'Solicitado Por',
    pending: 'Pendientes', inReview: 'En Revision', all: 'Todas',
    students: 'Estudiantes', requests: 'Solicitudes', refresh: 'Actualizar',
  }
};

/* ─── Tiny reusable pieces ─── */
const STATUS_CFG = {
  pending:       { color: 'bg-yellow-100 text-yellow-800', Icon: Clock },
  in_review:     { color: 'bg-blue-100 text-blue-800', Icon: Info },
  approved:      { color: 'bg-green-100 text-green-800', Icon: CheckCircle2 },
  rejected:      { color: 'bg-red-100 text-red-800', Icon: XCircle },
  info_required: { color: 'bg-orange-100 text-orange-800', Icon: AlertCircle },
};

const StatusBadge = ({ status, t }) => {
  const { color, Icon } = STATUS_CFG[status] || STATUS_CFG.pending;
  return <Badge variant="secondary" className={`${color} gap-1 text-[10px]`}><Icon className="h-3 w-3" />{t.statusLabels[status] || status}</Badge>;
};

const SortHeader = ({ label, sortKey, active, direction, onSort, className = '' }) => (
  <button onClick={() => onSort(sortKey)} className={`flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider hover:text-foreground transition-colors ${className}`}>
    {label}
    {active ? (direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-2.5 w-2.5 opacity-30" />}
  </button>
);

/* ─── Main component ─── */
export default function StudentsTab({ token }) {
  const { i18n } = useTranslation();
  const lang = i18n?.language || 'es';
  const t = T[lang] || T.es;
  const rejectReasons = REJECT_REASONS[lang] || REJECT_REASONS.es;

  // Shared API helper — eliminates fetch boilerplate
  const api = useCallback(async (path, opts = {}) => {
    const res = await fetch(`${API}/api/store${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error');
    }
    return res.json();
  }, [token]);

  /* ── Section toggle ── */
  const [section, setSection] = useState('students');

  /* ── Students state ── */
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'full_name', direction: 'asc' });
  const [viewMode, setViewMode] = useState('card');
  const [lockDialog, setLockDialog] = useState(null); // { student, type: 'lock'|'unlock' }
  const [unlockReason, setUnlockReason] = useState('');
  const [detailStudent, setDetailStudent] = useState(null);
  const [chatStudent, setChatStudent] = useState(null);
  const [processing, setProcessing] = useState(false);

  /* ── Requests state ── */
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [reqFilter, setReqFilter] = useState('pending');
  const [reqSchoolFilter, setReqSchoolFilter] = useState('all');
  const [reqSchools, setReqSchools] = useState([]);
  const [reqDialog, setReqDialog] = useState(null); // { request, action }
  const [reqForm, setReqForm] = useState({ notes: '', reason: '', selectedReasonId: '' });
  const [reqProcessing, setReqProcessing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  /* ── Data fetching ── */
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/textbook-access/admin/all-students');
      setStudents(data.students || data || []);
    } catch {
      try {
        const data = await api('/students/synced');
        setStudents(data.students || []);
      } catch { toast.error('Error loading students'); }
    } finally { setLoading(false); }
  }, [api]);

  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const params = new URLSearchParams();
      if (reqFilter !== 'all') params.append('status', reqFilter);
      if (reqSchoolFilter !== 'all') params.append('school_id', reqSchoolFilter);
      const data = await api(`/textbook-access/admin/requests?${params}`);
      setRequests(data.requests || []);
    } catch { /* silent */ } finally { setRequestsLoading(false); }
  }, [api, reqFilter, reqSchoolFilter]);

  const fetchPendingCount = useCallback(async () => {
    try {
      const data = await api('/textbook-access/admin/requests?status=pending');
      setPendingCount((data.requests || []).length);
    } catch { /* silent */ }
  }, [api]);

  const fetchSchools = useCallback(async () => {
    try {
      const data = await api('/textbook-access/admin/schools');
      setReqSchools(data.schools || []);
    } catch { /* silent */ }
  }, [api]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);
  useEffect(() => { fetchPendingCount(); fetchSchools(); }, [fetchPendingCount, fetchSchools]);
  useEffect(() => { if (section === 'requests') fetchRequests(); }, [section, fetchRequests]);

  /* ── Student actions ── */
  const handleLockUnlock = async () => {
    if (!lockDialog) return;
    setProcessing(true);
    const { student, type } = lockDialog;
    const id = student.student_id || student.sync_id;
    try {
      await api(`/school-year/students/${id}/${type}`, {
        method: 'POST',
        ...(type === 'unlock' && unlockReason ? { body: JSON.stringify({ reason: unlockReason }) } : {}),
      });
      toast.success(type === 'lock' ? 'Profile locked' : 'Profile unlocked');
      fetchStudents();
    } catch { toast.error('Error updating student'); }
    finally { setProcessing(false); setLockDialog(null); setUnlockReason(''); }
  };

  const handleTogglePresale = async (studentId, current) => {
    try {
      await api('/textbook-access/admin/students/bulk-presale', {
        method: 'POST', body: JSON.stringify({ student_ids: [studentId], presale_mode: !current }),
      });
      setStudents(prev => prev.map(s => (s.student_id || s.sync_id) === studentId ? { ...s, presale_mode: !current } : s));
      toast.success(`Pre-sale ${!current ? 'enabled' : 'disabled'}`);
    } catch { toast.error('Error toggling pre-sale'); }
  };

  const handleBulkPresale = async (enable) => {
    if (!selectedIds.size) return;
    setBulkProcessing(true);
    try {
      const data = await api('/textbook-access/admin/students/bulk-presale', {
        method: 'POST', body: JSON.stringify({ student_ids: [...selectedIds], presale_mode: enable }),
      });
      toast.success(`Pre-sale ${enable ? 'enabled' : 'disabled'} for ${data.modified} students`);
      setSelectedIds(new Set());
      fetchStudents();
    } catch { toast.error('Error updating pre-sale mode'); }
    finally { setBulkProcessing(false); }
  };

  /* ── Request actions ── */
  const openReqDialog = (request, action) => {
    setReqDialog({ request, action });
    setReqForm({ notes: '', reason: '', selectedReasonId: '' });
  };

  const processRequest = async () => {
    if (!reqDialog) return;
    const { request, action } = reqDialog;
    if (action === 'info_required' && !reqForm.reason.trim()) {
      toast.error(lang === 'es' ? 'Proporciona el mensaje' : 'Please provide the information message');
      return;
    }
    setReqProcessing(true);
    try {
      await api(`/textbook-access/admin/requests/${request.student_id}/${request.year}/approve`, {
        method: 'POST',
        body: JSON.stringify({
          status: action,
          admin_notes: reqForm.notes || null,
          rejection_reason: action === 'rejected' ? (reqForm.reason.trim() || null) : null,
        }),
      });
      const toastKey = action === 'in_review' ? 'inReview' : action === 'info_required' ? 'infoRequested' : action;
      toast.success(t.toasts[toastKey] || 'Done');
      setReqDialog(null);
      fetchRequests();
      fetchPendingCount();
      fetchStudents();
    } catch (err) { toast.error(err.message); }
    finally { setReqProcessing(false); }
  };

  const handleQuickReject = async (request, reasonId) => {
    const r = rejectReasons.find(x => x.id === reasonId);
    if (!r || reasonId === 'other') { openReqDialog(request, 'rejected'); return; }
    setReqProcessing(true);
    try {
      await api(`/textbook-access/admin/requests/${request.student_id}/${request.year}/approve`, {
        method: 'POST',
        body: JSON.stringify({ status: 'rejected', admin_notes: null, rejection_reason: r.reason }),
      });
      toast.success(t.toasts.rejected);
      fetchRequests();
      fetchPendingCount();
    } catch (err) { toast.error(err.message); }
    finally { setReqProcessing(false); }
  };

  /* ── Derived data ── */
  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    const term = searchTerm.toLowerCase();
    return students.filter(s =>
      s.full_name?.toLowerCase().includes(term) || s.student_number?.toLowerCase().includes(term) || s.student_id?.toLowerCase().includes(term)
    );
  }, [students, searchTerm]);

  const sortedStudents = useMemo(() => {
    const arr = [...filteredStudents];
    const { key, direction } = sortConfig;
    arr.sort((a, b) => {
      let va, vb;
      if (key === 'full_name') { va = a.full_name || ''; vb = b.full_name || ''; }
      else if (key === 'grade') {
        const ea = (a.enrollments || []).sort((x, y) => (y.year || 0) - (x.year || 0))[0];
        const eb = (b.enrollments || []).sort((x, y) => (y.year || 0) - (x.year || 0))[0];
        va = parseInt(ea?.grade) || 0; vb = parseInt(eb?.grade) || 0;
      } else if (key === 'school') { va = a.school_name || ''; vb = b.school_name || ''; }
      else if (key === 'locked') { va = a.is_locked ? 1 : 0; vb = b.is_locked ? 1 : 0; }
      else if (key === 'presale') { va = a.presale_mode ? 1 : 0; vb = b.presale_mode ? 1 : 0; }
      else { va = ''; vb = ''; }
      if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      return va < vb ? (direction === 'asc' ? -1 : 1) : va > vb ? (direction === 'asc' ? 1 : -1) : 0;
    });
    return arr;
  }, [filteredStudents, sortConfig]);

  const studentsPag = usePagination(sortedStudents, 25);
  const requestsPag = usePagination(requests, 25);

  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  }, []);

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const toggleAll = useCallback(() => {
    const ids = studentsPag.paginated.map(s => s.student_id || s.sync_id);
    setSelectedIds(ids.every(id => selectedIds.has(id)) ? new Set() : new Set(ids));
  }, [studentsPag.paginated, selectedIds]);

  const stats = useMemo(() => ({
    locked: students.filter(s => s.is_locked).length,
    presale: students.filter(s => s.presale_mode).length,
    grades: [...new Set(students.flatMap(s => (s.enrollments || []).map(e => e.grade)).filter(Boolean))].length,
  }), [students]);

  // Helper: get latest enrollment
  const latestEnrollment = (s) => (s.enrollments || []).sort((a, b) => (b.year || 0) - (a.year || 0))[0];
  const sid = (s) => s.student_id || s.sync_id;

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  /* ──────────────────── RENDER ──────────────────── */
  return (
    <div className="space-y-3" data-testid="students-tab">
      {/* Section Toggle */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1" data-testid="section-toggle">
        {[
          { id: 'students', icon: Users, label: t.students, count: students.length },
          { id: 'requests', icon: Clipboard, label: t.requests, badge: pendingCount },
        ].map(({ id, icon: Ic, label, count, badge }) => (
          <button key={id} onClick={() => setSection(id)} data-testid={`section-${id}`}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              section === id ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}>
            <Ic className="h-3.5 w-3.5" /> {label}
            {count != null && <Badge variant="secondary" className="ml-0.5 text-[10px] px-1.5 py-0 h-4">{count}</Badge>}
            {badge > 0 && <Badge className="ml-0.5 text-[10px] px-1.5 py-0 h-4 bg-amber-500 text-white">{badge}</Badge>}
          </button>
        ))}
      </div>

      {/* ═══ REQUESTS SECTION ═══ */}
      {section === 'requests' && (
        <div className="space-y-3" data-testid="requests-section">
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center border rounded-md overflow-hidden shrink-0">
              {['pending', 'in_review', 'all'].map(s => (
                <button key={s} onClick={() => setReqFilter(s)} data-testid={`req-filter-${s}`}
                  className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${reqFilter === s ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}`}>
                  {s === 'pending' ? t.pending : s === 'in_review' ? t.inReview : t.all}
                  {s === 'pending' && pendingCount > 0 && <span className="ml-1 text-[10px]">{pendingCount}</span>}
                </button>
              ))}
            </div>
            <Select value={reqSchoolFilter} onValueChange={setReqSchoolFilter}>
              <SelectTrigger className="h-8 text-xs w-auto min-w-[140px]"><SelectValue placeholder={t.allSchools} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allSchools}</SelectItem>
                {reqSchools.map(s => <SelectItem key={s.school_id} value={s.school_id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => { fetchRequests(); fetchPendingCount(); }} className="gap-1 h-8 text-xs shrink-0">
              <RefreshCw className="h-3 w-3" /> {t.refresh}
            </Button>
          </div>

          {/* Request Cards */}
          {requestsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : requestsPag.paginated.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">{t.noRequests}</CardContent></Card>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2" data-testid="request-cards">
                {requestsPag.paginated.map((req) => (
                  <Card key={`${req.student_id}-${req.year}`} className="border-border/60">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{req.student_name}</p>
                          <p className="text-[10px] text-muted-foreground">{req.school_name}</p>
                        </div>
                        <StatusBadge status={req.status} t={t} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{t.year}: <strong>{req.year}</strong></span>
                        <span>{t.grade}: <strong>{req.grade}°</strong></span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {t.requestedBy}: <span className="font-medium text-foreground">{req.requested_by_name || req.requested_by_email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1 border-t">
                        <Button size="sm" variant="outline" onClick={() => openReqDialog(req, 'approved')} disabled={reqProcessing}
                          className="h-7 text-xs gap-1 text-green-700 border-green-200 hover:bg-green-50 flex-1" data-testid={`approve-${req.student_id}`}>
                          <Check className="h-3 w-3" /> {t.approve}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" disabled={reqProcessing}
                              className="h-7 text-xs gap-1 text-red-700 border-red-200 hover:bg-red-50 flex-1" data-testid={`reject-${req.student_id}`}>
                              <XCircle className="h-3 w-3" /> {t.reject} <ChevronDown className="h-3 w-3 ml-auto" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {rejectReasons.map(r => (
                              <DropdownMenuItem key={r.id} onClick={() => handleQuickReject(req, r.id)} className="text-xs cursor-pointer">{r.label}</DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {req.status === 'pending' && (
                          <Button size="sm" variant="ghost" onClick={() => openReqDialog(req, 'in_review')} className="h-7 w-7 p-0 text-blue-600 shrink-0">
                            <Info className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <TablePagination page={requestsPag.page} totalPages={requestsPag.totalPages} totalItems={requestsPag.totalItems}
                pageSize={requestsPag.pageSize} onPageChange={requestsPag.setPage} onPageSizeChange={requestsPag.setPageSize}
                canPrev={requestsPag.canPrev} canNext={requestsPag.canNext} />
            </>
          )}
        </div>
      )}

      {/* ═══ STUDENTS SECTION ═══ */}
      {section === 'students' && (
        <div className="space-y-3">
          {/* Stats */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1" data-testid="student-stats">
            {[
              { icon: Users, val: students.length, label: 'students', cls: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600' },
              { icon: Lock, val: stats.locked, label: 'locked', cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600' },
              { icon: ShoppingCart, val: stats.presale, label: 'pre-sale', cls: stats.presale > 0 ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/40 text-orange-600' : 'bg-muted/50 text-muted-foreground' },
              { icon: GraduationCap, val: stats.grades, label: 'grades', cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' },
            ].map(({ icon: Ic, val, label, cls }) => (
              <span key={label} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/50 text-xs font-medium shrink-0 ${cls}`}>
                <Ic className="h-3.5 w-3.5" /> <span className="text-base font-bold leading-none">{val}</span> {label}
              </span>
            ))}
          </div>

          {/* Toolbar */}
          <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3">
            <div className="relative flex-1 min-w-0 sm:max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search by name or student ID..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 h-8 text-xs" data-testid="student-search" />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              {selectedIds.size > 0 && (
                <>
                  <span className="text-[11px] text-muted-foreground font-medium shrink-0">{selectedIds.size} sel.</span>
                  <Button variant="outline" size="sm" onClick={() => handleBulkPresale(true)} disabled={bulkProcessing}
                    className="gap-1 h-7 text-[11px] border-orange-300 text-orange-700 hover:bg-orange-50 shrink-0" data-testid="bulk-presale-on">
                    <ShoppingCart className="h-3 w-3" /> Pre-sale On
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkPresale(false)} disabled={bulkProcessing}
                    className="gap-1 h-7 text-[11px] shrink-0" data-testid="bulk-presale-off">Pre-sale Off</Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="h-7 text-[11px] shrink-0">Clear</Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={fetchStudents} className="gap-1 h-7 text-xs shrink-0">
                <RefreshCw className="h-3 w-3" /> Refresh
              </Button>
              <div className="flex items-center border rounded-md overflow-hidden shrink-0" data-testid="view-mode-toggle">
                {[{ mode: 'card', Icon: LayoutGrid }, { mode: 'table', Icon: List }].map(({ mode, Icon }) => (
                  <button key={mode} onClick={() => setViewMode(mode)} data-testid={`view-mode-${mode}`}
                    className={`p-1.5 transition-colors ${viewMode === mode ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground">
            Showing {studentsPag.paginated.length} of {sortedStudents.length} students
            {searchTerm && ` (filtered from ${students.length})`}
          </div>

          {/* Student List */}
          {sortedStudents.length === 0 ? (
            <Card><CardContent className="py-10 text-center">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No students found</p>
            </CardContent></Card>
          ) : viewMode === 'card' ? (
            /* ── Card View ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2" data-testid="student-cards">
              {studentsPag.paginated.map((student) => {
                const id = sid(student), enr = latestEnrollment(student);
                const locked = student.is_locked === true, presale = student.presale_mode === true;
                return (
                  <div key={id} data-testid={`student-card-${id}`}
                    className={`rounded-lg border p-3 transition-colors ${selectedIds.has(id) ? 'border-primary/50 bg-primary/5' : 'border-border/60 bg-card hover:bg-muted/30'}`}>
                    <div className="flex items-start gap-2.5">
                      <Checkbox checked={selectedIds.has(id)} onCheckedChange={() => toggleSelect(id)} className="mt-0.5" data-testid={`select-student-${id}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold truncate">{student.full_name}</p>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button variant="ghost" size="sm" onClick={() => setChatStudent(student)} className="h-6 w-6 p-0 text-purple-600" data-testid={`chat-student-${id}`}><MessageCircle className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => setDetailStudent(student)} className="h-6 w-6 p-0" data-testid={`view-student-${id}`}><Eye className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="sm" data-testid={`${locked ? 'unlock' : 'lock'}-student-${id}`}
                              onClick={() => { setLockDialog({ student, type: locked ? 'unlock' : 'lock' }); setUnlockReason(''); }}
                              className={`h-6 w-6 p-0 ${locked ? 'text-amber-600' : 'text-red-600'}`}>
                              {locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono">{student.student_number || id}</p>
                        <div className="flex items-center flex-wrap gap-1.5 mt-2">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-0.5"><GraduationCap className="h-2.5 w-2.5" /> {enr?.grade || '-'}</Badge>
                          {locked
                            ? <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5 gap-0.5"><Lock className="h-2.5 w-2.5" /> Locked</Badge>
                            : <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-0.5 text-emerald-600 border-emerald-200"><Unlock className="h-2.5 w-2.5" /> Editable</Badge>}
                          <button onClick={() => handleTogglePresale(id, presale)} data-testid={`presale-toggle-${id}`}
                            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                              presale ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-300' : 'bg-muted/40 text-muted-foreground hover:bg-muted'}`}>
                            <ShoppingCart className="h-2.5 w-2.5" /> {presale ? 'On' : 'Off'}
                          </button>
                          {student.school_name && <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{student.school_name}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Table View ── */
            <div className="rounded-lg border">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-8 px-2">
                      <Checkbox checked={studentsPag.paginated.length > 0 && studentsPag.paginated.every(s => selectedIds.has(sid(s)))}
                        onCheckedChange={toggleAll} data-testid="select-all-students" />
                    </TableHead>
                    <TableHead className="px-2"><SortHeader label="Student" sortKey="full_name" active={sortConfig.key === 'full_name'} direction={sortConfig.direction} onSort={handleSort} /></TableHead>
                    <TableHead className="px-2 w-16"><SortHeader label="Grade" sortKey="grade" active={sortConfig.key === 'grade'} direction={sortConfig.direction} onSort={handleSort} /></TableHead>
                    <TableHead className="px-2 hidden md:table-cell"><SortHeader label="School" sortKey="school" active={sortConfig.key === 'school'} direction={sortConfig.direction} onSort={handleSort} /></TableHead>
                    <TableHead className="px-2 w-24"><SortHeader label="Status" sortKey="locked" active={sortConfig.key === 'locked'} direction={sortConfig.direction} onSort={handleSort} /></TableHead>
                    <TableHead className="px-2 w-20 text-center"><SortHeader label="Pre-sale" sortKey="presale" active={sortConfig.key === 'presale'} direction={sortConfig.direction} onSort={handleSort} className="justify-center" /></TableHead>
                    <TableHead className="px-2 w-16 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentsPag.paginated.map((student) => {
                    const id = sid(student), enr = latestEnrollment(student);
                    const locked = student.is_locked === true, presale = student.presale_mode === true;
                    return (
                      <TableRow key={id} className={`h-10 ${selectedIds.has(id) ? 'bg-primary/5' : ''}`} data-testid={`student-row-${id}`}>
                        <TableCell className="px-2 py-1"><Checkbox checked={selectedIds.has(id)} onCheckedChange={() => toggleSelect(id)} data-testid={`select-student-${id}`} /></TableCell>
                        <TableCell className="px-2 py-1">
                          <span className="text-xs font-medium leading-tight block">{student.full_name}</span>
                          <span className="text-[10px] text-muted-foreground leading-tight block">{student.student_number || id}</span>
                        </TableCell>
                        <TableCell className="px-2 py-1 text-center"><span className="text-xs font-medium">{enr?.grade || '-'}</span></TableCell>
                        <TableCell className="px-2 py-1 hidden md:table-cell"><span className="text-[11px] text-muted-foreground truncate max-w-[140px] block">{student.school_name || '-'}</span></TableCell>
                        <TableCell className="px-2 py-1">
                          <div className="flex items-center gap-1">
                            {locked
                              ? <Badge variant="destructive" className="gap-0.5 text-[10px] px-1.5 py-0 h-5"><Lock className="h-2.5 w-2.5" /> Locked</Badge>
                              : <Badge variant="outline" className="gap-0.5 text-[10px] px-1.5 py-0 h-5"><Unlock className="h-2.5 w-2.5" /> Editable</Badge>}
                            {enr?.status === 'approved' && <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] px-1.5 py-0 h-5 hidden sm:inline-flex">Approved</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-1 text-center">
                          <button onClick={() => handleTogglePresale(id, presale)} data-testid={`presale-toggle-${id}`}
                            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                              presale ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-300 hover:bg-orange-200' : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                            <ShoppingCart className="h-2.5 w-2.5" /> {presale ? 'On' : 'Off'}
                          </button>
                        </TableCell>
                        <TableCell className="px-2 py-1 text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button variant="ghost" size="sm" onClick={() => setChatStudent(student)} className="h-6 w-6 p-0 text-purple-600" data-testid={`chat-student-${id}`}><MessageCircle className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => setDetailStudent(student)} className="h-6 w-6 p-0" data-testid={`view-student-${id}`}><Eye className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="sm" data-testid={`${locked ? 'unlock' : 'lock'}-student-${id}`}
                              onClick={() => { setLockDialog({ student, type: locked ? 'unlock' : 'lock' }); setUnlockReason(''); }}
                              className={`h-6 w-6 p-0 ${locked ? 'text-amber-600 hover:text-amber-700' : 'text-red-600 hover:text-red-700'}`}>
                              {locked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <TablePagination page={studentsPag.page} totalPages={studentsPag.totalPages} pageSize={studentsPag.pageSize}
            totalItems={sortedStudents.length} onPageChange={studentsPag.setPage} onPageSizeChange={studentsPag.setPageSize}
            canPrev={studentsPag.canPrev} canNext={studentsPag.canNext} />
        </div>
      )}

      {/* Mobile Floating Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-50 p-3 sm:hidden" data-testid="mobile-action-bar">
          <div className="bg-card border border-border shadow-lg rounded-xl px-4 py-3 flex items-center justify-between gap-2 animate-in slide-in-from-bottom-4">
            <span className="text-sm font-semibold text-primary shrink-0">{selectedIds.size} sel.</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleBulkPresale(true)} disabled={bulkProcessing}
                className="h-8 text-xs border-orange-300 text-orange-700 hover:bg-orange-50 gap-1" data-testid="mobile-presale-on">
                <ShoppingCart className="h-3 w-3" /> On
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkPresale(false)} disabled={bulkProcessing}
                className="h-8 text-xs gap-1" data-testid="mobile-presale-off"><ShoppingCart className="h-3 w-3" /> Off</Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="h-8 text-xs" data-testid="mobile-clear-selection"><X className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DIALOGS ═══ */}

      {/* Lock/Unlock */}
      <Dialog open={!!lockDialog} onOpenChange={() => setLockDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{lockDialog?.type === 'lock' ? 'Lock Student Profile' : 'Unlock Student Profile'}</DialogTitle>
            <DialogDescription>
              {lockDialog?.type === 'lock'
                ? `Lock "${lockDialog?.student?.full_name}"'s profile to prevent editing.`
                : `Unlock "${lockDialog?.student?.full_name}"'s profile to allow editing.`}
            </DialogDescription>
          </DialogHeader>
          {lockDialog?.type === 'unlock' && (
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea value={unlockReason} onChange={(e) => setUnlockReason(e.target.value)} placeholder="e.g., Parent needs to update info" rows={2} />
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setLockDialog(null)}>{t.cancel}</Button>
            <Button onClick={handleLockUnlock} disabled={processing} variant={lockDialog?.type === 'lock' ? 'destructive' : 'default'} className="gap-2">
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : lockDialog?.type === 'lock' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              {lockDialog?.type === 'lock' ? 'Lock' : 'Unlock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student Detail */}
      <Dialog open={!!detailStudent} onOpenChange={() => setDetailStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" /> {detailStudent?.full_name}</DialogTitle>
          </DialogHeader>
          {detailStudent && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Student ID', <span className="font-mono text-xs">{sid(detailStudent)}</span>],
                  ['Student Number', detailStudent.student_number || '-'],
                  ['School', detailStudent.school_name || '-'],
                  ['Relation', <span className="capitalize">{detailStudent.relation_type || '-'}</span>],
                  ['Profile Status', <Badge variant={detailStudent.is_locked ? 'destructive' : 'outline'} className="text-xs">{detailStudent.is_locked ? 'Locked' : 'Editable'}</Badge>],
                  ['Pre-sale', <Badge className={`text-xs ${detailStudent.presale_mode ? 'bg-orange-100 text-orange-700' : ''}`} variant={detailStudent.presale_mode ? 'default' : 'outline'}>{detailStudent.presale_mode ? 'Active' : 'Inactive'}</Badge>],
                ].map(([label, val], i) => (
                  <div key={i}><p className="text-xs text-muted-foreground">{label}</p><div>{val}</div></div>
                ))}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Enrollments</p>
                <div className="space-y-2">
                  {(detailStudent.enrollments || []).map((e, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{e.year}</Badge>
                        <span className="text-sm">Grade {e.grade || '?'}</span>
                      </div>
                      <Badge variant={e.status === 'approved' ? 'default' : 'outline'}
                        className={`text-xs ${e.status === 'approved' ? 'bg-green-100 text-green-700' : e.status === 'pending' ? 'bg-amber-100 text-amber-700' : ''}`}>
                        {e.status || 'pending'}
                      </Badge>
                    </div>
                  ))}
                  {(!detailStudent.enrollments || !detailStudent.enrollments.length) && <p className="text-xs text-muted-foreground">No enrollments</p>}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Request Action Dialog */}
      <Dialog open={!!reqDialog} onOpenChange={(open) => !open && setReqDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reqDialog?.action === 'approved' ? t.approveTitle : reqDialog?.action === 'rejected' ? t.rejectTitle : reqDialog?.action === 'info_required' ? t.infoTitle : t.markInReview}
            </DialogTitle>
            <DialogDescription>{reqDialog?.request?.student_name} — {reqDialog?.request?.school_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {reqDialog?.action === 'rejected' && (
              <div className="space-y-2">
                <Label className="text-xs">{t.selectReason}</Label>
                <div className="flex flex-wrap gap-1.5">
                  {rejectReasons.map(r => (
                    <button key={r.id} onClick={() => {
                      const reason = rejectReasons.find(x => x.id === r.id);
                      setReqForm(prev => ({ ...prev, selectedReasonId: r.id, reason: reason?.reason || '' }));
                    }}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${reqForm.selectedReasonId === r.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
                      {r.label}
                    </button>
                  ))}
                </div>
                <Textarea value={reqForm.reason} onChange={e => setReqForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder={t.rejectionReasonPlaceholder} rows={2} className="text-xs" />
              </div>
            )}
            {reqDialog?.action === 'info_required' && (
              <div className="space-y-2">
                <Label className="text-xs">{t.infoMessage} *</Label>
                <Textarea value={reqForm.reason} onChange={e => setReqForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder={t.infoMessagePlaceholder} rows={3} className="text-xs" />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs">{t.adminNotes}</Label>
              <Textarea value={reqForm.notes} onChange={e => setReqForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t.adminNotesPlaceholder} rows={2} className="text-xs" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setReqDialog(null)}>{t.cancel}</Button>
            <Button size="sm" onClick={processRequest} disabled={reqProcessing}
              className={reqDialog?.action === 'approved' ? 'bg-green-600 hover:bg-green-700' : reqDialog?.action === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}>
              {reqProcessing && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              {t.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CRM Chat */}
      {chatStudent && (
        <CrmChat studentId={sid(chatStudent)} studentName={chatStudent.full_name}
          isOpen={!!chatStudent} onClose={() => setChatStudent(null)} isAdmin={true} />
      )}
    </div>
  );
}
