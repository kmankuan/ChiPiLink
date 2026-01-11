/**
 * useWebSocket - Hook for real-time WebSocket notifications
 * Supports multi-language messages and multiple rooms
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const API_BASE = process.env.REACT_APP_BACKEND_URL || '';

// Convert HTTP URL to WebSocket URL
const getWsUrl = () => {
  const url = API_BASE.replace(/^http/, 'ws');
  return `${url}/api/realtime/ws`;
};

export function useWebSocket({
  room = 'global',
  userId = null,
  autoConnect = true,
  onMessage = null,
  onConnect = null,
  onDisconnect = null,
  onError = null
}) {
  const { i18n } = useTranslation();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [messages, setMessages] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);

  // Get current language
  const language = i18n.language?.substring(0, 2) || 'es';

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const params = new URLSearchParams({
      room,
      lang: language
    });
    
    if (userId) {
      params.append('user_id', userId);
    }

    const wsUrl = `${getWsUrl()}?${params.toString()}`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        console.log(`[WS] Connected to room: ${room}`);
        
        // Start ping interval to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
        
        onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          setMessages(prev => [...prev.slice(-99), data]); // Keep last 100 messages
          onMessage?.(data);
        } catch (e) {
          console.error('[WS] Error parsing message:', e);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('[WS] Error:', error);
        onError?.(error);
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        console.log('[WS] Disconnected');
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        
        onDisconnect?.();
        
        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (autoConnect) {
            console.log('[WS] Attempting to reconnect...');
            connect();
          }
        }, 5000);
      };
    } catch (error) {
      console.error('[WS] Connection error:', error);
      onError?.(error);
    }
  }, [room, userId, language, autoConnect, onConnect, onDisconnect, onMessage, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const changeRoom = useCallback((newRoom) => {
    sendMessage({ type: 'join_room', room: newRoom });
  }, [sendMessage]);

  const changeLanguage = useCallback((newLang) => {
    sendMessage({ type: 'change_language', lang: newLang });
  }, [sendMessage]);

  // Connect on mount if autoConnect is true
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Reconnect when language changes
  useEffect(() => {
    if (isConnected) {
      changeLanguage(language);
    }
  }, [language, isConnected, changeLanguage]);

  return {
    isConnected,
    lastMessage,
    messages,
    connect,
    disconnect,
    sendMessage,
    changeRoom,
    changeLanguage,
    clearMessages: () => setMessages([])
  };
}

export default useWebSocket;
