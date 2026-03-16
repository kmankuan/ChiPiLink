/**
 * SchoolTextbooksView — Student selection and textbook order status
 * Extracted from Unatienda.jsx for maintainability.
 * Handles: student tabs, student cards with order status, login prompt, inline link student flow.
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  BookOpen, Check, ChevronRight, Clock, GraduationCap,
  Loader2, Lock, Package, Plus, Send, User, UserPlus, X,
  Wallet, AlertTriangle, Mail, Phone, ArrowRight, Building2, Banknote, CheckCircle2
} from 'lucide-react';
import { schoolTxbTranslations } from '../constants/translations';
import { OrderSummaryModal } from './OrderSummaryModal';
import DepositFlow from '@/modules/account/wallet/DepositFlow';
import { ExpandableText } from '../../../components/ui/expandable-text';
import { useGuardedAction } from '@/hooks/useGuardedAction';
import RESOLVED_API_URL from '@/config/apiUrl';

const API_URL = RESOLVED_API_URL;

const GRADE_OPTIONS = [
  { value: 'K3', en: 'K3', es: 'K3', zh: 'K3' },
  { value: 'K4', en: 'K4', es: 'K4', zh: 'K4' },
  { value: 'K5', en: 'K5', es: 'K5', zh: 'K5' },
  { value: '1', en: '1st Grade', es: '1er Grado', zh: '1年级' },
  { value: '2', en: '2nd Grade', es: '2do Grado', zh: '2年级' },
  { value: '3', en: '3rd Grade', es: '3er Grado', zh: '3年级' },
  { value: '4', en: '4th Grade', es: '4to Grado', zh: '4年级' },
  { value: '5', en: '5th Grade', es: '5to Grado', zh: '5年级' },
  { value: '6', en: '6th Grade', es: '6to Grado', zh: '6年级' },
  { value: '7', en: '7th Grade', es: '7mo Grado', zh: '7年级' },
  { value: '8', en: '8th Grade', es: '8vo Grado', zh: '8年级' },
  { value: '9', en: '9th Grade', es: '9no Grado', zh: '9年级' },
  { value: '10', en: '10th Grade', es: '10mo Grado', zh: '10年级' },
  { value: '11', en: '11th Grade', es: '11vo Grado', zh: '11年级' },
  { value: '12', en: '12th Grade', es: '12vo Grado', zh: '12年级' },
];

const RELATIONSHIP_OPTIONS = [
  { value: 'parent', en: 'Parent', es: 'Padre/Madre', zh: '父/母' },
  { value: 'guardian', en: 'Legal Guardian', es: 'Tutor Legal', zh: '法定监护人' },
  { value: 'grandparent', en: 'Grandparent', es: 'Abuelo/a', zh: '祖父母' },
  { value: 'representative', en: 'Representative', es: 'Representante', zh: '代表' },
  { value: 'other', en: 'Other', es: 'Otro', zh: '其他' },
];

function InlineStudentForm({ token, onSuccess, onCancel, lang }) {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schoolsError, setSchoolsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Guardian info — persisted in localStorage, shown as header
  const GUARDIAN_KEY = 'chipilink_guardian_info';
  const savedGuardian = JSON.parse(localStorage.getItem(GUARDIAN_KEY) || 'null');
  const [guardian, setGuardian] = useState(savedGuardian || { name: '', email: '', phone: '' });
  const [guardianConfirmed, setGuardianConfirmed] = useState(!!savedGuardian?.name);
  const [editingGuardian, setEditingGuardian] = useState(!savedGuardian?.name);

  const [form, setForm] = useState({
    first_name: '', last_name: '', school_id: '', student_number: '',
    year: new Date().getFullYear(), grade: '', relation_type: '', relation_other: '',
  });

  const fetchSchools = useCallback(async () => {
    setLoading(true);
    setSchoolsError(false);
    try {
      const { data } = await axios.get(`${API_URL}/api/sysbook/access/schools`);
      setSchools(data?.schools || []);
    } catch (err) {
      console.error('Failed to load schools:', err);
      setSchoolsError(true);
      setSchools([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (submitting) return;

    const vt = {
      en: { firstName: 'Enter student first name', lastName: 'Enter student last name', school: 'Select a school', grade: 'Select a grade', relation: 'Select your relationship', success: 'Student linked! Pending admin approval.', error: 'Failed to submit' },
      es: { firstName: 'Ingrese el nombre del estudiante', lastName: 'Ingrese el apellido del estudiante', school: 'Seleccione una escuela', grade: 'Seleccione un grado', relation: 'Seleccione su relacion', success: 'Estudiante vinculado. Pendiente de aprobacion.', error: 'Error al enviar' },
      zh: { firstName: '请输入学生名字', lastName: '请输入学生姓氏', school: '请选择学校', grade: '请选择年级', relation: '请选择关系', success: '学生已关联，等待管理员审批。', error: '提交失败' },
    };
    const v = vt[lang] || vt.es;

    if (!form.first_name.trim()) { toast.error(v.firstName); return; }
    if (!form.last_name.trim()) { toast.error(v.lastName); return; }
    if (!form.school_id) { toast.error(v.school); return; }
    if (!form.grade) { toast.error(v.grade); return; }
    if (!form.relation_type) { toast.error(v.relation); return; }

    setSubmitting(true);
    try {
      // Save guardian info to localStorage for next student
      if (guardian.name) {
        localStorage.setItem(GUARDIAN_KEY, JSON.stringify(guardian));
      }
      await axios.post(`${API_URL}/api/sysbook/access/students`, {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        school_id: form.school_id,
        student_number: form.student_number.trim() || null,
        year: form.year,
        grade: form.grade,
        relation_type: form.relation_type,
        relation_other: form.relation_type === 'other' ? form.relation_other.trim() : null,
        guardian_name: guardian.name?.trim() || null,
        guardian_email: guardian.email?.trim() || null,
        guardian_phone: guardian.phone?.trim() || null,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(v.success);
      onSuccess();
    } catch (err) {
      console.error('Student link error:', err);
      toast.error(err.response?.data?.detail || v.error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  if (schoolsError || schools.length === 0) {
    return (
      <Card className="border-primary/30 shadow-sm">
        <CardContent className="py-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            {lang === 'es' ? 'Error cargando escuelas.' : 'Failed to load schools.'}
          </p>
          <div className="flex justify-center gap-2">
            <Button size="sm" variant="outline" onClick={fetchSchools}>
              {lang === 'es' ? 'Reintentar' : 'Retry'}
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel}>
              {lang === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const texts = {
    en: { title: 'Link Student', firstName: 'First Name', lastName: 'Last Name', school: 'School', grade: 'Grade', studentNo: 'Student Number (optional)', relationship: 'Your Relationship', other: 'Specify relationship', submit: 'Link Student', cancel: 'Cancel', selectPlaceholder: '-- Select --', firstNamePh: 'John', lastNamePh: 'Doe',
      guardianTitle: 'Guardian Information', guardianName: 'Full Name', guardianEmail: 'Email', guardianPhone: 'Cellphone', guardianEdit: 'Edit', guardianConfirm: 'Confirm', guardianUseSame: 'Use same guardian info?', guardianYes: 'Yes', guardianNo: 'Change' },
    es: { title: 'Vincular Estudiante', firstName: 'Nombre', lastName: 'Apellido', school: 'Escuela', grade: 'Grado', studentNo: 'Numero de Estudiante (opcional)', relationship: 'Su Relacion', other: 'Especificar relacion', submit: 'Vincular Estudiante', cancel: 'Cancelar', selectPlaceholder: '-- Seleccionar --', firstNamePh: 'Juan', lastNamePh: 'Perez',
      guardianTitle: 'Informacion del Acudiente', guardianName: 'Nombre Completo', guardianEmail: 'Correo', guardianPhone: 'Celular', guardianEdit: 'Editar', guardianConfirm: 'Confirmar', guardianUseSame: 'Usar misma informacion del acudiente?', guardianYes: 'Si', guardianNo: 'Cambiar' },
    zh: { title: '关联学生', firstName: '名', lastName: '姓', school: '学校', grade: '年级', studentNo: '学号（可选）', relationship: '您的关系', other: '指定关系', submit: '关联学生', cancel: '取消', selectPlaceholder: '-- 选择 --', firstNamePh: '名', lastNamePh: '姓',
      guardianTitle: '监护人信息', guardianName: '全名', guardianEmail: '邮箱', guardianPhone: '手机', guardianEdit: '编辑', guardianConfirm: '确认', guardianUseSame: '使用相同的监护人信息？', guardianYes: '是', guardianNo: '更改' },
  };
  const ft = texts[lang] || texts.es;

  const gSet = (k, v) => setGuardian(p => ({ ...p, [k]: v }));

  return (
    <Card className="border-primary/30 shadow-sm">
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">{ft.title}</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}><X className="h-4 w-4" /></Button>
        </div>

        {/* ═══ GUARDIAN HEADER ═══ */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2" data-testid="guardian-header">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{ft.guardianTitle}</Label>
            {guardianConfirmed && !editingGuardian && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setEditingGuardian(true)}>{ft.guardianEdit}</Button>
            )}
          </div>
          {guardianConfirmed && !editingGuardian ? (
            <div className="flex items-center gap-3 text-xs">
              <User className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="font-medium truncate">{guardian.name}</p>
                <p className="text-muted-foreground truncate">{[guardian.email, guardian.phone].filter(Boolean).join(' · ') || '—'}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">{ft.guardianName}</Label>
                <Input value={guardian.name} onChange={e => gSet('name', e.target.value)} placeholder={ft.guardianName} className="h-8 text-xs" data-testid="input-guardian-name" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">{ft.guardianEmail}</Label>
                <Input type="email" value={guardian.email} onChange={e => gSet('email', e.target.value)} placeholder="email@example.com" className="h-8 text-xs" data-testid="input-guardian-email" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">{ft.guardianPhone}</Label>
                <Input type="tel" value={guardian.phone} onChange={e => gSet('phone', e.target.value)} placeholder="+507 6000-0000" className="h-8 text-xs" data-testid="input-guardian-phone" />
              </div>
            </div>
          )}
          {editingGuardian && guardian.name && (
            <div className="flex justify-end">
              <Button size="sm" variant="secondary" className="h-6 text-[10px] px-3" onClick={() => { setGuardianConfirmed(true); setEditingGuardian(false); }}>
                <Check className="h-3 w-3 mr-1" />{ft.guardianConfirm}
              </Button>
            </div>
          )}
        </div>

        {/* ═══ STUDENT FIELDS ═══ */}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">{ft.firstName} *</Label>
            <Input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder={ft.firstNamePh} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ft.lastName} *</Label>
            <Input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder={ft.lastNamePh} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ft.school} *</Label>
            <select value={form.school_id} onChange={e => set('school_id', e.target.value)} className="w-full h-9 px-3 text-sm border rounded-md bg-background">
              <option value="">{ft.selectPlaceholder}</option>
              {schools.map(s => <option key={s.school_id} value={s.school_id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ft.grade} *</Label>
            <select value={form.grade} onChange={e => set('grade', e.target.value)} className="w-full h-9 px-3 text-sm border rounded-md bg-background">
              <option value="">{ft.selectPlaceholder}</option>
              {GRADE_OPTIONS.map(g => <option key={g.value} value={g.value}>{g[lang] || g.es}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ft.studentNo}</Label>
            <Input value={form.student_number} onChange={e => set('student_number', e.target.value)} placeholder="12345" className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ft.relationship} *</Label>
            <select value={form.relation_type} onChange={e => set('relation_type', e.target.value)} className="w-full h-9 px-3 text-sm border rounded-md bg-background">
              <option value="">{ft.selectPlaceholder}</option>
              {RELATIONSHIP_OPTIONS.map(r => <option key={r.value} value={r.value}>{r[lang] || r.es}</option>)}
            </select>
          </div>
          {form.relation_type === 'other' && (
            <div className="space-y-1">
              <Label className="text-xs">{ft.other}</Label>
              <Input value={form.relation_other} onChange={e => set('relation_other', e.target.value)} className="h-9 text-sm" />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onCancel}>{ft.cancel}</Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <UserPlus className="h-3.5 w-3.5 mr-1" />}
            {ft.submit}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyStudentCard({ onClick, lang }) {
  const labels = { en: 'Add a student', es: 'Agregar estudiante', zh: '添加学生' };
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer min-h-[120px]"
    >
      <div className="p-3 rounded-full bg-primary/10 text-primary">
        <Plus className="h-6 w-6" />
      </div>
      <span className="text-sm font-medium text-muted-foreground">{labels[lang] || labels.es}</span>
    </button>
  );
}

function PendingStudentCard({ student, lang }) {
  const pendingLabel = { en: 'Pending', es: 'Pendiente', zh: '待处理' };
  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
      <CardContent className="py-4 flex items-center gap-3">
        <div className="p-2 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30">
          <Clock className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.nombre}</p>
          <p className="text-xs text-muted-foreground">{student.school_name || student.escuela} • {student.grade || student.grado}</p>
        </div>
        <Badge variant="secondary" className="shrink-0 text-xs">
          <Clock className="h-3 w-3 mr-1" /> {pendingLabel[lang] || pendingLabel.es}
        </Badge>
      </CardContent>
    </Card>
  );
}

