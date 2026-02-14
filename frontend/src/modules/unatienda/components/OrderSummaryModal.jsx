/**
 * OrderSummaryModal — Confirmation modal before textbook order submission
 * Shows selected books, form data, totals, and wallet balance for user review.
 * Sections are configurable via admin backend (order_summary_config).
 */
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Separator } from '../../../components/ui/separator';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { BookOpen, User, Wallet, FileText, ShoppingCart, Loader2, Check } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function OrderSummaryModal({
  open,
  onOpenChange,
  onConfirm,
  studentName,
  selectedBooks = [],
  formData = {},
  formFields = [],
  total = 0,
  walletBalance = null,
  submitting = false,
  lang = 'es',
  getLocalizedText,
}) {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    if (open && !config) {
      axios.get(`${API_URL}/api/store/order-summary-config`)
        .then(res => setConfig(res.data))
        .catch(() => setConfig({}));
    }
  }, [open, config]);

  // Defaults: show everything
  const show = {
    student_info: config?.show_student_info !== false,
    book_list: config?.show_book_list !== false,
    form_data: config?.show_form_data !== false,
    wallet_balance: config?.show_wallet_balance !== false,
    total: config?.show_total !== false,
  };

  const t = {
    title: lang === 'es' ? 'Resumen del Pedido' : 'Order Summary',
    student: lang === 'es' ? 'Estudiante' : 'Student',
    books: lang === 'es' ? 'Libros Seleccionados' : 'Selected Books',
    formInfo: lang === 'es' ? 'Datos del Formulario' : 'Form Data',
    total: lang === 'es' ? 'Total' : 'Total',
    wallet: lang === 'es' ? 'Saldo de Billetera' : 'Wallet Balance',
    remaining: lang === 'es' ? 'Saldo restante' : 'Remaining balance',
    confirm: lang === 'es' ? 'Confirmar Pedido' : 'Confirm Order',
    cancel: lang === 'es' ? 'Cancelar' : 'Cancel',
    processing: lang === 'es' ? 'Procesando...' : 'Processing...',
    payWith: lang === 'es' ? 'Pago con Billetera' : 'Wallet Payment',
  };

  const remaining = walletBalance !== null ? walletBalance - total : null;

  // Get display value for form fields
  const getFieldDisplayValue = (field) => {
    const val = formData[field.field_id];
    if (val === undefined || val === null || val === '') return null;
    if (field.field_type === 'checkbox') return val ? (lang === 'es' ? 'Si' : 'Yes') : (lang === 'es' ? 'No' : 'No');
    if (field.field_type === 'select' || field.field_type === 'multiselect') {
      const options = field.options || [];
      if (Array.isArray(val)) {
        return val.map(v => {
          const opt = options.find(o => o.value === v);
          return opt ? (getLocalizedText ? getLocalizedText(opt, 'label') : opt.label) : v;
        }).join(', ');
      }
      const opt = options.find(o => o.value === val);
      return opt ? (getLocalizedText ? getLocalizedText(opt, 'label') : opt.label) : val;
    }
    if (field.field_type === 'file') return lang === 'es' ? 'Archivo adjunto' : 'File attached';
    return String(val);
  };

  const filledFields = formFields.filter(f => {
    const val = formData[f.field_id];
    return val !== undefined && val !== null && val !== '' && f.field_type !== 'info';
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0" data-testid="order-summary-modal">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-4 w-4 text-purple-600" />
            {t.title}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-5 py-3 overflow-auto">
          <div className="space-y-4">

            {/* Student Info */}
            {show.student_info && studentName && (
              <div className="flex items-center gap-2" data-testid="summary-student-info">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">{t.student}:</span>
                <span className="text-sm font-medium">{studentName}</span>
              </div>
            )}

            {/* Book List */}
            {show.book_list && selectedBooks.length > 0 && (
              <div data-testid="summary-book-list">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4 text-purple-600 shrink-0" />
                  <span className="text-sm font-medium">{t.books} ({selectedBooks.length})</span>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 divide-y divide-border">
                  {selectedBooks.map((book, i) => (
                    <div key={book.book_id || i} className="flex items-center justify-between px-3 py-2" data-testid={`summary-book-${i}`}>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Check className="h-3 w-3 text-purple-600 shrink-0" />
                        <span className="text-sm truncate">{book.book_name || book.name || book.book_id}</span>
                      </div>
                      <span className="text-sm font-semibold text-purple-700 dark:text-purple-400 ml-2 shrink-0">
                        ${(book.price || 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form Data */}
            {show.form_data && filledFields.length > 0 && (
              <div data-testid="summary-form-data">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-sm font-medium">{t.formInfo}</span>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 space-y-1.5">
                  {filledFields.map(field => {
                    const displayVal = getFieldDisplayValue(field);
                    if (!displayVal) return null;
                    const label = getLocalizedText ? getLocalizedText(field, 'label') : field.label;
                    return (
                      <div key={field.field_id} className="flex justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">{label}:</span>
                        <span className="font-medium text-right">{displayVal}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Separator />

            {/* Total & Wallet */}
            <div className="space-y-2" data-testid="summary-totals">
              {show.total && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t.total}</span>
                  <span className="text-lg font-bold text-purple-700 dark:text-purple-400">
                    ${total.toFixed(2)}
                  </span>
                </div>
              )}
              {show.wallet_balance && walletBalance !== null && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Wallet className="h-3.5 w-3.5" />
                      {t.wallet}
                    </span>
                    <span className="font-medium">${walletBalance.toFixed(2)}</span>
                  </div>
                  {remaining !== null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t.remaining}</span>
                      <span className={`font-medium ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${remaining.toFixed(2)}
                      </span>
                    </div>
                  )}
                </>
              )}
              <Badge variant="outline" className="text-xs w-fit">{t.payWith}</Badge>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-5 pb-5 pt-2 flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            data-testid="summary-cancel-btn"
            className="flex-1"
          >
            {t.cancel}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={submitting || (remaining !== null && remaining < 0)}
            data-testid="summary-confirm-btn"
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-1" />{t.processing}</>
            ) : (
              t.confirm
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
