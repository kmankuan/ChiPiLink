/**
 * usePrintListener — Listens for real-time print_job events from WebSocket.
 * When Monday.com triggers a print, this shows a notification and opens the PrintDialog.
 * If auto_print is enabled and thermal printer is connected, prints directly.
 */
import { useEffect, useCallback } from 'react';
import { useRealtimeEvent } from '@/contexts/RealtimeContext';
import { toast } from 'sonner';
import thermalPrinter from '@/services/ThermalPrinterService';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export function usePrintListener(onPrintJob) {
  const handler = useCallback(async (data) => {
    if (data?.type !== 'print_job') return;

    const orderCount = data.order_count || data.order_ids?.length || 0;
    const source = data.source === 'monday' ? 'from Monday.com' : '';

    // If thermal printer is connected and has orders, try auto-print
    if (thermalPrinter.connected && data.job_id) {
      try {
        // Fetch the full print job data
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${API}/api/print/jobs/${data.job_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const job = await res.json();
          const orders = job.orders || [];
          if (orders.length > 0) {
            await thermalPrinter.printOrders(orders, {
              title: 'PACKAGE LIST',
              footer: 'Thank you!',
            });
            // Mark as complete
            await fetch(`${API}/api/print/jobs/${data.job_id}/complete`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            });
            toast.success(`Auto-printed ${orders.length} receipt(s) ${source}`, {
              description: `Job ${data.job_id}`,
            });
            return;
          }
        }
      } catch (err) {
        console.error('[usePrintListener] Auto-print failed:', err);
        toast.error(`Auto-print failed: ${err.message}. Use manual print.`);
      }
    }

    // Fallback: show notification with manual print action
    toast.info(`Print job received: ${orderCount} order(s)`, {
      description: source || 'Print job queued',
      action: {
        label: 'Print',
        onClick: () => onPrintJob?.(data),
      },
    });
    onPrintJob?.(data);
  }, [onPrintJob]);

  useRealtimeEvent('print_job', handler);
}
