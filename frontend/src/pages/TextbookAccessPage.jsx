import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import {
  BookOpen,
  Plus,
  GraduationCap,
  School,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Info,
  Edit,
  Trash2,
  Loader2,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// Translations
const translations = {
  en: {
    title: 'School Textbook Purchase',
    subtitle: 'Manage your students to access exclusive school textbooks',
    addStudent: 'Add Student',
    editStudent: 'Edit Student',
    myStudents: 'My Students',
    noStudents: 'No students registered yet',
    noStudentsDesc: 'Add your first student to request access to school textbooks.',
    fullName: 'Student Full Name',
    fullNamePlaceholder: 'e.g., John Smith',
    school: 'School',
    selectSchool: 'Select school',
    year: 'School Year',
    grade: 'Grade',
    selectGrade: 'Select grade',
    relation: 'Relationship',
    selectRelation: 'Select relationship',
    relationOther: 'Specify relationship',
    relationOtherPlaceholder: 'e.g., Uncle, Aunt',
    studentNumber: 'Student ID (optional)',
    studentNumberPlaceholder: 'e.g., STD-2024-001',
    studentNumberHelp: 'If you know the school ID, it helps speed up verification',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    confirmDelete: 'Delete Student',
    confirmDeleteDesc: 'Are you sure you want to delete this student record? This action cannot be undone.',
    viewTextbooks: 'View Textbooks',
    addYear: 'Add Year',
    status: {
      pending: 'Pending',
      in_review: 'In Review',
      approved: 'Approved',
      rejected: 'Rejected',
      info_required: 'Info Required'
    },
    statusDesc: {
      pending: 'Waiting for admin review',
      in_review: 'Being verified',
      approved: 'Access granted',
      rejected: 'Request denied',
      info_required: 'Additional information needed'
    },
    relation_types: {
      parent: 'Parent',
      guardian: 'Legal Guardian',
      grandparent: 'Grandparent',
      representative: 'Representative',
      other: 'Other'
    },
    errors: {
      loadFailed: 'Failed to load data',
      saveFailed: 'Failed to save',
      deleteFailed: 'Failed to delete'
    },
    success: {
      saved: 'Saved successfully',
      deleted: 'Deleted successfully',
      yearAdded: 'Year added successfully'
    },
    readOnly: 'Read only (historical)',
    currentYear: 'Current year'
  },
  es: {
    title: 'Compra de Textos Escolares',
    subtitle: 'Administra tus estudiantes para acceder a textos escolares exclusivos',
    addStudent: 'Agregar Estudiante',
    editStudent: 'Editar Estudiante',
    myStudents: 'Mis Estudiantes',
    noStudents: 'No hay estudiantes registrados',
    noStudentsDesc: 'Agrega tu primer estudiante para solicitar acceso a textos escolares.',
    fullName: 'Nombre Completo del Estudiante',
    fullNamePlaceholder: 'ej: Juan Pérez García',
    school: 'Colegio',
    selectSchool: 'Seleccionar colegio',
    year: 'Año Escolar',
    grade: 'Grado',
    selectGrade: 'Seleccionar grado',
    relation: 'Relación',
    selectRelation: 'Seleccionar relación',
    relationOther: 'Especificar relación',
    relationOtherPlaceholder: 'ej: Tío, Tía',
    studentNumber: 'Número de Estudiante (opcional)',
    studentNumberPlaceholder: 'ej: STD-2024-001',
    studentNumberHelp: 'Si conoces el ID escolar, ayuda a acelerar la verificación',
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    confirmDelete: 'Eliminar Estudiante',
    confirmDeleteDesc: '¿Estás seguro de que deseas eliminar este registro de estudiante? Esta acción no se puede deshacer.',
    viewTextbooks: 'Ver Textos',
    addYear: 'Agregar Año',
    status: {
      pending: 'Pendiente',
      in_review: 'En Revisión',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      info_required: 'Info Requerida'
    },
    statusDesc: {
      pending: 'Esperando revisión del admin',
      in_review: 'Siendo verificado',
      approved: 'Acceso concedido',
      rejected: 'Solicitud denegada',
      info_required: 'Se necesita información adicional'
    },
    relation_types: {
      parent: 'Padre/Madre',
      guardian: 'Tutor Legal',
      grandparent: 'Abuelo/a',
      representative: 'Representante',
      other: 'Otro'
    },
    errors: {
      loadFailed: 'Error al cargar datos',
      saveFailed: 'Error al guardar',
      deleteFailed: 'Error al eliminar'
    },
    success: {
      saved: 'Guardado exitosamente',
      deleted: 'Eliminado exitosamente',
      yearAdded: 'Año agregado exitosamente'
    },
    readOnly: 'Solo lectura (histórico)',
    currentYear: 'Año actual'
  },
  zh: {
    title: '学校教科书购买',
    subtitle: '管理您的学生以访问专属学校教科书',
    addStudent: '添加学生',
    editStudent: '编辑学生',
    myStudents: '我的学生',
    noStudents: '尚未注册学生',
    noStudentsDesc: '添加您的第一个学生以申请访问学校教科书。',
    fullName: '学生全名',
    fullNamePlaceholder: '例如：张三',
    school: '学校',
    selectSchool: '选择学校',
    year: '学年',
    grade: '年级',
    selectGrade: '选择年级',
    relation: '关系',
    selectRelation: '选择关系',
    relationOther: '指定关系',
    relationOtherPlaceholder: '例如：叔叔、阿姨',
    studentNumber: '学生编号（可选）',
    studentNumberPlaceholder: '例如：STD-2024-001',
    studentNumberHelp: '如果您知道学校ID，可以加快验证速度',
    save: '保存',
    cancel: '取消',
    delete: '删除',
    confirmDelete: '删除学生',
    confirmDeleteDesc: '您确定要删除此学生记录吗？此操作无法撤消。',
    viewTextbooks: '查看教科书',
    addYear: '添加年份',
    status: {
      pending: '待处理',
      in_review: '审核中',
      approved: '已批准',
      rejected: '已拒绝',
      info_required: '需要信息'
    },
    statusDesc: {
      pending: '等待管理员审核',
      in_review: '正在验证',
      approved: '已授予访问权限',
      rejected: '请求被拒绝',
      info_required: '需要额外信息'
    },
    relation_types: {
      parent: '父母',
      guardian: '法定监护人',
      grandparent: '祖父母',
      representative: '代表',
      other: '其他'
    },
    errors: {
      loadFailed: '加载数据失败',
      saveFailed: '保存失败',
      deleteFailed: '删除失败'
    },
    success: {
      saved: '保存成功',
      deleted: '删除成功',
      yearAdded: '年份添加成功'
    },
    readOnly: '只读（历史记录）',
    currentYear: '当前年份'
  }
};

const StatusBadge = ({ status, t }) => {
  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
    in_review: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Info },
    approved: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
    rejected: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
    info_required: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertCircle }
  };
  
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;
  
  return (
    <Badge variant="outline" className={`${config.color} gap-1`}>
      <Icon className="h-3 w-3" />
      {t.status[status] || status}
    </Badge>
  );
};

