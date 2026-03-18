/**
 * ImpersonationBanner — Shown at the top of the page when admin is
 * viewing the app as another user. Provides an "Exit" button to return
 * to the admin panel.
 */
import { useAuth } from '@/contexts/AuthContext';
import { Eye, X } from 'lucide-react';

export function ImpersonationBanner() {
  const { isImpersonating, impersonationTarget, exitImpersonation } = useAuth();

  if (!isImpersonating) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 text-xs font-medium flex items-center justify-center gap-2 py-1.5 px-4 shadow-md"
      data-testid="impersonation-banner"
    >
      <Eye className="h-3.5 w-3.5 shrink-0" />
      <span>
        Viewing as <strong>{impersonationTarget?.name || impersonationTarget?.email || 'User'}</strong>
        <span className="opacity-70 ml-1">(Admin impersonation - 30 min)</span>
      </span>
      <button
        onClick={exitImpersonation}
        className="ml-2 inline-flex items-center gap-1 bg-amber-950/20 hover:bg-amber-950/30 rounded px-2 py-0.5 transition-colors"
        data-testid="exit-impersonation-btn"
      >
        <X className="h-3 w-3" />
        Exit
      </button>
    </div>
  );
}
