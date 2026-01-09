/**
 * Ping Pong Sponsors Admin - Panel de administración de patrocinadores
 * Permite a los administradores configurar logos, diseños y espacios publicitarios
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Edit2, Eye, Upload, Save, 
  GripVertical, Monitor, Layout, Palette, Settings2,
  Image, Link, Type, Clock, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp, Move, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const POSITION_OPTIONS = [
  { value: 'header_left', label: '📍 Header Izquierdo', desc: 'Espacio cuadrado izquierdo' },
  { value: 'header_right', label: '📍 Header Derecho', desc: 'Espacio cuadrado derecho' },
  { value: 'banner_bottom', label: '📺 Banner Inferior', desc: 'Banner horizontal principal' },
  { value: 'banner_top', label: '📺 Banner Superior', desc: 'Banner horizontal superior' },
];

const ANIMATION_OPTIONS = [
  { value: 'none', label: 'Sin animación' },
  { value: 'fade', label: 'Desvanecer' },
  { value: 'slide', label: 'Deslizar' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'pulse', label: 'Pulsar' },
];

const SIZE_OPTIONS = [
  { value: 'small', label: 'Pequeño' },
  { value: 'medium', label: 'Mediano' },
  { value: 'large', label: 'Grande' },
  { value: 'full', label: 'Completo' },
];

export default function SponsorsAdmin() {
  const navigate = useNavigate();
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSponsor, setSelectedSponsor] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('lista');
  const [layoutConfig, setLayoutConfig] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'primary',
    posicion: 'banner_bottom',
    logo_url: '',
    logo_base64: '',
    website_url: '',
    descripcion: '',
    color_fondo: '#1a1a2e',
    color_texto: '#ffffff',
    color_acento: '',
    gradiente: '',
    borde: '',
    sombra: false,
    animacion: 'none',
    duracion_animacion: 1000,
    duracion_display: 10,
    orden: 0,
    activo: true,
    texto_promocional: '',
    mostrar_nombre: true,
    tamano_logo: 'medium'
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchSponsors();
    fetchLayoutConfig();
  }, []);

  const fetchSponsors = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/sponsors/`);
      const data = await response.json();
      setSponsors(data);
    } catch (error) {
      console.error('Error fetching sponsors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLayoutConfig = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/sponsors/config/layout`);
      const data = await response.json();
      setLayoutConfig(data);
    } catch (error) {
      console.error('Error fetching layout:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = selectedSponsor 
        ? `${API_URL}/api/pinpanclub/sponsors/${selectedSponsor.sponsor_id}`
        : `${API_URL}/api/pinpanclub/sponsors/`;
      
      const method = selectedSponsor ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        fetchSponsors();
        resetForm();
      }
    } catch (error) {
      console.error('Error saving sponsor:', error);
    }
  };

  const handleDelete = async (sponsorId) => {
    if (!confirm('¿Eliminar este patrocinador?')) return;
    
    try {
      await fetch(`${API_URL}/api/pinpanclub/sponsors/${sponsorId}`, {
        method: 'DELETE'
      });
      fetchSponsors();
    } catch (error) {
      console.error('Error deleting sponsor:', error);
    }
  };

  const handleToggleActive = async (sponsor) => {
    try {
      await fetch(`${API_URL}/api/pinpanclub/sponsors/${sponsor.sponsor_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !sponsor.activo })
      });
      fetchSponsors();
    } catch (error) {
      console.error('Error toggling sponsor:', error);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({
        ...prev,
        logo_base64: event.target.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      tipo: 'primary',
      posicion: 'banner_bottom',
      logo_url: '',
      logo_base64: '',
      website_url: '',
      descripcion: '',
      color_fondo: '#1a1a2e',
      color_texto: '#ffffff',
      color_acento: '',
      gradiente: '',
      borde: '',
      sombra: false,
      animacion: 'none',
      duracion_animacion: 1000,
      duracion_display: 10,
      orden: 0,
      activo: true,
      texto_promocional: '',
      mostrar_nombre: true,
      tamano_logo: 'medium'
    });
    setSelectedSponsor(null);
    setShowForm(false);
  };

  const editSponsor = (sponsor) => {
    setSelectedSponsor(sponsor);
    setFormData({
      nombre: sponsor.nombre || '',
      tipo: sponsor.tipo || 'primary',
      posicion: sponsor.posicion || 'banner_bottom',
      logo_url: sponsor.logo_url || '',
      logo_base64: sponsor.logo_base64 || '',
      website_url: sponsor.website_url || '',
      descripcion: sponsor.descripcion || '',
      color_fondo: sponsor.color_fondo || '#1a1a2e',
      color_texto: sponsor.color_texto || '#ffffff',
      color_acento: sponsor.color_acento || '',
      gradiente: sponsor.gradiente || '',
      borde: sponsor.borde || '',
      sombra: sponsor.sombra || false,
      animacion: sponsor.animacion || 'none',
      duracion_animacion: sponsor.duracion_animacion || 1000,
      duracion_display: sponsor.duracion_display || 10,
      orden: sponsor.orden || 0,
      activo: sponsor.activo !== false,
      texto_promocional: sponsor.texto_promocional || '',
      mostrar_nombre: sponsor.mostrar_nombre !== false,
      tamano_logo: sponsor.tamano_logo || 'medium'
    });
    setShowForm(true);
  };

  const groupedSponsors = sponsors.reduce((acc, sponsor) => {
    const pos = sponsor.posicion || 'banner_bottom';
    if (!acc[pos]) acc[pos] = [];
    acc[pos].push(sponsor);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/pinpanclub')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-xl font-bold">🎯 Gestión de Patrocinadores</h1>
              <p className="text-sm text-gray-500">Configura los espacios publicitarios de las pantallas TV</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => window.open('/tv/pinpanclub', '_blank')}
            >
              <Eye className="w-4 h-4 mr-2" />
              Vista Previa TV
            </Button>
            <Button onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Patrocinador
            </Button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 mt-4">
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('lista')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'lista' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Layout className="w-4 h-4 inline mr-2" />
            Lista de Patrocinadores
          </button>
          <button
            onClick={() => setActiveTab('espacios')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'espacios' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Monitor className="w-4 h-4 inline mr-2" />
            Configurar Espacios
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'lista' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sponsors List */}
            <div className="lg:col-span-2 space-y-6">
              {POSITION_OPTIONS.map(pos => (
                <div key={pos.value} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">{pos.label}</h3>
                      <p className="text-sm text-gray-500">{pos.desc}</p>
                    </div>
                    <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {groupedSponsors[pos.value]?.length || 0} patrocinadores
                    </span>
                  </div>
                  
                  {groupedSponsors[pos.value]?.length > 0 ? (
                    <div className="space-y-2">
                      {groupedSponsors[pos.value].map(sponsor => (
                        <SponsorCard
                          key={sponsor.sponsor_id}
                          sponsor={sponsor}
                          onEdit={() => editSponsor(sponsor)}
                          onDelete={() => handleDelete(sponsor.sponsor_id)}
                          onToggle={() => handleToggleActive(sponsor)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-lg">
                      <Plus className="w-8 h-8 mx-auto mb-2" />
                      <p>No hay patrocinadores en este espacio</p>
                      <button 
                        onClick={() => { 
                          resetForm(); 
                          setFormData(prev => ({...prev, posicion: pos.value}));
                          setShowForm(true); 
                        }}
                        className="text-blue-500 mt-2 hover:underline"
                      >
                        Agregar uno
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Preview Panel */}
            <div className="bg-white rounded-xl shadow-sm p-4 sticky top-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Vista Previa
              </h3>
              
              {/* Mini TV Preview */}
              <div className="bg-gray-900 rounded-lg overflow-hidden aspect-video relative">
                {/* Header Preview */}
                <div className="absolute top-0 left-0 right-0 h-8 bg-black/50 flex items-center justify-between px-2">
                  <div className="w-16 h-5 bg-white/10 rounded flex items-center justify-center text-[6px] text-white">
                    {groupedSponsors.header_left?.[0]?.nombre || 'Sponsor'}
                  </div>
                  <span className="text-white text-[8px]">🏓 Club TM</span>
                  <div className="w-16 h-5 bg-white/10 rounded flex items-center justify-center text-[6px] text-white">
                    {groupedSponsors.header_right?.[0]?.nombre || 'Sponsor'}
                  </div>
                </div>
                
                {/* Content Preview */}
                <div className="absolute top-8 bottom-6 left-0 right-0 flex items-center justify-center">
                  <span className="text-white/40 text-xs">Contenido</span>
                </div>
                
                {/* Banner Preview */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-6 flex items-center justify-center text-[8px]"
                  style={{
                    backgroundColor: groupedSponsors.banner_bottom?.[0]?.color_fondo || '#1a1a2e',
                    color: groupedSponsors.banner_bottom?.[0]?.color_texto || '#fff'
                  }}
                >
                  {groupedSponsors.banner_bottom?.[0]?.nombre || 'Banner de Patrocinadores'}
                </div>
              </div>
              
              <p className="text-xs text-gray-500 mt-2 text-center">
                Los patrocinadores rotan automáticamente cada {layoutConfig?.espacios?.find(e => e.space_id === 'banner_bottom')?.intervalo_rotacion || 10} segundos
              </p>
            </div>
          </div>
        )}

        {activeTab === 'espacios' && (
          <SpacesConfig layout={layoutConfig} onUpdate={fetchLayoutConfig} />
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold">
                {selectedSponsor ? 'Editar Patrocinador' : 'Nuevo Patrocinador'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  Información Básica
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nombre *</label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={e => setFormData({...formData, nombre: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Posición *</label>
                    <select
                      value={formData.posicion}
                      onChange={e => setFormData({...formData, posicion: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      {POSITION_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">URL del sitio web</label>
                    <input
                      type="url"
                      value={formData.website_url}
                      onChange={e => setFormData({...formData, website_url: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Texto Promocional</label>
                    <input
                      type="text"
                      value={formData.texto_promocional}
                      onChange={e => setFormData({...formData, texto_promocional: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="¡Oferta especial!"
                    />
                  </div>
                </div>
              </div>

              {/* Logo */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Logo
                </h3>
                
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">URL del Logo</label>
                    <input
                      type="url"
                      value={formData.logo_url}
                      onChange={e => setFormData({...formData, logo_url: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="flex items-end">
                    <span className="text-gray-400 mb-2">o</span>
                  </div>
                  <div className="flex items-end">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Subir
                    </Button>
                  </div>
                </div>

                {(formData.logo_base64 || formData.logo_url) && (
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                      <img 
                        src={formData.logo_base64 || formData.logo_url}
                        alt="Preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Tamaño del logo</label>
                      <select
                        value={formData.tamano_logo}
                        onChange={e => setFormData({...formData, tamano_logo: e.target.value})}
                        className="border rounded-lg px-3 py-2"
                      >
                        {SIZE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Design */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Diseño y Colores
                </h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Color de Fondo</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.color_fondo}
                        onChange={e => setFormData({...formData, color_fondo: e.target.value})}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.color_fondo}
                        onChange={e => setFormData({...formData, color_fondo: e.target.value})}
                        className="flex-1 border rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Color de Texto</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.color_texto}
                        onChange={e => setFormData({...formData, color_texto: e.target.value})}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.color_texto}
                        onChange={e => setFormData({...formData, color_texto: e.target.value})}
                        className="flex-1 border rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Color Acento</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.color_acento || '#ffffff'}
                        onChange={e => setFormData({...formData, color_acento: e.target.value})}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.color_acento}
                        onChange={e => setFormData({...formData, color_acento: e.target.value})}
                        className="flex-1 border rounded-lg px-3 py-2"
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.sombra}
                      onChange={e => setFormData({...formData, sombra: e.target.checked})}
                      className="rounded"
                    />
                    <span className="text-sm">Sombra</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.mostrar_nombre}
                      onChange={e => setFormData({...formData, mostrar_nombre: e.target.checked})}
                      className="rounded"
                    />
                    <span className="text-sm">Mostrar nombre</span>
                  </label>
                </div>
              </div>

              {/* Animation */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Animación y Tiempo
                </h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Animación</label>
                    <select
                      value={formData.animacion}
                      onChange={e => setFormData({...formData, animacion: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      {ANIMATION_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Duración (seg)</label>
                    <input
                      type="number"
                      value={formData.duracion_display}
                      onChange={e => setFormData({...formData, duracion_display: parseInt(e.target.value)})}
                      className="w-full border rounded-lg px-3 py-2"
                      min={3}
                      max={60}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Orden</label>
                    <input
                      type="number"
                      value={formData.orden}
                      onChange={e => setFormData({...formData, orden: parseInt(e.target.value)})}
                      className="w-full border rounded-lg px-3 py-2"
                      min={0}
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <h3 className="font-semibold">Vista Previa</h3>
                <div 
                  className="h-24 rounded-lg flex items-center justify-center gap-4 px-6"
                  style={{
                    backgroundColor: formData.color_fondo,
                    boxShadow: formData.sombra ? '0 4px 15px rgba(0,0,0,0.3)' : 'none'
                  }}
                >
                  {(formData.logo_base64 || formData.logo_url) && (
                    <img 
                      src={formData.logo_base64 || formData.logo_url}
                      alt="Logo"
                      className="h-16 object-contain"
                    />
                  )}
                  <div>
                    {formData.mostrar_nombre && (
                      <div className="text-2xl font-bold" style={{ color: formData.color_texto }}>
                        {formData.nombre || 'Nombre del Patrocinador'}
                      </div>
                    )}
                    {formData.texto_promocional && (
                      <div className="text-lg opacity-80" style={{ color: formData.color_texto }}>
                        {formData.texto_promocional}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  <Save className="w-4 h-4 mr-2" />
                  {selectedSponsor ? 'Guardar Cambios' : 'Crear Patrocinador'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Sponsor Card Component
function SponsorCard({ sponsor, onEdit, onDelete, onToggle }) {
  const logo = sponsor.logo_base64 || sponsor.logo_url;
  
  return (
    <div className={`flex items-center gap-4 p-3 rounded-lg border ${
      sponsor.activo ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'
    }`}>
      {/* Logo Preview */}
      <div 
        className="w-16 h-12 rounded flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: sponsor.color_fondo || '#1a1a2e' }}
      >
        {logo ? (
          <img src={logo} alt="" className="max-w-full max-h-full object-contain" />
        ) : (
          <span className="text-xs text-white/60">{sponsor.nombre?.[0]}</span>
        )}
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{sponsor.nombre}</div>
        <div className="text-xs text-gray-500">
          Orden: {sponsor.orden} • {sponsor.duracion_display}s
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={onToggle}
          className={`p-2 rounded-lg ${sponsor.activo ? 'text-green-500' : 'text-gray-400'}`}
          title={sponsor.activo ? 'Activo' : 'Inactivo'}
        >
          {sponsor.activo ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
        </button>
        <button onClick={onEdit} className="p-2 rounded-lg hover:bg-gray-100">
          <Edit2 className="w-4 h-4" />
        </button>
        <button onClick={onDelete} className="p-2 rounded-lg hover:bg-red-50 text-red-500">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Spaces Configuration Component
function SpacesConfig({ layout, onUpdate }) {
  const [spaces, setSpaces] = useState(layout?.espacios || []);

  const updateSpace = async (spaceId, updates) => {
    try {
      const space = spaces.find(s => s.space_id === spaceId);
      const updated = { ...space, ...updates };
      
      await fetch(`${API_URL}/api/pinpanclub/sponsors/config/space/${spaceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      
      setSpaces(prev => prev.map(s => s.space_id === spaceId ? updated : s));
      onUpdate();
    } catch (error) {
      console.error('Error updating space:', error);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {spaces.map(space => (
        <div key={space.space_id} className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{space.nombre}</h3>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={space.visible}
                onChange={e => updateSpace(space.space_id, { visible: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Visible</span>
            </label>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ancho</label>
                <input
                  type="text"
                  value={space.ancho}
                  onChange={e => updateSpace(space.space_id, { ancho: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Alto</label>
                <input
                  type="text"
                  value={space.alto}
                  onChange={e => updateSpace(space.space_id, { alto: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
            
            {space.rotacion_activa !== undefined && (
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={space.rotacion_activa}
                    onChange={e => updateSpace(space.space_id, { rotacion_activa: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Rotación automática</span>
                </label>
                
                {space.rotacion_activa && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Intervalo (seg)</label>
                    <input
                      type="number"
                      value={space.intervalo_rotacion || 10}
                      onChange={e => updateSpace(space.space_id, { intervalo_rotacion: parseInt(e.target.value) })}
                      className="w-full border rounded-lg px-3 py-2"
                      min={3}
                      max={60}
                    />
                  </div>
                )}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-1">Color de fondo por defecto</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={space.color_fondo_default || '#1a1a2e'}
                  onChange={e => updateSpace(space.space_id, { color_fondo_default: e.target.value })}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={space.color_fondo_default || '#1a1a2e'}
                  onChange={e => updateSpace(space.space_id, { color_fondo_default: e.target.value })}
                  className="flex-1 border rounded-lg px-3 py-2"
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
