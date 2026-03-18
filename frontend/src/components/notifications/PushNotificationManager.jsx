/**
 * PushNotificationManager — Auto-links OneSignal identity on login
 * and shows a subtle subscribe prompt for unsubscribed users.
 */
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOneSignal } from '@/contexts/OneSignalContext';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PushNotificationManager() {
  const { user, isAuthenticated } = useAuth();
  const { isInitialized, isSubscribed, subscribe, setExternalUserId, addTags, permission } = useOneSignal();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Auto-link OneSignal identity when user logs in
  useEffect(() => {
    if (!isInitialized || !isAuthenticated || !user) return;
    const userId = user.user_id || user.id;
    if (userId) {
      setExternalUserId(userId);
      addTags({
        user_role: user.is_admin ? 'admin' : 'user',
        app: 'chipilink',
      });
    }
  }, [isInitialized, isAuthenticated, user, setExternalUserId, addTags]);

  // Show subscribe prompt after a delay if not subscribed
  useEffect(() => {
    if (!isInitialized || !isAuthenticated || isSubscribed || dismissed || permission === 'denied') return;
    const dismissedKey = `push_prompt_dismissed_${user?.user_id || ''}`;
    if (sessionStorage.getItem(dismissedKey)) return;

    const timer = setTimeout(() => setShowPrompt(true), 5000);
    return () => clearTimeout(timer);
  }, [isInitialized, isAuthenticated, isSubscribed, dismissed, permission, user]);

  const handleSubscribe = async () => {
    await subscribe();
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowPrompt(false);
    const dismissedKey = `push_prompt_dismissed_${user?.user_id || ''}`;
    sessionStorage.setItem(dismissedKey, '1');
  };

  if (!showPrompt) return null;

  return (
    <div
      className="fixed bottom-[68px] left-4 right-4 z-40 animate-in slide-in-from-bottom-4 fade-in duration-500"
      data-testid="push-prompt"
    >
      <div className="max-w-sm mx-auto bg-card/95 backdrop-blur-xl rounded-2xl shadow-lg border p-3 flex items-center gap-3">
        <div className="p-2 rounded-full bg-primary/10 shrink-0">
          <Bell className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">Enable Notifications</p>
          <p className="text-[10px] text-muted-foreground">Get alerts for messages & order updates</p>
        </div>
        <Button size="sm" className="h-7 text-xs shrink-0" onClick={handleSubscribe}>
          Enable
        </Button>
        <button onClick={handleDismiss} className="p-1 text-muted-foreground hover:text-foreground shrink-0">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
