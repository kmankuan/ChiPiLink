import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useInlineTranslation } from '@/contexts/InlineTranslationContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * EditableText - Component that renders translated text with inline editing for admins
 * 
 * Usage: <EditableText tKey="nav.home" />
 * Or with fallback: <EditableText tKey="nav.home" fallback="Home" />
 */
export default function EditableText({ tKey, fallback = '', className = '', as: Component = 'span' }) {
  const { t, i18n } = useTranslation();
  const { editMode, editingKey, startEditing, saveTranslation, cancelEditing, isAdmin } = useInlineTranslation();
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  const translatedText = t(tKey, fallback || tKey);
  const isEditing = editingKey === tKey;

  useEffect(() => {
    if (isEditing) {
      setEditValue(translatedText);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isEditing, translatedText]);

  const handleSave = async () => {
    setSaving(true);
    const success = await saveTranslation(tKey, i18n.language, editValue);
    setSaving(false);
    
    if (success) {
      toast.success('Traducción guardada');
      // Force reload translations
      window.location.reload();
    } else {
      toast.error('Error al guardar');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  // If not in edit mode or not admin, just render the text
  if (!editMode || !isAdmin) {
    return <Component className={className}>{translatedText}</Component>;
  }

  // In edit mode, show editable version
  if (isEditing) {
    return (
      <span className="inline-flex items-center gap-1">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-auto py-0 px-1 min-w-[100px] text-inherit"
          style={{ width: `${Math.max(100, editValue.length * 8)}px` }}
        />
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSave} disabled={saving}>
          <Check className="h-3 w-3 text-green-600" />
        </Button>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEditing}>
          <X className="h-3 w-3 text-red-600" />
        </Button>
      </span>
    );
  }

  // In edit mode but not currently editing this key
  return (
    <Component
      className={`${className} cursor-pointer hover:bg-yellow-100 hover:outline hover:outline-2 hover:outline-yellow-400 rounded px-1 transition-all group relative`}
      onClick={() => startEditing(tKey)}
      title={`Editar: ${tKey}`}
    >
      {translatedText}
      <Edit2 className="h-3 w-3 inline-block ml-1 opacity-0 group-hover:opacity-100 text-yellow-600" />
    </Component>
  );
}
