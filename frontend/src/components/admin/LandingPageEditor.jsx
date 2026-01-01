import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Plus,
  Trash2,
  GripVertical,
  Settings,
  Eye,
  EyeOff,
  Save,
  Loader2,
  Image,
  Type,
  LayoutGrid,
  MessageSquare,
  BarChart3,
  MousePointer,
  Layers,
  Minus,
  ExternalLink,
  Palette,
  Globe
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
  hero: 'bg-blue-50 border-blue-200',
  features: 'bg-green-50 border-green-200',
  text: 'bg-gray-50 border-gray-200',
  image: 'bg-purple-50 border-purple-200',
  cta: 'bg-orange-50 border-orange-200',
  stats: 'bg-cyan-50 border-cyan-200',
  cards: 'bg-pink-50 border-pink-200',
  banner: 'bg-yellow-50 border-yellow-200',
  testimonials: 'bg-indigo-50 border-indigo-200',
  spacer: 'bg-gray-50 border-gray-200',
  divider: 'bg-gray-50 border-gray-200'
};

export default function LandingPageEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blocks, setBlocks] = useState([]);
  const [templates, setTemplates] = useState({});
  const [siteConfig, setSiteConfig] = useState({
    nombre_sitio: 'Mi Tienda',
    descripcion: 'Plataforma de comercio electrónico',
    color_primario: '#16a34a',
    color_secundario: '#0f766e',
    footer_texto: '© 2025 Todos los derechos reservados'
  });
  const [editingBlock, setEditingBlock] = useState(null);
  const [addBlockDialog, setAddBlockDialog] = useState(false);
  const [siteConfigDialog, setSiteConfigDialog] = useState(false);
  const [isPublished, setIsPublished] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [pageRes, templatesRes, configRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/admin/landing-page`, { headers }),
        axios.get(`${BACKEND_URL}/api/admin/block-templates`, { headers }),
        axios.get(`${BACKEND_URL}/api/admin/site-config`, { headers })
      ]);

      // Sort blocks by order
      const sortedBlocks = (pageRes.data.bloques || []).sort((a, b) => a.orden - b.orden);
      setBlocks(sortedBlocks);
      setTemplates(templatesRes.data);
      setSiteConfig(configRes.data);
      setIsPublished(pageRes.data.publicada !== false);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlock = async (tipo) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${BACKEND_URL}/api/admin/landing-page/blocks?tipo=${tipo}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setBlocks(prev => [...prev, res.data.block].sort((a, b) => a.orden - b.orden));
        setAddBlockDialog(false);
        toast.success('Bloque agregado');
      }
    } catch (error) {
      toast.error('Error agregando bloque');
    }
  };

  const handleUpdateBlock = async (bloqueId, config, activo = null) => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      let url = `${BACKEND_URL}/api/admin/landing-page/blocks/${bloqueId}`;
      const params = new URLSearchParams();
      if (activo !== null) params.append('activo', activo);
      if (params.toString()) url += `?${params.toString()}`;

      await axios.put(url, config, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setBlocks(prev =>
        prev.map(b =>
          b.bloque_id === bloqueId
            ? { ...b, config, ...(activo !== null && { activo }) }
            : b
        )
      );
      setEditingBlock(null);
      toast.success('Bloque actualizado');
    } catch (error) {
      toast.error('Error actualizando bloque');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlock = async (bloqueId) => {
    if (!window.confirm('¿Eliminar este bloque?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${BACKEND_URL}/api/admin/landing-page/blocks/${bloqueId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setBlocks(prev => prev.filter(b => b.bloque_id !== bloqueId));
      toast.success('Bloque eliminado');
    } catch (error) {
      toast.error('Error eliminando bloque');
    }
  };

  const handleToggleBlock = async (bloqueId, currentActive) => {
    const block = blocks.find(b => b.bloque_id === bloqueId);
    if (block) {
      await handleUpdateBlock(bloqueId, block.config, !currentActive);
    }
  };

  const handleMoveBlock = async (bloqueId, direction) => {
    const idx = blocks.findIndex(b => b.bloque_id === bloqueId);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === blocks.length - 1)) {
      return;
    }

    const newBlocks = [...blocks];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newBlocks[idx], newBlocks[swapIdx]] = [newBlocks[swapIdx], newBlocks[idx]];

    // Update orders
    const orders = newBlocks.map((b, i) => ({ bloque_id: b.bloque_id, orden: i }));

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${BACKEND_URL}/api/admin/landing-page/blocks/reorder`,
        orders,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setBlocks(newBlocks.map((b, i) => ({ ...b, orden: i })));
    } catch (error) {
      toast.error('Error reordenando bloques');
    }
  };

  const handleUpdateSiteConfig = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      await axios.put(`${BACKEND_URL}/api/admin/site-config`, siteConfig, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSiteConfigDialog(false);
      toast.success('Configuración guardada');
    } catch (error) {
      toast.error('Error guardando configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${BACKEND_URL}/api/admin/landing-page/publish?publicada=${!isPublished}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsPublished(!isPublished);
      toast.success(isPublished ? 'Página despublicada' : 'Página publicada');
    } catch (error) {
      toast.error('Error cambiando estado');
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold">Editor de Landing Page</h2>
          <p className="text-muted-foreground">
            Personaliza la página de inicio con bloques editables
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={siteConfigDialog} onOpenChange={setSiteConfigDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Globe className="h-4 w-4" />
                Configuración del Sitio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Configuración del Sitio</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Nombre del Sitio</Label>
                  <Input
                    value={siteConfig.nombre_sitio}
                    onChange={(e) => setSiteConfig({ ...siteConfig, nombre_sitio: e.target.value })}
                    placeholder="Mi Tienda"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea
                    value={siteConfig.descripcion}
                    onChange={(e) => setSiteConfig({ ...siteConfig, descripcion: e.target.value })}
                    placeholder="Descripción del sitio"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Color Primario</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={siteConfig.color_primario}
                        onChange={(e) => setSiteConfig({ ...siteConfig, color_primario: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={siteConfig.color_primario}
                        onChange={(e) => setSiteConfig({ ...siteConfig, color_primario: e.target.value })}
                        placeholder="#16a34a"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Color Secundario</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={siteConfig.color_secundario}
                        onChange={(e) => setSiteConfig({ ...siteConfig, color_secundario: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={siteConfig.color_secundario}
                        onChange={(e) => setSiteConfig({ ...siteConfig, color_secundario: e.target.value })}
                        placeholder="#0f766e"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email de Contacto</Label>
                  <Input
                    type="email"
                    value={siteConfig.email_contacto || ''}
                    onChange={(e) => setSiteConfig({ ...siteConfig, email_contacto: e.target.value })}
                    placeholder="contacto@ejemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono de Contacto</Label>
                  <Input
                    value={siteConfig.telefono_contacto || ''}
                    onChange={(e) => setSiteConfig({ ...siteConfig, telefono_contacto: e.target.value })}
                    placeholder="+507 6000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Texto del Footer</Label>
                  <Input
                    value={siteConfig.footer_texto}
                    onChange={(e) => setSiteConfig({ ...siteConfig, footer_texto: e.target.value })}
                    placeholder="© 2025 Mi Tienda"
                  />
                </div>
                <Button onClick={handleUpdateSiteConfig} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar Configuración
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {isPublished ? 'Publicada' : 'Borrador'}
            </span>
            <Switch checked={isPublished} onCheckedChange={handleTogglePublish} />
          </div>

          <a href="/" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="icon">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </div>

      {/* Add Block Button */}
      <Dialog open={addBlockDialog} onOpenChange={setAddBlockDialog}>
        <DialogTrigger asChild>
          <Button className="w-full gap-2" variant="outline">
            <Plus className="h-4 w-4" />
            Agregar Bloque
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Bloque</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
            {Object.entries(templates).map(([tipo, template]) => {
              const Icon = BLOCK_ICONS[tipo] || Layers;
              return (
                <button
                  key={tipo}
                  onClick={() => handleAddBlock(tipo)}
                  className={`p-4 rounded-xl border-2 text-left transition-all hover:scale-105 hover:shadow-md ${BLOCK_COLORS[tipo] || 'bg-gray-50 border-gray-200'}`}
                >
                  <Icon className="h-6 w-6 mb-2 text-gray-700" />
                  <p className="font-medium text-sm">{template.nombre}</p>
                  <p className="text-xs text-muted-foreground mt-1">{template.descripcion}</p>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Blocks List */}
      {blocks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">No hay bloques en la página</p>
            <Button onClick={() => setAddBlockDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar primer bloque
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {blocks.map((block, index) => {
            const Icon = BLOCK_ICONS[block.tipo] || Layers;
            const template = templates[block.tipo];
            
            return (
              <Card
                key={block.bloque_id}
                className={`transition-all ${!block.activo ? 'opacity-50' : ''} ${BLOCK_COLORS[block.tipo] || ''}`}
              >
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => handleMoveBlock(block.bloque_id, 'up')}
                          disabled={index === 0}
                        >
                          <span className="text-xs">▲</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => handleMoveBlock(block.bloque_id, 'down')}
                          disabled={index === blocks.length - 1}
                        >
                          <span className="text-xs">▼</span>
                        </Button>
                      </div>
                      <div className="p-2 rounded-lg bg-white/50">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{template?.nombre || block.tipo}</CardTitle>
                        <CardDescription className="text-xs">
                          {block.config?.titulo || template?.descripcion || ''}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleBlock(block.bloque_id, block.activo)}
                      >
                        {block.activo ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingBlock(block)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteBlock(block.bloque_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Block Dialog */}
      <Dialog open={!!editingBlock} onOpenChange={(open) => !open && setEditingBlock(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Editar {templates[editingBlock?.tipo]?.nombre || editingBlock?.tipo}
            </DialogTitle>
          </DialogHeader>
          {editingBlock && (
            <BlockConfigEditor
              block={editingBlock}
              template={templates[editingBlock.tipo]}
              onSave={(config) => handleUpdateBlock(editingBlock.bloque_id, config)}
              saving={saving}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Block Configuration Editor Component
function BlockConfigEditor({ block, template, onSave, saving }) {
  const [config, setConfig] = useState(block.config || {});

  const handleChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const items = [...(config.items || [])];
    items[index] = { ...items[index], [field]: value };
    setConfig(prev => ({ ...prev, items }));
  };

  const handleAddItem = () => {
    const defaultItem = template?.config_default?.items?.[0] || { titulo: '', descripcion: '' };
    setConfig(prev => ({
      ...prev,
      items: [...(prev.items || []), { ...defaultItem }]
    }));
  };

  const handleRemoveItem = (index) => {
    setConfig(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Render different editors based on block type
  const renderEditor = () => {
    switch (block.tipo) {
      case 'hero':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título Principal</Label>
              <Input
                value={config.titulo || ''}
                onChange={(e) => handleChange('titulo', e.target.value)}
                placeholder="Bienvenido a nuestra tienda"
              />
            </div>
            <div className="space-y-2">
              <Label>Subtítulo</Label>
              <Textarea
                value={config.subtitulo || ''}
                onChange={(e) => handleChange('subtitulo', e.target.value)}
                placeholder="Descripción breve"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>URL de Imagen de Fondo</Label>
              <Input
                value={config.imagen_url || ''}
                onChange={(e) => handleChange('imagen_url', e.target.value)}
                placeholder="https://..."
              />
              {config.imagen_url && (
                <img src={config.imagen_url} alt="Preview" className="w-full h-32 object-cover rounded-lg mt-2" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Texto del Botón</Label>
                <Input
                  value={config.boton_texto || ''}
                  onChange={(e) => handleChange('boton_texto', e.target.value)}
                  placeholder="Comenzar"
                />
              </div>
              <div className="space-y-2">
                <Label>URL del Botón</Label>
                <Input
                  value={config.boton_url || ''}
                  onChange={(e) => handleChange('boton_url', e.target.value)}
                  placeholder="/registro"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Texto Botón Secundario</Label>
                <Input
                  value={config.boton_secundario_texto || ''}
                  onChange={(e) => handleChange('boton_secundario_texto', e.target.value)}
                  placeholder="Ver Catálogo"
                />
              </div>
              <div className="space-y-2">
                <Label>URL Botón Secundario</Label>
                <Input
                  value={config.boton_secundario_url || ''}
                  onChange={(e) => handleChange('boton_secundario_url', e.target.value)}
                  placeholder="/catalogo"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Altura (px)</Label>
              <Input
                value={config.altura || '500px'}
                onChange={(e) => handleChange('altura', e.target.value)}
                placeholder="500px"
              />
            </div>
          </div>
        );

      case 'features':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título de la Sección</Label>
              <Input
                value={config.titulo || ''}
                onChange={(e) => handleChange('titulo', e.target.value)}
                placeholder="¿Por qué elegirnos?"
              />
            </div>
            <div className="space-y-2">
              <Label>Subtítulo</Label>
              <Input
                value={config.subtitulo || ''}
                onChange={(e) => handleChange('subtitulo', e.target.value)}
                placeholder="Descripción opcional"
              />
            </div>
            <div className="space-y-2">
              <Label>Columnas</Label>
              <Select value={String(config.columnas || 3)} onValueChange={(v) => handleChange('columnas', parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 columnas</SelectItem>
                  <SelectItem value="3">3 columnas</SelectItem>
                  <SelectItem value="4">4 columnas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Características</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                  <Plus className="h-4 w-4 mr-1" /> Agregar
                </Button>
              </div>
              {(config.items || []).map((item, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Característica {index + 1}</span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={item.icono || ''}
                    onChange={(e) => handleItemChange(index, 'icono', e.target.value)}
                    placeholder="Icono (shield, truck, headphones...)"
                  />
                  <Input
                    value={item.titulo || ''}
                    onChange={(e) => handleItemChange(index, 'titulo', e.target.value)}
                    placeholder="Título"
                  />
                  <Input
                    value={item.descripcion || ''}
                    onChange={(e) => handleItemChange(index, 'descripcion', e.target.value)}
                    placeholder="Descripción"
                  />
                </div>
              ))}
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título (opcional)</Label>
              <Input
                value={config.titulo || ''}
                onChange={(e) => handleChange('titulo', e.target.value)}
                placeholder="Título"
              />
            </div>
            <div className="space-y-2">
              <Label>Contenido</Label>
              <Textarea
                value={config.contenido || ''}
                onChange={(e) => handleChange('contenido', e.target.value)}
                placeholder="Escribe tu contenido aquí..."
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <Label>Alineación</Label>
              <Select value={config.alineacion || 'center'} onValueChange={(v) => handleChange('alineacion', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Izquierda</SelectItem>
                  <SelectItem value="center">Centro</SelectItem>
                  <SelectItem value="right">Derecha</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL de la Imagen</Label>
              <Input
                value={config.imagen_url || ''}
                onChange={(e) => handleChange('imagen_url', e.target.value)}
                placeholder="https://..."
              />
              {config.imagen_url && (
                <img src={config.imagen_url} alt="Preview" className="w-full h-48 object-cover rounded-lg mt-2" />
              )}
            </div>
            <div className="space-y-2">
              <Label>Texto Alternativo (Alt)</Label>
              <Input
                value={config.alt || ''}
                onChange={(e) => handleChange('alt', e.target.value)}
                placeholder="Descripción de la imagen"
              />
            </div>
            <div className="space-y-2">
              <Label>Pie de Imagen (Caption)</Label>
              <Input
                value={config.caption || ''}
                onChange={(e) => handleChange('caption', e.target.value)}
                placeholder="Texto debajo de la imagen"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={config.redondeado !== false}
                onCheckedChange={(v) => handleChange('redondeado', v)}
              />
              <Label>Bordes redondeados</Label>
            </div>
          </div>
        );

      case 'cta':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={config.titulo || ''}
                onChange={(e) => handleChange('titulo', e.target.value)}
                placeholder="¿Listo para comenzar?"
              />
            </div>
            <div className="space-y-2">
              <Label>Subtítulo</Label>
              <Input
                value={config.subtitulo || ''}
                onChange={(e) => handleChange('subtitulo', e.target.value)}
                placeholder="Únete a miles de clientes"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Texto del Botón</Label>
                <Input
                  value={config.boton_texto || ''}
                  onChange={(e) => handleChange('boton_texto', e.target.value)}
                  placeholder="Registrarse"
                />
              </div>
              <div className="space-y-2">
                <Label>URL del Botón</Label>
                <Input
                  value={config.boton_url || ''}
                  onChange={(e) => handleChange('boton_url', e.target.value)}
                  placeholder="/registro"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Color de Fondo</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.fondo_color || '#16a34a'}
                    onChange={(e) => handleChange('fondo_color', e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={config.fondo_color || ''}
                    onChange={(e) => handleChange('fondo_color', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Color del Texto</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.texto_color || '#ffffff'}
                    onChange={(e) => handleChange('texto_color', e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={config.texto_color || ''}
                    onChange={(e) => handleChange('texto_color', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'stats':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Estadísticas</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="h-4 w-4 mr-1" /> Agregar
              </Button>
            </div>
            {(config.items || []).map((item, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Estadística {index + 1}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  value={item.numero || ''}
                  onChange={(e) => handleItemChange(index, 'numero', e.target.value)}
                  placeholder="1000+"
                />
                <Input
                  value={item.label || ''}
                  onChange={(e) => handleItemChange(index, 'label', e.target.value)}
                  placeholder="Clientes"
                />
              </div>
            ))}
          </div>
        );

      case 'cards':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título de la Sección</Label>
              <Input
                value={config.titulo || ''}
                onChange={(e) => handleChange('titulo', e.target.value)}
                placeholder="Nuestros Productos"
              />
            </div>
            <div className="space-y-2">
              <Label>Columnas</Label>
              <Select value={String(config.columnas || 3)} onValueChange={(v) => handleChange('columnas', parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 columnas</SelectItem>
                  <SelectItem value="3">3 columnas</SelectItem>
                  <SelectItem value="4">4 columnas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label>Tarjetas</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="h-4 w-4 mr-1" /> Agregar
              </Button>
            </div>
            {(config.items || []).map((item, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Tarjeta {index + 1}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  value={item.titulo || ''}
                  onChange={(e) => handleItemChange(index, 'titulo', e.target.value)}
                  placeholder="Título"
                />
                <Input
                  value={item.descripcion || ''}
                  onChange={(e) => handleItemChange(index, 'descripcion', e.target.value)}
                  placeholder="Descripción"
                />
                <Input
                  value={item.imagen_url || ''}
                  onChange={(e) => handleItemChange(index, 'imagen_url', e.target.value)}
                  placeholder="URL de imagen"
                />
                <Input
                  value={item.link || ''}
                  onChange={(e) => handleItemChange(index, 'link', e.target.value)}
                  placeholder="Link (opcional)"
                />
              </div>
            ))}
          </div>
        );

      case 'banner':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={config.titulo || ''}
                onChange={(e) => handleChange('titulo', e.target.value)}
                placeholder="Promoción Especial"
              />
            </div>
            <div className="space-y-2">
              <Label>Subtítulo</Label>
              <Input
                value={config.subtitulo || ''}
                onChange={(e) => handleChange('subtitulo', e.target.value)}
                placeholder="Aprovecha nuestras ofertas"
              />
            </div>
            <div className="space-y-2">
              <Label>URL de Imagen</Label>
              <Input
                value={config.imagen_url || ''}
                onChange={(e) => handleChange('imagen_url', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Color de Fondo</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={config.fondo_color || '#f0fdf4'}
                  onChange={(e) => handleChange('fondo_color', e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <Input
                  value={config.fondo_color || ''}
                  onChange={(e) => handleChange('fondo_color', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Texto del Botón</Label>
                <Input
                  value={config.boton_texto || ''}
                  onChange={(e) => handleChange('boton_texto', e.target.value)}
                  placeholder="Ver Más"
                />
              </div>
              <div className="space-y-2">
                <Label>URL del Botón</Label>
                <Input
                  value={config.boton_url || ''}
                  onChange={(e) => handleChange('boton_url', e.target.value)}
                  placeholder="/ofertas"
                />
              </div>
            </div>
          </div>
        );

      case 'testimonials':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título de la Sección</Label>
              <Input
                value={config.titulo || ''}
                onChange={(e) => handleChange('titulo', e.target.value)}
                placeholder="Lo que dicen nuestros clientes"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label>Testimonios</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="h-4 w-4 mr-1" /> Agregar
              </Button>
            </div>
            {(config.items || []).map((item, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Testimonio {index + 1}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  value={item.nombre || ''}
                  onChange={(e) => handleItemChange(index, 'nombre', e.target.value)}
                  placeholder="Nombre del cliente"
                />
                <Input
                  value={item.cargo || ''}
                  onChange={(e) => handleItemChange(index, 'cargo', e.target.value)}
                  placeholder="Cargo / Empresa (opcional)"
                />
                <Textarea
                  value={item.texto || ''}
                  onChange={(e) => handleItemChange(index, 'texto', e.target.value)}
                  placeholder="Testimonio..."
                  rows={3}
                />
                <Input
                  value={item.avatar_url || ''}
                  onChange={(e) => handleItemChange(index, 'avatar_url', e.target.value)}
                  placeholder="URL de avatar (opcional)"
                />
              </div>
            ))}
          </div>
        );

      case 'spacer':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Altura del Espaciador</Label>
              <Input
                value={config.altura || '60px'}
                onChange={(e) => handleChange('altura', e.target.value)}
                placeholder="60px"
              />
            </div>
          </div>
        );

      case 'divider':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Estilo</Label>
              <Select value={config.estilo || 'solid'} onValueChange={(v) => handleChange('estilo', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Sólido</SelectItem>
                  <SelectItem value="dashed">Punteado</SelectItem>
                  <SelectItem value="dotted">Puntos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={config.color || '#e5e7eb'}
                  onChange={(e) => handleChange('color', e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <Input
                  value={config.color || ''}
                  onChange={(e) => handleChange('color', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Margen Vertical</Label>
              <Input
                value={config.margen || '40px'}
                onChange={(e) => handleChange('margen', e.target.value)}
                placeholder="40px"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-muted-foreground text-center py-8">
            Editor no disponible para este tipo de bloque
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <ScrollArea className="h-[60vh] pr-4">
        {renderEditor()}
      </ScrollArea>
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={() => setConfig(block.config)}>
          Restaurar
        </Button>
        <Button onClick={() => onSave(config)} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar Cambios
        </Button>
      </div>
    </div>
  );
}
