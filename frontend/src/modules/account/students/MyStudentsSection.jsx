/**
 * My Students Section - Compact grid view of linked students
 * Shows student cards with status, quick actions, and order buttons
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Icons
import {
  GraduationCap,
  Plus,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  User,
  RefreshCw,
  ShoppingCart,
  BookOpen,
  School,
  Calendar,
  ExternalLink,
  ChevronRight,
  Eye,
  RotateCcw,
  Lock,
  Pencil,
  Save
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

// Translations
const translations = {
  en: {
    title: 'My Students',
    subtitle: 'Manage linked students and access textbook orders',
    linkStudent: 'Link Student',
    refresh: 'Refresh',
    noStudents: 'No students linked yet',
    noStudentsDesc: 'Link a student to access exclusive textbook ordering',
    orderTextbooks: 'Order Textbooks',
    viewProfile: 'View Profile',
    viewOrders: 'View Orders',
    pendingApproval: 'Pending Approval',
    approved: 'Approved',
    rejected: 'Rejected',
    infoRequired: 'Info Required',
    retryRequest: 'Retry Request',
    seeReason: 'See Reason',
    grade: 'Grade',
    school: 'School',
    year: 'Year',
    // Dialog
    dialogTitle: 'Link New Student',
    dialogDesc: 'Enter student information to request textbook access',
    fullName: 'Full Name',
    firstName: 'First Name',
    lastName: 'Last Name',
    selectSchool: 'Select School',
    studentNumber: 'Student ID (optional)',
    selectGrade: 'Select Grade',
    selectRelation: 'Your Relationship',
    submit: 'Submit Request',
    cancel: 'Cancel',
    // Status messages
    submitSuccess: 'Student link request submitted',
    submitError: 'Error submitting request',
    loadError: 'Error loading data'
  },
  es: {
    title: 'Mis Estudiantes',
    subtitle: 'Gestiona estudiantes vinculados y accede a pedidos de textos',
    linkStudent: 'Vincular Estudiante',
    refresh: 'Actualizar',
    noStudents: 'No hay estudiantes vinculados',
    noStudentsDesc: 'Vincula un estudiante para acceder a pedidos exclusivos de textos',
    orderTextbooks: 'Ordenar Textos',
    viewProfile: 'Ver Perfil',
    viewOrders: 'Ver Pedidos',
    pendingApproval: 'Pendiente de Aprobación',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    infoRequired: 'Info Requerida',
    retryRequest: 'Reintentar',
    seeReason: 'Ver Motivo',
    grade: 'Grado',
    school: 'Colegio',
    year: 'Año',
    // Dialog
    dialogTitle: 'Vincular Nuevo Estudiante',
    dialogDesc: 'Ingresa la información del estudiante para solicitar acceso a textos',
    fullName: 'Nombre Completo',
    firstName: 'Nombre',
    lastName: 'Apellido',
    selectSchool: 'Seleccionar Colegio',
    studentNumber: 'Nº Estudiante (opcional)',
    selectGrade: 'Seleccionar Grado',
    selectRelation: 'Tu Relación',
    submit: 'Enviar Solicitud',
    cancel: 'Cancelar',
    // Status messages
    submitSuccess: 'Solicitud de vinculación enviada',
    submitError: 'Error al enviar solicitud',
    loadError: 'Error al cargar datos'
  },
  zh: {
    title: '我的学生',
    subtitle: '管理关联的学生并访问教科书订单',
    linkStudent: '关联学生',
    refresh: '刷新',
    noStudents: '暂无关联学生',
    noStudentsDesc: '关联学生以访问专属教科书订购',
    orderTextbooks: '订购教科书',
    viewProfile: '查看资料',
    viewOrders: '查看订单',
    pendingApproval: '等待批准',
    approved: '已批准',
    rejected: '已拒绝',
    infoRequired: '需要信息',
    retryRequest: '重试请求',
    seeReason: '查看原因',
    grade: '年级',
    school: '学校',
    year: '年份',
    // Dialog
    dialogTitle: '关联新学生',
    dialogDesc: '输入学生信息以请求教科书访问权限',
    fullName: '全名',
    firstName: '名',
    lastName: '姓',
    selectSchool: '选择学校',
    studentNumber: '学生编号（可选）',
    selectGrade: '选择年级',
    selectRelation: '您的关系',
    submit: '提交请求',
    cancel: '取消',
    // Status messages
    submitSuccess: '学生关联请求已提交',
    submitError: '提交请求时出错',
    loadError: '加载数据时出错'
  }
};

// Grade options
const GRADE_OPTIONS = [
  { value: 'K3', label: 'K3' },
  { value: 'K4', label: 'K4' },
  { value: 'K5', label: 'K5' },
  { value: '1', label: '1st Grade' },
  { value: '2', label: '2nd Grade' },
  { value: '3', label: '3rd Grade' },
  { value: '4', label: '4th Grade' },
  { value: '5', label: '5th Grade' },
  { value: '6', label: '6th Grade' },
  { value: '7', label: '7th Grade' },
  { value: '8', label: '8th Grade' },
  { value: '9', label: '9th Grade' },
  { value: '10', label: '10th Grade' },
  { value: '11', label: '11th Grade' },
  { value: '12', label: '12th Grade' }
];

// Relationship options
const RELATIONSHIP_OPTIONS = [
  { value: 'parent', label: { en: 'Parent', es: 'Padre/Madre', zh: '父母' } },
  { value: 'guardian', label: { en: 'Legal Guardian', es: 'Tutor Legal', zh: '法定监护人' } },
  { value: 'grandparent', label: { en: 'Grandparent', es: 'Abuelo/a', zh: '祖父母' } },
  { value: 'representative', label: { en: 'Representative', es: 'Representante', zh: '代表' } },
  { value: 'other', label: { en: 'Other', es: 'Otro', zh: '其他' } }
];

// Status card colors and icons
const STATUS_CONFIG = {
  approved: {
    color: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    badgeColor: 'bg-green-500',
    icon: CheckCircle,
    iconColor: 'text-green-600'
  },
  pending: {
    color: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
    badgeColor: 'bg-yellow-500',
    icon: Clock,
    iconColor: 'text-yellow-600'
  },
  rejected: {
    color: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    badgeColor: 'bg-red-500',
    icon: XCircle,
    iconColor: 'text-red-600'
  },
  info_required: {
    color: 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800',
    badgeColor: 'bg-orange-500',
    icon: AlertCircle,
    iconColor: 'text-orange-600'
  }
};

// Student Card Component
function StudentCard({ student, t, lang, onOrderTextbooks, onViewOrders, onRetry, onEditProfile }) {
  const status = student.current_year_status || 'pending';
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const StatusIcon = config.icon;
  const isLocked = student.is_locked === true;
  
  return (
    <Card 
      className={`relative overflow-hidden transition-all hover:shadow-md ${config.color}`}
      data-testid={`student-card-${student.student_id}`}
    >
      {/* Status indicator bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${config.badgeColor}`} />
      
      <CardContent className="p-4 pt-5">
        {/* Header: Avatar + Name + Status */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
            status === 'approved' ? 'bg-green-100 dark:bg-green-800' :
            status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-800' :
            status === 'rejected' ? 'bg-red-100 dark:bg-red-800' :
            'bg-orange-100 dark:bg-orange-800'
          }`}>
            <GraduationCap className={`h-6 w-6 ${config.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim()}</h3>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <School className="h-3.5 w-3.5" />
              <span className="truncate">{student.school_name || 'School'}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isLocked && (
              <Badge variant="outline" className="gap-1 text-xs border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-900/20">
                <Lock className="h-3 w-3" />
              </Badge>
            )}
            <Badge className={`${config.badgeColor} text-white text-xs`}>
              {t[status === 'approved' ? 'approved' : 
                 status === 'pending' ? 'pendingApproval' : 
                 status === 'rejected' ? 'rejected' : 'infoRequired']}
            </Badge>
          </div>
        </div>
        
        {/* Info Row */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            <span>{t.grade} {student.grade || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{student.year || new Date().getFullYear()}</span>
          </div>
        </div>
        
        {/* Actions based on status */}
        <div className="flex flex-wrap gap-2">
          {status === 'approved' && (
            <>
              <Button 
                size="sm" 
                className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700"
                onClick={() => onOrderTextbooks(student)}
                data-testid={`order-btn-${student.student_id}`}
              >
                <ShoppingCart className="h-4 w-4" />
                {t.orderTextbooks}
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onViewOrders(student)}
                data-testid={`orders-btn-${student.student_id}`}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onEditProfile(student)}
                data-testid={`edit-btn-${student.student_id}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </>
          )}
          
          {status === 'pending' && (
            <div className="w-full text-center text-sm text-muted-foreground py-2">
              <Clock className="h-4 w-4 inline mr-1" />
              {t.pendingApproval}
            </div>
          )}
          
          {status === 'rejected' && (
            <Button 
              size="sm" 
              variant="outline"
              className="flex-1 gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => onRetry(student)}
            >
              <RotateCcw className="h-4 w-4" />
              {t.retryRequest}
            </Button>
          )}
          
          {status === 'info_required' && (
            <Button 
              size="sm" 
              variant="outline"
              className="flex-1 gap-1.5 border-orange-200 text-orange-600 hover:bg-orange-50"
              onClick={() => onRetry(student)}
            >
              <AlertCircle className="h-4 w-4" />
              {t.seeReason}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Empty state card (for adding new student)
function AddStudentCard({ t, onClick }) {
  return (
    <Card 
      className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors cursor-pointer group"
      onClick={onClick}
      data-testid="add-student-card"
    >
      <CardContent className="p-6 flex flex-col items-center justify-center text-center min-h-[180px]">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
          <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
        </div>
        <p className="font-medium text-muted-foreground group-hover:text-foreground">
          {t.linkStudent}
        </p>
      </CardContent>
    </Card>
  );
}

// Main Component
export default function MyStudentsSection({ embedded = false, onNavigateToTextbooks }) {
  const navigate = useNavigate();
  const { token, isAuthenticated, loading: authLoading } = useAuth();
  const { i18n } = useTranslation();
  
  // Data states
  const [students, setStudents] = useState([]);
  const [schools, setSchools] = useState([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Edit profile states
  const [editStudent, setEditStudent] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    school_id: '',
    student_number: '',
    year: new Date().getFullYear(),
    grade: '',
    relation_type: ''
  });

  const lang = i18n.language || 'es';
  const t = translations[lang] || translations.es;

  // Create axios instance
  const api = useCallback(() => {
    return axios.create({
      baseURL: API_BASE,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
  }, [token]);

  // Load data
  const loadData = useCallback(async () => {
    if (authLoading || !token || !isAuthenticated) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setLoadError(null);
    
    try {
      const [schoolsRes, studentsRes] = await Promise.all([
        api().get('/api/store/textbook-access/schools'),
        api().get('/api/store/textbook-access/my-students')
      ]);
      
      setSchools(schoolsRes.data?.schools || []);
      setStudents(studentsRes.data?.students || []);
    } catch (err) {
      console.error('Load data error:', err);
      setLoadError(err.response?.data?.detail || t.loadError);
    } finally {
      setLoading(false);
    }
  }, [token, isAuthenticated, authLoading, api, t.loadError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Form handlers
  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      school_id: '',
      student_number: '',
      year: new Date().getFullYear(),
      grade: '',
      relation_type: ''
    });
  };

  const handleSubmit = async () => {
    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.school_id || !formData.grade || !formData.relation_type) {
      toast.error('Please fill all required fields');
      return;
    }
    
    setSubmitting(true);
    try {
      await api().post('/api/store/textbook-access/students', {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        school_id: formData.school_id,
        student_number: formData.student_number,
        year: formData.year,
        grade: formData.grade,
        relation_type: formData.relation_type,
      });
      toast.success(t.submitSuccess);
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || t.submitError);
    } finally {
      setSubmitting(false);
    }
  };

  // Navigation handlers
  const handleOrderTextbooks = (student) => {
    if (onNavigateToTextbooks) {
      onNavigateToTextbooks(student);
    } else {
      // Navigate to Unatienda with student selected
      navigate(`/unatienda?category=textbooks&student=${student.student_id}`);
    }
  };

  const handleViewOrders = (student) => {
    navigate(`/unatienda?tab=orders&student=${student.student_id}`);
  };

  const handleRetry = (student) => {
    // Pre-fill form with student data and open dialog
    setFormData({
      full_name: student.full_name,
      school_id: student.school_id || '',
      student_number: student.student_number || '',
      year: student.year || new Date().getFullYear(),
      grade: student.grade || '',
      relation_type: student.relation_type || ''
    });
    setDialogOpen(true);
  };

  const handleEditProfile = (student) => {
    setEditStudent(student);
    setEditForm({
      full_name: student.full_name || '',
      student_number: student.student_number || '',
      relation_type: student.relation_type || '',
    });
  };

  const handleSaveProfile = async () => {
    if (!editStudent) return;
    setEditSaving(true);
    try {
      await api().put(
        `/api/store/textbook-access/students/${editStudent.student_id}`,
        editForm
      );
      toast.success(lang === 'es' ? 'Perfil actualizado' : 'Profile updated');
      setEditStudent(null);
      loadData();
    } catch (error) {
      const msg = error.response?.data?.detail || (lang === 'es' ? 'Error al actualizar' : 'Error updating profile');
      toast.error(msg);
    } finally {
      setEditSaving(false);
    }
  };

  // Loading state
  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">{loadError}</p>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t.refresh}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="my-students-section">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            {t.title}
          </h2>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)} data-testid="link-student-btn">
            <Plus className="h-4 w-4 mr-1" />
            {t.linkStudent}
          </Button>
        </div>
      </div>

      {/* Students Grid */}
      {students.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">{t.noStudents}</h3>
            <p className="text-muted-foreground mb-6">{t.noStudentsDesc}</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t.linkStudent}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((student) => (
            <StudentCard
              key={student.student_id}
              student={student}
              t={t}
              lang={lang}
              onOrderTextbooks={handleOrderTextbooks}
              onViewOrders={handleViewOrders}
              onRetry={handleRetry}
              onEditProfile={handleEditProfile}
            />
          ))}
          <AddStudentCard t={t} onClick={() => setDialogOpen(true)} />
        </div>
      )}

      {/* Link Student Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.dialogTitle}</DialogTitle>
            <DialogDescription>{t.dialogDesc}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Student Name */}
            <div className="space-y-2">
              <Label>{t.fullName} <span className="text-red-500">*</span></Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Enter student's full name"
              />
            </div>

            {/* School */}
            <div className="space-y-2">
              <Label>{t.selectSchool} <span className="text-red-500">*</span></Label>
              <Select
                value={formData.school_id}
                onValueChange={(val) => setFormData(prev => ({ ...prev, school_id: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.selectSchool} />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((school) => (
                    <SelectItem key={school.school_id} value={school.school_id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Student Number (optional) */}
            <div className="space-y-2">
              <Label>{t.studentNumber}</Label>
              <Input
                value={formData.student_number}
                onChange={(e) => setFormData(prev => ({ ...prev, student_number: e.target.value }))}
                placeholder="Optional"
              />
            </div>

            {/* Grade */}
            <div className="space-y-2">
              <Label>{t.selectGrade} <span className="text-red-500">*</span></Label>
              <Select
                value={formData.grade}
                onValueChange={(val) => setFormData(prev => ({ ...prev, grade: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.selectGrade} />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_OPTIONS.map((grade) => (
                    <SelectItem key={grade.value} value={grade.value}>
                      {grade.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Relationship */}
            <div className="space-y-2">
              <Label>{t.selectRelation} <span className="text-red-500">*</span></Label>
              <Select
                value={formData.relation_type}
                onValueChange={(val) => setFormData(prev => ({ ...prev, relation_type: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.selectRelation} />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_OPTIONS.map((rel) => (
                    <SelectItem key={rel.value} value={rel.value}>
                      {rel.label[lang] || rel.label.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t.submit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={!!editStudent} onOpenChange={() => setEditStudent(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editStudent?.is_locked ? <Lock className="h-4 w-4 text-amber-600" /> : <Pencil className="h-4 w-4" />}
              {lang === 'es' ? 'Perfil del Estudiante' : 'Student Profile'}
            </DialogTitle>
            <DialogDescription>
              {editStudent?.full_name} &middot; {t.grade} {editStudent?.grade}
            </DialogDescription>
          </DialogHeader>

          {editStudent?.is_locked && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-3">
              <Lock className="h-4 w-4 text-amber-600 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {lang === 'es'
                    ? 'Este perfil está bloqueado por el administrador. Los campos no pueden ser editados.'
                    : 'This profile is locked by the administrator. Fields cannot be edited.'}
                </p>
                <a
                  href="/pedidos"
                  className="text-xs text-purple-600 hover:underline font-medium mt-1 inline-block"
                >
                  {lang === 'es' ? 'Ir a Mensajes para contactar soporte' : 'Go to Messages to contact support'}
                  &rarr;
                </a>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {lang === 'es' ? 'Nombre Completo' : 'Full Name'}
              </Label>
              <Input
                value={editForm.full_name || ''}
                onChange={(e) => setEditForm(p => ({ ...p, full_name: e.target.value }))}
                disabled={editStudent?.is_locked}
                className={editStudent?.is_locked ? 'bg-muted cursor-not-allowed opacity-60' : ''}
                data-testid="edit-full-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {lang === 'es' ? 'Número de Estudiante' : 'Student Number'}
              </Label>
              <Input
                value={editForm.student_number || ''}
                onChange={(e) => setEditForm(p => ({ ...p, student_number: e.target.value }))}
                disabled={editStudent?.is_locked}
                className={editStudent?.is_locked ? 'bg-muted cursor-not-allowed opacity-60' : ''}
                data-testid="edit-student-number"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {lang === 'es' ? 'Relación' : 'Relation'}
              </Label>
              <Input
                value={editForm.relation_type || ''}
                onChange={(e) => setEditForm(p => ({ ...p, relation_type: e.target.value }))}
                disabled={editStudent?.is_locked}
                className={editStudent?.is_locked ? 'bg-muted cursor-not-allowed opacity-60' : ''}
                data-testid="edit-relation"
              />
            </div>

            {/* Read-only info */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{lang === 'es' ? 'Escuela' : 'School'}</p>
                <p className="text-xs font-medium">{editStudent?.school_name || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t.grade}</p>
                <p className="text-xs font-medium">{editStudent?.grade || '-'}</p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setEditStudent(null)}>
              {lang === 'es' ? 'Cerrar' : 'Close'}
            </Button>
            {!editStudent?.is_locked && (
              <Button
                size="sm"
                onClick={handleSaveProfile}
                disabled={editSaving}
                className="gap-1.5"
                data-testid="save-profile-btn"
              >
                {editSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {lang === 'es' ? 'Guardar' : 'Save'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
