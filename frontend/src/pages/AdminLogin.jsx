/**
 * AdminLogin — Dedicated admin login page at /admin/login
 * Email/password auth for administrators and moderators only.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, Lock, Mail, Shield } from 'lucide-react';

export default function AdminLogin() {
  const { t } = useTranslation();
  const { login, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // If already authenticated as admin, redirect to dashboard
  if (isAuthenticated && isAdmin) {
    navigate('/admin', { replace: true });
    return null;
  }

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(formData.email, formData.password);
      if (user.is_admin) {
        toast.success(`Welcome, ${user.name}!`);
        navigate('/admin');
      } else {
        toast.error(t('admin.notAdmin', 'This account does not have admin access'));
        navigate('/');
      }
    } catch (error) {
      const message = error.response?.data?.detail || t('auth.loginError', 'Login failed');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="w-full max-w-sm">
        <div className="bg-card rounded-2xl shadow-2xl border border-border/50 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <h1 className="font-serif text-2xl font-bold">{t('admin.loginTitle', 'Admin Access')}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('admin.loginSubtitle', 'For administrators and moderators only')}
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email', 'Email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="h-12 pl-10 rounded-lg"
                  required
                  data-testid="admin-email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t('auth.password', 'Password')}</Label>
                <Link to="/recuperar-contrasena" className="text-xs text-primary hover:underline">
                  {t('auth.forgotPassword', 'Forgot password?')}
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="h-12 pl-10 pr-10 rounded-lg"
                  required
                  data-testid="admin-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-lg text-base font-medium"
              disabled={loading}
              data-testid="admin-login-submit"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('common.loading', 'Loading...')}</>
              ) : (
                t('auth.login', 'Login')
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            <Link to="/" className="hover:underline">
              ← {t('admin.backToSite', 'Back to site')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
