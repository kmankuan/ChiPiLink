import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import RESOLVED_API_URL from '@/config/apiUrl';

const RealtimeContext = createContext(null);

const API = RESOLVED_API_URL;
const WS_URL = API?.replace('https://', 'wss://').replace('http://', 'ws://');

const RECONNECT_DELAY = 3000;
const PING_INTERVAL = 25000;

export function RealtimeProvider({ children }) {
  const { token, user } = useAuth();
  const { i18n } = useTranslation();
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const pingRef = useRef(null);
  const listenersRef = useRef(new Map());
  const [connected, setConnected] = useState(false);

  const userId = user?.user_id;
  const isAdmin = user?.is_admin;
  const lang = i18n.language || 'es';

  const addListener = useCallback((eventType, callback) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set());
    }
    listenersRef.current.get(eventType).add(callback);
    return () => {
      listenersRef.current.get(eventType)?.delete(callback);
    };
  }, []);

  const handleMessage = useCallback((data) => {
    if (data.type === 'pong' || data.type === 'connected') return;

    // Notify all listeners for this event type
    const typeListeners = listenersRef.current.get(data.type);
    if (typeListeners) {
      typeListeners.forEach(cb => {
        try { cb(data); } catch {}
      });
    }

    // Also notify wildcard listeners
    const wildcardListeners = listenersRef.current.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach(cb => {
        try { cb(data); } catch {}
      });
    }

    // Show toast for relevant events
    if (data.message && typeof data.message === 'string') {
      const toastTypes = [
        'order_submitted', 'access_request', 'access_request_approved',
        'access_request_rejected', 'access_request_updated',
        'user_registered', 'wallet_topup', 'wallet_update',
        'crm_message', 'order_status_changed',
      ];
      if (toastTypes.includes(data.type)) {
        toast.info(data.message, { duration: 4000 });
      }
    }
  }, []);

  const connect = useCallback(() => {
    if (!userId || !WS_URL) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const room = isAdmin ? 'admin' : 'store';
    const wsUrl = `${WS_URL}/api/realtime/ws?room=${room}&user_id=${userId}&lang=${lang}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        // Start ping interval
        if (pingRef.current) clearInterval(pingRef.current);
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, PING_INTERVAL);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        if (pingRef.current) clearInterval(pingRef.current);
        // Auto-reconnect
        reconnectRef.current = setTimeout(connect, RECONNECT_DELAY);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {}
  }, [userId, isAdmin, lang, handleMessage]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (pingRef.current) clearInterval(pingRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional close
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Reconnect when language changes
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'change_language', lang }));
    }
  }, [lang]);

  return (
    <RealtimeContext.Provider value={{ connected, addListener }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  return useContext(RealtimeContext);
}

/**
 * Hook to subscribe to specific realtime event types.
 * Returns nothing — just triggers the callback when events arrive.
 *
 * Usage:
 *   useRealtimeEvent('order_submitted', (data) => { refetchOrders(); });
 *   useRealtimeEvent('*', (data) => { console.log('any event', data); });
 */
export function useRealtimeEvent(eventType, callback) {
  const ctx = useRealtime();
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!ctx?.addListener) return;
    const stableCb = (data) => cbRef.current(data);
    return ctx.addListener(eventType, stableCb);
  }, [ctx, eventType]);
}
