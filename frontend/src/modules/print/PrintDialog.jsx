/**
 * PrintDialog — Shows preview of selected orders as package lists and triggers print.
 * Supports multi-order preview with pagination.
 * Uses Web Serial API for direct USB thermal printer printing.
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
  Printer, ChevronLeft, ChevronRight, Loader2, Eye, Usb
} from 'lucide-react';
import PackageListPreview from './PackageListPreview';
import RESOLVED_API_URL from '@/config/apiUrl';

const API_URL = RESOLVED_API_URL;

export default function PrintDialog({ open, onOpenChange, orderIds, token }) {
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

  const handleBrowserPrint = () => {
    setPrinting(true);

    // Create a new window with all package lists for printing
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
    .package-list-page {
      padding: 8px;
      page-break-after: always;
    }
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
    .w-3\\.5 { width: 14px; height: 14px; }
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
    };

    setTimeout(() => {
      printWindow.print();
      // Fallback close after 10s if onafterprint doesn't fire
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

            {/* Hidden full content for printing */}
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
                onClick={handleBrowserPrint}
                className="flex-1 gap-2"
                disabled={printing}
                data-testid="print-btn"
              >
                {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                {t('print.printAll', 'Print All')} ({orders.length})
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
