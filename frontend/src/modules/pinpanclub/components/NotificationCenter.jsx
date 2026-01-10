/**
 * Notification Center Component
 * Centro de notificaciones con WebSocket en tiempo real
 * Soporta: campana en header + panel lateral deslizable
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Bell, Check, CheckCheck, Trash2, X, 
  Trophy, Users, MessageSquare, Heart, Target, Award,
  Clock, ChevronRight, Loader2, Wifi, WifiOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const WS_URL = API_URL?.replace('https://', 'wss://').replace('http://', 'ws://');

const notificationIcons = {
  match_pending: Clock,
  match_confirmed: Check,
  new_follower: Users,
  new_comment: MessageSquare,
  new_reaction: Heart,
  badge_earned: Award,
  prize_won: Trophy,
  challenge_available: Target,
  challenge_completed: Trophy,
  season_ending: Clock,
  season_closed: Trophy
};

const notificationColors = {
  match_pending: 'bg-yellow-100 text-yellow-700',
  match_confirmed: 'bg-green-100 text-green-700',
  new_follower: 'bg-blue-100 text-blue-700',
  new_comment: 'bg-purple-100 text-purple-700',
  new_reaction: 'bg-pink-100 text-pink-700',
  badge_earned: 'bg-orange-100 text-orange-700',
  prize_won: 'bg-yellow-100 text-yellow-700',
  challenge_available: 'bg-indigo-100 text-indigo-700',
  challenge_completed: 'bg-green-100 text-green-700',
  season_ending: 'bg-red-100 text-red-700',
  season_closed: 'bg-gray-100 text-gray-700'
};

// ============== MAIN NOTIFICATION CENTER COMPONENT ==============

export default function NotificationCenter({ 
  userId, 
  mode = 'sheet', // 'sheet' | 'popover' | 'both'
  showConnectionStatus = false 
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (!userId || !WS_URL) return;

    const wsUrl = `${WS_URL}/api/pinpanclub/ws/notifications/${userId}`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Notification WebSocket connected');
        setWsConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      wsRef.current.onclose = () => {
        console.log('Notification WebSocket disconnected');
        setWsConnected(false);
        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  }, [userId]);

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'connected':
        console.log('WebSocket confirmed connection');
        break;
      case 'unread_count':
        setUnreadCount(data.count);
        break;
      case 'new_notification':
        // Add new notification to the top of the list
        setNotifications(prev => [data.notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        // Show toast for new notification
        toast.info(data.notification.title, {
          description: data.notification.message,
          duration: 4000
        });
        break;
      case 'ping':
        // Respond to ping with pong
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'pong' }));
        }
        break;
    }
  };

  // Connect WebSocket on mount
  useEffect(() => {
    if (userId) {
      connectWebSocket();
      fetchUnreadCount();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [userId, connectWebSocket]);

  // Fetch notifications when panel opens
  useEffect(() => {
    if (isOpen && userId) {
      fetchNotifications();
    }
  }, [isOpen, userId]);

  const fetchUnreadCount = async () => {
    if (!userId) return;
    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/social/notifications/${userId}/unread-count`);
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unread_count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/social/notifications/${userId}?limit=30`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    // Use WebSocket if connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        type: 'mark_read', 
        notification_id: notificationId 
      }));
    }
    
    // Also update via REST API
    try {
      await fetch(`${API_URL}/api/pinpanclub/social/notifications/${notificationId}/read`, {
        method: 'POST'
      });
      setNotifications(prev => 
        prev.map(n => n.notification_id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    // Use WebSocket if connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'mark_all_read' }));
    }
    
    try {
      await fetch(`${API_URL}/api/pinpanclub/social/notifications/${userId}/read-all`, {
        method: 'POST'
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('Todas las notificaciones marcadas como leídas');
    } catch (error) {
      toast.error('Error al marcar notificaciones');
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.notification_id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
      setIsOpen(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Ahora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  // Notification list content (shared between popover and sheet)
  const NotificationList = () => (
    <>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <p className="text-muted-foreground">No tienes notificaciones</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const Icon = notificationIcons[notification.type] || Bell;
            const colorClass = notificationColors[notification.type] || 'bg-gray-100 text-gray-700';
            
            return (
              <div
                key={notification.notification_id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                  !notification.is_read ? 'bg-blue-50/50 border-l-4 border-blue-500' : ''
                }`}
                data-testid={`notification-item-${notification.notification_id}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notification.is_read ? 'font-semibold' : ''}`}>
                      {notification.title}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                  {notification.action_url && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  // Bell button with badge
  const BellButton = ({ onClick, variant = "ghost" }) => (
    <Button 
      variant={variant} 
      size="icon" 
      className="relative" 
      onClick={onClick}
      data-testid="notification-btn"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
      {showConnectionStatus && (
        <span className={`absolute -bottom-1 -right-1 w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
      )}
    </Button>
  );

  // Header with title and mark all read button
  const NotificationHeader = () => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5" />
        <span className="font-semibold">Notificaciones</span>
        {unreadCount > 0 && (
          <Badge variant="destructive">{unreadCount}</Badge>
        )}
        {showConnectionStatus && (
          <span className={`ml-2 ${wsConnected ? 'text-green-500' : 'text-gray-400'}`}>
            {wsConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          </span>
        )}
      </div>
      {notifications.some(n => !n.is_read) && (
        <Button variant="ghost" size="sm" onClick={markAllAsRead}>
          <CheckCheck className="h-4 w-4 mr-1" />
          Marcar todo
        </Button>
      )}
    </div>
  );

  // Render based on mode
  if (mode === 'popover') {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <BellButton />
        </PopoverTrigger>
        <PopoverContent className="w-[380px] p-0" align="end">
          <div className="p-4 border-b">
            <NotificationHeader />
          </div>
          <ScrollArea className="h-[400px] p-4">
            <NotificationList />
          </ScrollArea>
        </PopoverContent>
      </Popover>
    );
  }

  if (mode === 'sheet') {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <BellButton />
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>
              <NotificationHeader />
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-100px)] mt-4">
            <NotificationList />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  // mode === 'both' - Popover on desktop, Sheet on mobile
  return (
    <>
      {/* Desktop: Popover */}
      <div className="hidden md:block">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <BellButton />
          </PopoverTrigger>
          <PopoverContent className="w-[380px] p-0" align="end">
            <div className="p-4 border-b">
              <NotificationHeader />
            </div>
            <ScrollArea className="h-[400px] p-4">
              <NotificationList />
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      {/* Mobile: Sheet */}
      <div className="md:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <BellButton />
          </SheetTrigger>
          <SheetContent className="w-full sm:w-[400px]">
            <SheetHeader>
              <SheetTitle>
                <NotificationHeader />
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-100px)] mt-4">
              <NotificationList />
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

