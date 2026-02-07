/**
 * SchoolTextbooksView — Student selection and textbook order status
 * Extracted from Unatienda.jsx for maintainability.
 * Handles: student tabs, student cards with order status, login prompt, link student flow.
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  BookOpen, Check, ChevronLeft, ChevronRight, Clock, Eye, GraduationCap,
  Loader2, Lock, Package, Send, ShoppingCart, User, UserPlus, Users
} from 'lucide-react';
import { schoolTxbTranslations } from '../constants/translations';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SchoolTextbooksView({ 
  isAuthenticated, 
  privateCatalogAccess, 
  storeConfig, 
  onSelectStudent, 
  onLinkStudent,
  onBack 
}) {
  const { i18n } = useTranslation();
  const { token } = useAuth();
  const navigate = useNavigate();
  const lang = i18n?.language || 'es';
  
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(0);
  const [orderData, setOrderData] = useState(null); // Full order from backend
  const [loading, setLoading] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [reorderItem, setReorderItem] = useState(null);
  const [reorderReason, setReorderReason] = useState('');
  const [requestingReorder, setRequestingReorder] = useState(false);
  
  const texts = {
    en: {
      title: 'School Textbooks', subtitle: 'Order textbooks for your students',
      loginRequired: 'Login Required', loginMessage: 'Please login to access exclusive school textbooks',
      loginButton: 'Login', back: 'Back to Store',
      noValidatedStudents: 'No Validated Students', noValidatedStudentsDesc: 'Your student link requests are pending approval.',
      goToMyStudents: 'View My Students', linkStudentBtn: 'Link Student',
      grade: 'Grade', loading: 'Loading...',
      noBooks: 'No textbooks available for this grade',
      purchased: 'Purchased', reorderPending: 'Reorder pending',
      available: 'Available', outOfStock: 'Out of stock',
      submitOrder: 'Submit Order', orderSuccess: 'Order submitted successfully!',
      orderError: 'Error submitting order', selectAtLeastOne: 'Please select at least one book',
      total: 'Total', itemsOf: 'of',
      requestReorder: 'Request Reorder', reorderReason: 'Reason for reorder',
      reorderSuccess: 'Reorder requested', reorderError: 'Error requesting reorder',
      reorderReasonPlaceholder: 'e.g., Book was damaged, need replacement',
      send: 'Send Request', cancel: 'Cancel',
    },
    es: {
      title: 'Textos Escolares', subtitle: 'Ordena los textos de tus estudiantes',
      loginRequired: 'Inicio de Sesión Requerido', loginMessage: 'Inicia sesión para acceder a textos escolares exclusivos',
      loginButton: 'Iniciar Sesión', back: 'Volver a la Tienda',
      noValidatedStudents: 'Sin Estudiantes Validados', noValidatedStudentsDesc: 'Tus solicitudes están pendientes de aprobación.',
      goToMyStudents: 'Ver Mis Estudiantes', linkStudentBtn: 'Vincular Estudiante',
      grade: 'Grado', loading: 'Cargando...',
      noBooks: 'No hay textos disponibles para este grado',
      purchased: 'Comprado', reorderPending: 'Reorden pendiente',
      available: 'Disponible', outOfStock: 'Agotado',
      submitOrder: 'Enviar Pedido', orderSuccess: '¡Pedido enviado correctamente!',
      orderError: 'Error al enviar el pedido', selectAtLeastOne: 'Selecciona al menos un libro',
      total: 'Total', itemsOf: 'de',
      requestReorder: 'Solicitar Reorden', reorderReason: 'Motivo de la reorden',
      reorderSuccess: 'Reorden solicitada', reorderError: 'Error al solicitar reorden',
      reorderReasonPlaceholder: 'Ej: Libro dañado, necesito reemplazo',
      send: 'Enviar Solicitud', cancel: 'Cancelar',
    },
    zh: {
      title: '学校教科书', subtitle: '为您的学生订购教科书',
      loginRequired: '需要登录', loginMessage: '请登录以访问专属学校教科书',
      loginButton: '登录', back: '返回商店',
      noValidatedStudents: '无验证学生', noValidatedStudentsDesc: '您的请求正在等待批准。',
      goToMyStudents: '查看我的学生', linkStudentBtn: '关联学生',
      grade: '年级', loading: '加载中...',
      noBooks: '此年级暂无教科书',
      purchased: '已购买', reorderPending: '重新订购等待中',
      available: '可用', outOfStock: '缺货',
      submitOrder: '提交订单', orderSuccess: '订单提交成功！',
      orderError: '提交订单时出错', selectAtLeastOne: '请至少选择一本书',
      total: '总计', itemsOf: '/',
      requestReorder: '请求重新订购', reorderReason: '重新订购原因',
      reorderSuccess: '重新订购已请求', reorderError: '请求重新订购时出错',
      reorderReasonPlaceholder: '例如：书籍损坏，需要更换',
      send: '发送请求', cancel: '取消',
    }
  };
  
  const t = texts[lang] || texts.es;
  const validatedStudents = privateCatalogAccess?.students || [];
  const hasAccess = privateCatalogAccess?.has_access === true;
  const selectedStudent = validatedStudents[selectedStudentIndex];
  
  // Items derived from orderData
  const items = orderData?.items || [];
  const orderedItems = items.filter(i => i.status === 'ordered');
  const availableItems = items.filter(i => i.status === 'available' || i.status === 'reorder_approved');
  const pendingItems = items.filter(i => i.status === 'reorder_requested');
  const selectedList = availableItems.filter(i => selectedBooks[i.book_id]);
  const selectedTotal = selectedList.reduce((sum, i) => sum + (i.price || 0), 0);
  const orderedTotal = orderedItems.reduce((sum, i) => sum + (i.price || 0), 0);

  // Fetch student order (has items with statuses)
  const fetchOrder = async () => {
    if (!selectedStudent || !token) return;
    const studentId = selectedStudent.student_id || selectedStudent.sync_id;
    setLoading(true);
    setSelectedBooks({});
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/store/textbook-orders/student/${studentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrderData(res.data);
    } catch (error) {
      console.error('Error fetching order:', error);
      setOrderData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [selectedStudent, token]);
  
  const toggleBook = (bookId) => {
    setSelectedBooks(prev => ({ ...prev, [bookId]: !prev[bookId] }));
  };
  
  const handleSubmit = async () => {
    if (selectedList.length === 0) { toast.error(t.selectAtLeastOne); return; }
    setSubmitting(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/store/textbook-orders/submit`,
        {
          student_id: selectedStudent.student_id || selectedStudent.sync_id,
          items: selectedList.map(b => ({ book_id: b.book_id, quantity: 1 })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(t.orderSuccess);
      setSelectedBooks({});
      await fetchOrder(); // Refresh to show newly locked items
    } catch (error) {
      toast.error(error.response?.data?.detail || t.orderError);
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleReorderRequest = async () => {
    if (!reorderItem || !orderData?.order_id) return;
    setRequestingReorder(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/store/textbook-orders/${orderData.order_id}/reorder/${reorderItem.book_id}`,
        { reason: reorderReason || '' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(t.reorderSuccess);
      setReorderItem(null);
      setReorderReason('');
      await fetchOrder();
    } catch (error) {
      toast.error(error.response?.data?.detail || t.reorderError);
    } finally {
      setRequestingReorder(false);
    }
  };
  
  // ---- Early returns for unauthenticated / no students ----
  if (!isAuthenticated) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1" data-testid="back-to-store">
          <ChevronLeft className="h-4 w-4" /> {t.back}
        </Button>
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <Lock className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <h3 className="font-semibold mb-1">{t.loginRequired}</h3>
            <p className="text-sm text-muted-foreground mb-4">{storeConfig?.textbooks_login_message?.[lang] || t.loginMessage}</p>
            <Button onClick={() => window.location.href = '/login'}>{t.loginButton}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!hasAccess || validatedStudents.length === 0) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1" data-testid="back-to-store">
          <ChevronLeft className="h-4 w-4" /> {t.back}
        </Button>
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <h3 className="font-semibold mb-1">{t.noValidatedStudents}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t.noValidatedStudentsDesc}</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={() => navigate('/my-account?tab=students')} variant="outline" size="sm">{t.goToMyStudents}</Button>
              <Button onClick={onLinkStudent} size="sm"><UserPlus className="h-4 w-4 mr-1" />{t.linkStudentBtn}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // ---- Main view: students tabs + textbook items ----
  return (
    <div className="space-y-3" data-testid="school-textbooks-view">
      {/* Back + Header row */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 shrink-0" data-testid="back-to-store">
          <ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">{t.back}</span>
        </Button>
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-purple-600" />
          <h2 className="text-base sm:text-lg font-bold">{t.title}</h2>
        </div>
        <Button variant="outline" size="sm" onClick={onLinkStudent} className="shrink-0 text-xs" data-testid="link-student-btn">
          <UserPlus className="h-3.5 w-3.5 sm:mr-1" />
          <span className="hidden sm:inline">{t.linkStudentBtn}</span>
        </Button>
      </div>
      
      {/* Student Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" data-testid="student-tabs">
        {validatedStudents.map((student, index) => {
          const isActive = selectedStudentIndex === index;
          return (
            <button
              key={student.student_id || student.sync_id}
              data-testid={`student-tab-${index}`}
              onClick={() => setSelectedStudentIndex(index)}
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all whitespace-nowrap shrink-0 text-xs sm:text-sm
                ${isActive
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium' 
                  : 'border-border/50 bg-muted/30 hover:bg-muted text-muted-foreground'
                }
              `}
            >
              <User className="h-3.5 w-3.5" />
              <span className="truncate max-w-[100px] sm:max-w-[140px]">{student.name || student.full_name}</span>
              <span className="opacity-60">{t.grade} {student.grade}</span>
            </button>
          );
        })}
      </div>
      
      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
          <span className="ml-2 text-sm text-muted-foreground">{t.loading}</span>
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <Package className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">{t.noBooks}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Progress indicator */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>{orderedItems.length} {t.itemsOf} {items.length} {t.purchased.toLowerCase()}</span>
            {orderedTotal > 0 && <span className="font-medium text-foreground">{t.purchased}: ${orderedTotal.toFixed(2)}</span>}
          </div>
          
          {/* Item list - single column, compact for mobile */}
          <div className="rounded-lg border divide-y bg-card" data-testid="textbook-list">
            {items.map((item) => {
              const isOrdered = item.status === 'ordered';
              const isPending = item.status === 'reorder_requested';
              const isAvailable = item.status === 'available' || item.status === 'reorder_approved';
              const isSelected = !!selectedBooks[item.book_id];
              
              return (
                <div
                  key={item.book_id}
                  data-testid={`textbook-item-${item.book_id}`}
                  className={`
                    flex items-center gap-2.5 px-3 py-2.5 sm:py-3 transition-colors
                    ${isOrdered ? 'bg-green-50/50 dark:bg-green-900/10' : ''}
                    ${isPending ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}
                    ${isSelected ? 'bg-purple-50 dark:bg-purple-900/20' : ''}
                    ${isAvailable && !isSelected ? 'hover:bg-muted/50 cursor-pointer' : ''}
                  `}
                  onClick={() => isAvailable && toggleBook(item.book_id)}
                >
                  {/* Selection / Status indicator */}
                  <div className="shrink-0 w-5 flex justify-center">
                    {isOrdered ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : isPending ? (
                      <Clock className="h-4 w-4 text-amber-500" />
                    ) : (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleBook(item.book_id)}
                        className="h-4 w-4 rounded border-2 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        data-testid={`checkbox-${item.book_id}`}
                      />
                    )}
                  </div>
                  
                  {/* Book info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isOrdered ? 'text-muted-foreground' : ''}`}>
                      {item.book_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.book_code}
                    </p>
                  </div>
                  
                  {/* Price + status badge + reorder action */}
                  <div className="shrink-0 text-right flex flex-col items-end gap-0.5">
                    <p className={`text-sm font-semibold ${isOrdered ? 'text-green-600' : 'text-foreground'}`}>
                      ${item.price?.toFixed(2)}
                    </p>
                    {isOrdered && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setReorderItem(item); }}
                        className="text-[10px] text-green-600 hover:text-purple-600 hover:underline font-medium transition-colors"
                        data-testid={`reorder-btn-${item.book_id}`}
                      >
                        {t.purchased} &middot; {t.requestReorder}
                      </button>
                    )}
                    {isPending && (
                      <span className="text-[10px] text-amber-600 font-medium">{t.reorderPending}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Sticky bottom bar for selection + submit (only when items can be ordered) */}
          {availableItems.length > 0 && (
            <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t -mx-4 px-4 py-3 sm:static sm:mx-0 sm:px-0 sm:py-0 sm:border-0 sm:bg-transparent" data-testid="order-bar">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">{selectedList.length} {lang === 'es' ? 'seleccionado(s)' : 'selected'}</span>
                  {selectedTotal > 0 && (
                    <span className="ml-2 font-bold text-purple-600">${selectedTotal.toFixed(2)}</span>
                  )}
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || selectedList.length === 0}
                  className="gap-1.5 bg-purple-600 hover:bg-purple-700 shrink-0"
                  size="sm"
                  data-testid="submit-order-btn"
                >
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {t.submitOrder}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Reorder Request Dialog */}
      {reorderItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setReorderItem(null)}>
          <div className="bg-background rounded-t-xl sm:rounded-xl w-full sm:max-w-sm p-4 space-y-3 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="font-semibold text-sm">{t.requestReorder}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{reorderItem.book_name}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t.reorderReason}</label>
              <textarea
                value={reorderReason}
                onChange={(e) => setReorderReason(e.target.value)}
                placeholder={t.reorderReasonPlaceholder}
                className="w-full px-3 py-2 text-sm border rounded-lg resize-none bg-muted/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setReorderItem(null)} className="flex-1">
                {t.cancel}
              </Button>
              <Button
                size="sm"
                onClick={handleReorderRequest}
                disabled={requestingReorder}
                className="flex-1 gap-1.5 bg-purple-600 hover:bg-purple-700"
              >
                {requestingReorder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {t.send}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
