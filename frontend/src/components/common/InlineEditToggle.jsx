import { useInlineTranslation } from '@/contexts/InlineTranslationContext';
import { Button } from '@/components/ui/button';
import { Languages, Edit, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

/**
 * InlineEditToggle - Button to toggle translation edit mode
 * Only visible to admins
 */
export default function InlineEditToggle() {
  const { t } = useTranslation();
  const { editMode, toggleEditMode, isAdmin } = useInlineTranslation();

  if (!isAdmin) return null;

  const handleToggle = () => {
    toggleEditMode();
    if (!editMode) {
      toast.info('Modo de edición activado. Haz clic en cualquier texto para editarlo.');
    }
  };

  return (
    <Button
      variant={editMode ? "default" : "outline"}
      size="sm"
      onClick={handleToggle}
      className={`gap-2 ${editMode ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}`}
      title={editMode ? 'Desactivar edición de traducciones' : 'Activar edición de traducciones'}
    >
      {editMode ? (
        <>
          <Eye className="h-4 w-4" />
          <span className="hidden sm:inline">Modo Vista</span>
        </>
      ) : (
        <>
          <Edit className="h-4 w-4" />
          <span className="hidden sm:inline">Editar Textos</span>
        </>
      )}
    </Button>
  );
}
