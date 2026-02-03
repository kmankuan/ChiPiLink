import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  ShoppingCart, 
  AlertTriangle, 
  CreditCard, 
  Truck,
  Check,
  Settings,
  X,
  ChevronRight,
  GraduationCap
} from 'lucide-react';

const NOTIFICATION_TYPES = {
  pedido_nuevo: { icon: ShoppingCart, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Pedidos Nuevos' },
  bajo_stock: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Bajo Stock' },
  pago_confirmado: { icon: CreditCard, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Pagos Confirmados' },
  pedido_enviado: { icon: Truck, color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'Pedidos Enviados' },
  matricula_pendiente: { icon: GraduationCap, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Matrículas Pendientes' },
  matricula_verificada: { icon: GraduationCap, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Matrículas Verificadas' }
};

export function NotificationBar() {
  const { api, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [countByType, setCountByType] = useState({});
  const [config, setConfig] = useState({
    mostrar_pedidos_nuevos: true,
    mostrar_bajo_stock: true,
    mostrar_pagos_confirmados: true,
    mostrar_pedidos_enviados: true,
    mostrar_matriculas: true
  });
  const [popoverOpen, setPopoverOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!isAdmin) return;
    
    try {
      const response = await api.get('/admin/notificaciones', {
        params: { limite: 20, solo_no_leidas: true }
      });
      setNotifications(response.data?.notifications || response.data?.notificaciones || []);
      setTotalUnread(response.data?.total_unread || response.data?.total_no_leidas || 0);
      setCountByType(response.data?.count_by_type || response.data?.conteo_por_tipo || {});
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Reset to safe defaults on error
      setNotifications([]);
      setTotalUnread(0);
      setCountByType({});
    }
  }, [api, isAdmin]);

  const fetchConfig = useCallback(async () => {
    if (!isAdmin) return;
    
    try {
      const response = await api.get('/admin/config-notificaciones');
      setConfig(response.data);
    } catch (error) {
      console.error('Error fetching notification config:', error);
    }
  }, [api, isAdmin]);

  useEffect(() => {
    fetchNotifications();
    fetchConfig();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications, fetchConfig]);

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/admin/notificaciones/${notificationId}/leer`);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/admin/notificaciones/leer-todas');
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const updateConfig = async (key, value) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    
    try {
      await api.put('/admin/config-notificaciones', newConfig);
    } catch (error) {
      console.error('Error updating config:', error);
    }
  };

  // Filter visible notification types based on config
  const visibleTypes = [];
  if (config.mostrar_pedidos_nuevos) visibleTypes.push('pedido_nuevo');
  if (config.mostrar_bajo_stock) visibleTypes.push('bajo_stock');
  if (config.mostrar_pagos_confirmados) visibleTypes.push('pago_confirmado');
  if (config.mostrar_pedidos_enviados) visibleTypes.push('pedido_enviado');
  if (config.mostrar_matriculas) {
    visibleTypes.push('matricula_pendiente');
    visibleTypes.push('matricula_verificada');
  }

  const filteredNotifications = notifications.filter(n => visibleTypes.includes(n.tipo));
  const visibleCount = filteredNotifications.length;

  if (!isAdmin) return null;

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Ahora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString();
  };

  return (
    <div 
      className="bg-card/80 backdrop-blur-md border-b border-border/50 sticky top-16 z-40"
      data-testid="notification-bar"
    >
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-10">
          {/* Left side - Quick stats */}
          <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
            {visibleTypes.map(type => {
              const typeConfig = NOTIFICATION_TYPES[type];
              if (!typeConfig) return null;
              const count = (countByType && countByType[type]) || 0;
              if (count === 0) return null;
              
              const Icon = typeConfig.icon;
              return (
                <div 
                  key={type}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${typeConfig.bg} shrink-0`}
                >
                  <Icon className={`h-3.5 w-3.5 ${typeConfig.color}`} />
                  <span className="text-xs font-medium">{count}</span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {typeConfig.label}
                  </span>
                </div>
              );
            })}
            
            {visibleCount === 0 && (
              <span className="text-xs text-muted-foreground">
                Sin notificaciones nuevas
              </span>
            )}
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Settings dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs">
                  Mostrar Notificaciones
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={config.mostrar_pedidos_nuevos}
                  onCheckedChange={(v) => updateConfig('mostrar_pedidos_nuevos', v)}
                >
                  <ShoppingCart className="h-4 w-4 mr-2 text-blue-500" />
                  Pedidos Nuevos
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={config.mostrar_bajo_stock}
                  onCheckedChange={(v) => updateConfig('mostrar_bajo_stock', v)}
                >
                  <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
                  Bajo Stock
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={config.mostrar_pagos_confirmados}
                  onCheckedChange={(v) => updateConfig('mostrar_pagos_confirmados', v)}
                >
                  <CreditCard className="h-4 w-4 mr-2 text-green-500" />
                  Pagos Confirmados
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={config.mostrar_pedidos_enviados}
                  onCheckedChange={(v) => updateConfig('mostrar_pedidos_enviados', v)}
                >
                  <Truck className="h-4 w-4 mr-2 text-purple-500" />
                  Pedidos Enviados
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notifications popover */}
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 relative">
                  <Bell className="h-3.5 w-3.5" />
                  {visibleCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center">
                      {visibleCount > 9 ? '9+' : visibleCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between p-3 border-b border-border">
                  <h4 className="font-medium text-sm">Notificaciones</h4>
                  {visibleCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={markAllAsRead}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Marcar todas
                    </Button>
                  )}
                </div>
                
                <ScrollArea className="h-[300px]">
                  {filteredNotifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      No hay notificaciones
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {filteredNotifications.map((notif) => {
                        const typeConfig = NOTIFICATION_TYPES[notif?.tipo] || NOTIFICATION_TYPES.pedido_nuevo;
                        if (!typeConfig) return null;
                        const Icon = typeConfig.icon;
                        
                        return (
                          <div 
                            key={notif.notificacion_id}
                            className="p-3 hover:bg-muted/50 transition-colors cursor-pointer group"
                            onClick={() => markAsRead(notif.notificacion_id)}
                          >
                            <div className="flex gap-3">
                              <div className={`p-2 rounded-lg ${typeConfig.bg} shrink-0`}>
                                <Icon className={`h-4 w-4 ${typeConfig.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {notif.titulo}
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {notif.mensaje}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {formatTime(notif.created_at)}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notif.notificacion_id);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
}
