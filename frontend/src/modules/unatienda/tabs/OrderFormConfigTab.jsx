/**
 * Order Form Config Admin Tab
 * Admin interface to manage dynamic form fields for textbook orders
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Loader2,
  FileText,
  Type,
  Hash,
  List,
  CheckSquare,
  Upload,
  Calendar,
  Mail,
  Phone,
  Info,
  Eye,
  EyeOff,
  Save,
  X
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Field type icons mapping
const fieldTypeIcons = {
  text: Type,
  textarea: FileText,
  number: Hash,
  select: List,
  multiselect: List,
  checkbox: CheckSquare,
  file: Upload,
  date: Calendar,
  email: Mail,
  phone: Phone,
  info: Info
};

export default function OrderFormConfigTab() {
  const { token } = useAuth();
  const [fields, setFields] = useState([]);
  const [fieldTypes, setFieldTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  // Form state for new/edit field
  const [fieldForm, setFieldForm] = useState({
    field_type: 'text',
    label: '',
    label_es: '',
    label_zh: '',
    placeholder: '',
    placeholder_es: '',
    placeholder_zh: '',
    help_text: '',
    help_text_es: '',
    help_text_zh: '',
    required: false,
    content: '',
    content_es: '',
    content_zh: '',
    options: [],
    allowed_extensions: ['.pdf', '.jpg', '.jpeg', '.png'],
    max_file_size_mb: 5
  });

  useEffect(() => {
    fetchData();
  }, [showInactive]);

  const fetchData = async () => {
    try {
      const [fieldsRes, typesRes] = await Promise.all([
        axios.get(`${API_URL}/api/store/order-form-config/admin/fields?include_inactive=${showInactive}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/store/order-form-config/field-types`)
      ]);
      
      setFields(fieldsRes.data.fields || []);
      setFieldTypes(typesRes.data.types || []);
    } catch (error) {
      console.error('Error fetching form config:', error);
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = () => {
    setEditingField(null);
    setFieldForm({
      field_type: 'text',
      label: '',
      label_es: '',
      label_zh: '',
      placeholder: '',
      placeholder_es: '',
      placeholder_zh: '',
      help_text: '',
      help_text_es: '',
      help_text_zh: '',
      required: false,
      content: '',
      content_es: '',
      content_zh: '',
      options: [],
      allowed_extensions: ['.pdf', '.jpg', '.jpeg', '.png'],
      max_file_size_mb: 5
    });
    setShowFieldDialog(true);
  };

  const handleEditField = (field) => {
    setEditingField(field);
    setFieldForm({
      field_type: field.field_type,
      label: field.label || '',
      label_es: field.label_es || '',
      label_zh: field.label_zh || '',
      placeholder: field.placeholder || '',
      placeholder_es: field.placeholder_es || '',
      placeholder_zh: field.placeholder_zh || '',
      help_text: field.help_text || '',
      help_text_es: field.help_text_es || '',
      help_text_zh: field.help_text_zh || '',
      required: field.required || false,
      content: field.content || '',
      content_es: field.content_es || '',
      content_zh: field.content_zh || '',
      options: field.options || [],
      allowed_extensions: field.allowed_extensions || ['.pdf', '.jpg', '.jpeg', '.png'],
      max_file_size_mb: field.max_file_size_mb || 5
    });
    setShowFieldDialog(true);
  };

  const handleSaveField = async () => {
    if (!fieldForm.label) {
      toast.error('El nombre del campo es requerido');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        field_type: fieldForm.field_type,
        label: fieldForm.label,
        label_es: fieldForm.label_es || fieldForm.label,
        placeholder: fieldForm.placeholder,
        placeholder_es: fieldForm.placeholder_es,
        help_text: fieldForm.help_text,
        help_text_es: fieldForm.help_text_es,
        required: fieldForm.required,
        content: fieldForm.field_type === 'info' ? fieldForm.content : null,
        content_es: fieldForm.field_type === 'info' ? fieldForm.content_es : null,
        options: ['select', 'multiselect'].includes(fieldForm.field_type) ? fieldForm.options : null,
        allowed_extensions: fieldForm.field_type === 'file' ? fieldForm.allowed_extensions : null,
        max_file_size_mb: fieldForm.field_type === 'file' ? fieldForm.max_file_size_mb : null
      };

      if (editingField) {
        await axios.put(
          `${API_URL}/api/store/order-form-config/admin/fields/${editingField.field_id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Campo actualizado');
      } else {
        await axios.post(
          `${API_URL}/api/store/order-form-config/admin/fields`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Campo creado');
      }

      setShowFieldDialog(false);
      fetchData();
    } catch (error) {
      console.error('Error saving field:', error);
      toast.error('Error al guardar campo');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (field) => {
    try {
      await axios.put(
        `${API_URL}/api/store/order-form-config/admin/fields/${field.field_id}`,
        { active: !field.active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(field.active ? 'Campo desactivado' : 'Campo activado');
      fetchData();
    } catch (error) {
      toast.error('Error al cambiar estado');
    }
  };

  const handleDeleteField = async (field) => {
    if (!confirm(`¿Eliminar permanentemente el campo "${field.label}"?`)) return;

    try {
      await axios.delete(
        `${API_URL}/api/store/order-form-config/admin/fields/${field.field_id}?hard_delete=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Campo eliminado');
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar campo');
    }
  };

  const handleAddOption = () => {
    setFieldForm(prev => ({
      ...prev,
      options: [...prev.options, { value: '', label: '', label_es: '' }]
    }));
  };

  const handleUpdateOption = (index, key, value) => {
    setFieldForm(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => 
        i === index ? { ...opt, [key]: value } : opt
      )
    }));
  };

  const handleRemoveOption = (index) => {
    setFieldForm(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const getFieldTypeLabel = (type) => {
    const ft = fieldTypes.find(t => t.type === type);
    return ft?.label_es || ft?.label || type;
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
          <h3 className="text-lg font-semibold">Configuración del Formulario de Pedido</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona los campos que aparecen en el formulario de pedido de textos
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={showInactive}
              onCheckedChange={setShowInactive}
              id="show-inactive"
            />
            <Label htmlFor="show-inactive" className="text-sm">Mostrar inactivos</Label>
          </div>
          <Button onClick={handleAddField} className="gap-2">
            <Plus className="h-4 w-4" />
            Agregar Campo
          </Button>
        </div>
      </div>

      {/* Fields List */}
      <div className="space-y-3">
        {fields.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No hay campos configurados</p>
              <Button onClick={handleAddField} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Agregar primer campo
              </Button>
            </CardContent>
          </Card>
        ) : (
          fields.map((field, index) => {
            const IconComponent = fieldTypeIcons[field.field_type] || FileText;
            
            return (
              <Card 
                key={field.field_id}
                className={`${!field.active ? 'opacity-50' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Drag Handle */}
                    <div className="cursor-grab text-muted-foreground">
                      <GripVertical className="h-5 w-5" />
                    </div>

                    {/* Field Icon */}
                    <div className="p-2 rounded-lg bg-primary/10">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>

                    {/* Field Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{field.label}</span>
                        {field.label_es && field.label_es !== field.label && (
                          <span className="text-sm text-muted-foreground">
                            ({field.label_es})
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {getFieldTypeLabel(field.field_type)}
                        </Badge>
                        {field.required && (
                          <Badge variant="destructive" className="text-xs">Requerido</Badge>
                        )}
                        {!field.active && (
                          <Badge variant="secondary" className="text-xs">Inactivo</Badge>
                        )}
                      </div>
                      {field.help_text && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {field.help_text_es || field.help_text}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(field)}
                        title={field.active ? 'Desactivar' : 'Activar'}
                      >
                        {field.active ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditField(field)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteField(field)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Field Dialog */}
      <Dialog open={showFieldDialog} onOpenChange={setShowFieldDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingField ? 'Editar Campo' : 'Nuevo Campo'}
            </DialogTitle>
            <DialogDescription>
              Configure las propiedades del campo del formulario
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Field Type */}
            <div className="space-y-2">
              <Label>Tipo de Campo *</Label>
              <Select
                value={fieldForm.field_type}
                onValueChange={(value) => setFieldForm(prev => ({ ...prev, field_type: value }))}
                disabled={!!editingField}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fieldTypes.map((type) => (
                    <SelectItem key={type.type} value={type.type}>
                      <div className="flex items-center gap-2">
                        <span>{type.label_es || type.label}</span>
                        <span className="text-xs text-muted-foreground">
                          - {type.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Labels */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre (EN) *</Label>
                <Input
                  value={fieldForm.label}
                  onChange={(e) => setFieldForm(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="Field name"
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre (ES)</Label>
                <Input
                  value={fieldForm.label_es}
                  onChange={(e) => setFieldForm(prev => ({ ...prev, label_es: e.target.value }))}
                  placeholder="Nombre del campo"
                />
              </div>
            </div>

            {/* Placeholder (for input fields) */}
            {['text', 'textarea', 'number', 'email', 'phone', 'date'].includes(fieldForm.field_type) && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Placeholder (EN)</Label>
                  <Input
                    value={fieldForm.placeholder}
                    onChange={(e) => setFieldForm(prev => ({ ...prev, placeholder: e.target.value }))}
                    placeholder="Enter value..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Placeholder (ES)</Label>
                  <Input
                    value={fieldForm.placeholder_es}
                    onChange={(e) => setFieldForm(prev => ({ ...prev, placeholder_es: e.target.value }))}
                    placeholder="Ingrese valor..."
                  />
                </div>
              </div>
            )}

            {/* Help Text */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Texto de Ayuda (EN)</Label>
                <Input
                  value={fieldForm.help_text}
                  onChange={(e) => setFieldForm(prev => ({ ...prev, help_text: e.target.value }))}
                  placeholder="Help text for the user"
                />
              </div>
              <div className="space-y-2">
                <Label>Texto de Ayuda (ES)</Label>
                <Input
                  value={fieldForm.help_text_es}
                  onChange={(e) => setFieldForm(prev => ({ ...prev, help_text_es: e.target.value }))}
                  placeholder="Texto de ayuda para el usuario"
                />
              </div>
            </div>

            {/* Content (for info fields) */}
            {fieldForm.field_type === 'info' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Contenido (EN) - Markdown</Label>
                  <Textarea
                    value={fieldForm.content}
                    onChange={(e) => setFieldForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="**Bold text**, *italic*, - list items..."
                    rows={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contenido (ES) - Markdown</Label>
                  <Textarea
                    value={fieldForm.content_es}
                    onChange={(e) => setFieldForm(prev => ({ ...prev, content_es: e.target.value }))}
                    placeholder="**Texto en negrita**, *cursiva*, - elementos de lista..."
                    rows={5}
                  />
                </div>
              </div>
            )}

            {/* Options (for select/multiselect) */}
            {['select', 'multiselect'].includes(fieldForm.field_type) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Opciones</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddOption}>
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar Opción
                  </Button>
                </div>
                {fieldForm.options.map((option, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      value={option.value}
                      onChange={(e) => handleUpdateOption(index, 'value', e.target.value)}
                      placeholder="Valor"
                      className="w-1/3"
                    />
                    <Input
                      value={option.label}
                      onChange={(e) => handleUpdateOption(index, 'label', e.target.value)}
                      placeholder="Label (EN)"
                      className="w-1/3"
                    />
                    <Input
                      value={option.label_es}
                      onChange={(e) => handleUpdateOption(index, 'label_es', e.target.value)}
                      placeholder="Label (ES)"
                      className="w-1/3"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* File settings */}
            {fieldForm.field_type === 'file' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Extensiones Permitidas</Label>
                  <Input
                    value={fieldForm.allowed_extensions.join(', ')}
                    onChange={(e) => setFieldForm(prev => ({
                      ...prev,
                      allowed_extensions: e.target.value.split(',').map(s => s.trim())
                    }))}
                    placeholder=".pdf, .jpg, .png"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tamaño Máximo (MB)</Label>
                  <Input
                    type="number"
                    value={fieldForm.max_file_size_mb}
                    onChange={(e) => setFieldForm(prev => ({
                      ...prev,
                      max_file_size_mb: parseFloat(e.target.value)
                    }))}
                    min={0.1}
                    max={50}
                    step={0.1}
                  />
                </div>
              </div>
            )}

            {/* Required */}
            <div className="flex items-center gap-2">
              <Switch
                checked={fieldForm.required}
                onCheckedChange={(checked) => setFieldForm(prev => ({ ...prev, required: checked }))}
                id="required"
              />
              <Label htmlFor="required">Campo requerido</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFieldDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveField} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingField ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