export default function TextbookAccessPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [config, setConfig] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [addYearStudent, setAddYearStudent] = useState(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    school_id: '',
    student_number: '',
    relation_type: '',
    relation_other: '',
    year: '',
    grade: ''
  });
  
  // Multiple students form state
  const [multipleStudents, setMultipleStudents] = useState([]);

  // Get translations
  const t = translations[i18n.language] || translations.en;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [configRes, schoolsRes, studentsRes] = await Promise.all([
        fetch(`${API}/api/store/textbook-access/config`, { headers }),
        fetch(`${API}/api/store/textbook-access/schools`, { headers }),
        fetch(`${API}/api/store/textbook-access/my-students`, { headers })
      ]);
      
      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData);
        // Set default year
        if (configData.available_years?.length > 0) {
          setFormData(prev => ({
            ...prev,
            year: String(configData.current_year)
          }));
        }
      }
      
      if (schoolsRes.ok) {
        const schoolsData = await schoolsRes.json();
        setSchools(schoolsData.schools || []);
      }
      
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setStudents(studentsData.students || []);
      }
    } catch (err) {
      toast.error(t.errors.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [token, t.errors.loadFailed]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenForm = (student = null) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        full_name: student.full_name,
        school_id: student.school_id,
        student_number: student.student_number || '',
        relation_type: student.relation_type,
        relation_other: student.relation_other || '',
        year: '',
        grade: ''
      });
    } else {
      setEditingStudent(null);
      setFormData({
        full_name: '',
        school_id: '',
        student_number: '',
        relation_type: '',
        relation_other: '',
        year: String(config?.current_year || new Date().getFullYear()),
        grade: ''
      });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    // Validation
    if (!formData.full_name.trim()) {
      toast.error('Please enter student name');
      return;
    }
    if (!formData.school_id) {
      toast.error('Please select a school');
      return;
    }
    if (!formData.relation_type) {
      toast.error('Please select relationship');
      return;
    }
    if (formData.relation_type === 'other' && !formData.relation_other.trim()) {
      toast.error('Please specify the relationship');
      return;
    }
    
    if (!editingStudent) {
      if (!formData.year) {
        toast.error('Please select year');
        return;
      }
      if (!formData.grade) {
        toast.error('Please select grade');
        return;
      }
    }

    setSaving(true);
    try {
      const url = editingStudent
        ? `${API}/api/store/textbook-access/students/${editingStudent.student_id}`
        : `${API}/api/store/textbook-access/students`;
      
      const method = editingStudent ? 'PUT' : 'POST';
      
      const body = editingStudent
        ? {
            full_name: formData.full_name,
            school_id: formData.school_id,
            student_number: formData.student_number || null,
            relation_type: formData.relation_type,
            relation_other: formData.relation_type === 'other' ? formData.relation_other : null
          }
        : {
            full_name: formData.full_name,
            school_id: formData.school_id,
            student_number: formData.student_number || null,
            relation_type: formData.relation_type,
            relation_other: formData.relation_type === 'other' ? formData.relation_other : null,
            year: parseInt(formData.year),
            grade: formData.grade
          };
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Save failed');
      }
      
      toast.success(t.success.saved);
      setShowForm(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || t.errors.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (studentId) => {
    try {
      const res = await fetch(`${API}/api/store/textbook-access/students/${studentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Delete failed');
      
      toast.success(t.success.deleted);
      setDeleteConfirm(null);
      fetchData();
    } catch (err) {
      toast.error(t.errors.deleteFailed);
    }
  };

  const handleAddYear = async (studentId, year, grade) => {
    try {
      const res = await fetch(`${API}/api/store/textbook-access/students/${studentId}/enrollments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ year: parseInt(year), grade })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to add year');
      }
      
      toast.success(t.success.yearAdded);
      setAddYearStudent(null);
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleViewTextbooks = (student) => {
    // Navigate to private catalog with student context
    const school = schools.find(s => s.school_id === student.school_id);
    if (school?.catalog_id) {
      navigate(`/tienda/catalogo/${school.catalog_id}`, { 
        state: { student_id: student.student_id }
      });
    } else {
      navigate('/tienda/privado', { 
        state: { student_id: student.student_id }
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            {t.title}
          </h2>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
          </Button>
          <Button onClick={() => handleOpenForm()} data-testid="add-student-btn">
            <Plus className="h-4 w-4 mr-2" />
            {t.addStudent}
          </Button>
        </div>
      </div>

      {/* Students List */}
      {students.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg">{t.noStudents}</h3>
            <p className="text-muted-foreground text-sm mb-4">{t.noStudentsDesc}</p>
            <Button onClick={() => handleOpenForm()}>
              <Plus className="h-4 w-4 mr-2" />
              {t.addStudent}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {students.map((student) => (
            <Card key={student.student_id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      {student.full_name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1">
                        <School className="h-4 w-4" />
                        {student.school_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {t.relation_types[student.relation_type] || student.relation_type}
                        {student.relation_other && ` (${student.relation_other})`}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenForm(student)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(student)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Enrollments */}
                  {student.enrollments?.map((enrollment) => (
                    <div 
                      key={enrollment.year} 
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        enrollment.is_editable ? 'bg-muted/50' : 'bg-muted/20'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{enrollment.year}</span>
                          {enrollment.year === config?.current_year && (
                            <Badge variant="secondary" className="text-xs">{t.currentYear}</Badge>
                          )}
                        </div>
                        <span className="text-muted-foreground">•</span>
                        <span>{enrollment.grade}° Grado</span>
                        <StatusBadge status={enrollment.status} t={t} />
                      </div>
                      <div className="flex items-center gap-2">
                        {!enrollment.is_editable && (
                          <span className="text-xs text-muted-foreground">{t.readOnly}</span>
                        )}
                        {enrollment.status === 'approved' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleViewTextbooks(student)}
                            className="gap-1"
                          >
                            {t.viewTextbooks}
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Add Year Button */}
                  {config?.available_years?.some(y => 
                    !student.enrollments?.find(e => e.year === y.year)
                  ) && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => setAddYearStudent(student)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t.addYear}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Student Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStudent ? t.editStudent : t.addStudent}
            </DialogTitle>
            <DialogDescription>
              {editingStudent 
                ? 'Update student information'
                : 'Add a new student to request textbook access'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name">{t.fullName} *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder={t.fullNamePlaceholder}
              />
            </div>
            
            {/* School */}
            <div className="space-y-2">
              <Label>{t.school} *</Label>
              <Select
                value={formData.school_id}
                onValueChange={(v) => setFormData(prev => ({ ...prev, school_id: v }))}
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
            
            {/* Year & Grade (only for new students) */}
            {!editingStudent && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.year} *</Label>
                  <Select
                    value={formData.year}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, year: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {config?.available_years?.map((y) => (
                        <SelectItem key={y.year} value={String(y.year)}>
                          {y.year} {y.is_current && `(${t.currentYear})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.grade} *</Label>
                  <Select
                    value={formData.grade}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, grade: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.selectGrade} />
                    </SelectTrigger>
                    <SelectContent>
                      {config?.grades?.map((g) => (
                        <SelectItem key={g.value} value={g.value}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {/* Relation */}
            <div className="space-y-2">
              <Label>{t.relation} *</Label>
              <Select
                value={formData.relation_type}
                onValueChange={(v) => setFormData(prev => ({ ...prev, relation_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.selectRelation} />
                </SelectTrigger>
                <SelectContent>
                  {config?.relation_types?.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {i18n.language === 'zh' ? r.label_zh : 
                       i18n.language === 'es' ? r.label_es : r.label_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Relation Other */}
            {formData.relation_type === 'other' && (
              <div className="space-y-2">
                <Label>{t.relationOther} *</Label>
                <Input
                  value={formData.relation_other}
                  onChange={(e) => setFormData(prev => ({ ...prev, relation_other: e.target.value }))}
                  placeholder={t.relationOtherPlaceholder}
                />
              </div>
            )}
            
            {/* Student Number */}
            <div className="space-y-2">
              <Label>{t.studentNumber}</Label>
              <Input
                value={formData.student_number}
                onChange={(e) => setFormData(prev => ({ ...prev, student_number: e.target.value }))}
                placeholder={t.studentNumberPlaceholder}
              />
              <p className="text-xs text-muted-foreground">{t.studentNumberHelp}</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Year Dialog */}
      <Dialog open={!!addYearStudent} onOpenChange={() => setAddYearStudent(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.addYear}</DialogTitle>
            <DialogDescription>
              {addYearStudent?.full_name}
            </DialogDescription>
          </DialogHeader>
          
          <AddYearForm
            student={addYearStudent}
            config={config}
            t={t}
            i18n={i18n}
            onSave={handleAddYear}
            onCancel={() => setAddYearStudent(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmDelete}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.confirmDeleteDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => handleDelete(deleteConfirm?.student_id)}
            >
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Separate component for Add Year form
function AddYearForm({ student, config, t, i18n, onSave, onCancel }) {
  const [year, setYear] = useState('');
  const [grade, setGrade] = useState('');
  const [saving, setSaving] = useState(false);
  
  const availableYears = config?.available_years?.filter(y => 
    !student?.enrollments?.find(e => e.year === y.year)
  ) || [];
  
  const handleSubmit = async () => {
    if (!year || !grade) {
      toast.error('Please select year and grade');
      return;
    }
    setSaving(true);
    await onSave(student.student_id, year, grade);
    setSaving(false);
  };
  
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>{t.year}</Label>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger>
            <SelectValue placeholder={t.year} />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((y) => (
              <SelectItem key={y.year} value={String(y.year)}>
                {y.year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label>{t.grade}</Label>
        <Select value={grade} onValueChange={setGrade}>
          <SelectTrigger>
            <SelectValue placeholder={t.selectGrade} />
          </SelectTrigger>
          <SelectContent>
            {config?.grades?.map((g) => (
              <SelectItem key={g.value} value={g.value}>
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>{t.cancel}</Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {t.save}
        </Button>
      </div>
    </div>
  );
}
