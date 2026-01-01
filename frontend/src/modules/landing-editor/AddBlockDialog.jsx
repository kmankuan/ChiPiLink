import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  Image,
  Type,
  LayoutGrid,
  MessageSquare,
  BarChart3,
  MousePointer,
  Layers,
  Minus,
  Loader2
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Icon mapping for block types
const BLOCK_ICONS = {
  hero: Image,
  features: LayoutGrid,
  text: Type,
  image: Image,
  cta: MousePointer,
  stats: BarChart3,
  cards: LayoutGrid,
  banner: Image,
  testimonials: MessageSquare,
  spacer: Minus,
  divider: Minus
};

// Color classes for block types
const BLOCK_COLORS = {
  hero: 'bg-blue-50 border-blue-200 hover:border-blue-400',
  features: 'bg-green-50 border-green-200 hover:border-green-400',
  text: 'bg-gray-50 border-gray-200 hover:border-gray-400',
  image: 'bg-purple-50 border-purple-200 hover:border-purple-400',
  cta: 'bg-orange-50 border-orange-200 hover:border-orange-400',
  stats: 'bg-cyan-50 border-cyan-200 hover:border-cyan-400',
  cards: 'bg-pink-50 border-pink-200 hover:border-pink-400',
  banner: 'bg-yellow-50 border-yellow-200 hover:border-yellow-400',
  testimonials: 'bg-indigo-50 border-indigo-200 hover:border-indigo-400',
  spacer: 'bg-gray-50 border-gray-200 hover:border-gray-400',
  divider: 'bg-gray-50 border-gray-200 hover:border-gray-400'
};

export function AddBlockDialog({ open, onOpenChange, onBlockAdded }) {
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(null);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('No estás autenticado. Por favor, inicia sesión.');
        setLoading(false);
        return;
      }
      
      const response = await axios.get(`${BACKEND_URL}/api/admin/block-templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
      if (error.response?.status === 401) {
        toast.error('Sesión expirada. Por favor, inicia sesión de nuevo.');
      } else {
        toast.error('Error cargando plantillas de bloques');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlock = async (tipo) => {
    try {
      setAdding(tipo);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${BACKEND_URL}/api/admin/landing-page/blocks?tipo=${tipo}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success(`Bloque "${templates[tipo]?.nombre || tipo}" agregado`);
        onBlockAdded(response.data.block);
        onOpenChange(false);
      }
    } catch (error) {
      toast.error('Error agregando bloque');
    } finally {
      setAdding(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif">Agregar Nuevo Bloque</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
            {Object.entries(templates).map(([tipo, template]) => {
              const Icon = BLOCK_ICONS[tipo] || Layers;
              const isAdding = adding === tipo;
              
              return (
                <button
                  key={tipo}
                  onClick={() => handleAddBlock(tipo)}
                  disabled={adding !== null}
                  className={`p-4 rounded-xl border-2 text-left transition-all hover:scale-105 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${BLOCK_COLORS[tipo] || 'bg-gray-50 border-gray-200'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {isAdding ? (
                      <Loader2 className="h-6 w-6 animate-spin text-gray-700" />
                    ) : (
                      <Icon className="h-6 w-6 text-gray-700" />
                    )}
                  </div>
                  <p className="font-medium text-sm">{template.nombre}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {template.descripcion}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Floating Add Block Button for Edit Mode
export function FloatingAddBlockButton({ onClick }) {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-24 left-6 z-50 shadow-lg rounded-full gap-2 bg-green-600 hover:bg-green-700"
      size="lg"
    >
      <Plus className="h-5 w-5" />
      Agregar Bloque
    </Button>
  );
}
