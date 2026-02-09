/**
 * EmbedWidget — Standalone mini-dashboard rendered inside an iframe.
 * Supports streamlined textbook ordering flow:
 *   LaoPan Login → Link Student → Textbook Orders → Wallet
 * Respects admin display config (hide URL, hide nav/footer, streamlined mode).
 */
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast, Toaster } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BookOpen, Users, Package, Bell, ChevronRight, ChevronLeft,
  Loader2, LogIn, X, ShoppingCart, CheckCircle, Clock, AlertCircle,
  Wallet, UserPlus, GraduationCap, ExternalLink
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/* ── Status helpers ── */
const STATUS_MAP = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600', icon: Clock },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700', icon: Package },
  processing: { label: 'Processing', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  ready: { label: 'Ready', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  delivered: { label: 'Delivered', color: 'bg-green-200 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.draft;
  const Icon = s.icon;
  return (
    <Badge className={`${s.color} gap-1 text-[10px] font-medium`} data-testid={`status-${status}`}>
      <Icon className="h-3 w-3" /> {s.label}
    </Badge>
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

/* ── Login Prompt (LaoPan only) ── */
function LoginPrompt() {
  const handleLogin = () => {
    const mainAppUrl = API_URL?.replace('/api', '') || window.location.origin;
    window.open(`${mainAppUrl}/login?redirect=${encodeURIComponent(window.location.href)}`, '_blank');
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center" data-testid="widget-login-prompt">
      <div className="p-4 rounded-full bg-primary/10">
        <LogIn className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h3 className="text-base font-semibold">Welcome</h3>
        <p className="text-xs text-muted-foreground mt-1">Log in with your LaoPan account to continue</p>
      </div>
      <Button onClick={handleLogin} data-testid="widget-login-btn" className="gap-2">
        <LogIn className="h-4 w-4" /> Log in with LaoPan
      </Button>
    </div>
  );
}

/* ── Link Student View ── */
function LinkStudentView({ token, onStudentLinked }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', grade: '', school_id: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error('Please enter the student name');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/store/textbook-access/students`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Student linked successfully!');
      onStudentLinked();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to link student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4" data-testid="widget-link-student">
      <div className="text-center mb-2">
        <div className="inline-flex p-3 rounded-full bg-primary/10 mb-2">
          <UserPlus className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-sm font-semibold">Link Your Student</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Add your child's information to access textbook ordering
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">First Name</Label>
            <Input
              value={form.first_name}
              onChange={(e) => setForm(p => ({ ...p, first_name: e.target.value }))}
              className="h-8 text-xs"
              placeholder="First name"
              data-testid="widget-student-first-name"
            />
          </div>
          <div>
            <Label className="text-xs">Last Name</Label>
            <Input
              value={form.last_name}
              onChange={(e) => setForm(p => ({ ...p, last_name: e.target.value }))}
              className="h-8 text-xs"
              placeholder="Last name"
              data-testid="widget-student-last-name"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">Grade</Label>
          <Input
            value={form.grade}
            onChange={(e) => setForm(p => ({ ...p, grade: e.target.value }))}
            className="h-8 text-xs"
            placeholder="e.g. 3, K5"
            data-testid="widget-student-grade"
          />
        </div>
        <Button type="submit" className="w-full gap-2" disabled={loading} data-testid="widget-link-submit">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Link Student
        </Button>
      </form>
    </div>
  );
}

/* ── Textbook Orders View (streamlined) ── */
function TextbookOrdersView({ token, students }) {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [order, setOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  // Auto-select if only one approved student
  useEffect(() => {
    const approved = students.filter(s =>
      s.enrollments?.some(e => e.status === 'approved')
    );
    if (approved.length === 1 && !selectedStudent) {
      selectStudent(approved[0]);
    }
  }, [students]);

  const selectStudent = async (student) => {
    setSelectedStudent(student);
    setLoadingOrder(true);
    try {
      const sid = student.student_id || student._id || student.id;
      const { data } = await axios.get(`${API_URL}/api/store/textbook-orders/student/${sid}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrder(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load textbooks');
    } finally {
      setLoadingOrder(false);
    }
  };

  // Student selection
  if (!selectedStudent) {
    const approved = students.filter(s =>
      s.enrollments?.some(e => e.status === 'approved')
    );
    if (approved.length === 0) {
      return (
        <div className="text-center py-6 px-4" data-testid="widget-no-approved">
          <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">Enrollment Pending</p>
          <p className="text-xs text-muted-foreground mt-1">
            Your student's enrollment is awaiting approval. Textbooks will be available once approved.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2 p-1" data-testid="widget-student-select">
        <p className="text-xs text-muted-foreground px-1">Select a student:</p>
        {approved.map((s, i) => {
          const enrollment = s.enrollments?.find(e => e.status === 'approved');
          return (
            <button
              key={i}
              onClick={() => selectStudent(s)}
              data-testid={`widget-student-${i}`}
              className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors text-left"
            >
              <div>
                <p className="text-xs font-medium">{s.full_name || `${s.first_name} ${s.last_name}`}</p>
                <p className="text-[10px] text-muted-foreground">
                  Grade {enrollment?.grade || '—'}
                </p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    );
  }

  // Textbook list for selected student
  if (loadingOrder) return <LoadingSpinner />;

  const items = order?.items || [];
  const orderedItems = items.filter(i => i.status === 'ordered');
  const availableItems = items.filter(i => i.status === 'available');
  const totalOrdered = orderedItems.reduce((s, i) => s + i.price * i.quantity_ordered, 0);

  return (
    <div className="space-y-3" data-testid="widget-textbook-list">
      <div className="flex items-center justify-between">
        {students.filter(s => s.enrollments?.some(e => e.status === 'approved')).length > 1 && (
          <button onClick={() => { setSelectedStudent(null); setOrder(null); }} className="flex items-center gap-1 text-xs text-primary hover:underline" data-testid="widget-back-btn">
            <ChevronLeft className="h-3 w-3" /> Back
          </button>
        )}
        <div className="flex-1 text-right">
          <p className="text-xs font-semibold">
            {selectedStudent.full_name || `${selectedStudent.first_name} ${selectedStudent.last_name}`}
          </p>
        </div>
      </div>

      {order?.status === 'submitted' && orderedItems.length > 0 && (
        <Card className="bg-green-50 border-green-200 p-2.5">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
            <div>
              <p className="text-xs font-medium text-green-800">Order Submitted</p>
              <p className="text-[10px] text-green-700">{orderedItems.length} books ordered — ${totalOrdered.toFixed(2)}</p>
            </div>
          </div>
        </Card>
      )}

      {availableItems.length > 0 && (
        <>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Available Textbooks</p>
          {availableItems.map((item, i) => (
            <Card key={i} className="p-2.5" data-testid={`widget-book-${i}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{item.book_name}</p>
                  {item.book_code && <p className="text-[10px] text-muted-foreground">{item.book_code}</p>}
                </div>
                <span className="text-xs font-semibold text-primary ml-2">${item.price?.toFixed(2)}</span>
              </div>
            </Card>
          ))}
        </>
      )}

      {orderedItems.length > 0 && (
        <>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mt-2">Ordered</p>
          {orderedItems.map((item, i) => (
            <Card key={i} className="p-2.5 opacity-70" data-testid={`widget-ordered-${i}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{item.book_name}</p>
                  <p className="text-[10px] text-muted-foreground">{item.book_code}</p>
                </div>
                <Badge className="text-[9px] bg-green-100 text-green-700">Ordered</Badge>
              </div>
            </Card>
          ))}
        </>
      )}

      {items.length === 0 && (
        <div className="text-center py-6">
          <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No textbooks available for this grade yet.</p>
        </div>
      )}

      <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => {
        window.open(`${API_URL?.replace('/api', '')}/unatienda?tab=private`, '_blank');
      }} data-testid="widget-go-to-order">
        <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open Full Order Page
      </Button>
    </div>
  );
}

/* ── Wallet View ── */
function WalletView({ token }) {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [walletRes, txRes] = await Promise.all([
          axios.get(`${API_URL}/api/wallet/me`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/api/wallet/transactions?limit=10`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setWallet(walletRes.data);
        setTransactions(txRes.data?.transactions || txRes.data || []);
      } catch {
        // Wallet may not exist yet
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  if (loading) return <LoadingSpinner />;

  const balance = wallet?.balance ?? wallet?.saldo ?? 0;

  return (
    <div className="space-y-3" data-testid="widget-wallet">
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Balance</p>
          <p className="text-2xl font-bold text-primary" data-testid="widget-wallet-balance">
            ${typeof balance === 'number' ? balance.toFixed(2) : '0.00'}
          </p>
        </CardContent>
      </Card>

      {transactions.length > 0 && (
        <>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Recent Transactions</p>
          {transactions.slice(0, 5).map((tx, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg border text-xs" data-testid={`widget-tx-${i}`}>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{tx.description || tx.descripcion || tx.type || 'Transaction'}</p>
                <p className="text-[10px] text-muted-foreground">
                  {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : ''}
                </p>
              </div>
              <span className={`font-semibold ml-2 ${(tx.amount || tx.monto || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {(tx.amount || tx.monto || 0) >= 0 ? '+' : ''}${Math.abs(tx.amount || tx.monto || 0).toFixed(2)}
              </span>
            </div>
          ))}
        </>
      )}

      {transactions.length === 0 && !loading && (
        <p className="text-xs text-center py-4 text-muted-foreground">No transactions yet.</p>
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

/* ── Nav items for non-streamlined mode ── */
const NAV_ITEMS = [
  { key: 'textbook_orders', label: 'Textbooks', icon: BookOpen },
  { key: 'my_students', label: 'Students', icon: Users },
  { key: 'order_status', label: 'Orders', icon: Package },
  { key: 'notifications', label: 'Alerts', icon: Bell },
  { key: 'wallet', label: 'Wallet', icon: Wallet },
];

/* ── Main Widget Shell ── */
export default function EmbedWidget() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState(null); // null = not loaded
  const [activeTab, setActiveTab] = useState('textbook_orders');

  const display = config?.display || {};
  const streamlined = display.streamlined_flow !== false;
  const hideNavbar = display.hide_navbar !== false;
  const hideUrlBar = display.hide_url_bar !== false;

  // Fetch config + auth
  useEffect(() => {
    const init = async () => {
      try {
        const { data: cfg } = await axios.get(`${API_URL}/api/widget/embed-config`);
        setConfig(cfg);

        const storedToken = localStorage.getItem('auth_token');
        if (storedToken) {
          try {
            const { data: userData } = await axios.get(`${API_URL}/api/auth-v2/me`, {
              headers: { Authorization: `Bearer ${storedToken}` }
            });
            setToken(storedToken);
            setUser(userData);
          } catch {
            localStorage.removeItem('auth_token');
          }
        }
      } catch {} finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Listen for auth from popup
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'chipi-auth-token' && e.data?.token) {
        localStorage.setItem('auth_token', e.data.token);
        setToken(e.data.token);
        axios.get(`${API_URL}/api/auth-v2/me`, {
          headers: { Authorization: `Bearer ${e.data.token}` }
        }).then(r => setUser(r.data)).catch(() => {});
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Load students after auth
  useEffect(() => {
    if (!token) return;
    axios.get(`${API_URL}/api/store/textbook-access/my-students`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => setStudents(r.data?.students || r.data || []))
      .catch(() => setStudents([]));
  }, [token]);

  const closeWidget = () => {
    window.parent.postMessage({ type: 'chipi-widget-close' }, '*');
  };

  const reloadStudents = () => {
    if (!token) return;
    axios.get(`${API_URL}/api/store/textbook-access/my-students`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => setStudents(r.data?.students || r.data || []))
      .catch(() => setStudents([]));
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

  // ── Not logged in ──
  if (!token) {
    return (
      <div className="h-screen flex flex-col bg-background text-foreground" data-testid="widget-shell">
        <Toaster position="top-center" richColors />
        {!hideNavbar && (
          <WidgetHeader user={null} hideUrl={hideUrlBar} onClose={closeWidget} />
        )}
        <div className="flex-1">
          <LoginPrompt />
        </div>
      </div>
    );
  }

  // ── Streamlined flow ──
  if (streamlined) {
    const hasStudents = students && students.length > 0;
    const studentsLoaded = students !== null;

    return (
      <div className="h-screen flex flex-col bg-background text-foreground" data-testid="widget-shell">
        <Toaster position="top-center" richColors />
        {!hideNavbar && (
          <WidgetHeader user={user} hideUrl={hideUrlBar} onClose={closeWidget} />
        )}

        {/* Streamlined nav: Textbooks + Wallet */}
        <div className="flex border-b bg-card" data-testid="widget-nav">
          <button
            onClick={() => setActiveTab('textbook_orders')}
            data-testid="widget-tab-textbooks"
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors border-b-2 ${
              activeTab === 'textbook_orders' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="h-4 w-4" /> Textbooks
          </button>
          {config.features?.wallet?.enabled !== false && (
            <button
              onClick={() => setActiveTab('wallet')}
              data-testid="widget-tab-wallet"
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors border-b-2 ${
                activeTab === 'wallet' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Wallet className="h-4 w-4" /> Wallet
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {activeTab === 'wallet' ? (
            <WalletView token={token} />
          ) : !studentsLoaded ? (
            <LoadingSpinner />
          ) : !hasStudents ? (
            <LinkStudentView token={token} onStudentLinked={reloadStudents} />
          ) : (
            <TextbookOrdersView token={token} students={students} />
          )}
        </div>
      </div>
    );
  }

  // ── Full feature mode (non-streamlined) ──
  const enabledNav = NAV_ITEMS.filter(
    item => config.features?.[item.key]?.enabled !== false
  ).sort((a, b) => (config.features?.[a.key]?.order || 0) - (config.features?.[b.key]?.order || 0));

  if (!config.features?.[activeTab]?.enabled && enabledNav.length > 0) {
    setActiveTab(enabledNav[0].key);
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground" data-testid="widget-shell">
      <Toaster position="top-center" richColors />

      {!hideNavbar && (
        <WidgetHeader user={user} hideUrl={hideUrlBar} onClose={closeWidget} />
      )}

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
                  isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {activeTab === 'textbook_orders' && students && (
            <TextbookOrdersView token={token} students={students} />
          )}
          {activeTab === 'wallet' && <WalletView token={token} />}
          {activeTab === 'notifications' && <NotificationsView token={token} />}
        </div>
      </div>
    </div>
  );
}

/* ── Widget Header ── */
function WidgetHeader({ user, hideUrl, onClose }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b bg-card" data-testid="widget-header">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
          <BookOpen className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="text-sm font-bold">ChiPi Link</span>
      </div>
      <div className="flex items-center gap-1">
        {user && !hideUrl && (
          <span className="text-[10px] text-muted-foreground mr-1 hidden sm:inline">
            {user.display_name || user.nombre || user.email}
          </span>
        )}
        {user && hideUrl && (
          <span className="text-[10px] text-muted-foreground mr-1 hidden sm:inline">
            {user.display_name || user.nombre || user.email?.split('@')[0]}
          </span>
        )}
        <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors" data-testid="widget-close-btn">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
