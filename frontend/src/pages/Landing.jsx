import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DynamicHead from '@/components/DynamicHead';
import { getLocalizedText } from '@/components/admin/MultilingualInput';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Book, 
  Truck, 
  HeadphonesIcon, 
  ArrowRight,
  GraduationCap,
  CheckCircle2,
  Shield,
  Star,
  Mail,
  Phone,
  Loader2,
  Quote,
  Edit3,
  Save,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import { AddBlockDialog, FloatingAddBlockButton } from '@/modules/landing-editor/AddBlockDialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Edit Mode Context
const EditModeContext = createContext({
  isEditMode: false,
  editingBlockId: null,
  setEditingBlockId: () => {},
  updateBlockConfig: () => {},
  saveBlock: () => {}
});

const useEditMode = () => useContext(EditModeContext);

// Icon mapping for features
const ICON_MAP = {
  shield: Shield,
  truck: Truck,
  headphones: HeadphonesIcon,
  book: Book,
  star: Star,
  graduation: GraduationCap,
  check: CheckCircle2
};

// Editable Text Component
function EditableText({ value, onChange, className = '', multiline = false, placeholder = 'Editar texto...', style = {} }) {
  const { isEditMode } = useEditMode();
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (!isEditMode) {
    return <span className={className} style={style}>{value}</span>;
  }

  if (isEditing) {
    const handleBlur = () => {
      setIsEditing(false);
      if (localValue !== value) {
        onChange(localValue);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !multiline) {
        handleBlur();
      }
      if (e.key === 'Escape') {
        setLocalValue(value);
        setIsEditing(false);
      }
    };

    if (multiline) {
      return (
        <textarea
          ref={inputRef}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`bg-white/90 dark:bg-gray-800/90 border-2 border-primary rounded-lg p-2 w-full resize-none outline-none ${className}`}
          style={{ ...style, minHeight: '60px' }}
          placeholder={placeholder}
        />
      );
    }

    return (
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`bg-white/90 dark:bg-gray-800/90 border-2 border-primary rounded-lg px-2 py-1 outline-none ${className}`}
        style={style}
        placeholder={placeholder}
      />
    );
  }

  return (
    <span 
      className={`cursor-pointer hover:bg-primary/20 hover:outline hover:outline-2 hover:outline-primary hover:outline-dashed rounded px-1 transition-all ${className}`}
      style={style}
      onClick={() => setIsEditing(true)}
      title="Clic para editar"
    >
      {value || <span className="text-gray-400 italic">{placeholder}</span>}
    </span>
  );
}

