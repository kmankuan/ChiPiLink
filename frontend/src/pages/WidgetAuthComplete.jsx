/**
 * WidgetAuthComplete — Shown after OAuth login when initiated from the widget.
 * Saves the token (already done by LaoPanCallback) and tells the user to go back.
 * Also attempts to close the tab automatically.
 */
import { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WidgetAuthComplete() {
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    // Try to close this tab after a short delay
    const timer = setTimeout(() => {
      try {
        window.close();
      } catch {
        // Can't close — show message to user
      }
      setCanClose(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6" data-testid="widget-auth-complete">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Login Successful!</h2>
          <p className="text-sm text-muted-foreground">
            You can now close this tab and return to the widget.
          </p>
        </div>
        {canClose && (
          <Button onClick={() => window.close()} className="w-full">
            Close this tab
          </Button>
        )}
      </div>
    </div>
  );
}
