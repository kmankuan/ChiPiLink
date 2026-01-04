/**
 * CXGenie Agent Panel Component
 * Embeds the CXGenie help desk for agents/admins to manage conversations
 */
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.REACT_APP_BACKEND_URL || '';

export function CXGenieAgentPanel({ tab = 'live-chat', className = '' }) {
  const { token } = useAuth();
  const [panelData, setPanelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPanelData = async () => {
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/api/cxgenie/agent-panel/embed?tab=${tab}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch agent panel data');
        }

        const data = await response.json();
        setPanelData(data);
      } catch (err) {
        console.error('Error loading agent panel:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPanelData();
  }, [token, tab]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-96 bg-red-50 rounded-lg ${className}`}>
        <div className="text-center">
          <p className="text-red-600 font-medium">Error loading chat panel</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!panelData?.embed_url) {
    return (
      <div className={`flex items-center justify-center h-96 bg-gray-50 rounded-lg ${className}`}>
        <p className="text-gray-500">Agent panel not configured</p>
      </div>
    );
  }

  return (
    <div className={`w-full h-full min-h-[600px] ${className}`}>
      <iframe
        src={panelData.embed_url}
        title="CXGenie Agent Panel"
        className="w-full h-full border-0 rounded-lg"
        style={{ minHeight: '600px' }}
        allow="microphone; camera"
      />
    </div>
  );
}

/**
 * Tab selector for agent panel
 */
export function CXGenieAgentTabs({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'live-chat', label: 'Live Chat', icon: '💬' },
    { id: 'all', label: 'Todos', icon: '📋' },
    { id: 'open', label: 'Abiertos', icon: '🔵' },
    { id: 'pending', label: 'Pendientes', icon: '🟡' },
    { id: 'resolved', label: 'Resueltos', icon: '🟢' },
  ];

  return (
    <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === tab.id
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span className="mr-1">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default CXGenieAgentPanel;
