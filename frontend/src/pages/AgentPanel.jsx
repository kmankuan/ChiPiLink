/**
 * CXGenie Agent Panel Page
 * Full-page agent panel for handling customer tickets and chats
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CXGenieAgentPanel, CXGeniePanelSelector, CXGenieAgentTabs } from '@/components/chat';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Maximize2, Minimize2, ExternalLink } from 'lucide-react';

export default function AgentPanel() {
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState('tickets'); // 'tickets' or 'live-chat'
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const openInNewWindow = () => {
    const baseUrl = 'https://app.cxgenie.ai/workspaces/03a35f5f-f777-489a-b60c-69939ac89c49/help-desk';
    const url = activePanel === 'tickets' 
      ? `${baseUrl}?t=tickets`
      : `${baseUrl}?t=live-chat&type=ALL`;
    window.open(url, '_blank', 'width=1200,height=800');
  };

  const getPanelTitle = () => {
    return activePanel === 'tickets' ? '🎫 Panel de Tickets' : '💬 Chat en Vivo';
  };

  const getPanelDescription = () => {
    return activePanel === 'tickets' 
      ? 'Gestiona los tickets de soporte de clientes'
      : 'Atiende conversaciones en tiempo real';
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${isFullscreen ? 'p-0' : 'p-4'}`}>
      {/* Header */}
      {!isFullscreen && (
        <div className="max-w-7xl mx-auto mb-4">
          <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al Admin
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {getPanelTitle()}
                </h1>
                <p className="text-sm text-gray-500">
                  {getPanelDescription()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={openInNewWindow}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir en nueva ventana
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                className="gap-2"
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="h-4 w-4" />
                    Salir
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-4 w-4" />
                    Pantalla completa
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Panel Selector - Tickets vs Chat */}
      {!isFullscreen && (
        <div className="max-w-7xl mx-auto mb-4">
          <CXGeniePanelSelector activePanel={activePanel} onPanelChange={setActivePanel} />
        </div>
      )}

      {/* Additional Tabs for filtering */}
      {!isFullscreen && (
        <div className="max-w-7xl mx-auto mb-4">
          <CXGenieAgentTabs activeTab={activePanel} onTabChange={setActivePanel} />
        </div>
      )}

      {/* Agent Panel */}
      <div className={`${isFullscreen ? 'h-screen' : 'max-w-7xl mx-auto'}`}>
        <div className={`bg-white rounded-lg shadow-sm overflow-hidden ${isFullscreen ? 'h-full' : 'h-[calc(100vh-280px)]'}`}>
          <CXGenieAgentPanel panel={activePanel} className="h-full" />
        </div>
      </div>

      {/* Fullscreen exit button */}
      {isFullscreen && (
        <button
          onClick={toggleFullscreen}
          className="fixed top-4 right-4 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg z-50 transition-colors"
          title="Salir de pantalla completa"
        >
          <Minimize2 className="h-5 w-5 text-gray-700" />
        </button>
      )}
    </div>
  );
}
