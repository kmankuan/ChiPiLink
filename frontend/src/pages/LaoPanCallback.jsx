import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * LaoPan OAuth Callback Page
 * Handles the OAuth redirect from LaoPan.online
 */
export default function LaoPanCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { processLaoPanCallback } = useAuth();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');
      const errorDesc = searchParams.get('error_description');

      // Detect if opened as popup by widget
      const isPopup = window.opener != null;

      // Handle OAuth error
      if (errorParam) {
        if (isPopup) {
          window.opener.postMessage({ type: 'chipi-auth-error', error: errorDesc || errorParam }, '*');
          window.close();
          return;
        }
        setError(errorDesc || errorParam);
        setProcessing(false);
        return;
      }

      // Validate required params
      if (!code || !state) {
        if (isPopup) {
          window.opener.postMessage({ type: 'chipi-auth-error', error: 'Incomplete authentication' }, '*');
          window.close();
          return;
        }
        setError('Parámetros de autenticación incompletos');
        setProcessing(false);
        return;
      }

      try {
        const result = await processLaoPanCallback(code, state);

        if (isPopup) {
          // Send token back to the widget iframe via the opener (parent page)
          const token = localStorage.getItem('auth_token');
          window.opener.postMessage({ type: 'chipi-auth-token', token }, '*');
          window.close();
          return;
        }
        
        // Redirect to intended page
        const redirectTo = result.redirectAfter || '/';
        
        // If returning to the widget, skip the toast (widget has its own UI)
        if (redirectTo === '/embed/widget') {
          navigate(redirectTo, { replace: true });
          return;
        }

        toast.success(`¡Bienvenido, ${result.user.name || 'Usuario'}!`);
        navigate(redirectTo, { replace: true });
      } catch (err) {
        console.error('LaoPan callback error:', err);
        const message = err.response?.data?.detail || 'Error al procesar la autenticación';
        if (isPopup) {
          window.opener.postMessage({ type: 'chipi-auth-error', error: message }, '*');
          window.close();
          return;
        }
        setError(message);
        setProcessing(false);
      }
    };

    handleCallback();
  }, [searchParams, processLaoPanCallback, navigate]);

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <h2 className="text-xl font-medium">Procesando autenticación...</h2>
          <p className="text-muted-foreground">Por favor espere mientras verificamos su cuenta</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Error de autenticación</h2>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate('/login')} className="w-full">
              Volver a intentar
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full">
              Ir al inicio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