// ============== HOOK FOR NOTIFICATION COUNT ==============

export function useNotificationCount(userId) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!userId || !WS_URL) return;

    const wsUrl = `${WS_URL}/api/pinpanclub/ws/notifications/${userId}`;
    
    const connect = () => {
      try {
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => setWsConnected(true);
        
        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'unread_count') {
              setUnreadCount(data.count);
            } else if (data.type === 'new_notification') {
              setUnreadCount(prev => prev + 1);
            } else if (data.type === 'ping') {
              wsRef.current?.send(JSON.stringify({ type: 'pong' }));
            }
          } catch (e) {
            console.error('Error parsing message:', e);
          }
        };

        wsRef.current.onclose = () => {
          setWsConnected(false);
          setTimeout(connect, 5000);
        };

        wsRef.current.onerror = () => setWsConnected(false);
      } catch (e) {
        console.error('WebSocket error:', e);
      }
    };

    // Initial fetch
    fetch(`${API_URL}/api/pinpanclub/social/notifications/${userId}/unread-count`)
      .then(res => res.json())
      .then(data => setUnreadCount(data.unread_count))
      .catch(console.error);

    connect();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [userId]);

  return { unreadCount, wsConnected };
}

// ============== STANDALONE BELL ICON COMPONENT ==============

export function NotificationBell({ userId, onClick }) {
  const { unreadCount, wsConnected } = useNotificationCount(userId);

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="relative" 
      onClick={onClick}
      data-testid="notification-bell"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Button>
  );
}
