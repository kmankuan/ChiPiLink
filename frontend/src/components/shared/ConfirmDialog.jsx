/**
 * ConfirmDialog — Reusable confirmation dialog for destructive actions
 */
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Archive, Trash2 } from 'lucide-react';

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  description,
  confirmLabel = 'Confirm',
  variant = 'destructive', // 'destructive' | 'warning' | 'default'
  loading = false,
  icon,
  children,
}) {
  const icons = {
    destructive: Trash2,
    warning: Archive,
    default: AlertTriangle,
  };
  const Icon = icon || icons[variant] || AlertTriangle;

  const colors = {
    destructive: 'text-red-600',
    warning: 'text-amber-600',
    default: 'text-foreground',
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${colors[variant]}`}>
            <Icon className="h-5 w-5" /> {title}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 text-sm">
          {description && <p className="text-muted-foreground mb-3">{description}</p>}
          {children}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={variant} onClick={onConfirm} disabled={loading} data-testid="confirm-action-btn">
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
