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
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  BookOpen, Check, ChevronRight, Clock, Eye, GraduationCap,
  Loader2, Lock, Package, Plus, Send, ShoppingCart, User, UserPlus, Users, X
} from 'lucide-react';
import { schoolTxbTranslations } from '../constants/translations';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const GRADE_OPTIONS = [
  { value: 'K3', label: 'K3' }, { value: 'K4', label: 'K4' }, { value: 'K5', label: 'K5' },
  { value: '1', label: '1st Grade' }, { value: '2', label: '2nd Grade' }, { value: '3', label: '3rd Grade' },
  { value: '4', label: '4th Grade' }, { value: '5', label: '5th Grade' }, { value: '6', label: '6th Grade' },
  { value: '7', label: '7th Grade' }, { value: '8', label: '8th Grade' }, { value: '9', label: '9th Grade' },
  { value: '10', label: '10th Grade' }, { value: '11', label: '11th Grade' }, { value: '12', label: '12th Grade' },
];

const RELATIONSHIP_OPTIONS = [
  { value: 'parent', label: 'Parent' }, { value: 'guardian', label: 'Legal Guardian' },
  { value: 'grandparent', label: 'Grandparent' }, { value: 'representative', label: 'Representative' },
  { value: 'other', label: 'Other' },
];

