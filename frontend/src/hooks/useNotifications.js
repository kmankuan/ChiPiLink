/**
 * useNotifications — Hook for unread message notifications
 * Polls the backend for unread counts and provides mark-as-read functionality.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;
const POLL_INTERVAL = 30000; // 30 seconds

export function useNotifications() {
  const { token, isAuthenticated } = useAuth();
  const [totalUnread, setTotalUnread] = useState(0);
  const [perOrder, setPerOrder] = useState({});
  const intervalRef = useRef(null);

  const fetchUnread = useCallback(async () => {
    if (!token || !isAuthenticated) {
      setTotalUnread(0);
      setPerOrder({});
      return;
    }
    try {
      const res = await fetch(`${API}/api/sysbook/orders/notifications/unread`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTotalUnread(data.total_unread || 0);
        setPerOrder(data.per_order || {});
      }
    } catch {
      // Silently fail — non-critical
    }
  }, [token, isAuthenticated]);

  const markOrderRead = useCallback(async (orderId) => {
    if (!token) return;
    try {
      await fetch(`${API}/api/sysbook/orders/${orderId}/updates/mark-read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      // Optimistic update
      setPerOrder(prev => {
        const copy = { ...prev };
        const count = copy[orderId] || 0;
        delete copy[orderId];
        setTotalUnread(prev => Math.max(0, prev - count));
        return copy;
      });
    } catch {
      // Silently fail
    }
  }, [token]);

  // Poll on mount + interval
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUnread();
    intervalRef.current = setInterval(fetchUnread, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchUnread, isAuthenticated]);

  return { totalUnread, perOrder, markOrderRead, refreshUnread: fetchUnread };
}
