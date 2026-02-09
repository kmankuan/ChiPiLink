/**
 * WidgetAuthComplete — After OAuth login from widget.
 * Pushes the token to the server-side relay so the widget iframe can pick it up.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function WidgetAuthComplete() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('syncing'); // syncing | done | error

  useEffect(() => {
    const relay = async () => {
      const ws = searchParams.get('ws');
      const token = localStorage.getItem('auth_token');

      if (!ws || !token) {
        setStatus('done'); // No session to relay, just show close message
        return;
      }

      try {
        await axios.post(`${API_URL}/api/widget/auth-session/${ws}/token`, { token });
        setStatus('done');
      } catch (err) {
        console.error('Token relay error:', err);
        setStatus('done'); // Still show close message
      }

      // Try to auto-close after a short delay
      setTimeout(() => {
        try { window.close(); } catch {}
      }, 1500);
    };

    relay();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6" data-testid="widget-auth-complete">
      <div className="max-w-sm w-full text-center space-y-6">
        {status === 'syncing' ? (
          <>
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <p className="text-sm text-muted-foreground">Completing login...</p>
          </>
        ) : (
          <>
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Login Successful!</h2>
              <p className="text-sm text-muted-foreground">
                You can now close this tab and return to the widget.
              </p>
            </div>
            <Button onClick={() => window.close()} className="w-full">
              Close this tab
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
