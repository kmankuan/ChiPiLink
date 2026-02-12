import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePagination } from '@/hooks/usePagination';
import { TablePagination } from '@/components/shared/TablePagination';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Info,
  AlertCircle,
  Loader2,
  RefreshCw,
  Filter,
  School,
  User,
  Calendar,
  GraduationCap,
  MessageSquare,
  Check,
  X,
  HelpCircle,
  ChevronDown
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// Predefined rejection reasons for quick actions
const QUICK_REJECT_REASONS = {
  en: [
    { id: 'not_enrolled', label: 'Student not enrolled', reason: 'The student is not currently enrolled in our system.' },
    { id: 'wrong_school', label: 'Wrong school', reason: 'The student is registered at a different school.' },
    { id: 'wrong_grade', label: 'Incorrect grade', reason: 'The grade level does not match our records.' },
    { id: 'duplicate', label: 'Duplicate request', reason: 'A request for this student already exists.' },
    { id: 'incomplete', label: 'Incomplete info', reason: 'The request is missing required information.' },
    { id: 'other', label: 'Other (custom)', reason: '' }
  ],
  es: [
    { id: 'not_enrolled', label: 'No está matriculado', reason: 'El estudiante no está matriculado actualmente en nuestro sistema.' },
    { id: 'wrong_school', label: 'Colegio incorrecto', reason: 'El estudiante está registrado en otro colegio.' },
    { id: 'wrong_grade', label: 'Grado incorrecto', reason: 'El nivel de grado no coincide con nuestros registros.' },
    { id: 'duplicate', label: 'Solicitud duplicada', reason: 'Ya existe una solicitud para este estudiante.' },
    { id: 'incomplete', label: 'Info incompleta', reason: 'La solicitud carece de información requerida.' },
    { id: 'other', label: 'Otro (personalizado)', reason: '' }
  ],
  zh: [
    { id: 'not_enrolled', label: '未注册', reason: '该学生目前未在我们的系统中注册。' },
    { id: 'wrong_school', label: '学校错误', reason: '该学生注册在不同的学校。' },
    { id: 'wrong_grade', label: '年级错误', reason: '年级与我们的记录不符。' },
    { id: 'duplicate', label: '重复请求', reason: '该学生已有请求。' },
    { id: 'incomplete', label: '信息不完整', reason: '请求缺少必要信息。' },
    { id: 'other', label: '其他（自定义）', reason: '' }
  ]
};

