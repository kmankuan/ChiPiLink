/**
 * CXGenie Agent Panel Page
 * Interface for accessing CXGenie help desk panels
 * Note: CXGenie uses CSP frame-ancestors 'none' so iframes are not supported
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, MessageSquare, Ticket, Users, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.REACT_APP_BACKEND_URL || '';

export default function AgentPanel() {
  const navigate = useNavigate();
  const [panelData, setPanelData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPanelData = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_URL}/api/cxgenie/agent-panel`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (response.ok) {
          const data = await response.json();
          setPanelData(data);
        }
      } catch (err) {
        console.error('Error loading panel data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPanelData();
  }, []);

  const openPanel = (url) => {
    window.open(url, '_blank', 'width=1400,height=900,menubar=no,toolbar=no,location=no,status=no');
  };

  const openSignIn = () => {
    window.open('https://livechat.chipilink.com/sign-in', '_blank', 'width=500,height=700');
  };

  const panels = [
    {
      id: 'tickets',
      title: 'Tickets de Soporte',
      description: 'Gestiona todos los tickets de soporte de tus clientes',
      icon: Ticket,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      url: 'https://livechat.chipilink.com/workspaces/03a35f5f-f777-489a-b60c-69939ac89c49/help-desk?t=tickets'
    },
    {
      id: 'live-chat',
      title: 'Chat en Vivo',
      description: 'Atiende conversaciones en tiempo real con clientes',
      icon: MessageSquare,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      url: 'https://livechat.chipilink.com/workspaces/03a35f5f-f777-489a-b60c-69939ac89c49/help-desk?t=live-chat&type=ALL'
    }
  ];

  const quickFilters = [
    {
      id: 'all',
      label: 'Todos',
      icon: Users,
      url: 'https://livechat.chipilink.com/workspaces/03a35f5f-f777-489a-b60c-69939ac89c49/help-desk?t=all&type=ALL'
    },
    {
      id: 'open',
      label: 'Abiertos',
      icon: AlertCircle,
      url: 'https://livechat.chipilink.com/workspaces/03a35f5f-f777-489a-b60c-69939ac89c49/help-desk?t=open&type=ALL'
    },
    {
      id: 'pending',
      label: 'Pendientes',
      icon: Clock,
      url: 'https://livechat.chipilink.com/workspaces/03a35f5f-f777-489a-b60c-69939ac89c49/help-desk?t=pending&type=ALL'
    },
    {
      id: 'resolved',
      label: 'Resueltos',
      icon: CheckCircle,
      url: 'https://livechat.chipilink.com/workspaces/03a35f5f-f777-489a-b60c-69939ac89c49/help-desk?t=resolved&type=ALL'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm p-4 md:p-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Volver al Admin</span>
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                🎧 Centro de Soporte CXGenie
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Gestiona tickets y chats en vivo de tus clientes
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={openSignIn}
            className="gap-2 hidden sm:flex"
          >
            <ExternalLink className="h-4 w-4" />
            Iniciar Sesión
          </Button>
        </div>
      </div>

      {/* Main Panels */}
      <div className="max-w-5xl mx-auto mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Paneles Principales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {panels.map((panel) => {
            const Icon = panel.icon;
            return (
              <button
                key={panel.id}
                onClick={() => openPanel(panel.url)}
                className="group relative bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 text-left border border-gray-100 hover:border-gray-200"
              >
                <div className="flex items-start gap-4">
                  <div className={`${panel.color} ${panel.hoverColor} p-4 rounded-xl transition-colors`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors">
                      {panel.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {panel.description}
                    </p>
                  </div>
                  <ExternalLink className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors" />
                </div>
                <div className="absolute inset-0 rounded-xl ring-2 ring-transparent group-hover:ring-primary/20 transition-all" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Filters */}
      <div className="max-w-5xl mx-auto mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Filtros Rápidos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {quickFilters.map((filter) => {
            const Icon = filter.icon;
            return (
              <button
                key={filter.id}
                onClick={() => openPanel(filter.url)}
                className="group flex items-center gap-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-all p-4 border border-gray-100 hover:border-primary/30"
              >
                <Icon className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors" />
                <span className="font-medium text-gray-700 group-hover:text-primary transition-colors">
                  {filter.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Info Card */}
      <div className="max-w-5xl mx-auto">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">Información Importante</h3>
              <p className="text-sm text-blue-700 mt-1">
                Los paneles se abren en una nueva ventana para una mejor experiencia de trabajo.
                Asegúrate de haber iniciado sesión en CXGenie antes de acceder a los paneles.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openSignIn}
                  className="gap-2 bg-white hover:bg-blue-50 border-blue-200"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ir a Login de CXGenie
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open('https://livechat.chipilink.com', '_blank')}
                  className="gap-2 text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                >
                  Abrir Dashboard Principal
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sign In Button */}
      <div className="fixed bottom-4 right-4 sm:hidden">
        <Button
          onClick={openSignIn}
          className="rounded-full shadow-lg gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Login
        </Button>
      </div>
    </div>
  );
}
