/**
 * PrintDialog — Shows preview of selected orders as package lists and prints.
 *
 * Since the LR2000E is installed as the default Windows printer,
 * we use window.print() through the Windows print system.
 * The CSS is optimized for 72mm thermal receipt paper.
 *
 * "Print to LR2000E" = opens a thermal-formatted window and triggers window.print()
 * "Browser Print" = opens a standard-formatted window for regular printers
 */
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Printer, ChevronLeft, ChevronRight, Loader2, Eye
} from 'lucide-react';
import PackageListPreview from './PackageListPreview';
import { toast } from 'sonner';
import RESOLVED_API_URL from '@/config/apiUrl';

const API_URL = RESOLVED_API_URL;

export default function PrintDialog({ open, onOpenChange, orderIds, token, onPrintComplete }) {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [formatConfig, setFormatConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [printing, setPrinting] = useState(false);
  const [jobId, setJobId] = useState(null);
  const printRef = useRef(null);

  useEffect(() => {
    if (open && orderIds?.length > 0) {
      fetchPrintData();
      setCurrentPage(0);
    }
  }, [open, orderIds]);

  const fetchPrintData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/print/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ order_ids: orderIds }),
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setFormatConfig(data.format_config || {});
        setJobId(data.job_id || null);
      }
    } catch (err) {
      console.error('Error fetching print data:', err);
    } finally {
      setLoading(false);
    }
  };

  const markJobComplete = async () => {
    if (!jobId) return;
    try {
      await fetch(`${API_URL}/api/print/jobs/${jobId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Error marking print job complete:', err);
    }
  };

  const markOrdersPrinted = async () => {
    try {
      await fetch(`${API_URL}/api/sysbook/orders/admin/mark-printed`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ order_ids: orderIds }),
      });
      onPrintComplete?.();
    } catch (err) {
      console.error('Error marking orders printed:', err);
    }
  };

  /** Print to thermal printer (LR2000E) — uses the Windows default printer */
  const handleThermalPrint = async () => {
    setPrinting(true);

    try {
      // Fetch fresh thermal HTML from backend at print time
      const ids = orderIds.join(',');
      const url = `${API_URL}/api/print/thermal-page?order_ids=${encodeURIComponent(ids)}&token=${encodeURIComponent(token)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const html = await res.text();

      // Open popup and write the HTML using document.write (same pattern as Standard Print)
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (!printWindow) {
        toast.error('Pop-up blocked. Please allow pop-ups for this site.');
        setPrinting(false);
        return;
      }

      printWindow.document.write(html);
      printWindow.document.close();

      // Wait for content to render, then print
      printWindow.onafterprint = () => {
        printWindow.close();
        setPrinting(false);
        markJobComplete();
        markOrdersPrinted();
        toast.success(`${orders.length} receipt(s) sent to printer`);
      };

      setTimeout(() => {
        printWindow.print();
        // Fallback close after 30s if onafterprint doesn't fire
        setTimeout(() => {
          if (!printWindow.closed) printWindow.close();
          setPrinting(false);
        }, 30000);
      }, 800);
    } catch (err) {
      console.error('Thermal print error:', err);
      toast.error('Failed to load print data. Please try again.');
      setPrinting(false);
    }
  };

  /** Standard browser print (for regular paper printers) */
  const handleBrowserPrint = () => {
    setPrinting(true);

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      setPrinting(false);
      return;
    }

    const content = printRef.current?.innerHTML || '';
    const paperWidth = formatConfig?.paper_size === '58mm' ? '58mm' : '80mm';

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Package Lists</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; width: ${paperWidth}; }
    .package-list-page { padding: 8px; page-break-after: always; }
    .package-list-page:last-child { page-break-after: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 2px 4px; text-align: left; font-size: 11px; }
    th { border-bottom: 1px solid #333; font-weight: bold; }
    td { border-bottom: 1px dotted #ccc; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .font-mono { font-family: 'Courier New', monospace; }
    .border-b { border-bottom: 1px solid #ddd; }
    .border-dashed { border-style: dashed; }
    .mb-2 { margin-bottom: 4px; }
    .mb-3 { margin-bottom: 8px; }
    .mb-4 { margin-bottom: 12px; }
    .mt-2 { margin-top: 4px; }
    .mt-6 { margin-top: 20px; }
    .pb-2 { padding-bottom: 4px; }
    .pb-3 { padding-bottom: 8px; }
    .pt-3 { padding-top: 8px; }
    .pt-4 { padding-top: 12px; }
    .py-1 { padding-top: 2px; padding-bottom: 2px; }
    .mx-auto { margin-left: auto; margin-right: auto; }
    .w-48 { width: 150px; }
    .h-8 { height: 24px; }
    .flex { display: flex; }
    .justify-between { justify-content: space-between; }
    .items-center { align-items: center; }
    .gap-1 { gap: 4px; }
    .space-y-2 > * + * { margin-top: 4px; }
    .text-xs { font-size: 10px; }
    .text-sm { font-size: 11px; }
    .text-base { font-size: 12px; }
    .text-gray-400 { color: #9ca3af; }
    .text-gray-500 { color: #6b7280; }
    .text-gray-600 { color: #4b5563; }
    .border-gray-100 { border-color: #f3f4f6; }
    .border-gray-200 { border-color: #e5e7eb; }
    .border-gray-300 { border-color: #d1d5db; }
    .border-gray-400 { border-color: #9ca3af; }
    .rounded-sm { border-radius: 2px; }
    .inline-block { display: inline-block; }
    @media print {
      body { width: ${paperWidth}; margin: 0; }
      .package-list-page { padding: 4px; }
    }
  </style>
</head>
<body>${content}</body>
</html>`);

    printWindow.document.close();
    printWindow.onafterprint = () => {
      printWindow.close();
      setPrinting(false);
      markJobComplete();
      markOrdersPrinted();
    };

    setTimeout(() => {
      printWindow.print();
      setTimeout(() => {
        if (!printWindow.closed) printWindow.close();
        setPrinting(false);
      }, 10000);
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            {t('print.preview', 'Print Preview')}
            <Badge variant="secondary">{orders.length} {t('print.orders', 'orders')}</Badge>
          </DialogTitle>
          <DialogDescription>
            {t('print.previewDesc', 'Review package lists before printing')}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('print.noOrders', 'No orders found for printing')}
          </div>
        ) : (
          <>
            {/* Preview Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                data-testid="print-prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentPage + 1} / {orders.length}
                {orders[currentPage] && (
                  <span className="ml-2 font-medium">{orders[currentPage].student_name}</span>
                )}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(orders.length - 1, currentPage + 1))}
                disabled={currentPage >= orders.length - 1}
                data-testid="print-next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Preview Area */}
            <div className="flex-1 overflow-y-auto border rounded-lg bg-gray-50 dark:bg-gray-900 min-h-[300px]">
              {orders[currentPage] && (
                <PackageListPreview
                  order={orders[currentPage]}
                  formatConfig={formatConfig}
                  isLast
                />
              )}
            </div>

            {/* Hidden full content for standard browser printing */}
            <div ref={printRef} className="hidden">
              {orders.map((order, idx) => (
                <PackageListPreview
                  key={order.order_id}
                  order={order}
                  formatConfig={formatConfig}
                  isLast={idx === orders.length - 1}
                />
              ))}
            </div>

            <Separator />

            {/* Print Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleThermalPrint}
                className="flex-1 gap-2"
                disabled={printing}
                data-testid="thermal-print-btn"
              >
                {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                Print to LR2000E ({orders.length})
              </Button>
              <Button
                onClick={handleBrowserPrint}
                className="gap-2"
                disabled={printing}
                variant="outline"
                data-testid="print-btn"
              >
                <Eye className="h-4 w-4" />
                {t('print.browserPrint', 'Standard Print')}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
