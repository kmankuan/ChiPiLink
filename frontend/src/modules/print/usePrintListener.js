/**
 * usePrintListener — Listens for real-time print_job events from WebSocket.
 * When Monday.com triggers a print, this shows a notification and opens the PrintDialog.
 */
import { useEffect, useCallback } from 'react';
import { useRealtimeEvent } from '@/contexts/RealtimeContext';
import { toast } from 'sonner';

export function usePrintListener(onPrintJob) {
  const handler = useCallback((data) => {
    if (data?.type === 'print_job') {
      toast.info(`Print job received: ${data.order_count} order(s)`, {
        description: data.source === 'monday' ? 'Triggered from Monday.com' : 'Print job queued',
        action: {
          label: 'Print',
          onClick: () => onPrintJob?.(data),
        },
      });
      onPrintJob?.(data);
    }
  }, [onPrintJob]);

  useRealtimeEvent('print_job', handler);
}