export default function SchoolTextbooksView({ 
  isAuthenticated, 
  sysbookAccess, 
  storeConfig, 
  onSelectStudent, 
  onLinkStudent,
  onBack 
}) {
  const { i18n } = useTranslation();
  const { token } = useAuth();
  const navigate = useNavigate();
  const lang = i18n?.language || 'es';
  
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [studentOrders, setStudentOrders] = useState({}); // { studentId: orderData }
  const [studentLoading, setStudentLoading] = useState({}); // { studentId: boolean }
  const SELECTED_BOOKS_KEY = 'chipi_selected_textbooks';
  const [selectedBooks, setSelectedBooks] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(SELECTED_BOOKS_KEY) || '{}'); } catch { return {}; }
  });
  
  // Persist selections to sessionStorage so they survive tab switches
  useEffect(() => {
    try { sessionStorage.setItem(SELECTED_BOOKS_KEY, JSON.stringify(selectedBooks)); } catch {}
  }, [selectedBooks]);
  const [executeSubmit, submitting] = useGuardedAction();
  const [reorderItem, setReorderItem] = useState(null);
  const [reorderReason, setReorderReason] = useState('');
  const [requestingReorder, setRequestingReorder] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [allStudents, setAllStudents] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const [summaryStudent, setSummaryStudent] = useState(null);
  const [depositOpen, setDepositOpen] = useState(false);
  const [walletPolling, setWalletPolling] = useState(false);
  // Payment flow state: tracks which students have completed the Pay step
  const [paymentAcknowledged, setPaymentAcknowledged] = useState({}); // { studentId: paymentMethod }
  const [showPayMethodsFor, setShowPayMethodsFor] = useState(null); // studentId or null
  const [showMethodDetail, setShowMethodDetail] = useState(null); // 'cash' | 'bank_transfer' | null
  const [payLoading, setPayLoading] = useState(false); // Loading state for Pay button
  const paymentMethods = storeConfig?.payment_methods || {};
  
  const texts = {
    en: {
      title: 'School Textbooks', subtitle: 'Order textbooks for your students',
      loginRequired: 'Login Required', loginMessage: 'Please login to access exclusive school textbooks',
      loginButton: 'Login', back: 'Back to Store',
      noValidatedStudents: 'No Validated Students', noValidatedStudentsDesc: 'Your student link requests are pending approval.',
      goToMyStudents: 'View My Students', linkStudentBtn: 'Link Student',
      grade: 'Grade', loading: 'Loading...',
      noBooks: 'No textbooks available for this grade',
      purchased: 'Purchased', reorderPending: 'Reorder pending',
      available: 'Available', outOfStock: 'Out of stock',
      submitOrder: 'Submit Order', orderSuccess: 'Order submitted successfully!',
      orderError: 'Error submitting order', selectAtLeastOne: 'Please select at least one book',
      total: 'Total', itemsOf: 'of',
      requestReorder: 'Request Reorder', reorderReason: 'Reason for reorder',
      reorderSuccess: 'Reorder requested', reorderError: 'Error requesting reorder',
      reorderReasonPlaceholder: 'e.g., Book was damaged, need replacement',
      send: 'Send Request', cancel: 'Cancel',
      textbooksList: 'Textbooks List', tapToView: 'Tap to view textbooks',
    },
    es: {
      title: 'Textos Escolares', subtitle: 'Ordena los textos de tus estudiantes',
      loginRequired: 'Inicio de Sesión Requerido', loginMessage: 'Inicia sesión para acceder a textos escolares exclusivos',
      loginButton: 'Iniciar Sesión', back: 'Volver a la Tienda',
      noValidatedStudents: 'Sin Estudiantes Validados', noValidatedStudentsDesc: 'Tus solicitudes están pendientes de aprobación.',
      goToMyStudents: 'Ver Mis Estudiantes', linkStudentBtn: 'Vincular Estudiante',
      grade: 'Grado', loading: 'Cargando...',
      noBooks: 'No hay textos disponibles para este grado',
      purchased: 'Comprado', reorderPending: 'Reorden pendiente',
      available: 'Disponible', outOfStock: 'Agotado',
      submitOrder: 'Enviar Pedido', orderSuccess: '¡Pedido enviado correctamente!',
      orderError: 'Error al enviar el pedido', selectAtLeastOne: 'Selecciona al menos un libro',
      total: 'Total', itemsOf: 'de',
      requestReorder: 'Solicitar Reorden', reorderReason: 'Motivo de la reorden',
      reorderSuccess: 'Reorden solicitada', reorderError: 'Error al solicitar reorden',
      reorderReasonPlaceholder: 'Ej: Libro dañado, necesito reemplazo',
      send: 'Enviar Solicitud', cancel: 'Cancelar',
      textbooksList: 'Lista de Textos', tapToView: 'Toca para ver los textos',
    },
    zh: {
      title: '学校教科书', subtitle: '为您的学生订购教科书',
      loginRequired: '需要登录', loginMessage: '请登录以访问专属学校教科书',
      loginButton: '登录', back: '返回商店',
      noValidatedStudents: '无验证学生', noValidatedStudentsDesc: '您的请求正在等待批准。',
      goToMyStudents: '查看我的学生', linkStudentBtn: '关联学生',
      grade: '年级', loading: '加载中...',
      noBooks: '此年级暂无教科书',
      purchased: '已购买', reorderPending: '重新订购等待中',
      available: '可用', outOfStock: '缺货',
      submitOrder: '提交订单', orderSuccess: '订单提交成功！',
      orderError: '提交订单时出错', selectAtLeastOne: '请至少选择一本书',
      total: '总计', itemsOf: '/',
      requestReorder: '请求重新订购', reorderReason: '重新订购原因',
      reorderSuccess: '重新订购已请求', reorderError: '请求重新订购时出错',
      reorderReasonPlaceholder: '例如：书籍损坏，需要更换',
      send: '发送请求', cancel: '取消',
      textbooksList: '教科书列表', tapToView: '点击查看教科书',
    }
  };
  
  const t = texts[lang] || texts.es;
  const validatedStudents = sysbookAccess?.students || [];
  const hasAccess = sysbookAccess?.has_access === true;

  // Fetch all students (including pending) for the card display
  const fetchAllStudents = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${API_URL}/api/sysbook/access/my-students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAllStudents(data?.students || []);
    } catch { setAllStudents([]); }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && (!hasAccess || validatedStudents.length === 0)) {
      fetchAllStudents();
    }
  }, [isAuthenticated, hasAccess, validatedStudents.length, fetchAllStudents]);

  // Poll for student link approval — when pending, check every 3s until approved
  const [linkPolling, setLinkPolling] = useState(false);
  useEffect(() => {
    if (!linkPolling || !isAuthenticated || !token) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/sysbook/access`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.students?.length > 0 && data.has_access) {
            // Approval detected — reload the page to show textbooks
            setLinkPolling(false);
            window.location.reload();
          }
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [linkPolling, isAuthenticated, token]);


  // Fetch wallet balance — polls every 10s after deposit submission
  const refreshWallet = useCallback(() => {
    if (!token) return;
    axios.get(`${API_URL}/api/wallet/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setWalletBalance(res.data.wallet?.balance_usd ?? 0))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

  // Real-time wallet balance updates — rely on polling via walletPolling state
  // (Ably real-time removed to avoid "Connection closed" teardown errors in this component)


  // Poll wallet balance after deposit (auto-detect admin approval)
  useEffect(() => {
    if (!walletPolling) return;
    const interval = setInterval(refreshWallet, 10000);
    // Stop polling after 5 minutes
    const timeout = setTimeout(() => setWalletPolling(false), 300000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [walletPolling, refreshWallet]);

  // Fetch order for a specific student (with caching)
  const fetchOrderForStudent = useCallback(async (studentId) => {
    if (!studentId || !token) return;
    setStudentLoading(prev => ({ ...prev, [studentId]: true }));
    try {
      const res = await axios.get(
        `${API_URL}/api/sysbook/orders/student/${studentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStudentOrders(prev => ({ ...prev, [studentId]: res.data }));
    } catch {
      setStudentOrders(prev => ({ ...prev, [studentId]: null }));
    } finally {
      setStudentLoading(prev => ({ ...prev, [studentId]: false }));
    }
  }, [token]);

  // Toggle accordion: expand one, collapse others
  const toggleExpand = useCallback((studentId) => {
    setExpandedStudentId(prev => {
      const newId = prev === studentId ? null : studentId;
      // Fetch order data if expanding and not already loaded
      if (newId && !studentOrders[newId]) {
        fetchOrderForStudent(newId);
      }
      return newId;
    });
  }, [studentOrders, fetchOrderForStudent]);

  // Helpers for the currently expanded student
  const getStudentOrder = (studentId) => studentOrders[studentId];
  const getStudentBooks = (studentId) => selectedBooks[studentId] || {};
  
  const toggleBook = (studentId, bookId) => {
    setSelectedBooks(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [bookId]: !(prev[studentId]?.[bookId]) }
    }));
  };
  
  // ---- PAY → SEND ORDER two-step flow ----

  // Step 1: "Pay" button clicked — always open payment methods dialog immediately
  const handlePayClick = (student) => {
    const studentId = student.student_id || student.sync_id;
    const books = getStudentBooks(studentId);
    const orderData = getStudentOrder(studentId);
    const items = orderData?.items || [];
    const availableItems = items.filter(i => i.status === 'available' || i.status === 'reorder_approved');
    const selectedList = availableItems.filter(i => books[i.book_id]);
    if (selectedList.length === 0) { toast.error(t.selectAtLeastOne); return; }
    // Always open the payment methods dialog — wallet balance check happens inside
    setShowPayMethodsFor(studentId);
  };

  // Step 1b: User selects a payment method from the dialog
  const handleSelectPaymentMethod = async (methodKey) => {
    if (methodKey === 'wallet') {
      // Check wallet balance first
      const studentId = showPayMethodsFor;
      const books = getStudentBooks(studentId);
      const orderData = getStudentOrder(studentId);
      const items = orderData?.items || [];
      const availableItems = items.filter(i => i.status === 'available' || i.status === 'reorder_approved');
      const selectedList = availableItems.filter(i => books[i.book_id]);
      const total = selectedList.reduce((sum, b) => sum + (b.price || 0), 0);

      setPayLoading(true);
      try {
        const walletRes = await axios.get(`${API_URL}/api/wallet/me`, { headers: { Authorization: `Bearer ${token}` } });
        const freshBalance = walletRes.data.wallet?.balance_usd ?? 0;
        setWalletBalance(freshBalance);

        if ((freshBalance + 0.01) >= total) {
          // Balance sufficient — acknowledge wallet payment and unlock Send Order
          setShowPayMethodsFor(null);
          setPaymentAcknowledged(prev => ({ ...prev, [studentId]: 'wallet' }));
          toast.success(lang === 'es' ? 'Saldo suficiente. Ahora puedes enviar el pedido.' : 'Sufficient balance. You can now send the order.');
        } else {
          // Balance insufficient — open deposit flow to top up
          setShowPayMethodsFor(null);
          setDepositOpen(true);
        }
      } catch {
        // Wallet check failed — open deposit flow
        setShowPayMethodsFor(null);
        setDepositOpen(true);
      } finally {
        setPayLoading(false);
      }
    } else {
      // Show method detail (cash instructions or bank transfer details)
      setShowMethodDetail(methodKey);
    }
  };

  // Step 1c: User acknowledges payment method instructions → unlock Send Order
  const handleAcknowledgeMethod = (methodKey) => {
    const studentId = showPayMethodsFor;
    setShowMethodDetail(null);
    setShowPayMethodsFor(null);
    if (studentId) {
      setPaymentAcknowledged(prev => ({ ...prev, [studentId]: methodKey }));
      toast.success(lang === 'es' ? 'Metodo de pago confirmado. Ahora puedes enviar el pedido.' : 'Payment method confirmed. You can now send the order.');
    }
  };

  // Step 2: "Send Order" button — show confirmation about awaiting_payment status
  const handleSendOrderClick = (student) => {
    const studentId = student.student_id || student.sync_id;
    const books = getStudentBooks(studentId);
    const orderData = getStudentOrder(studentId);
    const items = orderData?.items || [];
    const availableItems = items.filter(i => i.status === 'available' || i.status === 'reorder_approved');
    const selectedList = availableItems.filter(i => books[i.book_id]);
    if (selectedList.length === 0) { toast.error(t.selectAtLeastOne); return; }
    setSummaryStudent(student);
  };

  const [showPaymentPending, setShowPaymentPending] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState(null);

  // Step 2b: Confirm order from summary modal
  const handleConfirmOrder = () => executeSubmit(async () => {
    if (!summaryStudent) return;
    const student = summaryStudent;
    const studentId = student.student_id || student.sync_id;
    const orderData = getStudentOrder(studentId);
    const books = getStudentBooks(studentId);
    const items = orderData?.items || [];
    const availableItems = items.filter(i => i.status === 'available' || i.status === 'reorder_approved');
    const selectedList = availableItems.filter(i => books[i.book_id]);
    const total = selectedList.reduce((sum, b) => sum + (b.price || 0), 0);
    const payMethod = paymentAcknowledged[studentId] || 'awaiting_payment';

    if (payMethod === 'wallet') {
      // Wallet payment — deduct and submit
      let freshBalance = walletBalance || 0;
      try {
        const walletRes = await axios.get(`${API_URL}/api/wallet/me`, { headers: { Authorization: `Bearer ${token}` } });
        freshBalance = walletRes.data.wallet?.balance_usd ?? 0;
        setWalletBalance(freshBalance);
      } catch {}
      if ((freshBalance + 0.01) >= total) {
        await _submitOrder(studentId, selectedList, 'wallet');
      } else {
        // Balance changed since Pay step — submit as awaiting_payment
        await _submitOrder(studentId, selectedList, 'awaiting_payment');
      }
    } else {
      // Cash / Bank Transfer / other — submit as awaiting_payment
      await _submitOrder(studentId, selectedList, 'awaiting_payment');
    }
    // Clear payment acknowledged for this student after order
    setPaymentAcknowledged(prev => { const n = { ...prev }; delete n[studentId]; return n; });
  });

  const _submitOrder = async (studentId, selectedList, paymentMethod) => {
    try {
      const res = await axios.post(
        `${API_URL}/api/sysbook/orders/submit`,
        {
          student_id: studentId,
          items: selectedList.map(b => ({ book_id: b.book_id, quantity: 1 })),
          payment_method: paymentMethod,
        },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }
      );
      // Show warnings if some items failed
      if (res.data?.warnings?.length > 0) {
        toast.warning(`${t.orderSuccess} (${res.data.items_failed} ${lang === 'es' ? 'libro(s) no disponible(s)' : 'book(s) unavailable'})`);
      } else if (paymentMethod === 'awaiting_payment') {
        toast.success(lang === 'es' ? 'Pedido creado — pendiente de pago' : lang === 'zh' ? '订单已创建 — 待付款' : 'Order placed — awaiting payment');
      } else {
        toast.success(t.orderSuccess);
      }
      setSelectedBooks(prev => ({ ...prev, [studentId]: {} }));
      try { sessionStorage.removeItem('chipi_selected_textbooks'); } catch {}
      setSummaryStudent(null);
      axios.get(`${API_URL}/api/wallet/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setWalletBalance(res.data.wallet?.balance_usd ?? 0))
        .catch(() => {});
      await fetchOrderForStudent(studentId);
    } catch (error) {
      toast.error(error.response?.data?.detail || t.orderError);
      axios.get(`${API_URL}/api/wallet/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setWalletBalance(res.data.wallet?.balance_usd ?? 0))
        .catch(() => {});
    }
  };
  
  // Pay for an existing awaiting_payment order
  const [payingOrderId, setPayingOrderId] = useState(null);
  const handlePayExistingOrder = async (orderId, studentId) => {
    setPayingOrderId(orderId);
    try {
      // Refresh wallet first
      let freshBalance = walletBalance || 0;
      try {
        const walletRes = await axios.get(`${API_URL}/api/wallet/me`, { headers: { Authorization: `Bearer ${token}` } });
        freshBalance = walletRes.data.wallet?.balance_usd ?? 0;
        setWalletBalance(freshBalance);
      } catch {}

      const orderData = getStudentOrder(studentId);
      const total = orderData?.total_amount || 0;

      if ((freshBalance + 0.01) < total) {
        toast.error(lang === 'es'
          ? `Saldo insuficiente. Disponible: $${freshBalance.toFixed(2)}, Requerido: $${total.toFixed(2)}`
          : `Insufficient balance. Available: $${freshBalance.toFixed(2)}, Required: $${total.toFixed(2)}`);
        return;
      }

      const res = await axios.post(
        `${API_URL}/api/sysbook/orders/${orderId}/pay`,
        {},
        { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }
      );
      if (res.data?.success) {
        toast.success(lang === 'es' ? 'Pago completado exitosamente!' : 'Payment completed successfully!');
        refreshWallet();
        await fetchOrderForStudent(studentId);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || (lang === 'es' ? 'Error al procesar el pago' : 'Payment failed'));
    } finally {
      setPayingOrderId(null);
    }
  };

  const handleReorderRequest = async () => {
    if (!reorderItem) return;
    const studentId = expandedStudentId;
    const orderData = getStudentOrder(studentId);
    if (!orderData?.order_id) return;
    setRequestingReorder(true);
    try {
      await axios.post(
        `${API_URL}/api/sysbook/orders/${orderData.order_id}/reorder/${reorderItem.book_id}`,
        { reason: reorderReason || '' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(t.reorderSuccess);
      setReorderItem(null);
      setReorderReason('');
      await fetchOrderForStudent(studentId);
    } catch (error) {
      toast.error(error.response?.data?.detail || t.reorderError);
    } finally {
      setRequestingReorder(false);
    }
  };
  
  // ---- Early returns for unauthenticated / no students ----
  if (!isAuthenticated) {
    return (
      <div className="space-y-4">
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <Lock className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <h3 className="font-semibold mb-1">{t.loginRequired}</h3>
            <p className="text-sm text-muted-foreground mb-4">{storeConfig?.textbooks_login_message?.[lang] || t.loginMessage}</p>
            <Button onClick={() => window.location.href = '/login'}>{t.loginButton}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!hasAccess || validatedStudents.length === 0) {
    const pendingStudents = (allStudents || []).filter(s => s.status === 'pending' || s.estado === 'pendiente');

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-purple-600" />
            <h2 className="text-base sm:text-lg font-bold">{t.title}</h2>
          </div>
        </div>

        {/* Student cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Existing pending students */}
          {pendingStudents.map((s, i) => (
            <PendingStudentCard key={s.student_id || i} student={s} lang={lang} />
          ))}

          {/* Empty card to add a new student (always show when no validated) */}
          {!showLinkForm && (
            <EmptyStudentCard onClick={() => setShowLinkForm(true)} lang={lang} />
          )}
        </div>

        {/* Inline student linking form */}
        {showLinkForm && (
          <InlineStudentForm
            token={token}
            lang={lang}
            onSuccess={() => {
              setShowLinkForm(false);
              fetchAllStudents();
            }}
            onCancel={() => setShowLinkForm(false)}
          />
        )}

        {/* Info message when students are pending */}
        {pendingStudents.length > 0 && !showLinkForm && (
          <p className="text-xs text-muted-foreground text-center">
            {t.noValidatedStudentsDesc}
          </p>
        )}
      </div>
    );
  }
  
  // ---- Main view: student cards with expandable textbook lists ----
  return (
    <div className="space-y-3" data-testid="school-textbooks-view">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-purple-600" />
          <h2 className="text-base sm:text-lg font-bold">{t.title}</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowLinkForm(!showLinkForm)} className="shrink-0 text-xs" data-testid="link-student-btn">
          {showLinkForm ? <X className="h-3.5 w-3.5 sm:mr-1" /> : <UserPlus className="h-3.5 w-3.5 sm:mr-1" />}
          <span className="hidden sm:inline">{showLinkForm ? t.cancel : t.linkStudentBtn}</span>
        </Button>
      </div>

      {/* Inline student linking form */}
      {showLinkForm && (
        <InlineStudentForm
          token={token}
          lang={lang}
          onSuccess={() => {
            setShowLinkForm(false);
            fetchAllStudents();
            setLinkPolling(true); // Start polling for auto-approval
          }}
          onCancel={() => setShowLinkForm(false)}
        />
      )}
      
      {/* Student Accordion Cards */}
      <div className="space-y-3 pb-24" data-testid="student-accordion">
        {validatedStudents.map((student) => {
          const studentId = student.student_id || student.sync_id;
          const isExpanded = expandedStudentId === studentId;
          const isLoading = studentLoading[studentId];
          const orderData = getStudentOrder(studentId);
          const books = getStudentBooks(studentId);
          const items = orderData?.items || [];
          const orderedItems = items.filter(i => i.status === 'ordered');
          const availableItems = items.filter(i => i.status === 'available' || i.status === 'reorder_approved');
          const selectedList = availableItems.filter(i => books[i.book_id]);
          const selectedTotal = selectedList.reduce((sum, i) => sum + (i.price || 0), 0);
          const orderedTotal = orderedItems.reduce((sum, i) => sum + (i.price || 0), 0);
          const studentName = student.name || student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim();

          return (
            <div key={studentId} className="rounded-xl border bg-card overflow-hidden" data-testid={`student-card-${studentId}`}>
              {/* Student info header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
                <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{studentName}</p>
                  <p className="text-xs text-muted-foreground">{student.school_name} &middot; {t.grade} {student.grade}</p>
                </div>
                <Badge variant="outline" className="shrink-0 text-xs border-green-300 text-green-700 bg-green-50 dark:bg-green-900/20">
                  <Check className="h-3 w-3 mr-1" /> {lang === 'es' ? 'Aprobado' : 'Approved'}
                </Badge>
              </div>
              
              {/* Textbooks List expandable bar */}
              <button
                onClick={() => toggleExpand(studentId)}
                className={`
                  w-full flex items-center justify-between px-4 py-2.5 transition-colors text-left
                  ${isExpanded 
                    ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' 
                    : 'bg-muted/30 hover:bg-muted/60 text-muted-foreground'}
                `}
                data-testid={`textbooks-list-btn-${studentId}`}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <BookOpen className="h-4 w-4" />
                  {t.textbooksList}
                  {orderData && items.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">
                      {items.length} items · {orderedItems.length} {t.purchased.toLowerCase()}
                    </Badge>
                  )}
                </span>
                <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
              </button>

              {/* Expanded textbook list content */}
              {isExpanded && (
                <div className="border-t">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                      <span className="ml-2 text-sm text-muted-foreground">{t.loading}</span>
                    </div>
                  ) : items.length === 0 ? (
                    <div className="py-8 text-center">
                      <Package className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">{t.noBooks}</p>
                    </div>
                  ) : (
                    <div>
                      {/* Progress indicator */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground px-4 py-2 bg-muted/20">
                        <span>{orderedItems.length} {t.itemsOf} {items.length} {t.purchased.toLowerCase()}</span>
                        {orderedTotal > 0 && <span className="font-medium text-foreground">{t.purchased}: ${orderedTotal.toFixed(2)}</span>}
                      </div>

                      {/* Order Status Stepper */}
                      {orderData?.status && orderedItems.length > 0 && (() => {
                        const isAwaitingPayment = orderData.status === 'awaiting_payment';
                        const steps = isAwaitingPayment ? [
                          { key: 'awaiting_payment', label: lang === 'es' ? 'Pendiente Pago' : 'Awaiting Payment', icon: Wallet },
                          { key: 'submitted', label: lang === 'es' ? 'Enviado' : 'Submitted', icon: Send },
                          { key: 'processing', label: lang === 'es' ? 'Procesando' : 'Processing', icon: Package },
                          { key: 'ready', label: lang === 'es' ? 'Listo' : 'Ready', icon: CheckCircle2 },
                        ] : [
                          { key: 'submitted', label: lang === 'es' ? 'Enviado' : 'Submitted', icon: Send },
                          { key: 'paid', label: lang === 'es' ? 'Pagado' : 'Paid', icon: Wallet },
                          { key: 'processing', label: lang === 'es' ? 'Procesando' : 'Processing', icon: Package },
                          { key: 'ready', label: lang === 'es' ? 'Listo' : 'Ready', icon: CheckCircle2 },
                        ];
                        const statusOrder = isAwaitingPayment
                          ? { awaiting_payment: 0, submitted: 1, processing: 2, ready: 3, delivered: 4 }
                          : { submitted: 0, awaiting_link: 0, paid: 1, processing: 2, ready: 3, delivered: 4 };
                        const currentIdx = statusOrder[orderData.status] ?? 0;
                        return (
                          <div className="px-4 py-2.5 bg-muted/10 border-b" data-testid={`order-stepper-${studentId}`}>
                            <div className="flex items-center justify-between">
                              {steps.map((step, idx) => {
                                const StepIcon = step.icon;
                                const isDone = idx < currentIdx;
                                const isCurrent = idx === currentIdx;
                                return (
                                  <div key={step.key} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center gap-0.5">
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                        isDone ? 'bg-green-500 text-white' : isCurrent ? 'bg-purple-600 text-white ring-2 ring-purple-200' : 'bg-muted text-muted-foreground'
                                      }`}>
                                        {isDone ? <Check className="h-3 w-3" /> : <StepIcon className="h-3 w-3" />}
                                      </div>
                                      <span className={`text-[9px] font-medium ${isCurrent ? 'text-purple-700' : isDone ? 'text-green-700' : 'text-muted-foreground'}`}>{step.label}</span>
                                    </div>
                                    {idx < steps.length - 1 && (
                                      <div className={`flex-1 h-0.5 mx-1 mt-[-12px] rounded ${isDone ? 'bg-green-400' : 'bg-muted'}`} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* Item list */}
                      <div className="divide-y" data-testid={`textbook-list-${studentId}`}>
                        {items.map((item, itemIndex) => {
                          const isOrdered = item.status === 'ordered';
                          const isPending = item.status === 'reorder_requested';
                          const isAvailable = item.status === 'available' || item.status === 'reorder_approved';
                          const isSelected = !!books[item.book_id];
                          
                          return (
                            <div
                              key={item.book_id}
                              data-testid={`textbook-item-${item.book_id}`}
                              className={`
                                flex items-center gap-2.5 px-4 py-2.5 transition-colors
                                ${isOrdered ? 'bg-green-50/50 dark:bg-green-900/10' : ''}
                                ${isPending ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}
                                ${isSelected ? 'bg-purple-50 dark:bg-purple-900/20' : ''}
                                ${isAvailable && !isSelected ? 'hover:bg-muted/50 cursor-pointer' : ''}
                              `}
                              onClick={(e) => {
                                if (isAvailable && e.target.tagName !== 'INPUT') {
                                  toggleBook(studentId, item.book_id);
                                }
                              }}
                            >
                              {/* Row number */}
                              <span className="shrink-0 w-5 text-[10px] text-muted-foreground text-right">{itemIndex + 1}</span>
                              {/* Selection / Status indicator */}
                              <div className="shrink-0 w-5 flex justify-center">
                                {isOrdered ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : isPending ? (
                                  <Clock className="h-4 w-4 text-amber-500" />
                                ) : (
                                  <input
                                    type="checkbox"
                                    checked={isSelected && isAvailable}
                                    disabled={!isAvailable}
                                    onChange={() => { if (isAvailable) toggleBook(studentId, item.book_id); }}
                                    className={`h-4 w-4 rounded border-2 focus:ring-purple-500 ${isAvailable ? 'text-purple-600 cursor-pointer' : 'text-gray-300 cursor-not-allowed opacity-50'}`}
                                  />
                                )}
                              </div>
                              
                              {/* Book info */}
                              <div className="flex-1 min-w-0">
                                <ExpandableText className={`text-sm font-medium ${isOrdered ? 'text-muted-foreground' : ''}`}>
                                  {item.book_name}
                                </ExpandableText>
                                <p className="text-xs text-muted-foreground truncate">{item.book_code}</p>
                              </div>
                              
                              {/* Price + status badge */}
                              <div className="shrink-0 text-right flex flex-col items-end gap-0.5">
                                <p className={`text-sm font-semibold ${isOrdered ? 'text-green-600' : 'text-foreground'}`}>
                                  ${item.price?.toFixed(2)}
                                </p>
                                {isOrdered && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setReorderItem(item); }}
                                    className="text-[10px] text-green-600 hover:text-purple-600 hover:underline font-medium transition-colors"
                                  >
                                    {t.purchased} &middot; {t.requestReorder}
                                  </button>
                                )}
                                {isPending && (
                                  <span className="text-[10px] text-amber-600 font-medium">{t.reorderPending}</span>
                                )}
                                {item.status === 'out_of_stock' && (
                                  <span className="text-[10px] text-red-500 font-medium">{t.outOfStock}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Submit bar — two-step: Pay → Send Order */}
                      {availableItems.length > 0 && (
                        <div className="sticky bottom-0 z-10 border-t px-4 py-3 bg-card shadow-[0_-4px_12px_rgba(0,0,0,0.15)]" data-testid={`order-bar-${studentId}`}>
                          {/* Wallet balance row */}
                          <div className={`flex items-center justify-between mb-2 px-2 py-1.5 rounded-lg text-xs ${
                            walletBalance !== null && walletBalance >= selectedTotal
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-700'
                              : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700'
                          }`} data-testid={`wallet-balance-${studentId}`}>
                            <span className="flex items-center gap-1.5">
                              <Wallet className="h-3.5 w-3.5" />
                              {lang === 'es' ? 'Saldo:' : 'Balance:'}
                            </span>
                            <span className="font-bold">${(walletBalance ?? 0).toFixed(2)}</span>
                          </div>

                          {/* Payment acknowledged indicator */}
                          {paymentAcknowledged[studentId] && (
                            <div className="mb-2 flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs bg-green-50 dark:bg-green-900/20 text-green-700" data-testid={`payment-ack-${studentId}`}>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {paymentAcknowledged[studentId] === 'wallet'
                                ? (lang === 'es' ? 'Pago con billetera confirmado' : 'Wallet payment confirmed')
                                : paymentAcknowledged[studentId] === 'cash'
                                  ? (lang === 'es' ? 'Pago en efectivo seleccionado' : 'Cash payment selected')
                                  : paymentAcknowledged[studentId] === 'bank_transfer'
                                    ? (lang === 'es' ? 'Transferencia bancaria seleccionada' : 'Bank transfer selected')
                                    : (lang === 'es' ? 'Metodo de pago confirmado' : 'Payment method confirmed')
                              }
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-3 pb-safe">
                            <div className="text-sm">
                              <span className="text-muted-foreground">{selectedList.length} {lang === 'es' ? 'seleccionado(s)' : 'selected'}</span>
                              {selectedTotal > 0 && (
                                <span className="ml-2 font-bold text-purple-600">${selectedTotal.toFixed(2)}</span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {/* Step 1: Pay button — always visible */}
                              {!paymentAcknowledged[studentId] && (
                                <Button
                                  onClick={() => handlePayClick(student)}
                                  disabled={submitting || selectedList.length === 0}
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-300 dark:hover:bg-purple-900/30 shrink-0 active:bg-purple-100"
                                  data-testid={`pay-btn-${studentId}`}
                                >
                                  <Wallet className="h-3.5 w-3.5" />
                                  {lang === 'es' ? 'Pagar' : 'Pay'}
                                </Button>
                              )}
                              {/* Step 2: Send Order — enabled only after Pay step */}
                              <Button
                                onClick={() => handleSendOrderClick(student)}
                                disabled={submitting || selectedList.length === 0 || !paymentAcknowledged[studentId]}
                                className={`gap-1.5 shrink-0 ${paymentAcknowledged[studentId] ? 'bg-purple-600 hover:bg-purple-700' : 'bg-muted text-muted-foreground'}`}
                                size="sm"
                                data-testid={`submit-order-btn-${studentId}`}
                              >
                                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                {t.submitOrder}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Pay Now bar — for existing awaiting_payment orders */}
                      {orderData?.status === 'awaiting_payment' && orderData?.order_id && (
                        <div className="sticky bottom-0 z-10 border-t px-4 py-3 bg-card shadow-[0_-4px_12px_rgba(0,0,0,0.15)]" data-testid={`pay-now-bar-${studentId}`}>
                          {/* Wallet balance */}
                          <div className={`flex items-center justify-between mb-2 px-2 py-1.5 rounded-lg text-xs ${
                            walletBalance !== null && walletBalance >= (orderData.total_amount || 0)
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-700'
                              : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700'
                          }`}>
                            <span className="flex items-center gap-1.5">
                              <Wallet className="h-3.5 w-3.5" />
                              {lang === 'es' ? 'Saldo:' : 'Balance:'}
                            </span>
                            <span className="font-bold">${(walletBalance ?? 0).toFixed(2)}</span>
                          </div>

                          {/* Awaiting payment notice */}
                          <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-2 text-xs text-amber-700">
                            <AlertTriangle className="h-3 w-3 inline mr-1" />
                            {lang === 'es'
                              ? `Pedido pendiente de pago: $${(orderData.total_amount || 0).toFixed(2)}`
                              : `Order awaiting payment: $${(orderData.total_amount || 0).toFixed(2)}`}
                          </div>

                          <div className="flex items-center justify-between gap-3 pb-safe">
                            <div className="text-sm">
                              <span className="text-muted-foreground">{orderedItems.length} {lang === 'es' ? 'libro(s)' : 'book(s)'}</span>
                              <span className="ml-2 font-bold text-purple-600">${(orderData.total_amount || 0).toFixed(2)}</span>
                            </div>
                            <Button
                              onClick={() => handlePayExistingOrder(orderData.order_id, studentId)}
                              disabled={payingOrderId === orderData.order_id || (walletBalance !== null && (walletBalance + 0.01) < (orderData.total_amount || 0))}
                              className="gap-1.5 bg-green-600 hover:bg-green-700 shrink-0"
                              size="sm"
                              data-testid={`pay-now-btn-${studentId}`}
                            >
                              {payingOrderId === orderData.order_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wallet className="h-3.5 w-3.5" />}
                              {payingOrderId === orderData.order_id
                                ? (lang === 'es' ? 'Procesando...' : 'Processing...')
                                : (lang === 'es' ? 'Pagar Ahora' : 'Pay Now')}
                            </Button>
                          </div>

                          {/* If balance insufficient, show top-up option */}
                          {walletBalance !== null && (walletBalance + 0.01) < (orderData.total_amount || 0) && (
                            <div className="mt-2 flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 h-7 text-[10px] gap-1 border-amber-300 text-amber-700 hover:bg-amber-100"
                                onClick={() => setDepositOpen(true)}
                              >
                                <Banknote className="h-3 w-3" />
                                {lang === 'es' ? 'Recargar Billetera' : 'Top Up Wallet'}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

      </div>
      
      {/* Reorder Request Dialog */}
      {reorderItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setReorderItem(null)}>
          <div className="bg-background rounded-t-xl sm:rounded-xl w-full sm:max-w-sm p-4 space-y-3 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="font-semibold text-sm">{t.requestReorder}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{reorderItem.book_name}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t.reorderReason}</label>
              <textarea
                value={reorderReason}
                onChange={(e) => setReorderReason(e.target.value)}
                placeholder={t.reorderReasonPlaceholder}
                className="w-full px-3 py-2 text-sm border rounded-lg resize-none bg-muted/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setReorderItem(null)} className="flex-1">
                {t.cancel}
              </Button>
              <Button
                size="sm"
                onClick={handleReorderRequest}
                disabled={requestingReorder}
                className="flex-1 gap-1.5 bg-purple-600 hover:bg-purple-700"
              >
                {requestingReorder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {t.send}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Order Summary Preview Modal — now includes awaiting_payment warning */}
      {summaryStudent && (() => {
        const sid = summaryStudent.student_id || summaryStudent.sync_id;
        const bks = getStudentBooks(sid);
        const od = getStudentOrder(sid);
        const itms = od?.items || [];
        const avail = itms.filter(i => i.status === 'available' || i.status === 'reorder_approved');
        const sel = avail.filter(i => bks[i.book_id]);
        const payMethod = paymentAcknowledged[sid] || 'awaiting_payment';
        const isWalletPay = payMethod === 'wallet';
        return (
          <OrderSummaryModal
            open={!!summaryStudent}
            onOpenChange={(v) => { if (!v) setSummaryStudent(null); }}
            onConfirm={handleConfirmOrder}
            studentName={summaryStudent.full_name || `${summaryStudent.first_name || ''} ${summaryStudent.last_name || ''}`.trim()}
            selectedBooks={sel.map(b => ({ book_id: b.book_id, book_name: b.book_name, name: b.book_name, price: b.price }))}
            total={sel.reduce((s, b) => s + (b.price || 0), 0)}
            walletBalance={walletBalance}
            submitting={submitting}
            lang={lang}
            awaitingPaymentNote={!isWalletPay ? (
              lang === 'es'
                ? 'Tu pedido se creara en estado "Pendiente de Pago". Sera confirmado cuando se reciba el pago.'
                : 'Your order will be created in "Awaiting Payment" status. It will be confirmed when payment is received.'
            ) : null}
          />
        );
      })()}

      {/* Inline Deposit Dialog */}
      <DepositFlow
        open={depositOpen}
        onOpenChange={setDepositOpen}
        token={token}
        onSuccess={() => {
          refreshWallet();
          setWalletPolling(true);
          toast.info(lang === 'es'
            ? 'Solicitud enviada. Tu saldo se actualizara automaticamente cuando sea aprobada.'
            : 'Request sent. Your balance will update automatically when approved.');
        }}
      />

      {/* Payment Methods Dialog */}
      {showPayMethodsFor && !showMethodDetail && (
        <Dialog open={true} onOpenChange={() => setShowPayMethodsFor(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-purple-600" />
                {lang === 'es' ? 'Metodo de Pago' : 'Payment Method'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-3">
                {lang === 'es'
                  ? 'Selecciona como deseas realizar el pago para recargar tu billetera:'
                  : 'Select how you want to make your payment to top up your wallet:'}
              </p>
              {Object.entries(paymentMethods)
                .filter(([key]) => key !== 'wallet')
                .sort(([,a], [,b]) => (a.order || 0) - (b.order || 0))
                .map(([key, method]) => {
                  const isEnabled = method.enabled !== false;
                  const IconMap = { banknote: Banknote, 'building-2': Building2, smartphone: Phone, 'credit-card': Wallet };
                  const MethodIcon = IconMap[method.icon] || Wallet;
                  return (
                    <button
                      key={key}
                      onClick={() => isEnabled && handleSelectPaymentMethod(key)}
                      disabled={!isEnabled}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        isEnabled
                          ? 'border-border hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer'
                          : 'border-border/50 opacity-50 cursor-not-allowed'
                      }`}
                      data-testid={`pay-method-${key}`}
                    >
                      <div className={`p-2 rounded-lg ${isEnabled ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' : 'bg-muted text-muted-foreground'}`}>
                        <MethodIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{method.label?.[lang] || method.label?.es || key}</p>
                        <p className="text-[10px] text-muted-foreground">{method.description?.[lang] || method.description?.es || ''}</p>
                      </div>
                      {isEnabled ? (
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <Badge variant="secondary" className="text-[9px] shrink-0">{lang === 'es' ? 'Pronto' : 'Soon'}</Badge>
                      )}
                    </button>
                  );
                })}
              {/* Wallet payment option — checks balance when selected */}
              <button
                onClick={() => handleSelectPaymentMethod('wallet')}
                disabled={payLoading}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                  payLoading ? 'opacity-70 cursor-wait' : 'border-border hover:border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 cursor-pointer'
                }`}
                data-testid="pay-method-wallet-topup"
              >
                <div className="p-2 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30">
                  {payLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {lang === 'es' ? 'Billetera' : 'Wallet'}
                    {walletBalance !== null && <span className="text-xs text-muted-foreground ml-1.5">(${(walletBalance ?? 0).toFixed(2)})</span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{payLoading ? (lang === 'es' ? 'Verificando saldo...' : 'Checking balance...') : (lang === 'es' ? 'Pagar desde el saldo de tu billetera' : 'Pay from your wallet balance')}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Payment Method Detail Dialog (Cash / Bank Transfer instructions) */}
      {showMethodDetail && showPayMethodsFor && (
        <Dialog open={true} onOpenChange={() => setShowMethodDetail(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {showMethodDetail === 'cash'
                  ? (paymentMethods.cash?.label?.[lang] || 'Cash')
                  : showMethodDetail === 'bank_transfer'
                    ? (paymentMethods.bank_transfer?.label?.[lang] || 'Bank Transfer')
                    : showMethodDetail}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {/* Instructions */}
              <p className="text-sm text-muted-foreground">
                {paymentMethods[showMethodDetail]?.instructions?.[lang] || paymentMethods[showMethodDetail]?.instructions?.es || ''}
              </p>

              {/* Bank transfer details */}
              {showMethodDetail === 'bank_transfer' && paymentMethods.bank_transfer?.bank_details && (() => {
                const bd = paymentMethods.bank_transfer.bank_details;
                return (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-sm" data-testid="bank-details">
                    {bd.bank_name && <div className="flex justify-between"><span className="text-muted-foreground">{lang === 'es' ? 'Banco:' : 'Bank:'}</span><span className="font-medium">{bd.bank_name}</span></div>}
                    {bd.account_type && <div className="flex justify-between"><span className="text-muted-foreground">{lang === 'es' ? 'Tipo:' : 'Type:'}</span><span className="font-medium">{bd.account_type?.[lang] || bd.account_type?.es || bd.account_type}</span></div>}
                    {bd.account_number && <div className="flex justify-between"><span className="text-muted-foreground">{lang === 'es' ? 'Cuenta:' : 'Account:'}</span><span className="font-mono font-medium">{bd.account_number}</span></div>}
                    {bd.account_holder && <div className="flex justify-between"><span className="text-muted-foreground">{lang === 'es' ? 'Titular:' : 'Holder:'}</span><span className="font-medium">{bd.account_holder}</span></div>}
                    {bd.email && <div className="flex justify-between"><span className="text-muted-foreground">{lang === 'es' ? 'Correo:' : 'Email:'}</span><span className="font-medium">{bd.email}</span></div>}
                    {bd.reference_note && (
                      <div className="mt-2 text-xs text-amber-700 bg-amber-50 dark:bg-amber-900/20 rounded p-2">
                        <AlertTriangle className="h-3 w-3 inline mr-1" />
                        {bd.reference_note?.[lang] || bd.reference_note?.es || bd.reference_note}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Cash specific note */}
              {showMethodDetail === 'cash' && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground" data-testid="cash-details">
                  <Banknote className="h-4 w-4 inline mr-1.5 text-green-600" />
                  {lang === 'es'
                    ? 'Al dejar el efectivo, el cajero generara una solicitud de recarga que sera acreditada a tu billetera.'
                    : 'When you leave the cash, the cashier will generate a top-up request that will be credited to your wallet.'}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => handleAcknowledgeMethod(showMethodDetail)} className="w-full bg-purple-600 hover:bg-purple-700">
                <Check className="h-4 w-4 mr-1.5" />
                {lang === 'es' ? 'Entendido, Confirmar' : 'Understood, Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