// Translations
const translations = {
  en: {
    title: 'Textbook Access Requests',
    subtitle: 'Review and approve student textbook access requests',
    pendingTab: 'Pending',
    inReviewTab: 'In Review',
    allTab: 'All',
    noRequests: 'No requests found',
    student: 'Student',
    school: 'School',
    grade: 'Grade',
    year: 'Year',
    user: 'Requested By',
    relation: 'Relation',
    status: 'Status',
    actions: 'Actions',
    approve: 'Approve',
    reject: 'Reject',
    quickReject: 'Quick Reject',
    requestInfo: 'Request Info',
    markInReview: 'Mark In Review',
    approveTitle: 'Approve Request',
    rejectTitle: 'Reject Request',
    infoTitle: 'Request Information',
    adminNotes: 'Admin Notes (optional)',
    adminNotesPlaceholder: 'Internal notes (not visible to user)',
    rejectionReason: 'Rejection Reason',
    rejectionReasonPlaceholder: 'Explain why the request was rejected (optional)',
    selectReason: 'Select a reason',
    customReason: 'Custom reason (optional)',
    infoMessage: 'Information Required',
    infoMessagePlaceholder: 'What information does the user need to provide?',
    confirm: 'Confirm',
    cancel: 'Cancel',
    filterSchool: 'Filter by School',
    filterYear: 'Filter by Year',
    allSchools: 'All Schools',
    allYears: 'All Years',
    studentNumber: 'Student ID',
    requestDate: 'Request Date',
    refresh: 'Refresh',
    statusLabels: {
      pending: 'Pending',
      in_review: 'In Review',
      approved: 'Approved',
      rejected: 'Rejected',
      info_required: 'Info Required'
    },
    success: {
      approved: 'Request approved',
      rejected: 'Request rejected',
      inReview: 'Marked as in review',
      infoRequested: 'Information requested'
    }
  },
  es: {
    title: 'Solicitudes de Acceso a Textos',
    subtitle: 'Revisar y aprobar solicitudes de acceso a textos escolares',
    pendingTab: 'Pendientes',
    inReviewTab: 'En Revisión',
    allTab: 'Todas',
    noRequests: 'No se encontraron solicitudes',
    student: 'Estudiante',
    school: 'Colegio',
    grade: 'Grado',
    year: 'Año',
    user: 'Solicitado Por',
    relation: 'Relación',
    status: 'Estado',
    actions: 'Acciones',
    approve: 'Aprobar',
    reject: 'Rechazar',
    quickReject: 'Rechazo Rápido',
    requestInfo: 'Pedir Info',
    markInReview: 'Marcar En Revisión',
    approveTitle: 'Aprobar Solicitud',
    rejectTitle: 'Rechazar Solicitud',
    infoTitle: 'Solicitar Información',
    adminNotes: 'Notas Internas (opcional)',
    adminNotesPlaceholder: 'Notas internas (no visible para el usuario)',
    rejectionReason: 'Motivo de Rechazo',
    rejectionReasonPlaceholder: 'Explica por qué se rechazó (opcional)',
    selectReason: 'Selecciona un motivo',
    customReason: 'Motivo personalizado (opcional)',
    infoMessage: 'Información Requerida',
    infoMessagePlaceholder: '¿Qué información necesita proporcionar el usuario?',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    filterSchool: 'Filtrar por Colegio',
    filterYear: 'Filtrar por Año',
    allSchools: 'Todos los Colegios',
    allYears: 'Todos los Años',
    studentNumber: 'Nº Estudiante',
    requestDate: 'Fecha Solicitud',
    refresh: 'Actualizar',
    statusLabels: {
      pending: 'Pendiente',
      in_review: 'En Revisión',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      info_required: 'Info Requerida'
    },
    success: {
      approved: 'Solicitud aprobada',
      rejected: 'Solicitud rechazada',
      inReview: 'Marcada como en revisión',
      infoRequested: 'Información solicitada'
    }
  },
  zh: {
    title: '教科书访问请求',
    subtitle: '审核和批准学生教科书访问请求',
    pendingTab: '待处理',
    inReviewTab: '审核中',
    allTab: '全部',
    noRequests: '未找到请求',
    student: '学生',
    school: '学校',
    grade: '年级',
    year: '年份',
    user: '申请人',
    relation: '关系',
    status: '状态',
    actions: '操作',
    approve: '批准',
    reject: '拒绝',
    quickReject: '快速拒绝',
    requestInfo: '请求信息',
    markInReview: '标记审核中',
    approveTitle: '批准请求',
    rejectTitle: '拒绝请求',
    infoTitle: '请求信息',
    adminNotes: '管理员备注（可选）',
    adminNotesPlaceholder: '内部备注（用户不可见）',
    rejectionReason: '拒绝原因',
    rejectionReasonPlaceholder: '解释为什么拒绝（可选）',
    selectReason: '选择原因',
    customReason: '自定义原因（可选）',
    infoMessage: '需要的信息',
    infoMessagePlaceholder: '用户需要提供什么信息？',
    confirm: '确认',
    cancel: '取消',
    filterSchool: '按学校筛选',
    filterYear: '按年份筛选',
    allSchools: '所有学校',
    allYears: '所有年份',
    studentNumber: '学生编号',
    requestDate: '申请日期',
    refresh: '刷新',
    statusLabels: {
      pending: '待处理',
      in_review: '审核中',
      approved: '已批准',
      rejected: '已拒绝',
      info_required: '需要信息'
    },
    success: {
      approved: '请求已批准',
      rejected: '请求已拒绝',
      inReview: '已标记为审核中',
      infoRequested: '已请求信息'
    }
  }
};

const StatusBadge = ({ status, t }) => {
  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    in_review: { color: 'bg-blue-100 text-blue-800', icon: Info },
    approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
    rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
    info_required: { color: 'bg-orange-100 text-orange-800', icon: AlertCircle }
  };
  
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;
  
  return (
    <Badge variant="secondary" className={`${config.color} gap-1`}>
      <Icon className="h-3 w-3" />
      {t.statusLabels[status] || status}
    </Badge>
  );
};

