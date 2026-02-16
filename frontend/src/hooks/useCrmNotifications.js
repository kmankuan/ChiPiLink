/**
 * useCrmNotifications — Hook for CRM chat unread message notifications
 * Polls the backend for unread CRM chat counts per student.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;
const POLL_INTERVAL = 30000; // 30 seconds

export function useCrmNotifications() {
  const { token, isAuthenticated } = useAuth();
  const [totalUnread, setTotalUnread] = useState(0);
  const [perStudent, setPerStudent] = useState({});
  const intervalRef = useRef(null);

  const fetchUnread = useCallback(async () => {
    if (!token || !isAuthenticated) {
      setTotalUnread(0);
      setPerStudent({});
      return;
    }
    try {
      const res = await fetch(`${API}/api/store/crm-chat/notifications/unread`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTotalUnread(data.total_unread || 0);
        setPerStudent(data.per_student || {});
      }
    } catch {
      // Silently fail — non-critical
    }
  }, [token, isAuthenticated]);

  const markStudentRead = useCallback(async (studentId) => {
    if (!token) return;
    try {
      await fetch(`${API}/api/store/crm-chat/${studentId}/mark-read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      // Optimistic update
      setPerStudent((prev) => {
        const copy = { ...prev };
        const count = copy[studentId]?.count || 0;
        delete copy[studentId];
        setTotalUnread((t) => Math.max(0, t - count));
        return copy;
      });
    } catch {
      // Silently fail
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUnread();
    intervalRef.current = setInterval(fetchUnread, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchUnread, isAuthenticated]);

  return { totalUnread, perStudent, markStudentRead, refreshUnread: fetchUnread };
}
