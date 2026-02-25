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

/**
 * Build thermal receipt HTML for the LR2000E (72mm paper)
 * Uses ESC/POS-style layout in HTML: monospace, narrow, compact
 */
function buildThermalReceiptHTML(orders, formatConfig = {}) {
  const title = formatConfig?.header?.title || 'PACKAGE LIST';
  const footer = formatConfig?.footer?.text || 'Thank you!';
  const now = new Date().toLocaleString();

  const receipts = orders.map((order, idx) => {
    const student = order.student_name || 'Unknown';
    const grade = order.grade || '';
    const orderId = (order.order_id || '').slice(-8);
    const items = order.items || order.books || [];
    const total = items.reduce((s, it) => s + (Number(it.price || 0) * (it.quantity || it.qty || 1)), 0);

    let html = `<div class="receipt${idx < orders.length - 1 ? ' page-break' : ''}">`;

    // Header
    html += `<div class="title">${title}</div>`;
    html += `<div class="subtitle">${now}</div>`;
    html += `<div class="sep"></div>`;

    // Student info
    html += `<div class="section-head">STUDENT</div>`;
    html += `<div class="row"><span>${student}</span></div>`;
    if (grade) html += `<div class="row"><span>Grade: ${grade}</span><span>ID: ${orderId}</span></div>`;
    html += `<div class="sep"></div>`;

    // Items
    if (items.length > 0) {
      html += `<div class="section-head">ITEMS (${items.length})</div>`;
      items.forEach((item, i) => {
        const name = item.title || item.name || item.book_title || `Item ${i + 1}`;
        const qty = item.quantity || item.qty || 1;
        const price = item.price ? `$${Number(item.price).toFixed(2)}` : '';
        html += `<div class="row"><span>${qty}x ${name}</span><span>${price}</span></div>`;
      });
      html += `<div class="sep"></div>`;
      if (total > 0) {
        html += `<div class="row total"><span>TOTAL</span><span>$${total.toFixed(2)}</span></div>`;
        html += `<div class="sep"></div>`;
      }
    }

    // Footer
    html += `<div class="footer">${footer}</div>`;
    html += `</div>`;
    return html;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
<title>Print - ${orders.length} Package List(s)</title>
<style>
  /* Reset */
  * { margin: 0; padding: 0; box-sizing: border-box; }

  /* Page setup for 72mm (80mm with margins) thermal paper */
  @page {
    size: 72mm auto;
    margin: 2mm 3mm;
  }

  body {
    font-family: 'Courier New', 'Consolas', monospace;
    font-size: 11px;
    line-height: 1.3;
    width: 72mm;
    color: #000;
    background: #fff;
  }

  .receipt {
    padding: 2mm 0;
  }

  .page-break {
    page-break-after: always;
    border-bottom: 1px dashed #999;
    margin-bottom: 4mm;
    padding-bottom: 4mm;
  }

  .title {
    text-align: center;
    font-size: 16px;
    font-weight: bold;
    letter-spacing: 1px;
    padding: 2mm 0 1mm;
  }

  .subtitle {
    text-align: center;
    font-size: 9px;
    color: #555;
    margin-bottom: 2mm;
  }

  .sep {
    border-top: 1px dashed #000;
    margin: 1.5mm 0;
  }

  .section-head {
    font-weight: bold;
    font-size: 10px;
    letter-spacing: 0.5px;
    margin: 1mm 0;
  }

  .row {
    display: flex;
    justify-content: space-between;
    padding: 0.5mm 0;
    font-size: 10px;
    gap: 2mm;
  }

  .row span:first-child {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row span:last-child {
    text-align: right;
    white-space: nowrap;
  }

  .row.total {
    font-weight: bold;
    font-size: 12px;
    padding: 1mm 0;
  }

  .footer {
    text-align: center;
    font-size: 9px;
    color: #555;
    margin-top: 3mm;
    padding-bottom: 2mm;
  }

  /* Screen preview */
  @media screen {
    body {
      max-width: 72mm;
      margin: 10mm auto;
      border: 1px solid #ddd;
      padding: 3mm;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
  }

  /* Print: remove shadows, ensure clean output */
  @media print {
    body { width: 72mm; margin: 0; box-shadow: none; border: none; padding: 0; }
  }
</style>
</head>
<body>
${receipts}
</body>
</html>`;
}

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

  /** Print to thermal printer (LR2000E) — uses the Windows default printer */
  const handleThermalPrint = () => {
    setPrinting(true);

    const html = buildThermalReceiptHTML(orders, formatConfig);
    const printWindow = window.open('', '_blank', 'width=320,height=600');
    if (!printWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups for this site.');
      setPrinting(false);
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onafterprint = () => {
      printWindow.close();
      setPrinting(false);
      markJobComplete();
      toast.success(`${orders.length} receipt(s) sent to printer`);
    };

    setTimeout(() => {
      printWindow.print();
      // Fallback close after 15s if onafterprint doesn't fire
      setTimeout(() => {
        if (!printWindow.closed) {
          printWindow.close();
          setPrinting(false);
          markJobComplete();
        }
      }, 15000);
    }, 500);
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
