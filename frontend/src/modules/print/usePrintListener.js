/**
 * usePrintListener — Listens for real-time print_job events from WebSocket.
 * When Monday.com triggers a print, shows notification and optionally auto-prints.
 */
import { useCallback } from 'react';
import { useRealtimeEvent } from '@/contexts/RealtimeContext';
import { toast } from 'sonner';

export function usePrintListener(onPrintJob) {
  const handler = useCallback((data) => {
    if (data?.type !== 'print_job') return;

    const orderCount = data.order_count || data.order_ids?.length || 0;
    const source = data.source === 'monday' ? 'from Monday.com' : '';

    toast.info(`Print job received: ${orderCount} order(s)`, {
      description: source || 'Print job queued',
      action: {
        label: 'Print Now',
        onClick: () => onPrintJob?.(data),
      },
    });
    onPrintJob?.(data);
  }, [onPrintJob]);

  useRealtimeEvent('print_job', handler);
}
