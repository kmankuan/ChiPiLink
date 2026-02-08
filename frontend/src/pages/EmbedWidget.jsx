/**
 * EmbedWidget — Standalone mini-dashboard rendered inside an iframe.
 * Features: Textbook Orders, My Students, Order Status, Notifications.
 * Auth: Uses existing LaoPan SSO token from localStorage (shared origin)
 *        or prompts LaoPan login if not authenticated.
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast, Toaster } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen, Users, Package, Bell, ChevronRight, ChevronLeft,
  Loader2, LogIn, X, ShoppingCart, CheckCircle, Clock, AlertCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/* ── Status helpers ── */
const STATUS_MAP = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700', icon: Package },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.pending;
  const Icon = s.icon;
  return (
    <Badge className={`${s.color} gap-1 text-[10px] font-medium`} data-testid={`status-${status}`}>
      <Icon className="h-3 w-3" /> {s.label}
    </Badge>
  );
}

/* ── Navigation ── */
const NAV_ITEMS = [
  { key: 'textbook_orders', label: 'Textbooks', icon: BookOpen },
  { key: 'my_students', label: 'Students', icon: Users },
  { key: 'order_status', label: 'Orders', icon: Package },
  { key: 'notifications', label: 'Alerts', icon: Bell },
];

/* ── Mini Textbook Order View ── */
function TextbookOrdersView({ token }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [books, setBooks] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/api/store/students`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setStudents(r.data?.students || r.data || []))
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false));
  }, [token]);

  const selectStudent = async (student) => {
    setSelectedStudent(student);
    setLoadingBooks(true);
    const sid = student._id || student.id;
    try {
      const { data } = await axios.get(`${API_URL}/api/store/students/${sid}/available-books`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBooks(data?.books || data || []);
    } catch {
      toast.error('Failed to load books');
    } finally {
      setLoadingBooks(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (selectedStudent) {
    return (
      <div className="space-y-3" data-testid="widget-textbook-detail">
        <button onClick={() => setSelectedStudent(null)} className="flex items-center gap-1 text-xs text-primary hover:underline" data-testid="widget-back-btn">
          <ChevronLeft className="h-3 w-3" /> Back to students
        </button>
        <h3 className="text-sm font-semibold">
          {selectedStudent.first_name || selectedStudent.full_name} — Available Books
        </h3>
        {loadingBooks ? <LoadingSpinner /> : (
          books.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No available books for this student.</p>
          ) : (
            <div className="space-y-2">
              {books.map((book, i) => (
                <Card key={i} className="p-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium">{book.title || book.nombre}</p>
                      <p className="text-[10px] text-muted-foreground">{book.subject || book.materia}</p>
                    </div>
                    <span className="text-xs font-semibold text-primary">${book.price || book.precio || '—'}</span>
                  </div>
                </Card>
              ))}
            </div>
          )
        )}
        <Button size="sm" className="w-full mt-2" onClick={() => {
          window.open(`${API_URL?.replace('/api', '')}/unatienda?tab=private`, '_blank');
        }} data-testid="widget-go-to-order">
          <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Go to Full Order Page
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="widget-textbook-students">
      <p className="text-xs text-muted-foreground">Select a student to view available textbooks:</p>
      {students.length === 0 ? (
        <p className="text-xs text-center py-4 text-muted-foreground">No linked students found.</p>
      ) : (
        students.map((s, i) => (
          <button
            key={i}
            onClick={() => selectStudent(s)}
            data-testid={`widget-student-${i}`}
            className="w-full flex items-center justify-between p-2.5 rounded-lg border hover:bg-accent/50 transition-colors text-left"
          >
            <div>
              <p className="text-xs font-medium">{s.first_name} {s.last_name}</p>
              <p className="text-[10px] text-muted-foreground">Grade: {s.grade || s.grado || '—'}</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        ))
      )}
    </div>
  );
}

/* ── My Students View ── */
function MyStudentsView({ token }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/api/store/students`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setStudents(r.data?.students || r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-2" data-testid="widget-my-students">
      {students.length === 0 ? (
        <p className="text-xs text-center py-4 text-muted-foreground">No students linked to your account.</p>
      ) : (
        students.map((s, i) => (
          <Card key={i} className="p-2.5" data-testid={`widget-student-card-${i}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold">{s.first_name} {s.last_name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {s.school_name || 'School'} — Grade {s.grade || s.grado || '—'}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px]">{s.status || 'active'}</Badge>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

/* ── Order Status View ── */
function OrderStatusView({ token }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/api/store/orders`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setOrders(r.data?.orders || r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-2" data-testid="widget-orders">
      {orders.length === 0 ? (
        <p className="text-xs text-center py-4 text-muted-foreground">No orders found.</p>
      ) : (
        orders.slice(0, 10).map((o, i) => (
          <Card key={i} className="p-2.5" data-testid={`widget-order-${i}`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium">Order #{o.order_number || o.numero_pedido || i + 1}</p>
              <StatusBadge status={o.status || o.estado} />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {o.student_name || o.nombre_estudiante || '—'} — {o.items?.length || 0} items
            </p>
          </Card>
        ))
      )}
    </div>
  );
}

/* ── Notifications View ── */
function NotificationsView({ token }) {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/api/notifications`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setNotifs(r.data?.notifications || r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-2" data-testid="widget-notifications">
      {notifs.length === 0 ? (
        <p className="text-xs text-center py-4 text-muted-foreground">No notifications.</p>
      ) : (
        notifs.slice(0, 15).map((n, i) => (
          <div key={i} className={`p-2.5 rounded-lg border text-xs ${n.read ? 'opacity-60' : ''}`} data-testid={`widget-notif-${i}`}>
            <p className="font-medium">{n.title}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{n.message || n.body}</p>
          </div>
        ))
      )}
    </div>
  );
}

/* ── Loading Spinner ── */
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-6">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
    </div>
  );
}

/* ── Login Prompt ── */
function LoginPrompt() {
  const handleLogin = () => {
    // Redirect to main app login which will use LaoPan SSO
    const mainAppUrl = API_URL?.replace('/api', '') || window.location.origin;
    window.open(`${mainAppUrl}/login?redirect=${encodeURIComponent(window.location.href)}`, '_blank');
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center" data-testid="widget-login-prompt">
      <div className="p-3 rounded-full bg-primary/10">
        <LogIn className="h-6 w-6 text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-semibold">Login Required</h3>
        <p className="text-xs text-muted-foreground mt-1">Please log in with your LaoPan account to access this widget.</p>
      </div>
      <Button size="sm" onClick={handleLogin} data-testid="widget-login-btn">
        <LogIn className="h-3.5 w-3.5 mr-1" /> Log in with LaoPan
      </Button>
    </div>
  );
}

/* ── Main Widget Shell ── */
export default function EmbedWidget() {
  const { t } = useTranslation();
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('textbook_orders');
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch widget config + check auth
  useEffect(() => {
    const init = async () => {
      try {
        // Fetch widget config
        const { data: cfg } = await axios.get(`${API_URL}/api/widget/embed-config`);
        setConfig(cfg);

        // Check existing auth token
        const storedToken = localStorage.getItem('auth_token');
        if (storedToken) {
          try {
            const { data: userData } = await axios.get(`${API_URL}/api/auth-v2/me`, {
              headers: { Authorization: `Bearer ${storedToken}` }
            });
            setToken(storedToken);
            setUser(userData);
          } catch {
            // Token expired or invalid
            localStorage.removeItem('auth_token');
          }
        }
      } catch {
        // Widget config fetch failed
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Listen for auth messages from parent (in case login happens in popup)
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'chipi-auth-token' && e.data?.token) {
        localStorage.setItem('auth_token', e.data.token);
        setToken(e.data.token);
        // Re-fetch user
        axios.get(`${API_URL}/api/auth-v2/me`, {
          headers: { Authorization: `Bearer ${e.data.token}` }
        }).then(r => setUser(r.data)).catch(() => {});
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Close widget (notify parent)
  const closeWidget = () => {
    window.parent.postMessage({ type: 'chipi-widget-close' }, '*');
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!config?.enabled) {
    return (
      <div className="h-screen flex items-center justify-center bg-background p-6 text-center">
        <p className="text-sm text-muted-foreground">Widget is currently disabled.</p>
      </div>
    );
  }

  // Get enabled nav items
  const enabledNav = NAV_ITEMS.filter(
    item => config.features?.[item.key]
  ).sort((a, b) => (config.features[a.key]?.order || 0) - (config.features[b.key]?.order || 0));

  // Auto-select first enabled tab if current is disabled
  if (!config.features?.[activeTab] && enabledNav.length > 0) {
    setActiveTab(enabledNav[0].key);
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground" data-testid="widget-shell">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-card" data-testid="widget-header">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <BookOpen className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold">ChiPi Link</span>
        </div>
        <div className="flex items-center gap-1">
          {user && (
            <span className="text-[10px] text-muted-foreground mr-1 hidden sm:inline">
              {user.display_name || user.nombre || user.email}
            </span>
          )}
          <button
            onClick={closeWidget}
            className="p-1 rounded hover:bg-muted transition-colors"
            data-testid="widget-close-btn"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {!token ? (
        <LoginPrompt />
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b bg-card" data-testid="widget-nav">
            {enabledNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  data-testid={`widget-tab-${item.key}`}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors border-b-2 ${
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* View Content */}
          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === 'textbook_orders' && <TextbookOrdersView token={token} />}
            {activeTab === 'my_students' && <MyStudentsView token={token} />}
            {activeTab === 'order_status' && <OrderStatusView token={token} />}
            {activeTab === 'notifications' && <NotificationsView token={token} />}
          </div>
        </div>
      )}
    </div>
  );
}