// Editable Image Component
function EditableImage({ src, alt, className = '', onChangeSrc }) {
  const { isEditMode } = useEditMode();
  const [isEditing, setIsEditing] = useState(false);
  const [localSrc, setLocalSrc] = useState(src);

  if (!isEditMode) {
    return <img src={src} alt={alt} className={className} />;
  }

  if (isEditing) {
    return (
      <div className="relative">
        <img src={localSrc || src} alt={alt} className={`${className} opacity-50`} />
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-w-md w-full mx-4">
            <p className="text-sm font-medium mb-2">URL de la imagen:</p>
            <Input
              value={localSrc}
              onChange={(e) => setLocalSrc(e.target.value)}
              placeholder="https://..."
              className="mb-3"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { onChangeSrc(localSrc); setIsEditing(false); }}>
                <Save className="h-4 w-4 mr-1" /> Guardar
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setLocalSrc(src); setIsEditing(false); }}>
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group cursor-pointer" onClick={() => setIsEditing(true)}>
      <img src={src} alt={alt} className={className} />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="bg-white/90 dark:bg-gray-800/90 px-3 py-2 rounded-lg shadow-lg">
          <Edit3 className="h-5 w-5 inline mr-2" />
          Cambiar imagen
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { t } = useTranslation();
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [blocks, setBlocks] = useState([]);
  const [siteConfig, setSiteConfig] = useState(null);
  const [useStaticPage, setUseStaticPage] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [addBlockDialogOpen, setAddBlockDialogOpen] = useState(false);

  useEffect(() => {
    fetchLandingData();
  }, []);

  const fetchLandingData = async () => {
    try {
      const [pageRes, configRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/public/landing-page`),
        axios.get(`${BACKEND_URL}/api/public/site-config`)
      ]);

      const pageData = pageRes.data;
      setSiteConfig(configRes.data);

      if (pageData.publicada && pageData.bloques && pageData.bloques.length > 0) {
        const activeBlocks = pageData.bloques
          .filter(b => b.activo !== false)
          .sort((a, b) => a.orden - b.orden);
        setBlocks(activeBlocks);
        setUseStaticPage(false);
      } else {
        // Even without blocks, show the dynamic editor if admin is in edit mode
        setBlocks([]);
        setUseStaticPage(false);
      }
    } catch (error) {
      console.error('Error fetching landing data:', error);
      setUseStaticPage(true);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockAdded = (newBlock) => {
    setBlocks(prev => [...prev, newBlock].sort((a, b) => a.orden - b.orden));
    setHasChanges(true);
  };

  const handleDeleteBlock = async (blockId) => {
    if (!window.confirm('¿Eliminar este bloque?')) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      await axios.delete(`${BACKEND_URL}/api/admin/landing-page/blocks/${blockId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBlocks(prev => prev.filter(b => b.bloque_id !== blockId));
      toast.success('Bloque eliminado');
    } catch (error) {
      toast.error('Error eliminando bloque');
    }
  };

  const updateBlockConfig = (blockId, newConfig) => {
    setBlocks(prev => prev.map(b => 
      b.bloque_id === blockId 
        ? { ...b, config: { ...b.config, ...newConfig } }
        : b
    ));
    setHasChanges(true);
  };

  const saveBlock = async (blockId) => {
    const block = blocks.find(b => b.bloque_id === blockId);
    if (!block) return;

    try {
      setSaving(true);
      const token = localStorage.getItem('auth_token');
      await axios.put(
        `${BACKEND_URL}/api/admin/landing-page/blocks/${blockId}`,
        block.config,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Bloque guardado');
      setHasChanges(false);
    } catch (error) {
      toast.error('Error guardando bloque');
    } finally {
      setSaving(false);
    }
  };

  const saveAllBlocks = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('auth_token');
      
      for (const block of blocks) {
        await axios.put(
          `${BACKEND_URL}/api/admin/landing-page/blocks/${block.bloque_id}`,
          block.config,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      toast.success('Todos los cambios guardados');
      setHasChanges(false);
    } catch (error) {
      toast.error('Error guardando cambios');
    } finally {
      setSaving(false);
    }
  };

  const saveSiteConfig = async (newConfig) => {
    try {
      const token = localStorage.getItem('auth_token');
      await axios.put(`${BACKEND_URL}/api/admin/site-config`, newConfig, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSiteConfig(newConfig);
      toast.success('Configuración guardada');
    } catch (error) {
      toast.error('Error guardando configuración');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (useStaticPage) {
    return <StaticLandingPage siteConfig={siteConfig} />;
  }

  const editModeValue = {
    isEditMode,
    editingBlockId,
    setEditingBlockId,
    updateBlockConfig,
    saveBlock
  };

  return (
    <EditModeContext.Provider value={editModeValue}>
      {/* Dynamic Head - Updates title, meta tags, favicon, etc */}
      <DynamicHead siteConfig={siteConfig} />
      
      <div className="min-h-screen relative">
        {/* Admin Edit Mode Toggle */}
        {isAdmin && (
          <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-2">
            {isEditMode && hasChanges && (
              <Button 
                onClick={saveAllBlocks}
                disabled={saving}
                className="shadow-lg rounded-full gap-2"
                size="lg"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                Guardar Todo
              </Button>
            )}
            <Button 
              onClick={() => {
                if (isEditMode && hasChanges) {
                  if (window.confirm('¿Guardar cambios antes de salir del modo edición?')) {
                    saveAllBlocks().then(() => setIsEditMode(false));
                  } else {
                    setIsEditMode(false);
                    fetchLandingData(); // Reload to discard changes
                  }
                } else {
                  setIsEditMode(!isEditMode);
                }
              }}
              variant={isEditMode ? "destructive" : "default"}
              className="shadow-lg rounded-full gap-2"
              size="lg"
            >
              {isEditMode ? (
                <>
                  <X className="h-5 w-5" />
                  Salir de Edición
                </>
              ) : (
                <>
                  <Edit3 className="h-5 w-5" />
                  Editar Página
                </>
              )}
            </Button>
          </div>
        )}

        {/* Edit Mode Banner */}
        {isEditMode && (
          <div className="sticky top-16 z-40 bg-primary text-primary-foreground py-2 px-4 text-center text-sm font-medium shadow-md">
            <Edit3 className="h-4 w-4 inline mr-2" />
            Modo Edición Activo - Haz clic en cualquier texto para editarlo
            {hasChanges && <span className="ml-2 text-yellow-200">• Cambios sin guardar</span>}
          </div>
        )}

        {/* Floating Add Block Button */}
        {isEditMode && (
          <FloatingAddBlockButton onClick={() => setAddBlockDialogOpen(true)} />
        )}

        {/* Add Block Dialog */}
        <AddBlockDialog 
          open={addBlockDialogOpen} 
          onOpenChange={setAddBlockDialogOpen}
          onBlockAdded={handleBlockAdded}
        />

        {/* Empty State for Edit Mode */}
        {isEditMode && blocks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 px-4">
            <div className="p-4 rounded-full bg-primary/10 mb-4">
              <Plus className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-2xl font-serif font-bold mb-2">Página vacía</h2>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Comienza a crear tu página agregando bloques. Haz clic en el botón verde para empezar.
            </p>
            <Button onClick={() => setAddBlockDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Agregar Primer Bloque
            </Button>
          </div>
        )}

        {blocks.map((block) => (
          <BlockRenderer 
            key={block.bloque_id} 
            block={block} 
            siteConfig={siteConfig}
            onUpdateConfig={(newConfig) => updateBlockConfig(block.bloque_id, newConfig)}
            onSave={() => saveBlock(block.bloque_id)}
            onDelete={() => handleDeleteBlock(block.bloque_id)}
          />
        ))}
        
        <Footer 
          siteConfig={siteConfig} 
          onUpdateSiteConfig={isEditMode ? saveSiteConfig : null}
        />
      </div>
    </EditModeContext.Provider>
  );
}

// Block Wrapper Component - needs to be outside render
function BlockWrapper({ children, isEditMode, onSave, onDelete }) {
  if (!isEditMode) return children;
  
  return (
    <div className="relative group">
      {children}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-20">
        <Button size="sm" variant="secondary" className="shadow-lg" onClick={onSave}>
          <Save className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="destructive" className="shadow-lg" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Block Renderer Component
function BlockRenderer({ block, siteConfig, onUpdateConfig, onSave, onDelete }) {
  const navigate = useNavigate();
  const { isEditMode } = useEditMode();
  const { i18n } = useTranslation();
  const config = block.config || {};
  
  // Get current language for localized content
  const lang = i18n.language?.split('-')[0] || 'es';
  
  // Helper to get localized text
  const L = (value) => getLocalizedText(value, lang);

  const updateConfig = (key, value) => {
    onUpdateConfig({ [key]: value });
  };

  const updateItemConfig = (index, field, value) => {
    const items = [...(config.items || [])];
    items[index] = { ...items[index], [field]: value };
    onUpdateConfig({ items });
  };

  const addItem = (defaultItem) => {
    const items = [...(config.items || []), defaultItem];
    onUpdateConfig({ items });
  };

  const removeItem = (index) => {
    const items = (config.items || []).filter((_, i) => i !== index);
    onUpdateConfig({ items });
  };

  switch (block.tipo) {
    case 'hero':
      return (
        <BlockWrapper isEditMode={isEditMode} onSave={onSave} onDelete={onDelete}>
          <section 
            className="relative overflow-hidden"
            style={{ minHeight: config.altura || '500px' }}
          >
            {isEditMode ? (
              <EditableImage
                src={config.imagen_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                onChangeSrc={(url) => updateConfig('imagen_url', url)}
              />
            ) : (
              config.imagen_url && (
                <img 
                  src={config.imagen_url} 
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )
            )}
            <div 
              className="absolute inset-0" 
              style={{ background: config.overlay_color || 'rgba(0,0,0,0.5)' }} 
            />
            <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 lg:px-12 h-full flex items-center" style={{ minHeight: config.altura || '500px' }}>
              <div className="py-16 md:py-24">
                {siteConfig?.nombre_sitio && (
                  <p className="uppercase tracking-[0.2em] text-xs font-bold text-primary mb-4">
                    {siteConfig.nombre_sitio}
                  </p>
                )}
                <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4 max-w-2xl">
                  {isEditMode ? (
                    <EditableText 
                      value={L(config.titulo)}
                      onChange={(v) => updateConfig('titulo', v)}
                      placeholder="Título principal"
                    />
                  ) : (
                    L(config.titulo) || 'Título principal'
                  )}
                </h1>
                {(config.subtitulo || isEditMode) && (
                  <p className="text-white/80 text-base md:text-lg mb-8 max-w-xl leading-relaxed">
                    {isEditMode ? (
                      <EditableText 
                        value={L(config.subtitulo)}
                        onChange={(v) => updateConfig('subtitulo', v)}
                        placeholder="Subtítulo o descripción"
                        multiline
                      />
                    ) : (
                      L(config.subtitulo)
                    )}
                  </p>
                )}
                <div className="flex flex-wrap gap-4">
                  {(config.boton_texto || isEditMode) && (
                    <Button 
                      size="lg"
                      onClick={() => !isEditMode && navigate(config.boton_url || '/registro')}
                      className="rounded-full px-8 py-6 text-lg font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                    >
                      {isEditMode ? (
                        <EditableText 
                          value={L(config.boton_texto)}
                          onChange={(v) => updateConfig('boton_texto', v)}
                          placeholder="Texto del botón"
                        />
                      ) : (
                        L(config.boton_texto) || 'Comenzar'
                      )}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  )}
                  {(config.boton_secundario_texto || isEditMode) && (
                    <Button 
                      variant="secondary"
                      size="lg"
                      onClick={() => !isEditMode && navigate(config.boton_secundario_url || '/')}
                      className="rounded-full px-8 py-6 text-lg bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-sm"
                    >
                      {isEditMode ? (
                        <EditableText 
                          value={L(config.boton_secundario_texto)}
                          onChange={(v) => updateConfig('boton_secundario_texto', v)}
                          placeholder="Botón secundario"
                        />
                      ) : (
                        L(config.boton_secundario_texto) || 'Ver más'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </section>
        </BlockWrapper>
      );

    case 'features':
      return (
        <BlockWrapper isEditMode={isEditMode} onSave={onSave} onDelete={onDelete}>
          <section className="px-4 md:px-8 lg:px-12 py-12 md:py-20 max-w-7xl mx-auto">
            {(config.titulo || config.subtitulo || isEditMode) && (
              <div className="text-center mb-12">
                {(config.titulo || isEditMode) && (
                  <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
                    {isEditMode ? (
                      <EditableText 
                        value={L(config.titulo)}
                        onChange={(v) => updateConfig('titulo', v)}
                        placeholder="Título de la sección"
                      />
                    ) : (
                      L(config.titulo)
                    )}
                  </h2>
                )}
                {(config.subtitulo || isEditMode) && (
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    {isEditMode ? (
                      <EditableText 
                        value={L(config.subtitulo)}
                        onChange={(v) => updateConfig('subtitulo', v)}
                        placeholder="Subtítulo opcional"
                      />
                    ) : (
                      L(config.subtitulo)
                    )}
                  </p>
                )}
              </div>
            )}
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${config.columnas || 3} gap-6 md:gap-8`}>
              {(config.items || config.features || []).map((item, index) => {
                const IconComponent = getIconComponent(item.icono);
                return (
                  <div key={index} className="group p-6 rounded-2xl bg-card border hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    {IconComponent && (
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <IconComponent className="h-6 w-6" />
                      </div>
                    )}
                    <h3 className="font-semibold text-lg mb-2">
                      {isEditMode ? (
                        <EditableText 
                          value={L(item.titulo)}
                          onChange={(v) => updateItemConfig(index, 'titulo', v)}
                          placeholder="Título"
                        />
                      ) : (
                        L(item.titulo)
                      )}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {isEditMode ? (
                        <EditableText 
                          value={L(item.descripcion)}
                          onChange={(v) => updateItemConfig(index, 'descripcion', v)}
                          placeholder="Descripción"
                          multiline
                        />
                      ) : (
                        L(item.descripcion)
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </BlockWrapper>
      );

    case 'text':
      return (
        <BlockWrapper isEditMode={isEditMode} onSave={onSave} onDelete={onDelete}>
          <section 
            className="px-4 md:px-8 lg:px-12 py-12 md:py-16 max-w-7xl mx-auto"
            style={{ textAlign: config.alineacion || 'center' }}
          >
            <div style={{ maxWidth: config.ancho_max || '800px', margin: '0 auto' }}>
              {(config.titulo || isEditMode) && (
                <h2 className="font-serif text-2xl md:text-3xl font-bold mb-6">
                  {isEditMode ? (
                    <EditableText 
                      value={L(config.titulo)}
                      onChange={(v) => updateConfig('titulo', v)}
                      placeholder="Título"
                    />
                  ) : (
                    L(config.titulo)
                  )}
                </h2>
              )}
              {(config.contenido || isEditMode) && (
                <div className="prose prose-lg max-w-none text-muted-foreground">
                  {isEditMode ? (
                    <EditableText 
                      value={L(config.contenido)}
                      onChange={(v) => updateConfig('contenido', v)}
                      placeholder="Contenido del texto"
                      multiline
                    />
                  ) : (
                    L(config.contenido)
                  )}
                </div>
              )}
            </div>
          </section>
        </BlockWrapper>
      );

    case 'image':
      return (
        <BlockWrapper isEditMode={isEditMode} onSave={onSave} onDelete={onDelete}>
          <section className="px-4 md:px-8 lg:px-12 py-12 max-w-7xl mx-auto">
            <figure style={{ width: config.ancho || '100%', margin: '0 auto' }}>
              <EditableImage 
                src={config.imagen_url} 
                alt={L(config.alt) || ''} 
                className={`w-full h-auto ${config.redondeado !== false ? 'rounded-2xl' : ''}`}
                onChangeSrc={(url) => updateConfig('imagen_url', url)}
              />
              {(config.caption || isEditMode) && (
                <figcaption className="text-center text-sm text-muted-foreground mt-4">
                  {isEditMode ? (
                    <EditableText 
                      value={L(config.caption)}
                      onChange={(v) => updateConfig('caption', v)}
                      placeholder="Pie de imagen"
                    />
                  ) : (
                    L(config.caption)
                  )}
                </figcaption>
              )}
            </figure>
          </section>
        </BlockWrapper>
      );

    case 'cta':
      return (
        <BlockWrapper isEditMode={isEditMode} onSave={onSave} onDelete={onDelete}>
          <section className="px-4 md:px-8 lg:px-12 py-12 md:py-20 max-w-7xl mx-auto">
            <div 
              className="relative rounded-3xl overflow-hidden p-8 md:p-12 lg:p-16"
              style={{ 
                backgroundColor: config.fondo_color || '#16a34a',
                color: config.texto_color || '#ffffff'
              }}
            >
              <div className="relative z-10 max-w-2xl">
                <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
                  {isEditMode ? (
                    <EditableText 
                      value={L(config.titulo)}
                      onChange={(v) => updateConfig('titulo', v)}
                      placeholder="Título CTA"
                    />
                  ) : (
                    L(config.titulo)
                  )}
                </h2>
                {(config.subtitulo || isEditMode) && (
                  <p className="mb-8 leading-relaxed opacity-90">
                    {isEditMode ? (
                      <EditableText 
                        value={L(config.subtitulo)}
                        onChange={(v) => updateConfig('subtitulo', v)}
                        placeholder="Subtítulo"
                      />
                    ) : (
                      L(config.subtitulo)
                    )}
                  </p>
                )}
                {(config.boton_texto || isEditMode) && (
                  <Button 
                    size="lg"
                    onClick={() => !isEditMode && navigate(config.boton_url || '/registro')}
                    className="rounded-full px-8 py-6 text-lg font-medium bg-white text-gray-900 hover:bg-white/90"
                  >
                    {isEditMode ? (
                      <EditableText 
                        value={L(config.boton_texto)}
                        onChange={(v) => updateConfig('boton_texto', v)}
                        placeholder="Texto del botón"
                      />
                    ) : (
                      L(config.boton_texto) || 'Comenzar'
                    )}
                    />
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
          </section>
        </BlockWrapper>
      );

    case 'stats':
      return (
        <BlockWrapper isEditMode={isEditMode} onSave={onSave} onDelete={onDelete}>
          <section className="px-4 md:px-8 lg:px-12 py-12 md:py-16 max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {(config.items || []).map((item, index) => (
                <div key={index} className="text-center relative group">
                  {isEditMode && (
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                  <p className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-2">
                    <EditableText 
                      value={item.numero}
                      onChange={(v) => updateItemConfig(index, 'numero', v)}
                      placeholder="100+"
                    />
                  </p>
                  <p className="text-muted-foreground">
                    <EditableText 
                      value={item.label}
                      onChange={(v) => updateItemConfig(index, 'label', v)}
                      placeholder="Etiqueta"
                    />
                  </p>
                </div>
              ))}
              {isEditMode && (
                <button
                  onClick={() => addItem({ numero: '100+', label: 'Nueva estadística' })}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-colors"
                >
                  <Plus className="h-6 w-6 mb-1" />
                  Agregar
                </button>
              )}
            </div>
          </section>
        </BlockWrapper>
      );

    case 'cards':
      return (
        <BlockWrapper isEditMode={isEditMode} onSave={onSave} onDelete={onDelete}>
          <section className="px-4 md:px-8 lg:px-12 py-12 md:py-20 max-w-7xl mx-auto">
            {(config.titulo || isEditMode) && (
              <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold mb-12 text-center">
                <EditableText 
                  value={config.titulo}
                  onChange={(v) => updateConfig('titulo', v)}
                  placeholder="Título de la sección"
                />
              </h2>
            )}
            <div className={`grid grid-cols-1 md:grid-cols-${config.columnas || 3} gap-6 md:gap-8`}>
              {(config.items || []).map((item, index) => (
                <div 
                  key={index}
                  className="bg-card rounded-2xl overflow-hidden border border-border/50 hover:shadow-lg transition-all duration-300 group relative"
                >
                  {isEditMode && (
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 z-10 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                  {(item.imagen_url || isEditMode) && (
                    <div className="aspect-video overflow-hidden">
                      <EditableImage
                        src={item.imagen_url || 'https://via.placeholder.com/400x225'}
                        alt={item.titulo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onChangeSrc={(url) => updateItemConfig(index, 'imagen_url', url)}
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="font-serif text-xl font-bold mb-2">
                      <EditableText 
                        value={item.titulo}
                        onChange={(v) => updateItemConfig(index, 'titulo', v)}
                        placeholder="Título"
                      />
                    </h3>
                    <p className="text-muted-foreground">
                      <EditableText 
                        value={item.descripcion}
                        onChange={(v) => updateItemConfig(index, 'descripcion', v)}
                        placeholder="Descripción"
                      />
                    </p>
                  </div>
                </div>
              ))}
              {isEditMode && (
                <button
                  onClick={() => addItem({ titulo: 'Nueva tarjeta', descripcion: 'Descripción', imagen_url: '' })}
                  className="border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-colors min-h-[200px]"
                >
                  <Plus className="h-8 w-8 mb-2" />
                  Agregar tarjeta
                </button>
              )}
            </div>
          </section>
        </BlockWrapper>
      );

    case 'banner':
      return (
        <BlockWrapper isEditMode={isEditMode} onSave={onSave} onDelete={onDelete}>
          <section className="px-4 md:px-8 lg:px-12 py-12 max-w-7xl mx-auto">
            <div 
              className="rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8"
              style={{ backgroundColor: config.fondo_color || '#f0fdf4' }}
            >
              <div className="flex-1">
                <h2 className="font-serif text-2xl md:text-3xl font-bold mb-2">
                  <EditableText 
                    value={config.titulo}
                    onChange={(v) => updateConfig('titulo', v)}
                    placeholder="Título del banner"
                  />
                </h2>
                {(config.subtitulo || isEditMode) && (
                  <p className="text-muted-foreground mb-6">
                    <EditableText 
                      value={config.subtitulo}
                      onChange={(v) => updateConfig('subtitulo', v)}
                      placeholder="Subtítulo"
                    />
                  </p>
                )}
                {(config.boton_texto || isEditMode) && (
                  <Button onClick={() => !isEditMode && navigate(config.boton_url || '/')} className="rounded-full">
                    <EditableText 
                      value={config.boton_texto}
                      onChange={(v) => updateConfig('boton_texto', v)}
                      placeholder="Texto del botón"
                    />
                  </Button>
                )}
              </div>
              {(config.imagen_url || isEditMode) && (
                <div className="flex-shrink-0">
                  <EditableImage
                    src={config.imagen_url || 'https://via.placeholder.com/200'}
                    alt=""
                    className="w-48 h-48 object-cover rounded-2xl"
                    onChangeSrc={(url) => updateConfig('imagen_url', url)}
                  />
                </div>
              )}
            </div>
          </section>
        </BlockWrapper>
      );

    case 'testimonials':
      return (
        <BlockWrapper isEditMode={isEditMode} onSave={onSave} onDelete={onDelete}>
          <section className="px-4 md:px-8 lg:px-12 py-12 md:py-20 max-w-7xl mx-auto">
            {(config.titulo || isEditMode) && (
              <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold mb-12 text-center">
                <EditableText 
                  value={config.titulo}
                  onChange={(v) => updateConfig('titulo', v)}
                  placeholder="Título de testimonios"
                />
              </h2>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {(config.items || []).map((item, index) => (
                <div 
                  key={index}
                  className="bg-card rounded-2xl p-6 border border-border/50 relative group"
                >
                  {isEditMode && (
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                  <Quote className="h-8 w-8 text-primary/30 mb-4" />
                  <p className="text-muted-foreground mb-6 italic">
                    &ldquo;
                    <EditableText 
                      value={item.texto}
                      onChange={(v) => updateItemConfig(index, 'texto', v)}
                      placeholder="Texto del testimonio"
                      multiline
                    />
                    &rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-bold text-lg">
                        {item.nombre?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold">
                        <EditableText 
                          value={item.nombre}
                          onChange={(v) => updateItemConfig(index, 'nombre', v)}
                          placeholder="Nombre"
                        />
                      </p>
                      {(item.cargo || isEditMode) && (
                        <p className="text-sm text-muted-foreground">
                          <EditableText 
                            value={item.cargo}
                            onChange={(v) => updateItemConfig(index, 'cargo', v)}
                            placeholder="Cargo"
                          />
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isEditMode && (
                <button
                  onClick={() => addItem({ nombre: 'Nuevo cliente', texto: 'Testimonio...', cargo: '' })}
                  className="border-2 border-dashed border-gray-300 rounded-2xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-colors min-h-[200px]"
                >
                  <Plus className="h-8 w-8 mb-2" />
                  Agregar testimonio
                </button>
              )}
            </div>
          </section>
        </BlockWrapper>
      );

    case 'spacer':
      return (
        <BlockWrapper isEditMode={isEditMode} onSave={onSave} onDelete={onDelete}>
          <div 
            style={{ height: config.altura || '60px' }} 
            className={isEditMode ? 'bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300' : ''}
          >
            {isEditMode && (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Espaciador ({config.altura || '60px'})
              </div>
            )}
          </div>
        </BlockWrapper>
      );

    case 'divider':
      return (
        <BlockWrapper isEditMode={isEditMode} onSave={onSave} onDelete={onDelete}>
          <div 
            className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12"
            style={{ padding: `${config.margen || '40px'} 0` }}
          >
            <hr 
              style={{ 
                borderStyle: config.estilo || 'solid',
                borderColor: config.color || '#e5e7eb',
                borderWidth: '1px 0 0 0',
                width: config.ancho || '100%',
                margin: '0 auto'
              }} 
            />
          </div>
        </BlockWrapper>
      );

    default:
      return null;
  }
}

// Footer Component
function Footer({ siteConfig, onUpdateSiteConfig }) {
  const { isEditMode } = useEditMode();
  const [localConfig, setLocalConfig] = useState(siteConfig);

  useEffect(() => {
    setLocalConfig(siteConfig);
  }, [siteConfig]);

  const updateLocalConfig = (key, value) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
    if (onUpdateSiteConfig) {
      onUpdateSiteConfig(newConfig);
    }
  };

  return (
    <footer className="px-4 md:px-8 lg:px-12 py-8 border-t border-border">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Book className="h-5 w-5 text-primary" />
          <span className="font-serif font-bold">
            {isEditMode ? (
              <EditableText 
                value={localConfig?.nombre_sitio || 'Mi Tienda'}
                onChange={(v) => updateLocalConfig('nombre_sitio', v)}
                placeholder="Nombre del sitio"
              />
            ) : (
              localConfig?.nombre_sitio || 'Mi Tienda'
            )}
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          {(localConfig?.email_contacto || isEditMode) && (
            <span className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              {isEditMode ? (
                <EditableText 
                  value={localConfig?.email_contacto || ''}
                  onChange={(v) => updateLocalConfig('email_contacto', v)}
                  placeholder="email@ejemplo.com"
                />
              ) : (
                localConfig?.email_contacto
              )}
            </span>
          )}
          {(localConfig?.telefono_contacto || isEditMode) && (
            <span className="flex items-center gap-1">
              <Phone className="h-4 w-4" />
              {isEditMode ? (
                <EditableText 
                  value={localConfig?.telefono_contacto || ''}
                  onChange={(v) => updateLocalConfig('telefono_contacto', v)}
                  placeholder="+507 6000-0000"
                />
              ) : (
                localConfig?.telefono_contacto
              )}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {isEditMode ? (
            <EditableText 
              value={localConfig?.footer_texto || '© 2025 Todos los derechos reservados'}
              onChange={(v) => updateLocalConfig('footer_texto', v)}
              placeholder="Texto del footer"
            />
          ) : (
            localConfig?.footer_texto || '© 2025 Todos los derechos reservados'
          )}
        </p>
      </div>
    </footer>
  );
}

// Static Landing Page (Fallback)
function StaticLandingPage({ siteConfig }) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const features = [
    {
      icon: Book,
      title: t('landing.features.easy'),
      description: t('landing.features.easyDesc')
    },
    {
      icon: Truck,
      title: t('landing.features.fast'),
      description: t('landing.features.fastDesc')
    },
    {
      icon: HeadphonesIcon,
      title: t('landing.features.support'),
      description: t('landing.features.supportDesc')
    }
  ];

  const grades = ['1', '2', '3', '4', '5', '6'];
  const siteName = siteConfig?.nombre_sitio || t('app.name') || 'Tienda';

  return (
    <>
      {/* Dynamic Head - Updates title, meta tags, favicon, etc */}
      <DynamicHead siteConfig={siteConfig} />
      
      <div className="min-h-screen noise-bg">
        {/* Hero Section - Bento Grid */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 p-4 md:p-8 lg:p-12 max-w-7xl mx-auto">
          {/* Main Hero Card */}
          <div 
            className="col-span-full md:col-span-8 row-span-2 min-h-[400px] md:min-h-[500px] rounded-3xl overflow-hidden relative group"
            data-testid="hero-main-card"
          >
            <img 
              src="https://images.unsplash.com/photo-1571260899304-425eee4c7efc?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200" 
              alt="Students with textbooks"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 lg:p-12">
              <p className="uppercase tracking-[0.2em] text-xs font-bold text-accent mb-4">
                {siteName}
              </p>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4 max-w-2xl">
              {t('landing.hero.title')}
            </h1>
            <p className="text-white/80 text-base md:text-lg mb-8 max-w-xl leading-relaxed">
              {t('landing.hero.subtitle')}
            </p>
            <div className="flex flex-wrap gap-4">
              <Button 
                size="lg"
                onClick={() => navigate(isAuthenticated ? '/dashboard' : '/registro')}
                className="rounded-full px-8 py-6 text-lg font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                data-testid="hero-cta-button"
              >
                {t('landing.hero.cta')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="secondary"
                size="lg"
                onClick={() => navigate('/catalogo')}
                className="rounded-full px-8 py-6 text-lg bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-sm"
                data-testid="hero-catalog-button"
              >
                {t('nav.catalog')}
              </Button>
            </div>
          </div>
        </div>

        {/* Side Card - Quick Stats */}
        <div 
          className="col-span-full md:col-span-4 rounded-3xl bg-card border border-border p-6 md:p-8 flex flex-col justify-between soft-shadow"
          data-testid="stats-card"
        >
          <div>
            <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-serif text-xl md:text-2xl font-bold mb-2">
              12 {t('landing.allGrades')}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t('landing.fromPreschool')}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-6">
            {grades.map(grade => (
              <span 
                key={grade}
                className="px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground"
              >
                {t(`grades.${grade}`)}
              </span>
            ))}
          </div>
        </div>

        {/* Side Card - Benefits */}
        <div 
          className="col-span-full md:col-span-4 rounded-3xl bg-primary text-primary-foreground p-6 md:p-8 soft-shadow"
          data-testid="benefits-card"
        >
          <h3 className="font-serif text-lg md:text-xl font-bold mb-4">
            {t('landing.whyUs')}
          </h3>
          <ul className="space-y-3">
            {[
              t('landing.benefits.prices'),
              t('landing.benefits.original'),
              t('landing.benefits.shipping'),
              t('landing.benefits.support')
            ].map((benefit, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 md:px-8 lg:px-12 py-12 md:py-20 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
            {t('landing.buyEasy')}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('landing.buyEasyDesc')}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group relative bg-card rounded-2xl p-8 border border-border/50 hover:border-primary/50 transition-all duration-300 soft-shadow"
              data-testid={`feature-card-${index}`}
            >
              <div className="p-3 rounded-xl bg-primary/10 w-fit mb-6 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-bold mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 md:px-8 lg:px-12 py-12 md:py-20 max-w-7xl mx-auto">
        <div 
          className="relative rounded-3xl overflow-hidden bg-secondary p-8 md:p-12 lg:p-16"
          data-testid="cta-section"
        >
          <div className="relative z-10 max-w-2xl">
            <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
              {t('landing.readyToOrder')}
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              {t('landing.readyToOrderDesc')}
            </p>
            <div className="flex flex-wrap gap-4">
              <Button 
                size="lg"
                onClick={() => navigate('/registro')}
                className="rounded-full px-8 py-6 text-lg font-medium"
                data-testid="cta-register-button"
              >
                {t('nav.register')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline"
                size="lg"
                onClick={() => navigate('/catalogo')}
                className="rounded-full px-8 py-6 text-lg"
              >
                {t('landing.viewCatalog')}
              </Button>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-1/3 h-full hidden lg:block">
            <img 
              src="https://images.unsplash.com/photo-1531280518436-9f2cc0fff88a?crop=entropy&cs=srgb&fm=jpg&q=85&w=600"
              alt="Decorative"
              className="w-full h-full object-cover opacity-50 rounded-l-3xl"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer siteConfig={siteConfig} />
    </div>
    </>
  );
}
