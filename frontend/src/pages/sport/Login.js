import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LogIn } from 'lucide-react';

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Fill all fields'); return; }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Logged in!');
      navigate('/sport');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-amber-50 p-4">
      <Card className="w-full max-w-sm" data-testid="login-page">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 mx-auto flex items-center justify-center mb-2">
            <span className="text-3xl">🏓</span>
          </div>
          <CardTitle>ChiPi Sport</CardTitle>
          <p className="text-sm text-gray-500">{t('login')}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>{t('email')}</Label>
              <Input data-testid="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" />
            </div>
            <div>
              <Label>{t('password')}</Label>
              <Input data-testid="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <Button data-testid="login-submit" type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700">
              {loading ? t('loading') : <><LogIn size={16} className="mr-2" /> {t('login')}</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