export default function TextbookAccessAdminTab({ token }) {
  const { i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedTab, setSelectedTab] = useState('pending');
  const [filterSchool, setFilterSchool] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [actionDialog, setActionDialog] = useState(null);
  const [actionData, setActionData] = useState({ notes: '', reason: '', selectedReasonId: '' });
  const [processing, setProcessing] = useState(false);

  const t = translations[i18n.language] || translations.en;
  const quickRejectReasons = QUICK_REJECT_REASONS[i18n.language] || QUICK_REJECT_REASONS.en;

  const requestsPagination = usePagination(requests, 25);
  const pageRequests = requestsPagination.paginated;

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTab !== 'all') {
        params.append('status', selectedTab === 'pending' ? 'pending' : 'in_review');
      }
      if (filterSchool && filterSchool !== 'all') params.append('school_id', filterSchool);
      if (filterYear && filterYear !== 'all') params.append('year', filterYear);
      
      const res = await fetch(`${API}/api/store/textbook-access/admin/requests?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (err) {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [token, selectedTab, filterSchool, filterYear]);

  const fetchSchools = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/store/textbook-access/admin/schools`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSchools(data.schools || []);
      }
    } catch (err) {
      console.error('Failed to load schools:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAction = async (request, action) => {
    setActionDialog({ request, action });
    setActionData({ notes: '', reason: '', selectedReasonId: '' });
  };

  // Handle quick reject reason selection
  const handleReasonSelect = (reasonId) => {
    const selectedReason = quickRejectReasons.find(r => r.id === reasonId);
    setActionData(prev => ({
      ...prev,
      selectedReasonId: reasonId,
      reason: selectedReason?.reason || ''
    }));
  };

  const processAction = async () => {
    if (!actionDialog) return;
    
    const { request, action } = actionDialog;
    
    // For info_required, reason is required
    if (action === 'info_required' && !actionData.reason.trim()) {
      toast.error('Please provide the information message');
      return;
    }
    
    // For rejection, use either selected reason or custom reason (both optional now)
    const finalReason = actionData.reason.trim() || null;
    
    setProcessing(true);
    try {
      const res = await fetch(
        `${API}/api/store/textbook-access/admin/requests/${request.student_id}/${request.year}/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            status: action,
            admin_notes: actionData.notes || null,
            rejection_reason: action === 'rejected' ? finalReason : null
          })
        }
      );
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Action failed');
      }
      
      const successMessages = {
        approved: t.success.approved,
        rejected: t.success.rejected,
        in_review: t.success.inReview,
        info_required: t.success.infoRequested
      };
      
      toast.success(successMessages[action] || 'Action completed');
      setActionDialog(null);
      fetchRequests();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Quick reject without dialog
  const handleQuickReject = async (request, reasonId) => {
    const reason = quickRejectReasons.find(r => r.id === reasonId);
    if (!reason || reasonId === 'other') {
      // Open dialog for custom reason
      handleAction(request, 'rejected');
      return;
    }
    
    setProcessing(true);
    try {
      const res = await fetch(
        `${API}/api/store/textbook-access/admin/requests/${request.student_id}/${request.year}/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            status: 'rejected',
            admin_notes: null,
            rejection_reason: reason.reason
          })
        }
      );
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Action failed');
      }
      
      toast.success(t.success.rejected);
      fetchRequests();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const getAvailableYears = () => {
    const years = new Set();
    requests.forEach(r => years.add(r.year));
    return Array.from(years).sort((a, b) => b - a);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-semibold">{t.title}</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRequests} className="self-start sm:self-auto">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t.refresh}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        <div className="flex items-center gap-2 flex-1 sm:flex-none">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={filterSchool} onValueChange={setFilterSchool}>
            <SelectTrigger className="flex-1 sm:w-[200px]">
              <SelectValue placeholder={t.filterSchool} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allSchools}</SelectItem>
              {schools.map((school) => (
                <SelectItem key={school.school_id} value={school.school_id}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder={t.filterYear} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allYears}</SelectItem>
            {getAvailableYears().map((year) => (
              <SelectItem key={year} value={String(year)}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            {t.pendingTab}
            {requests.filter(r => r.status === 'pending').length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {requests.filter(r => r.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="in_review" className="gap-2">
            <Info className="h-4 w-4" />
            {t.inReviewTab}
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            {t.allTab}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t.noRequests}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block sm:hidden space-y-3">
                {requests.map((request, idx) => (
                  <Card key={`mobile-${request.student_id}-${request.year}-${idx}`} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      {/* Header: Student Name + Status */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-base truncate">{request.student_name}</p>
                          {request.student_number && (
                            <p className="text-xs text-muted-foreground">ID: {request.student_number}</p>
                          )}
                        </div>
                        <StatusBadge status={request.status} t={t} />
                      </div>
                      
                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <p className="text-muted-foreground text-xs">{t.school}</p>
                          <p className="font-medium truncate">{request.school_name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">{t.year} / {t.grade}</p>
                          <p className="font-medium">{request.year} / {request.grade}°</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-muted-foreground text-xs">{t.user}</p>
                          <p className="font-medium truncate">{request.user_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{request.user_email}</p>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex justify-end gap-2 pt-2 border-t">
                        {request.status !== 'approved' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => handleAction(request, 'approved')}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            {t.approve}
                          </Button>
                        )}
                        {request.status !== 'rejected' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <X className="h-4 w-4 mr-1" />
                                {t.reject}
                                <ChevronDown className="h-3 w-3 ml-1" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {quickRejectReasons.slice(0, -1).map((reason) => (
                                <DropdownMenuItem
                                  key={reason.id}
                                  onClick={() => handleQuickReject(request, reason.id)}
                                  className="text-red-600"
                                >
                                  {reason.label}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleAction(request, 'rejected')}
                                className="text-muted-foreground"
                              >
                                {quickRejectReasons.find(r => r.id === 'other')?.label}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop Table View */}
              <Card className="hidden sm:block">
                <ScrollArea className="max-h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.student}</TableHead>
                        <TableHead>{t.school}</TableHead>
                        <TableHead>{t.year}</TableHead>
                        <TableHead>{t.grade}</TableHead>
                        <TableHead>{t.user}</TableHead>
                        <TableHead>{t.relation}</TableHead>
                        <TableHead>{t.status}</TableHead>
                        <TableHead className="text-right">{t.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((request, idx) => (
                        <TableRow key={`${request.student_id}-${request.year}-${idx}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{request.student_name}</p>
                              {request.student_number && (
                                <p className="text-xs text-muted-foreground">
                                  ID: {request.student_number}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{request.school_name}</TableCell>
                          <TableCell>{request.year}</TableCell>
                          <TableCell>{request.grade}°</TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{request.user_name}</p>
                              <p className="text-xs text-muted-foreground">{request.user_email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">{request.relation_type}</TableCell>
                          <TableCell>
                            <StatusBadge status={request.status} t={t} />
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              {request.status !== 'approved' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleAction(request, 'approved')}
                                  title={t.approve}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              {request.status !== 'rejected' && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      title={t.reject}
                                    >
                                      <X className="h-4 w-4" />
                                      <ChevronDown className="h-3 w-3 ml-0.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    {quickRejectReasons.slice(0, -1).map((reason) => (
                                      <DropdownMenuItem
                                        key={reason.id}
                                        onClick={() => handleQuickReject(request, reason.id)}
                                        className="text-red-600 cursor-pointer"
                                      >
                                        {reason.label}
                                      </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleAction(request, 'rejected')}
                                      className="text-muted-foreground cursor-pointer"
                                    >
                                      {quickRejectReasons.find(r => r.id === 'other')?.label}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                              {request.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => handleAction(request, 'in_review')}
                                  title={t.markInReview}
                                >
                                  <Info className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                onClick={() => handleAction(request, 'info_required')}
                                title={t.requestInfo}
                              >
                                <HelpCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.action === 'approved' && t.approveTitle}
              {actionDialog?.action === 'rejected' && t.rejectTitle}
              {actionDialog?.action === 'in_review' && t.markInReview}
              {actionDialog?.action === 'info_required' && t.infoTitle}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.request?.student_name} - {actionDialog?.request?.year}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Rejection Reason - with quick select */}
            {actionDialog?.action === 'rejected' && (
              <div className="space-y-3">
                <Label>{t.selectReason}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {quickRejectReasons.map((reason) => (
                    <Button
                      key={reason.id}
                      type="button"
                      variant={actionData.selectedReasonId === reason.id ? "default" : "outline"}
                      size="sm"
                      className={`justify-start text-left h-auto py-2 px-3 ${
                        actionData.selectedReasonId === reason.id 
                          ? 'bg-red-600 hover:bg-red-700 text-white' 
                          : 'hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                      }`}
                      onClick={() => handleReasonSelect(reason.id)}
                    >
                      {reason.label}
                    </Button>
                  ))}
                </div>
                
                {/* Custom reason textarea (always shown for editing) */}
                <div className="space-y-2">
                  <Label>{t.customReason}</Label>
                  <Textarea
                    value={actionData.reason}
                    onChange={(e) => setActionData(prev => ({ 
                      ...prev, 
                      reason: e.target.value,
                      selectedReasonId: e.target.value ? 'other' : prev.selectedReasonId 
                    }))}
                    placeholder={t.rejectionReasonPlaceholder}
                    rows={2}
                  />
                </div>
              </div>
            )}
            
            {/* Info Required Message */}
            {actionDialog?.action === 'info_required' && (
              <div className="space-y-2">
                <Label>{t.infoMessage} *</Label>
                <Textarea
                  value={actionData.reason}
                  onChange={(e) => setActionData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder={t.infoMessagePlaceholder}
                  rows={3}
                />
              </div>
            )}
            
            {/* Admin Notes */}
            <div className="space-y-2">
              <Label>{t.adminNotes}</Label>
              <Textarea
                value={actionData.notes}
                onChange={(e) => setActionData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t.adminNotesPlaceholder}
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              {t.cancel}
            </Button>
            <Button 
              onClick={processAction} 
              disabled={processing}
              className={
                actionDialog?.action === 'approved' ? 'bg-green-600 hover:bg-green-700' :
                actionDialog?.action === 'rejected' ? 'bg-red-600 hover:bg-red-700' :
                ''
              }
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
