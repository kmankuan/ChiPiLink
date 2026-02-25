/**
 * PackageListPreview — Renders a single order as a printable package list.
 * Used inside PrintDialog for preview and actual printing.
 */
import { useTranslation } from 'react-i18next';
import { CheckSquare, Package } from 'lucide-react';

export default function PackageListPreview({ order, formatConfig, isLast = false }) {
  const { t } = useTranslation();
  const h = formatConfig?.header || {};
  const b = formatConfig?.body || {};
  const f = formatConfig?.footer || {};
  const s = formatConfig?.style || {};

  const orderedItems = (order.items || []).filter(i => (i.quantity_ordered || i.quantity || 0) > 0);
  const total = order.total_amount || orderedItems.reduce((sum, i) => sum + (i.price || 0) * (i.quantity_ordered || i.quantity || 1), 0);

  return (
    <div
      className="package-list-page bg-white text-black p-6"
      style={{
        fontSize: s.font_size || '12px',
        pageBreakAfter: isLast ? 'auto' : 'always',
        maxWidth: formatConfig?.paper_size === '58mm' ? '58mm' : '80mm',
        margin: '0 auto',
      }}
      data-testid={`package-list-${order.order_id}`}
    >
      {/* Header */}
      <div className="text-center mb-4 border-b border-dashed border-gray-400 pb-3">
        {h.show_logo && h.logo_url && (
          <img src={h.logo_url} alt="Logo" className="h-8 mx-auto mb-2" />
        )}
        <h2 className="font-bold text-base flex items-center justify-center gap-1">
          <Package className="h-4 w-4" />
          {h.title || t('print.packageList', 'Package List')}
        </h2>
        {h.subtitle && <p className="text-xs text-gray-500">{h.subtitle}</p>}
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          {h.show_date && <span>{new Date().toLocaleDateString()}</span>}
          {h.show_order_id && <span className="font-mono">{order.order_id}</span>}
        </div>
      </div>

      {/* Student Info */}
      <div className="mb-3 pb-2 border-b border-gray-200">
        {b.show_student_name && (
          <p className="font-bold text-sm">{order.student_name}</p>
        )}
        {b.show_grade && order.grade && (
          <p className="text-xs text-gray-600">
            {t('print.grade', 'Grade')}: {order.grade} {order.year ? `— ${order.year}` : ''}
          </p>
        )}
      </div>

      {/* Items Table */}
      <table className="w-full text-xs mb-3">
        <thead>
          <tr className="border-b border-gray-300">
            {b.show_checkboxes && <th className="w-6 py-1 text-left">✓</th>}
            {b.show_item_code && <th className="py-1 text-left">{t('print.code', 'Code')}</th>}
            <th className="py-1 text-left">{t('print.item', 'Item')}</th>
            {b.show_item_quantity && <th className="py-1 text-right w-8">{t('print.qty', 'Qty')}</th>}
            {b.show_item_price && <th className="py-1 text-right w-12">{t('print.price', 'Price')}</th>}
            {b.show_item_status && <th className="py-1 text-right w-14">{t('print.status', 'Status')}</th>}
          </tr>
        </thead>
        <tbody>
          {orderedItems.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-100">
              {b.show_checkboxes && (
                <td className="py-1">
                  <span className="inline-block w-3.5 h-3.5 border border-gray-400 rounded-sm" />
                </td>
              )}
              {b.show_item_code && (
                <td className="py-1 font-mono text-gray-500">{item.book_id?.slice(-6) || '—'}</td>
              )}
              <td className="py-1 font-medium">{item.book_name || item.name}</td>
              {b.show_item_quantity && (
                <td className="py-1 text-right">{item.quantity_ordered || item.quantity || 1}</td>
              )}
              {b.show_item_price && (
                <td className="py-1 text-right">${(item.price || 0).toFixed(2)}</td>
              )}
              {b.show_item_status && (
                <td className="py-1 text-right text-gray-500">{item.status || '—'}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div className="border-t border-dashed border-gray-400 pt-3 space-y-2">
        <div className="flex justify-between text-xs">
          {f.show_item_count && (
            <span>{t('print.items', 'Items')}: {orderedItems.length}</span>
          )}
          {f.show_total && (
            <span className="font-bold">{t('print.total', 'Total')}: ${total.toFixed(2)}</span>
          )}
        </div>

        {f.custom_text && (
          <p className="text-xs text-gray-500 italic">{f.custom_text}</p>
        )}

        {f.show_signature_line && (
          <div className="mt-6 pt-4">
            <div className="border-t border-gray-400 w-48 mx-auto" />
            <p className="text-center text-xs text-gray-500 mt-1">
              {f.signature_label || t('print.receivedBy', 'Received by')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