function InlineStudentForm({ token, onSuccess, onCancel, lang }) {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: '', school_id: '', student_number: '',
    year: new Date().getFullYear(), grade: '', relation_type: '', relation_other: '',
  });

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/store/textbook-access/schools`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSchools(data?.schools || []);
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchSchools();
  }, [token]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.full_name.trim()) { toast.error('Enter student name'); return; }
    if (!form.school_id) { toast.error('Select a school'); return; }
    if (!form.grade) { toast.error('Select a grade'); return; }
    if (!form.relation_type) { toast.error('Select your relationship'); return; }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/store/textbook-access/students`, {
        full_name: form.full_name.trim(),
        school_id: form.school_id,
        student_number: form.student_number.trim() || null,
        year: form.year,
        grade: form.grade,
        relation_type: form.relation_type,
        relation_other: form.relation_type === 'other' ? form.relation_other.trim() : null,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Student linked! Pending admin approval.');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  const texts = {
    en: { name: 'Student Full Name', school: 'School', grade: 'Grade', studentNo: 'Student Number (optional)', relationship: 'Your Relationship', other: 'Specify relationship', submit: 'Link Student', cancel: 'Cancel' },
    es: { name: 'Nombre Completo', school: 'Escuela', grade: 'Grado', studentNo: 'Número de Estudiante (opcional)', relationship: 'Su Relación', other: 'Especificar relación', submit: 'Vincular Estudiante', cancel: 'Cancelar' },
    zh: { name: '学生全名', school: '学校', grade: '年级', studentNo: '学号（可选）', relationship: '您的关系', other: '指定关系', submit: '关联学生', cancel: '取消' },
  };
  const ft = texts[lang] || texts.es;

  return (
    <Card className="border-primary/30 shadow-sm">
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">{ft.submit}</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}><X className="h-4 w-4" /></Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">{ft.name} *</Label>
            <Input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="John Doe" className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ft.school} *</Label>
            <select value={form.school_id} onChange={e => set('school_id', e.target.value)} className="w-full h-9 px-3 text-sm border rounded-md bg-background">
              <option value="">-- Select --</option>
              {schools.map(s => <option key={s.school_id} value={s.school_id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ft.grade} *</Label>
            <select value={form.grade} onChange={e => set('grade', e.target.value)} className="w-full h-9 px-3 text-sm border rounded-md bg-background">
              <option value="">-- Select --</option>
              {GRADE_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ft.studentNo}</Label>
            <Input value={form.student_number} onChange={e => set('student_number', e.target.value)} placeholder="12345" className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ft.relationship} *</Label>
            <select value={form.relation_type} onChange={e => set('relation_type', e.target.value)} className="w-full h-9 px-3 text-sm border rounded-md bg-background">
              <option value="">-- Select --</option>
              {RELATIONSHIP_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
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

function PendingStudentCard({ student }) {
  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
      <CardContent className="py-4 flex items-center gap-3">
        <div className="p-2 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30">
          <Clock className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{student.full_name || student.nombre}</p>
          <p className="text-xs text-muted-foreground">{student.school_name || student.escuela} • {student.grade || student.grado}</p>
        </div>
        <Badge variant="secondary" className="shrink-0 text-xs">
          <Clock className="h-3 w-3 mr-1" /> Pending
        </Badge>
      </CardContent>
    </Card>
  );
}

export default function SchoolTextbooksView({ 
  isAuthenticated, 
  privateCatalogAccess, 
  storeConfig, 
  onSelectStudent, 
  onLinkStudent,
  onBack 
}) {
  const { i18n } = useTranslation();
  const { token } = useAuth();
  const navigate = useNavigate();
  const lang = i18n?.language || 'es';
  
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(0);
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [reorderItem, setReorderItem] = useState(null);
  const [reorderReason, setReorderReason] = useState('');
  const [requestingReorder, setRequestingReorder] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [allStudents, setAllStudents] = useState(null); // null = not fetched yet
  
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
    }
  };
  
  const t = texts[lang] || texts.es;
  const validatedStudents = privateCatalogAccess?.students || [];
  const hasAccess = privateCatalogAccess?.has_access === true;
  const selectedStudent = validatedStudents[selectedStudentIndex];

  // Fetch all students (including pending) for the card display
  const fetchAllStudents = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${API_URL}/api/store/textbook-access/my-students`, {
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
  
  // Items derived from orderData
  const items = orderData?.items || [];
  const orderedItems = items.filter(i => i.status === 'ordered');
  const availableItems = items.filter(i => i.status === 'available' || i.status === 'reorder_approved');
  const pendingItems = items.filter(i => i.status === 'reorder_requested');
  const selectedList = availableItems.filter(i => selectedBooks[i.book_id]);
  const selectedTotal = selectedList.reduce((sum, i) => sum + (i.price || 0), 0);
  const orderedTotal = orderedItems.reduce((sum, i) => sum + (i.price || 0), 0);

  // Fetch student order (has items with statuses)
  const fetchOrder = async () => {
    if (!selectedStudent || !token) return;
    const studentId = selectedStudent.student_id || selectedStudent.sync_id;
    setLoading(true);
    setSelectedBooks({});
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/store/textbook-orders/student/${studentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrderData(res.data);
    } catch (error) {
      console.error('Error fetching order:', error);
      setOrderData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [selectedStudent, token]);
  
  const toggleBook = (bookId) => {
    setSelectedBooks(prev => ({ ...prev, [bookId]: !prev[bookId] }));
  };
  
  const handleSubmit = async () => {
    if (selectedList.length === 0) { toast.error(t.selectAtLeastOne); return; }
    setSubmitting(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/store/textbook-orders/submit`,
        {
          student_id: selectedStudent.student_id || selectedStudent.sync_id,
          items: selectedList.map(b => ({ book_id: b.book_id, quantity: 1 })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(t.orderSuccess);
      setSelectedBooks({});
      await fetchOrder(); // Refresh to show newly locked items
    } catch (error) {
      toast.error(error.response?.data?.detail || t.orderError);
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleReorderRequest = async () => {
    if (!reorderItem || !orderData?.order_id) return;
    setRequestingReorder(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/store/textbook-orders/${orderData.order_id}/reorder/${reorderItem.book_id}`,
        { reason: reorderReason || '' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(t.reorderSuccess);
      setReorderItem(null);
      setReorderReason('');
      await fetchOrder();
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
            <PendingStudentCard key={s.student_id || i} student={s} />
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
              // Trigger parent refresh to check for new access
              if (typeof onBack === 'function') onBack();
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
  
  // ---- Main view: students tabs + textbook items ----
  return (
    <div className="space-y-3" data-testid="school-textbooks-view">
      {/* Back + Header row */}
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

      {/* Inline student linking form (for main view too) */}
      {showLinkForm && (
        <InlineStudentForm
          token={token}
          lang={lang}
          onSuccess={() => {
            setShowLinkForm(false);
            fetchAllStudents();
            if (typeof onBack === 'function') onBack();
          }}
          onCancel={() => setShowLinkForm(false)}
        />
      )}
      
      {/* Student Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" data-testid="student-tabs">
        {validatedStudents.map((student, index) => {
          const isActive = selectedStudentIndex === index;
          return (
            <button
              key={student.student_id || student.sync_id}
              data-testid={`student-tab-${index}`}
              onClick={() => setSelectedStudentIndex(index)}
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all whitespace-nowrap shrink-0 text-xs sm:text-sm
                ${isActive
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium' 
                  : 'border-border/50 bg-muted/30 hover:bg-muted text-muted-foreground'
                }
              `}
            >
              <User className="h-3.5 w-3.5" />
              <span className="truncate max-w-[100px] sm:max-w-[140px]">{student.name || student.full_name}</span>
              <span className="opacity-60">{t.grade} {student.grade}</span>
            </button>
          );
        })}
      </div>
      
      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
          <span className="ml-2 text-sm text-muted-foreground">{t.loading}</span>
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <Package className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">{t.noBooks}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Progress indicator */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>{orderedItems.length} {t.itemsOf} {items.length} {t.purchased.toLowerCase()}</span>
            {orderedTotal > 0 && <span className="font-medium text-foreground">{t.purchased}: ${orderedTotal.toFixed(2)}</span>}
          </div>
          
          {/* Item list - single column, compact for mobile */}
          <div className="rounded-lg border divide-y bg-card" data-testid="textbook-list">
            {items.map((item) => {
              const isOrdered = item.status === 'ordered';
              const isPending = item.status === 'reorder_requested';
              const isAvailable = item.status === 'available' || item.status === 'reorder_approved';
              const isSelected = !!selectedBooks[item.book_id];
              
              return (
                <div
                  key={item.book_id}
                  data-testid={`textbook-item-${item.book_id}`}
                  className={`
                    flex items-center gap-2.5 px-3 py-2.5 sm:py-3 transition-colors
                    ${isOrdered ? 'bg-green-50/50 dark:bg-green-900/10' : ''}
                    ${isPending ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}
                    ${isSelected ? 'bg-purple-50 dark:bg-purple-900/20' : ''}
                    ${isAvailable && !isSelected ? 'hover:bg-muted/50 cursor-pointer' : ''}
                  `}
                  onClick={() => isAvailable && toggleBook(item.book_id)}
                >
                  {/* Selection / Status indicator */}
                  <div className="shrink-0 w-5 flex justify-center">
                    {isOrdered ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : isPending ? (
                      <Clock className="h-4 w-4 text-amber-500" />
                    ) : (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleBook(item.book_id)}
                        className="h-4 w-4 rounded border-2 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        data-testid={`checkbox-${item.book_id}`}
                      />
                    )}
                  </div>
                  
                  {/* Book info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isOrdered ? 'text-muted-foreground' : ''}`}>
                      {item.book_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.book_code}
                    </p>
                  </div>
                  
                  {/* Price + status badge + reorder action */}
                  <div className="shrink-0 text-right flex flex-col items-end gap-0.5">
                    <p className={`text-sm font-semibold ${isOrdered ? 'text-green-600' : 'text-foreground'}`}>
                      ${item.price?.toFixed(2)}
                    </p>
                    {isOrdered && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setReorderItem(item); }}
                        className="text-[10px] text-green-600 hover:text-purple-600 hover:underline font-medium transition-colors"
                        data-testid={`reorder-btn-${item.book_id}`}
                      >
                        {t.purchased} &middot; {t.requestReorder}
                      </button>
                    )}
                    {isPending && (
                      <span className="text-[10px] text-amber-600 font-medium">{t.reorderPending}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Sticky bottom bar for selection + submit (only when items can be ordered) */}
          {availableItems.length > 0 && (
            <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t -mx-4 px-4 py-3 sm:static sm:mx-0 sm:px-0 sm:py-0 sm:border-0 sm:bg-transparent" data-testid="order-bar">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">{selectedList.length} {lang === 'es' ? 'seleccionado(s)' : 'selected'}</span>
                  {selectedTotal > 0 && (
                    <span className="ml-2 font-bold text-purple-600">${selectedTotal.toFixed(2)}</span>
                  )}
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || selectedList.length === 0}
                  className="gap-1.5 bg-purple-600 hover:bg-purple-700 shrink-0"
                  size="sm"
                  data-testid="submit-order-btn"
                >
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {t.submitOrder}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      
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
    </div>
  );
}
