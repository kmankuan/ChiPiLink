import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

/**
 * MultilingualInput - Input/Textarea that supports multiple languages
 * 
 * Value format: { en: "English text", es: "Texto español", zh: "中文文字" }
 * or string for backward compatibility
 */
export function MultilingualInput({
  label,
  value,
  onChange,
  placeholder = {},
  multiline = false,
  rows = 2,
  className
}) {
  const [activeTab, setActiveTab] = useState('en');
  
  // Handle both old string format and new multilingual format
  const getValue = (lang) => {
    if (typeof value === 'string') {
      // Old format - show same value for all languages (migration case)
      return lang === 'es' ? value : '';
    }
    return value?.[lang] || '';
  };

  const handleChange = (lang, newValue) => {
    // Always save in multilingual format
    const currentValue = typeof value === 'string' 
      ? { en: '', es: value, zh: '' }
      : (value || { en: '', es: '', zh: '' });
    
    onChange({
      ...currentValue,
      [lang]: newValue
    });
  };

  const InputComponent = multiline ? Textarea : Input;
  
  // Check if any language has content
  const hasContent = (lang) => {
    const val = getValue(lang);
    return val && val.trim().length > 0;
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-8">
          <TabsTrigger value="en" className="text-xs gap-1 data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-900">
            🇺🇸 EN
            {hasContent('en') && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
          </TabsTrigger>
          <TabsTrigger value="es" className="text-xs gap-1 data-[state=active]:bg-red-100 dark:data-[state=active]:bg-red-900">
            🇵🇦 ES
            {hasContent('es') && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
          </TabsTrigger>
          <TabsTrigger value="zh" className="text-xs gap-1 data-[state=active]:bg-yellow-100 dark:data-[state=active]:bg-yellow-900">
            🇨🇳 中文
            {hasContent('zh') && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="en" className="mt-2">
          <InputComponent
            value={getValue('en')}
            onChange={(e) => handleChange('en', e.target.value)}
            placeholder={placeholder.en || placeholder.default || `Enter in English...`}
            rows={multiline ? rows : undefined}
          />
        </TabsContent>
        
        <TabsContent value="es" className="mt-2">
          <InputComponent
            value={getValue('es')}
            onChange={(e) => handleChange('es', e.target.value)}
            placeholder={placeholder.es || placeholder.default || `Escribir en español...`}
            rows={multiline ? rows : undefined}
          />
        </TabsContent>
        
        <TabsContent value="zh" className="mt-2">
          <InputComponent
            value={getValue('zh')}
            onChange={(e) => handleChange('zh', e.target.value)}
            placeholder={placeholder.zh || placeholder.default || `用中文输入...`}
            rows={multiline ? rows : undefined}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * MultilingualItemEditor - For editing items with multilingual fields
 */
export function MultilingualItemEditor({
  item,
  index,
  onItemChange,
  onRemove,
  fields = ['titulo', 'description']
}) {
  return (
    <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Item {index + 1}</span>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-destructive hover:text-destructive/80 text-sm"
        >
          Eliminar
        </button>
      </div>
      
      {fields.includes('icono') && (
        <div className="space-y-2">
          <Label>Icono</Label>
          <Input
            value={item.icono || ''}
            onChange={(e) => onItemChange(index, 'icono', e.target.value)}
            placeholder="Store, Users, Calendar..."
          />
        </div>
      )}
      
      {fields.includes('titulo') && (
        <MultilingualInput
          label="Título"
          value={item.titulo}
          onChange={(val) => onItemChange(index, 'titulo', val)}
          placeholder={{ default: "Título del item" }}
        />
      )}
      
      {fields.includes('description') && (
        <MultilingualInput
          label="Descripción"
          value={item.description}
          onChange={(val) => onItemChange(index, 'description', val)}
          placeholder={{ default: "Descripción del item" }}
          multiline
          rows={2}
        />
      )}
      
      {fields.includes('image_url') && (
        <div className="space-y-2">
          <Label>URL de Imagen</Label>
          <Input
            value={item.image_url || ''}
            onChange={(e) => onItemChange(index, 'image_url', e.target.value)}
            placeholder="https://..."
          />
        </div>
      )}
    </div>
  );
}

/**
 * Helper to get text in current language with fallback
 */
export function getLocalizedText(value, lang = 'es') {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[lang] || value.es || value.en || value.zh || '';
}

export default MultilingualInput;
