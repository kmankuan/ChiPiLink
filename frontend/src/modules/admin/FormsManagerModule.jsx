/**
 * FormsManagerModule — Centralized admin module for managing all dynamic forms.
 * Shows a catalog of form types, each openable to a field editor.
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ArrowLeft, BookOpen, ChevronRight, Edit2, GripVertical, Loader2, Plus,
  Save, ShoppingCart, Trash2, UserPlus, X, Eye, EyeOff, AlertTriangle,
} from 'lucide-react';
import useAutoTranslate from '@/hooks/useAutoTranslate';

const API = process.env.REACT_APP_BACKEND_URL;

const ICON_MAP = {
  'user-plus': UserPlus,
  'book-open': BookOpen,
  'shopping-cart': ShoppingCart,
};

const FIELD_TYPE_LABELS = {
  text: 'Text', textarea: 'Long Text', select: 'Dropdown',
  number: 'Number', file: 'File Upload', date: 'Date', email: 'Email', phone: 'Phone',
};

// Helper to get localized label from form type or field data
function getLabel(item, lang) {
  return item[`label_${lang}`] || item.label_en || item.label_es || '';
}
function getDesc(item, lang) {
  return item[`description_${lang}`] || item.description_en || item.description_es || '';
}
function getPlaceholder(item, lang) {
  return item[`placeholder_${lang}`] || item.placeholder_en || item.placeholder_es || '';
}
function getHelp(item, lang) {
  return item[`help_text_${lang}`] || item.help_text_en || item.help_text_es || '';
}

/* ============ Form Types Catalog ============ */
function FormTypesCatalog({ formTypes, loading, onSelectType }) {
  const { i18n } = useTranslation();
  const lang = i18n?.language?.substring(0, 2) || 'en';

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const texts = {
    en: { title: 'Forms Manager', desc: 'Configure and customize all application forms', fields: 'fields' },
    es: { title: 'Gestor de Formularios', desc: 'Configura y personaliza todos los formularios de la aplicación', fields: 'campos' },
    zh: { title: '表单管理器', desc: '配置和自定义所有应用程序表单', fields: '字段' },
  };
  const t = texts[lang] || texts.en;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">{t.title}</h2>
        <p className="text-sm text-muted-foreground">{t.desc}</p>
      </div>
      <div className="grid gap-3">
        {formTypes.map((ft) => {
          const Icon = ICON_MAP[ft.icon] || BookOpen;
          return (
            <Card
              key={ft.form_type}
              className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all"
              onClick={() => onSelectType(ft)}
            >
              <CardContent className="flex items-center gap-4 py-4">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{getLabel(ft, lang)}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{getDesc(ft, lang)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="secondary" className="text-[10px]">
                    {ft.total_fields} {t.fields}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ============ Field Editor for a Form Type ============ */
function FormFieldEditor({ formType, onBack }) {
  const { token } = useAuth();
  const { i18n } = useTranslation();
  const lang = i18n?.language?.substring(0, 2) || 'en';
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState(null);
  const [showAddField, setShowAddField] = useState(false);
  const [saving, setSaving] = useState(false);

  const texts = {
    en: { addField: 'Add Field', system: 'System', required: 'Required', disabled: 'Disabled', noFields: 'No fields configured. Click "Add Field" to start.', fieldEnabled: 'Field enabled', fieldDisabled: 'Field disabled', fieldDeleted: 'Field deleted', fieldCreated: 'Field created', fieldUpdated: 'Field updated', deleteConfirm: 'Delete this field permanently?', error: 'Error' },
    es: { addField: 'Agregar Campo', system: 'Sistema', required: 'Requerido', disabled: 'Desactivado', noFields: 'Sin campos configurados. Haz clic en "Agregar Campo" para comenzar.', fieldEnabled: 'Campo activado', fieldDisabled: 'Campo desactivado', fieldDeleted: 'Campo eliminado', fieldCreated: 'Campo creado', fieldUpdated: 'Campo actualizado', deleteConfirm: '¿Eliminar este campo permanentemente?', error: 'Error' },
    zh: { addField: '添加字段', system: '系统', required: '必填', disabled: '已禁用', noFields: '未配置字段。点击"添加字段"开始。', fieldEnabled: '字段已启用', fieldDisabled: '字段已禁用', fieldDeleted: '字段已删除', fieldCreated: '字段已创建', fieldUpdated: '字段已更新', deleteConfirm: '永久删除此字段？', error: '错误' },
  };
  const t = texts[lang] || texts.en;

  const fetchFields = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/store/form-config/admin/${formType.form_type}?include_inactive=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFields(data.fields || []);
      }
    } catch (e) {
      console.error('Failed to fetch fields:', e);
    } finally {
      setLoading(false);
    }
  }, [formType.form_type, token]);

  useEffect(() => { fetchFields(); }, [fetchFields]);

  const toggleFieldActive = async (field) => {
    try {
      await fetch(`${API}/api/store/form-config/admin/fields/${field.field_id}/toggle?is_active=${!field.is_active}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(field.is_active ? t.fieldDisabled : t.fieldEnabled);
      fetchFields();
    } catch { toast.error(t.error); }
  };

  const deleteField = async (fieldId) => {
    if (!confirm(t.deleteConfirm)) return;
    try {
      await fetch(`${API}/api/store/form-config/admin/fields/${fieldId}?hard=true`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(t.fieldDeleted);
      fetchFields();
    } catch { toast.error(t.error); }
  };

  const saveField = async (fieldData, isNew = false) => {
    setSaving(true);
    try {
      const url = isNew
        ? `${API}/api/store/form-config/admin/${formType.form_type}/fields`
        : `${API}/api/store/form-config/admin/fields/${fieldData.field_id}`;
      const method = isNew ? 'POST' : 'PUT';
      
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(fieldData),
      });
      if (res.ok) {
        toast.success(isNew ? t.fieldCreated : t.fieldUpdated);
        setEditingField(null);
        setShowAddField(false);
        fetchFields();
      } else {
        const err = await res.json();
        toast.error(err.detail || t.error);
      }
    } catch { toast.error(t.error); }
    finally { setSaving(false); }
  };

  const Icon = ICON_MAP[formType.icon] || BookOpen;

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h2 className="text-base font-bold truncate">{getLabel(formType, lang)}</h2>
            <p className="text-xs text-muted-foreground truncate">{getDesc(formType, lang)}</p>
          </div>
        </div>
        <Button size="sm" onClick={() => { setShowAddField(true); setEditingField(null); }} className="gap-1.5 shrink-0">
          <Plus className="h-3.5 w-3.5" /> {t.addField}
        </Button>
      </div>

      {/* Field List */}
      <div className="space-y-2">
        {fields.map((field) => (
          <Card key={field.field_id} className={`${!field.is_active ? 'opacity-50' : ''}`}>
            <CardContent className="flex items-center gap-3 py-3">
              <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 cursor-grab" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{getLabel(field, lang)}</p>
                  {field.is_system && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-300 text-amber-600">{t.system}</Badge>
                  )}
                  {field.is_required && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-red-300 text-red-500">{t.required}</Badge>
                  )}
                  {!field.is_active && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-gray-300 text-gray-500">{t.disabled}</Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {field.field_key} &middot; {FIELD_TYPE_LABELS[field.field_type] || field.field_type}
                  {lang !== 'en' && field.label_en && <span className="ml-1 opacity-60">({field.label_en})</span>}
                  {lang === 'en' && field.label_es && <span className="ml-1 opacity-60">({field.label_es})</span>}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleFieldActive(field)}>
                  {field.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingField(field); setShowAddField(false); }}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                {!field.is_system && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteField(field.field_id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {fields.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {t.noFields}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit / Add Field Panel */}
      {(editingField || showAddField) && (
        <FieldForm
          field={editingField}
          isNew={showAddField}
          saving={saving}
          onSave={saveField}
          onCancel={() => { setEditingField(null); setShowAddField(false); }}
        />
      )}
    </div>
  );
}

/* ============ Translation Dictionary ============ */
const TRANSLATIONS = {
  // Common form fields
  'first name': { es: 'Nombre', zh: '名' },
  'last name': { es: 'Apellido', zh: '姓' },
  'full name': { es: 'Nombre Completo', zh: '全名' },
  'name': { es: 'Nombre', zh: '名称' },
  'email': { es: 'Correo Electrónico', zh: '电子邮箱' },
  'email address': { es: 'Dirección de Correo', zh: '电子邮箱地址' },
  'phone': { es: 'Teléfono', zh: '电话' },
  'phone number': { es: 'Número de Teléfono', zh: '电话号码' },
  'mobile': { es: 'Celular', zh: '手机' },
  'mobile number': { es: 'Número de Celular', zh: '手机号码' },
  'whatsapp': { es: 'WhatsApp', zh: 'WhatsApp' },
  'whatsapp number': { es: 'Número de WhatsApp', zh: 'WhatsApp号码' },
  'address': { es: 'Dirección', zh: '地址' },
  'city': { es: 'Ciudad', zh: '城市' },
  'country': { es: 'País', zh: '国家' },
  'state': { es: 'Estado/Provincia', zh: '省/州' },
  'zip code': { es: 'Código Postal', zh: '邮政编码' },
  'postal code': { es: 'Código Postal', zh: '邮政编码' },
  'date': { es: 'Fecha', zh: '日期' },
  'date of birth': { es: 'Fecha de Nacimiento', zh: '出生日期' },
  'birthday': { es: 'Cumpleaños', zh: '生日' },
  'age': { es: 'Edad', zh: '年龄' },
  'gender': { es: 'Género', zh: '性别' },
  'nationality': { es: 'Nacionalidad', zh: '国籍' },
  'id number': { es: 'Número de Identificación', zh: '身份证号' },
  'passport': { es: 'Pasaporte', zh: '护照' },
  'passport number': { es: 'Número de Pasaporte', zh: '护照号码' },
  // Education
  'school': { es: 'Colegio', zh: '学校' },
  'grade': { es: 'Grado', zh: '年级' },
  'class': { es: 'Clase', zh: '班级' },
  'student': { es: 'Estudiante', zh: '学生' },
  'student name': { es: 'Nombre del Estudiante', zh: '学生姓名' },
  'student number': { es: 'Número de Estudiante', zh: '学号' },
  'student id': { es: 'ID del Estudiante', zh: '学生编号' },
  'teacher': { es: 'Profesor', zh: '教师' },
  'parent': { es: 'Padre/Madre', zh: '父母' },
  'guardian': { es: 'Tutor', zh: '监护人' },
  'relationship': { es: 'Relación', zh: '关系' },
  'year': { es: 'Año', zh: '年份' },
  'school year': { es: 'Año Escolar', zh: '学年' },
  'semester': { es: 'Semestre', zh: '学期' },
  // Commerce
  'price': { es: 'Precio', zh: '价格' },
  'quantity': { es: 'Cantidad', zh: '数量' },
  'total': { es: 'Total', zh: '总计' },
  'order': { es: 'Pedido', zh: '订单' },
  'order number': { es: 'Número de Pedido', zh: '订单号' },
  'payment': { es: 'Pago', zh: '付款' },
  'payment method': { es: 'Método de Pago', zh: '支付方式' },
  'receipt': { es: 'Recibo', zh: '收据' },
  'invoice': { es: 'Factura', zh: '发票' },
  'discount': { es: 'Descuento', zh: '折扣' },
  'notes': { es: 'Notas', zh: '备注' },
  'comments': { es: 'Comentarios', zh: '评论' },
  'description': { es: 'Descripción', zh: '描述' },
  'status': { es: 'Estado', zh: '状态' },
  'type': { es: 'Tipo', zh: '类型' },
  'category': { es: 'Categoría', zh: '类别' },
  'photo': { es: 'Foto', zh: '照片' },
  'image': { es: 'Imagen', zh: '图片' },
  'file': { es: 'Archivo', zh: '文件' },
  'document': { es: 'Documento', zh: '文档' },
  'attachment': { es: 'Adjunto', zh: '附件' },
  'signature': { es: 'Firma', zh: '签名' },
  'company': { es: 'Empresa', zh: '公司' },
  'occupation': { es: 'Ocupación', zh: '职业' },
  'website': { es: 'Sitio Web', zh: '网站' },
  'message': { es: 'Mensaje', zh: '消息' },
  'subject': { es: 'Asunto', zh: '主题' },
  'reference': { es: 'Referencia', zh: '参考' },
  'other': { es: 'Otro', zh: '其他' },
  'optional': { es: 'Opcional', zh: '可选' },
  'required': { es: 'Requerido', zh: '必填' },
};

function autoTranslate(text, fromLang = 'en') {
  if (!text) return { en: '', es: '', zh: '' };
  const key = text.trim().toLowerCase();

  if (fromLang === 'en') {
    const match = TRANSLATIONS[key] || (key.endsWith('s') ? TRANSLATIONS[key.slice(0, -1)] : null);
    return match ? { en: text, es: match.es, zh: match.zh } : { en: text, es: '', zh: '' };
  }

  // Reverse lookup: search by ES or ZH value
  for (const [enKey, vals] of Object.entries(TRANSLATIONS)) {
    const matchVal = fromLang === 'es' ? vals.es : vals.zh;
    if (matchVal && matchVal.toLowerCase() === key) {
      const enLabel = enKey.replace(/\b\w/g, c => c.toUpperCase());
      return { en: enLabel, es: vals.es, zh: vals.zh };
    }
  }
  return { en: '', es: '', zh: '' };
}

function toFieldKey(label) {
  if (!label) return '';
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/* ============ Field Form (Add / Edit) ============ */
function FieldForm({ field, isNew, saving, onSave, onCancel }) {
  // Use the core auto-translate hook
  const { translate: coreTranslate, toFieldKey: coreToFieldKey } = useAutoTranslate();
  
  // Track which fields the user has manually edited (to avoid overwriting)
  const [userEdited, setUserEdited] = useState({ field_key: false, label_es: false, label_zh: false });

  const [form, setForm] = useState({
    field_key: field?.field_key || '',
    field_type: field?.field_type || 'text',
    is_required: field?.is_required ?? true,
    label_en: field?.label_en || '',
    label_es: field?.label_es || '',
    label_zh: field?.label_zh || '',
    placeholder_en: field?.placeholder_en || '',
    placeholder_es: field?.placeholder_es || '',
    help_text_en: field?.help_text_en || '',
    help_text_es: field?.help_text_es || '',
    min_length: field?.min_length || null,
    max_length: field?.max_length || null,
    options: field?.options || [],
  });

  const [newOption, setNewOption] = useState({ value: '', label_en: '', label_es: '' });

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  // Reset labels + key + re-enable auto-translate
  const handleReset = () => {
    setForm(p => ({ ...p, label_en: '', label_es: '', label_zh: '', field_key: isNew ? '' : p.field_key }));
    setUserEdited({ field_key: false, label_es: false, label_zh: false });
  };

  // When English label changes: auto-generate key + auto-translate ES/ZH
  const handleEnLabelChange = (val) => {
    const updates = { label_en: val };
    if (isNew && !userEdited.field_key) {
      updates.field_key = coreToFieldKey(val);
    }
    const tr = coreTranslate(val, 'en');
    if (!userEdited.label_es && tr.es) updates.label_es = tr.es;
    if (!userEdited.label_zh && tr.zh) updates.label_zh = tr.zh;
    setForm(p => ({ ...p, ...updates }));
  };

  // When Spanish label changes: auto-translate EN/ZH
  const handleEsLabelChange = (val) => {
    setUserEdited(p => ({ ...p, label_es: true }));
    const updates = { label_es: val };
    const tr = coreTranslate(val, 'es');
    if (tr.en && !userEdited.label_en && !form.label_en) updates.label_en = tr.en;
    if (tr.zh && !userEdited.label_zh && !form.label_zh) updates.label_zh = tr.zh;
    if (tr.en && isNew && !userEdited.field_key && !form.field_key) updates.field_key = coreToFieldKey(tr.en);
    setForm(p => ({ ...p, ...updates }));
  };

  // When Chinese label changes: auto-translate EN/ES
  const handleZhLabelChange = (val) => {
    setUserEdited(p => ({ ...p, label_zh: true }));
    const updates = { label_zh: val };
    const tr = coreTranslate(val, 'zh');
    if (tr.en && !userEdited.label_en && !form.label_en) updates.label_en = tr.en;
    if (tr.es && !userEdited.label_es && !form.label_es) updates.label_es = tr.es;
    if (tr.en && isNew && !userEdited.field_key && !form.field_key) updates.field_key = coreToFieldKey(tr.en);
    setForm(p => ({ ...p, ...updates }));
  };

  // Mark field as manually edited when user changes it directly
  const handleManualEdit = (key, val) => {
    setUserEdited(p => ({ ...p, [key]: true }));
    set(key, val);
  };

  // Auto-translate option labels when English is typed
  const handleOptionEnChange = (val) => {
    const tr = coreTranslate(val, 'en');
    setNewOption(p => ({ ...p, label_en: val, label_es: p.label_es || tr.es || '' }));
  };

  const addOption = () => {
    if (!newOption.value || !newOption.label_en) return;
    set('options', [...form.options, { ...newOption }]);
    setNewOption({ value: '', label_en: '', label_es: '' });
  };

  const removeOption = (idx) => {
    set('options', form.options.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    if (!form.field_key || !form.label_en) {
      toast.error('Field key and English label are required');
      return;
    }
    const payload = { ...form };
    if (!isNew) payload.field_id = field.field_id;
    onSave(payload, isNew);
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{isNew ? 'Add New Field' : `Edit: ${field.label_en}`}</CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}><X className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Labels — EN first (auto-generates key + translations) */}
        <div className="space-y-1">
          <Label className="text-xs">Label (EN) * <span className="text-muted-foreground font-normal">— type here first, key + translations auto-fill</span></Label>
          <Input value={form.label_en} onChange={e => handleEnLabelChange(e.target.value)} placeholder="e.g., Phone Number" className="h-8 text-sm" autoFocus={isNew} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Field Key * <span className="text-muted-foreground font-normal">(auto)</span></Label>
            <Input value={form.field_key} onChange={e => handleManualEdit('field_key', e.target.value)} placeholder="auto_generated_key" className="h-8 text-sm font-mono" disabled={!isNew} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Field Type *</Label>
            <select value={form.field_type} onChange={e => set('field_type', e.target.value)} className="h-8 w-full rounded-md border bg-background px-2 text-sm">
              {Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        <Separator />

        {/* Translated Labels — auto-populated bidirectionally, editable */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Label (ES) <span className="text-muted-foreground font-normal">(auto)</span></Label>
            <Input value={form.label_es} onChange={e => handleEsLabelChange(e.target.value)} placeholder="auto-translated" className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Label (ZH) <span className="text-muted-foreground font-normal">(auto)</span></Label>
            <Input value={form.label_zh} onChange={e => handleZhLabelChange(e.target.value)} placeholder="auto-translated" className="h-8 text-sm" />
          </div>
        </div>

        {/* Placeholders */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Placeholder (EN)</Label>
            <Input value={form.placeholder_en} onChange={e => set('placeholder_en', e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Placeholder (ES)</Label>
            <Input value={form.placeholder_es} onChange={e => set('placeholder_es', e.target.value)} className="h-8 text-sm" />
          </div>
        </div>

        {/* Required toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-xs">Required Field</Label>
          <Switch checked={form.is_required} onCheckedChange={v => set('is_required', v)} />
        </div>

        {/* Options for select type */}
        {form.field_type === 'select' && (
          <div className="space-y-2">
            <Label className="text-xs font-medium">Dropdown Options</Label>
            {form.options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1.5">
                <span className="font-mono text-muted-foreground">{opt.value}</span>
                <span className="flex-1">{opt.label_en}</span>
                <span className="text-muted-foreground">{opt.label_es}</span>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeOption(idx)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input placeholder="value" value={newOption.value} onChange={e => setNewOption(p => ({ ...p, value: e.target.value }))} className="h-7 text-xs flex-1" />
              <Input placeholder="Label EN (auto-translates)" value={newOption.label_en} onChange={e => handleOptionEnChange(e.target.value)} className="h-7 text-xs flex-1" />
              <Input placeholder="Label ES (auto)" value={newOption.label_es} onChange={e => setNewOption(p => ({ ...p, label_es: e.target.value }))} className="h-7 text-xs flex-1" />
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addOption}>Add</Button>
            </div>
          </div>
        )}

        {/* Validation for text */}
        {(form.field_type === 'text' || form.field_type === 'textarea') && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Min Length</Label>
              <Input type="number" value={form.min_length || ''} onChange={e => set('min_length', e.target.value ? parseInt(e.target.value) : null)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max Length</Label>
              <Input type="number" value={form.max_length || ''} onChange={e => set('max_length', e.target.value ? parseInt(e.target.value) : null)} className="h-8 text-sm" />
            </div>
          </div>
        )}

        <Button onClick={handleSubmit} disabled={saving} className="w-full gap-2 mt-2">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {isNew ? 'Create Field' : 'Save Changes'}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ============ Main Module ============ */
export default function FormsManagerModule() {
  const { token } = useAuth();
  const [formTypes, setFormTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/store/form-config/admin/form-types/list`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setFormTypes(data.form_types || []);
        }
      } catch (e) {
        console.error('Failed to fetch form types:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (selectedType) {
    return <FormFieldEditor formType={selectedType} onBack={() => setSelectedType(null)} />;
  }

  return <FormTypesCatalog formTypes={formTypes} loading={loading} onSelectType={setSelectedType} />;
}
