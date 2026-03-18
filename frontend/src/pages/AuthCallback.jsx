import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const { processGoogleCallback } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        // Extract session_id from URL fragment
        const hash = location.hash;
        const sessionId = hash.split('session_id=')[1]?.split('&')[0];
        
        if (!sessionId) {
          toast.error('Error de autenticación');
          navigate('/login');
          return;
        }

        const user = await processGoogleCallback(sessionId);
        toast.success(`Welcome, ${user.name}!`);
        navigate(user.is_admin ? '/admin' : '/dashboard', { 
          replace: true,
          state: { user }
        });
      } catch (error) {
        console.error('Auth callback error:', error);
        toast.error('Error al procesar la autenticación');
        navigate('/login');
      }
    };

    processAuth();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Procesando autenticación...</p>
      </div>
    </div>
  );
}
