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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultilingualInput, MultilingualItemEditor } from './MultilingualInput';
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
  Globe,
  Construction,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Search,
  Share2,
  BarChart,
  FileImage,
  Link2
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
    footer_texto: '© 2025 Todos los derechos reservados',
    logo_url: '',
    favicon_url: '',
    email_contacto: '',
    telefono_contacto: '',
    // SEO & Meta
    meta_titulo: '',
    meta_descripcion: '',
    meta_keywords: '',
    og_image: '',
    // Analytics
    google_analytics_id: ''
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
      const token = localStorage.getItem('auth_token');
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
      const token = localStorage.getItem('auth_token');
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
      const token = localStorage.getItem('auth_token');
      
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
      const token = localStorage.getItem('auth_token');
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

  const handleToggleBlockPublish = async (bloqueId, currentPublicado) => {
    try {
      const token = localStorage.getItem('auth_token');
      await axios.put(
        `${BACKEND_URL}/api/admin/landing-page/blocks/${bloqueId}/publish?publicado=${!currentPublicado}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setBlocks(prev => prev.map(b => 
        b.bloque_id === bloqueId ? { ...b, publicado: !currentPublicado } : b
      ));
      toast.success(!currentPublicado ? 'Bloque publicado' : 'Bloque marcado en construcción');
    } catch (error) {
      toast.error('Error cambiando estado de publicación');
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
      const token = localStorage.getItem('auth_token');
      await axios.put(
        `${BACKEND_URL}/api/admin/landing-page/blocks/reorder`,
        { orders },
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
      const token = localStorage.getItem('auth_token');
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
      const token = localStorage.getItem('auth_token');
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
            <DialogContent className="max-w-2xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Configuración del Sitio</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="general" className="mt-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="general" className="text-xs sm:text-sm">
                    <Globe className="h-4 w-4 mr-1 hidden sm:inline" />
                    General
                  </TabsTrigger>
                  <TabsTrigger value="seo" className="text-xs sm:text-sm">
                    <Search className="h-4 w-4 mr-1 hidden sm:inline" />
                    SEO
                  </TabsTrigger>
                  <TabsTrigger value="branding" className="text-xs sm:text-sm">
                    <Palette className="h-4 w-4 mr-1 hidden sm:inline" />
                    Marca
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="text-xs sm:text-sm">
                    <BarChart className="h-4 w-4 mr-1 hidden sm:inline" />
                    Analytics
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="h-[400px] mt-4 pr-4">
                  {/* General Tab */}
                  <TabsContent value="general" className="space-y-4 mt-0">
                    <div className="space-y-2">
                      <Label>Nombre del Sitio</Label>
                      <Input
                        value={siteConfig.nombre_sitio}
                        onChange={(e) => setSiteConfig({ ...siteConfig, nombre_sitio: e.target.value })}
                        placeholder="Mi Tienda"
                      />
                      <p className="text-xs text-muted-foreground">
                        Nombre que aparece en el header y footer
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Descripción del Sitio</Label>
                      <Textarea
                        value={siteConfig.descripcion}
                        onChange={(e) => setSiteConfig({ ...siteConfig, descripcion: e.target.value })}
                        placeholder="Descripción del sitio"
                        rows={2}
                      />
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
                  </TabsContent>

                  {/* SEO Tab */}
                  <TabsContent value="seo" className="space-y-4 mt-0">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-blue-800">
                        <Search className="h-4 w-4 inline mr-1" />
                        Optimiza cómo aparece tu sitio en Google y redes sociales
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Título de la Pestaña del Navegador</Label>
                      <Input
                        value={siteConfig.meta_titulo || ''}
                        onChange={(e) => setSiteConfig({ ...siteConfig, meta_titulo: e.target.value })}
                        placeholder="ChiPi Link | Tu Super App"
                      />
                      <p className="text-xs text-muted-foreground">
                        Si está vacío, se usa el nombre del sitio
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Meta Descripción (SEO)</Label>
                      <Textarea
                        value={siteConfig.meta_descripcion || ''}
                        onChange={(e) => setSiteConfig({ ...siteConfig, meta_descripcion: e.target.value })}
                        placeholder="Descripción que aparece en los resultados de Google (máx 160 caracteres)"
                        rows={3}
                        maxLength={160}
                      />
                      <p className="text-xs text-muted-foreground">
                        {(siteConfig.meta_descripcion || '').length}/160 caracteres
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Palabras Clave</Label>
                      <Input
                        value={siteConfig.meta_keywords || ''}
                        onChange={(e) => setSiteConfig({ ...siteConfig, meta_keywords: e.target.value })}
                        placeholder="tienda, ecommerce, productos, panama"
                      />
                      <p className="text-xs text-muted-foreground">
                        Separadas por comas
                      </p>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Share2 className="h-4 w-4" />
                        Imagen para Redes Sociales (Open Graph)
                      </Label>
                      <Input
                        value={siteConfig.og_image || ''}
                        onChange={(e) => setSiteConfig({ ...siteConfig, og_image: e.target.value })}
                        placeholder="https://ejemplo.com/imagen-compartir.jpg"
                      />
                      <p className="text-xs text-muted-foreground">
                        Imagen que aparece al compartir en Facebook, Twitter, WhatsApp (1200x630px recomendado)
                      </p>
                      {siteConfig.og_image && (
                        <img 
                          src={siteConfig.og_image} 
                          alt="Preview" 
                          className="mt-2 rounded-lg max-h-32 object-cover border"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      )}
                    </div>
                  </TabsContent>

                  {/* Branding Tab */}
                  <TabsContent value="branding" className="space-y-4 mt-0">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Color Primario</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={siteConfig.color_primario}
                            onChange={(e) => setSiteConfig({ ...siteConfig, color_primario: e.target.value })}
                            className="w-10 h-10 rounded cursor-pointer border"
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
                            className="w-10 h-10 rounded cursor-pointer border"
                          />
                          <Input
                            value={siteConfig.color_secundario}
                            onChange={(e) => setSiteConfig({ ...siteConfig, color_secundario: e.target.value })}
                            placeholder="#0f766e"
                          />
                        </div>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <FileImage className="h-4 w-4" />
                        URL del Logo
                      </Label>
                      <Input
                        value={siteConfig.logo_url || ''}
                        onChange={(e) => setSiteConfig({ ...siteConfig, logo_url: e.target.value })}
                        placeholder="https://ejemplo.com/logo.png"
                      />
                      {siteConfig.logo_url && (
                        <img 
                          src={siteConfig.logo_url} 
                          alt="Logo Preview" 
                          className="mt-2 max-h-16 object-contain"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        URL del Favicon
                      </Label>
                      <Input
                        value={siteConfig.favicon_url || ''}
                        onChange={(e) => setSiteConfig({ ...siteConfig, favicon_url: e.target.value })}
                        placeholder="https://ejemplo.com/favicon.ico"
                      />
                      <p className="text-xs text-muted-foreground">
                        Icono pequeño que aparece en la pestaña del navegador (32x32px)
                      </p>
                    </div>
                  </TabsContent>

                  {/* Analytics Tab */}
                  <TabsContent value="analytics" className="space-y-4 mt-0">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-amber-800">
                        <BarChart className="h-4 w-4 inline mr-1" />
                        Conecta herramientas de análisis para medir el tráfico
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Google Analytics 4 - Measurement ID</Label>
                      <Input
                        value={siteConfig.google_analytics_id || ''}
                        onChange={(e) => setSiteConfig({ ...siteConfig, google_analytics_id: e.target.value })}
                        placeholder="G-XXXXXXXXXX"
                      />
                      <p className="text-xs text-muted-foreground">
                        Encuentra tu ID en Google Analytics → Admin → Data Streams
                      </p>
                    </div>
                  </TabsContent>
                </ScrollArea>

                <div className="mt-4 pt-4 border-t">
                  <Button onClick={handleUpdateSiteConfig} disabled={saving} className="w-full">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Guardar Configuración
                  </Button>
                </div>
              </Tabs>
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
            const isPublicado = block.publicado !== false; // Default to true if undefined
            
            return (
              <Card
                key={block.bloque_id}
                className={`transition-all ${!block.activo ? 'opacity-50' : ''} ${!isPublicado ? 'border-orange-300 bg-orange-50/50' : ''} ${BLOCK_COLORS[block.tipo] || ''}`}
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
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => handleMoveBlock(block.bloque_id, 'down')}
                          disabled={index === blocks.length - 1}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="p-2 rounded-lg bg-white/50">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{template?.nombre || block.tipo}</CardTitle>
                          {/* Badge de estado de publicación */}
                          <Badge 
                            variant={isPublicado ? "default" : "outline"}
                            className={`text-xs cursor-pointer transition-colors ${
                              isPublicado 
                                ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-300' 
                                : 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-300'
                            }`}
                            onClick={() => handleToggleBlockPublish(block.bloque_id, isPublicado)}
                            title={isPublicado ? 'Clic para marcar en construcción' : 'Clic para publicar'}
                          >
                            {isPublicado ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Publicado
                              </>
                            ) : (
                              <>
                                <Construction className="h-3 w-3 mr-1" />
                                En construcción
                              </>
                            )}
                          </Badge>
                        </div>
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
                        title={block.activo ? 'Desactivar bloque' : 'Activar bloque'}
                      >
                        {block.activo ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingBlock(block)}
                        title="Configurar bloque"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteBlock(block.bloque_id)}
                        title="Eliminar bloque"
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
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                🌐 Cada campo de texto tiene soporte para 3 idiomas. Haz clic en las pestañas para editar cada idioma.
              </p>
            </div>
            
            <MultilingualInput
              label="Título Principal"
              value={config.titulo}
              onChange={(val) => handleChange('titulo', val)}
              placeholder={{ en: "Welcome to our store", es: "Bienvenido a nuestra tienda", zh: "欢迎来到我们的商店" }}
            />
            
            <MultilingualInput
              label="Subtítulo"
              value={config.subtitulo}
              onChange={(val) => handleChange('subtitulo', val)}
              placeholder={{ en: "Brief description", es: "Descripción breve", zh: "简短描述" }}
              multiline
              rows={2}
            />
            
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
            
            <Separator />
            <p className="text-sm font-medium text-muted-foreground">Botones de Acción</p>
            
            <div className="grid grid-cols-2 gap-4">
              <MultilingualInput
                label="Texto del Botón Principal"
                value={config.boton_texto}
                onChange={(val) => handleChange('boton_texto', val)}
                placeholder={{ en: "Get Started", es: "Comenzar", zh: "开始" }}
              />
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
              <MultilingualInput
                label="Texto Botón Secundario"
                value={config.boton_secundario_texto}
                onChange={(val) => handleChange('boton_secundario_texto', val)}
                placeholder={{ en: "Learn More", es: "Ver más", zh: "了解更多" }}
              />
              <div className="space-y-2">
                <Label>URL Botón Secundario</Label>
                <Input
                  value={config.boton_secundario_url || ''}
                  onChange={(e) => handleChange('boton_secundario_url', e.target.value)}
                  placeholder="/productos"
                />
              </div>
            </div>
          </div>
        );

      case 'features':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                🌐 Cada campo de texto tiene soporte para 3 idiomas.
              </p>
            </div>
            
            <MultilingualInput
              label="Título de la Sección"
              value={config.titulo}
              onChange={(val) => handleChange('titulo', val)}
              placeholder={{ en: "Why choose us?", es: "¿Por qué elegirnos?", zh: "为什么选择我们？" }}
            />
            
            <MultilingualInput
              label="Subtítulo"
              value={config.subtitulo}
              onChange={(val) => handleChange('subtitulo', val)}
              placeholder={{ en: "Optional description", es: "Descripción opcional", zh: "可选描述" }}
            />
            
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
              {(config.items || config.features || []).map((item, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Característica {index + 1}</span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Icono</Label>
                    <Input
                      value={item.icono || ''}
                      onChange={(e) => handleItemChange(index, 'icono', e.target.value)}
                      placeholder="Store, Users, Calendar, Shield..."
                    />
                  </div>
                  <MultilingualInput
                    label="Título"
                    value={item.titulo}
                    onChange={(val) => handleItemChange(index, 'titulo', val)}
                    placeholder={{ en: "Feature title", es: "Título", zh: "标题" }}
                  />
                  <MultilingualInput
                    label="Descripción"
                    value={item.descripcion}
                    onChange={(val) => handleItemChange(index, 'descripcion', val)}
                    placeholder={{ en: "Feature description", es: "Descripción", zh: "描述" }}
                    multiline
                    rows={2}
                  />
                </div>
              ))}
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                🌐 Soporte multilingüe habilitado.
              </p>
            </div>
            
            <MultilingualInput
              label="Título (opcional)"
              value={config.titulo}
              onChange={(val) => handleChange('titulo', val)}
              placeholder={{ en: "Title", es: "Título", zh: "标题" }}
            />
            
            <MultilingualInput
              label="Contenido"
              value={config.contenido}
              onChange={(val) => handleChange('contenido', val)}
              placeholder={{ en: "Write your content here...", es: "Escribe tu contenido aquí...", zh: "在这里写内容..." }}
              multiline
              rows={6}
            />
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
            
            <MultilingualInput
              label="Texto Alternativo (Alt)"
              value={config.alt}
              onChange={(val) => handleChange('alt', val)}
              placeholder={{ en: "Image description", es: "Descripción de la imagen", zh: "图片描述" }}
            />
            
            <MultilingualInput
              label="Pie de Imagen (Caption)"
              value={config.caption}
              onChange={(val) => handleChange('caption', val)}
              placeholder={{ en: "Text below the image", es: "Texto debajo de la imagen", zh: "图片下方的文字" }}
            />
            
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
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                🌐 Soporte multilingüe habilitado.
              </p>
            </div>
            
            <MultilingualInput
              label="Título"
              value={config.titulo}
              onChange={(val) => handleChange('titulo', val)}
              placeholder={{ en: "Ready to get started?", es: "¿Listo para comenzar?", zh: "准备开始了吗？" }}
            />
            
            <MultilingualInput
              label="Subtítulo"
              value={config.subtitulo}
              onChange={(val) => handleChange('subtitulo', val)}
              placeholder={{ en: "Join thousands of customers", es: "Únete a miles de clientes", zh: "加入成千上万的客户" }}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <MultilingualInput
                label="Texto del Botón"
                value={config.boton_texto}
                onChange={(val) => handleChange('boton_texto', val)}
                placeholder={{ en: "Sign Up", es: "Registrarse", zh: "注册" }}
              />
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
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                🌐 Soporte multilingüe habilitado.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label>Estadísticas</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="h-4 w-4 mr-1" /> Agregar
              </Button>
            </div>
            {(config.items || []).map((item, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Estadística {index + 1}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Número/Valor</Label>
                  <Input
                    value={item.numero || ''}
                    onChange={(e) => handleItemChange(index, 'numero', e.target.value)}
                    placeholder="1000+"
                  />
                </div>
                <MultilingualInput
                  label="Etiqueta"
                  value={item.label}
                  onChange={(val) => handleItemChange(index, 'label', val)}
                  placeholder={{ en: "Customers", es: "Clientes", zh: "客户" }}
                />
              </div>
            ))}
          </div>
        );

      case 'cards':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                🌐 Soporte multilingüe habilitado.
              </p>
            </div>
            
            <MultilingualInput
              label="Título de la Sección"
              value={config.titulo}
              onChange={(val) => handleChange('titulo', val)}
              placeholder={{ en: "Our Products", es: "Nuestros Productos", zh: "我们的产品" }}
            />
            
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
              <div key={index} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Tarjeta {index + 1}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <MultilingualInput
                  label="Título"
                  value={item.titulo}
                  onChange={(val) => handleItemChange(index, 'titulo', val)}
                  placeholder={{ en: "Title", es: "Título", zh: "标题" }}
                />
                <MultilingualInput
                  label="Descripción"
                  value={item.descripcion}
                  onChange={(val) => handleItemChange(index, 'descripcion', val)}
                  placeholder={{ en: "Description", es: "Descripción", zh: "描述" }}
                  multiline
                />
                <div className="space-y-2">
                  <Label className="text-xs">URL de imagen</Label>
                  <Input
                    value={item.imagen_url || ''}
                    onChange={(e) => handleItemChange(index, 'imagen_url', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">URL del enlace</Label>
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
