/**
 * Form Fields Configuration Component
 * Allows admins to add, edit, remove, and reorder form fields
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Type,
  AlignLeft,
  ChevronDown,
  Hash,
  Upload,
  Calendar,
  Mail,
  Phone,
  Settings2,
  X,
  Save,
  AlertCircle
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// Translations
const translations = {
  en: {
    title: 'Form Field Configuration',
    subtitle: 'Configure fields for the textbook access request form',
    addField: 'Add Field',
    editField: 'Edit Field',
    deleteField: 'Delete Field',
    deleteConfirm: 'Are you sure you want to delete this field? This action cannot be undone.',
    fieldKey: 'Field Key',
    fieldKeyHelp: 'Unique identifier (no spaces, lowercase)',
    fieldType: 'Field Type',
    required: 'Required',
    active: 'Active',
    order: 'Order',
    labels: 'Labels',
    labelEn: 'Label (English)',
    labelEs: 'Label (Spanish)',
    labelZh: 'Label (Chinese)',
    placeholders: 'Placeholders',
    placeholderEn: 'Placeholder (English)',
    placeholderEs: 'Placeholder (Spanish)',
    placeholderZh: 'Placeholder (Chinese)',
    helpTexts: 'Help Texts',
    helpTextEn: 'Help Text (English)',
    helpTextEs: 'Help Text (Spanish)',
    helpTextZh: 'Help Text (Chinese)',
    validation: 'Validation',
    minLength: 'Min Length',
    maxLength: 'Max Length',
    minValue: 'Min Value',
    maxValue: 'Max Value',
    options: 'Options',
    addOption: 'Add Option',
    optionValue: 'Value',
    optionLabelEn: 'Label (EN)',
    optionLabelEs: 'Label (ES)',
    fileSettings: 'File Settings',
    allowedExtensions: 'Allowed Extensions',
    maxFileSize: 'Max File Size (MB)',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    noFields: 'No fields configured',
    noFieldsDesc: 'Add your first field to customize the form.',
    fieldTypes: {
      text: 'Short Text',
      textarea: 'Long Text',
      select: 'Dropdown',
      number: 'Number',
      file: 'File Upload',
      date: 'Date',
      email: 'Email',
      phone: 'Phone'
    },
    errors: {
      loadFailed: 'Failed to load configuration',
      saveFailed: 'Failed to save',
      deleteFailed: 'Failed to delete'
    },
    success: {
      saved: 'Field saved successfully',
      deleted: 'Field deleted successfully',
      reordered: 'Fields reordered'
    }
  },
  es: {
    title: 'Configuración de Campos del Formulario',
    subtitle: 'Configura los campos del formulario de solicitud de acceso a textos',
    addField: 'Agregar Campo',
    editField: 'Editar Campo',
    deleteField: 'Eliminar Campo',
    deleteConfirm: '¿Estás seguro de que deseas eliminar este campo? Esta acción no se puede deshacer.',
    fieldKey: 'Clave del Campo',
    fieldKeyHelp: 'Identificador único (sin espacios, minúsculas)',
    fieldType: 'Tipo de Campo',
    required: 'Requerido',
    active: 'Activo',
    order: 'Orden',
    labels: 'Etiquetas',
    labelEn: 'Etiqueta (Inglés)',
    labelEs: 'Etiqueta (Español)',
    labelZh: 'Etiqueta (Chino)',
    placeholders: 'Placeholders',
    placeholderEn: 'Placeholder (Inglés)',
    placeholderEs: 'Placeholder (Español)',
    placeholderZh: 'Placeholder (Chino)',
    helpTexts: 'Textos de Ayuda',
    helpTextEn: 'Texto de Ayuda (Inglés)',
    helpTextEs: 'Texto de Ayuda (Español)',
    helpTextZh: 'Texto de Ayuda (Chino)',
    validation: 'Validación',
    minLength: 'Longitud Mínima',
    maxLength: 'Longitud Máxima',
    minValue: 'Valor Mínimo',
    maxValue: 'Valor Máximo',
    options: 'Opciones',
    addOption: 'Agregar Opción',
    optionValue: 'Valor',
    optionLabelEn: 'Etiqueta (EN)',
    optionLabelEs: 'Etiqueta (ES)',
    fileSettings: 'Configuración de Archivos',
    allowedExtensions: 'Extensiones Permitidas',
    maxFileSize: 'Tamaño Máximo (MB)',
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    noFields: 'No hay campos configurados',
    noFieldsDesc: 'Agrega tu primer campo para personalizar el formulario.',
    fieldTypes: {
      text: 'Texto Corto',
      textarea: 'Texto Largo',
      select: 'Lista Desplegable',
      number: 'Número',
      file: 'Subir Archivo',
      date: 'Fecha',
      email: 'Correo',
      phone: 'Teléfono'
    },
    errors: {
      loadFailed: 'Error al cargar configuración',
      saveFailed: 'Error al guardar',
      deleteFailed: 'Error al eliminar'
    },
    success: {
      saved: 'Campo guardado exitosamente',
      deleted: 'Campo eliminado exitosamente',
      reordered: 'Campos reordenados'
    }
  },
  zh: {
    title: '表单字段配置',
    subtitle: '配置教科书访问请求表单的字段',
    addField: '添加字段',
    editField: '编辑字段',
    deleteField: '删除字段',
    deleteConfirm: '确定要删除此字段吗？此操作无法撤消。',
    fieldKey: '字段键',
    fieldKeyHelp: '唯一标识符（无空格，小写）',
    fieldType: '字段类型',
    required: '必填',
    active: '启用',
    order: '顺序',
    labels: '标签',
    labelEn: '标签（英文）',
    labelEs: '标签（西班牙文）',
    labelZh: '标签（中文）',
    placeholders: '占位符',
    placeholderEn: '占位符（英文）',
    placeholderEs: '占位符（西班牙文）',
    placeholderZh: '占位符（中文）',
    helpTexts: '帮助文本',
    helpTextEn: '帮助文本（英文）',
    helpTextEs: '帮助文本（西班牙文）',
    helpTextZh: '帮助文本（中文）',
    validation: '验证',
    minLength: '最小长度',
    maxLength: '最大长度',
    minValue: '最小值',
    maxValue: '最大值',
    options: '选项',
    addOption: '添加选项',
    optionValue: '值',
    optionLabelEn: '标签（英）',
    optionLabelEs: '标签（西）',
    fileSettings: '文件设置',
    allowedExtensions: '允许的扩展名',
    maxFileSize: '最大文件大小（MB）',
    save: '保存',
    cancel: '取消',
    delete: '删除',
    noFields: '没有配置字段',
    noFieldsDesc: '添加第一个字段以自定义表单。',
    fieldTypes: {
      text: '短文本',
      textarea: '长文本',
      select: '下拉选择',
      number: '数字',
      file: '文件上传',
      date: '日期',
      email: '电子邮件',
      phone: '电话'
    },
    errors: {
      loadFailed: '加载配置失败',
      saveFailed: '保存失败',
      deleteFailed: '删除失败'
    },
    success: {
      saved: '字段保存成功',
      deleted: '字段删除成功',
      reordered: '字段已重新排序'
    }
  }
};

const fieldTypeIcons = {
  text: Type,
  textarea: AlignLeft,
  select: ChevronDown,
  number: Hash,
  file: Upload,
  date: Calendar,
  email: Mail,
  phone: Phone
};

const defaultFormData = {
  field_key: '',
  field_type: 'text',
  is_required: true,
  order: 0,
  label_en: '',
  label_es: '',
  label_zh: '',
  placeholder_en: '',
  placeholder_es: '',
  placeholder_zh: '',
  help_text_en: '',
  help_text_es: '',
  help_text_zh: '',
  min_length: null,
  max_length: null,
  min_value: null,
  max_value: null,
  options: [],
  allowed_extensions: ['pdf', 'jpg', 'png'],
  max_file_size_mb: 5
};

export default function FormFieldsConfigTab({ token }) {
  const { i18n } = useTranslation();
  const t = translations[i18n.language] || translations.en;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState(defaultFormData);

  const fetchFields = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/store/form-config/admin/textbook_access?include_inactive=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFields(data.fields || []);
      }
    } catch (err) {
      toast.error(t.errors.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [token, t.errors.loadFailed]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const handleOpenDialog = (field = null) => {
    if (field) {
      setEditingField(field);
      setFormData({
        field_key: field.field_key || '',
        field_type: field.field_type || 'text',
        is_required: field.is_required ?? true,
        order: field.order || 0,
        label_en: field.label_en || '',
        label_es: field.label_es || '',
        label_zh: field.label_zh || '',
        placeholder_en: field.placeholder_en || '',
        placeholder_es: field.placeholder_es || '',
        placeholder_zh: field.placeholder_zh || '',
        help_text_en: field.help_text_en || '',
        help_text_es: field.help_text_es || '',
        help_text_zh: field.help_text_zh || '',
        min_length: field.min_length,
        max_length: field.max_length,
        min_value: field.min_value,
        max_value: field.max_value,
        options: field.options || [],
        allowed_extensions: field.allowed_extensions || ['pdf', 'jpg', 'png'],
        max_file_size_mb: field.max_file_size_mb || 5
      });
    } else {
      setEditingField(null);
      setFormData({
        ...defaultFormData,
        order: fields.length
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    // Validation
    if (!formData.field_key.trim()) {
      toast.error('Field key is required');
      return;
    }
    if (!formData.label_es.trim()) {
      toast.error('Spanish label is required');
      return;
    }
    
    setSaving(true);
    try {
      const url = editingField
        ? `${API}/api/store/form-config/admin/fields/${editingField.field_id}`
        : `${API}/api/store/form-config/admin/textbook_access/fields`;
      
      const method = editingField ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Save failed');
      }
      
      toast.success(t.success.saved);
      setShowDialog(false);
      fetchFields();
    } catch (err) {
      toast.error(err.message || t.errors.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (fieldId) => {
    try {
      const res = await fetch(`${API}/api/store/form-config/admin/fields/${fieldId}?hard=true`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Delete failed');
      
      toast.success(t.success.deleted);
      setDeleteConfirm(null);
      fetchFields();
    } catch (err) {
      toast.error(t.errors.deleteFailed);
    }
  };

  const handleToggleActive = async (field) => {
    try {
      const res = await fetch(
        `${API}/api/store/form-config/admin/fields/${field.field_id}/toggle?is_active=${!field.is_active}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (!res.ok) throw new Error('Toggle failed');
      
      fetchFields();
    } catch (err) {
      toast.error(t.errors.saveFailed);
    }
  };

  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...(prev.options || []), { value: '', label_en: '', label_es: '', label_zh: '' }]
    }));
  };

  const removeOption = (index) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const updateOption = (index, key, value) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? { ...opt, [key]: value } : opt)
    }));
  };

  const getFieldLabel = (field) => {
    if (i18n.language === 'zh') return field.label_zh || field.label_en;
    if (i18n.language === 'es') return field.label_es || field.label_en;
    return field.label_en;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {t.title}
          </h3>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchFields}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => handleOpenDialog()} data-testid="add-field-btn">
            <Plus className="h-4 w-4 mr-2" />
            {t.addField}
          </Button>
        </div>
      </div>

      {/* Fields List */}
      {fields.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg">{t.noFields}</h3>
            <p className="text-muted-foreground text-sm mb-4">{t.noFieldsDesc}</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              {t.addField}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => {
            const Icon = fieldTypeIcons[field.field_type] || Type;
            return (
              <Card 
                key={field.field_id} 
                className={`transition-opacity ${!field.is_active ? 'opacity-50' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="cursor-move text-muted-foreground">
                      <GripVertical className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{getFieldLabel(field)}</span>
                        <Badge variant="outline" className="text-xs">
                          {t.fieldTypes[field.field_type] || field.field_type}
                        </Badge>
                        {field.is_required && (
                          <Badge variant="destructive" className="text-xs">
                            {t.required}
                          </Badge>
                        )}
                        {!field.is_active && (
                          <Badge variant="secondary" className="text-xs">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        key: {field.field_key}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={field.is_active}
                        onCheckedChange={() => handleToggleActive(field)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(field)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setDeleteConfirm(field)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingField ? t.editField : t.addField}
            </DialogTitle>
            <DialogDescription>
              {editingField ? `Editing: ${editingField.field_key}` : 'Configure a new form field'}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.fieldKey} *</Label>
                  <Input
                    value={formData.field_key}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      field_key: e.target.value.toLowerCase().replace(/\s/g, '_')
                    }))}
                    placeholder="student_name"
                    disabled={!!editingField}
                  />
                  <p className="text-xs text-muted-foreground">{t.fieldKeyHelp}</p>
                </div>
                
                <div className="space-y-2">
                  <Label>{t.fieldType}</Label>
                  <Select
                    value={formData.field_type}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, field_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(t.fieldTypes).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="required"
                    checked={formData.is_required}
                    onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_required: v }))}
                  />
                  <Label htmlFor="required">{t.required}</Label>
                </div>
              </div>

              <Separator />

              {/* Labels */}
              <Accordion type="single" collapsible defaultValue="labels">
                <AccordionItem value="labels">
                  <AccordionTrigger>{t.labels}</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      <div className="space-y-2">
                        <Label>{t.labelEs} *</Label>
                        <Input
                          value={formData.label_es}
                          onChange={(e) => setFormData(prev => ({ ...prev, label_es: e.target.value }))}
                          placeholder="Nombre del Estudiante"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.labelEn}</Label>
                        <Input
                          value={formData.label_en}
                          onChange={(e) => setFormData(prev => ({ ...prev, label_en: e.target.value }))}
                          placeholder="Student Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.labelZh}</Label>
                        <Input
                          value={formData.label_zh}
                          onChange={(e) => setFormData(prev => ({ ...prev, label_zh: e.target.value }))}
                          placeholder="学生姓名"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="placeholders">
                  <AccordionTrigger>{t.placeholders}</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      <div className="space-y-2">
                        <Label>{t.placeholderEs}</Label>
                        <Input
                          value={formData.placeholder_es}
                          onChange={(e) => setFormData(prev => ({ ...prev, placeholder_es: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.placeholderEn}</Label>
                        <Input
                          value={formData.placeholder_en}
                          onChange={(e) => setFormData(prev => ({ ...prev, placeholder_en: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.placeholderZh}</Label>
                        <Input
                          value={formData.placeholder_zh}
                          onChange={(e) => setFormData(prev => ({ ...prev, placeholder_zh: e.target.value }))}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="helpTexts">
                  <AccordionTrigger>{t.helpTexts}</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      <div className="space-y-2">
                        <Label>{t.helpTextEs}</Label>
                        <Textarea
                          value={formData.help_text_es}
                          onChange={(e) => setFormData(prev => ({ ...prev, help_text_es: e.target.value }))}
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.helpTextEn}</Label>
                        <Textarea
                          value={formData.help_text_en}
                          onChange={(e) => setFormData(prev => ({ ...prev, help_text_en: e.target.value }))}
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.helpTextZh}</Label>
                        <Textarea
                          value={formData.help_text_zh}
                          onChange={(e) => setFormData(prev => ({ ...prev, help_text_zh: e.target.value }))}
                          rows={2}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Validation for text fields */}
                {(formData.field_type === 'text' || formData.field_type === 'textarea') && (
                  <AccordionItem value="validation">
                    <AccordionTrigger>{t.validation}</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-2">
                          <Label>{t.minLength}</Label>
                          <Input
                            type="number"
                            value={formData.min_length || ''}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              min_length: e.target.value ? parseInt(e.target.value) : null 
                            }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t.maxLength}</Label>
                          <Input
                            type="number"
                            value={formData.max_length || ''}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              max_length: e.target.value ? parseInt(e.target.value) : null 
                            }))}
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Validation for number fields */}
                {formData.field_type === 'number' && (
                  <AccordionItem value="validation">
                    <AccordionTrigger>{t.validation}</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-2">
                          <Label>{t.minValue}</Label>
                          <Input
                            type="number"
                            value={formData.min_value || ''}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              min_value: e.target.value ? parseFloat(e.target.value) : null 
                            }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t.maxValue}</Label>
                          <Input
                            type="number"
                            value={formData.max_value || ''}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              max_value: e.target.value ? parseFloat(e.target.value) : null 
                            }))}
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Options for select fields */}
                {formData.field_type === 'select' && (
                  <AccordionItem value="options">
                    <AccordionTrigger>{t.options}</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        {formData.options?.map((option, index) => (
                          <div key={index} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                            <div className="flex-1 grid grid-cols-3 gap-2">
                              <Input
                                placeholder={t.optionValue}
                                value={option.value}
                                onChange={(e) => updateOption(index, 'value', e.target.value)}
                              />
                              <Input
                                placeholder={t.optionLabelEs}
                                value={option.label_es}
                                onChange={(e) => updateOption(index, 'label_es', e.target.value)}
                              />
                              <Input
                                placeholder={t.optionLabelEn}
                                value={option.label_en}
                                onChange={(e) => updateOption(index, 'label_en', e.target.value)}
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeOption(index)}
                              className="text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" onClick={addOption} className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          {t.addOption}
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* File settings */}
                {formData.field_type === 'file' && (
                  <AccordionItem value="fileSettings">
                    <AccordionTrigger>{t.fileSettings}</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <Label>{t.allowedExtensions}</Label>
                          <Input
                            value={formData.allowed_extensions?.join(', ') || ''}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              allowed_extensions: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                            }))}
                            placeholder="pdf, jpg, png"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t.maxFileSize}</Label>
                          <Input
                            type="number"
                            value={formData.max_file_size_mb || ''}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              max_file_size_mb: e.target.value ? parseFloat(e.target.value) : null 
                            }))}
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {t.deleteField}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.deleteConfirm}
              <br />
              <strong className="text-foreground">{deleteConfirm?.label_es}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => handleDelete(deleteConfirm?.field_id)}
            >
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
