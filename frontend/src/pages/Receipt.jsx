import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';
import { Printer, ArrowLeft, Loader2, Download, Receipt as ReceiptIcon } from 'lucide-react';

export default function Receipt() {
  const { pedidoId } = useParams();
  const [searchParams] = useSearchParams();
  const shouldPrint = searchParams.get('print') === 'true';
  const isThermal = searchParams.get('thermal') === 'true';
  const { t } = useTranslation();
  const { api } = useAuth();
  const { siteConfig } = useSiteConfig();
  const navigate = useNavigate();
  const printRef = useRef();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printMode, setPrintMode] = useState(isThermal ? 'thermal' : 'normal');

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Recibo-${pedidoId}`,
    onAfterPrint: () => toast.success('Impresión completada'),
    pageStyle: printMode === 'thermal' ? `
      @page {
        size: 80mm auto;
        margin: 0;
      }
      @media print {
        body { 
          width: 80mm;
          margin: 0;
          padding: 0;
        }
      }
    ` : undefined
  });

  useEffect(() => {
    fetchReceipt();
  }, [pedidoId]);

  useEffect(() => {
    if (data && shouldPrint) {
      setTimeout(handlePrint, 500);
    }
  }, [data, shouldPrint]);

  const fetchReceipt = async () => {
    try {
      const response = await api.get(`/pedidos/${pedidoId}/recibo`);
      setData(response.data);
    } catch (error) {
      toast.error('Error al cargar el recibo');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { pedido, cliente } = data;
  const siteName = siteConfig?.nombre_sitio || 'Mi Tienda';

  // Thermal Receipt Component (80mm width optimized)
  const ThermalReceipt = () => (
    <div 
      ref={printRef}
      className="thermal-receipt bg-white text-black p-2"
      style={{ 
        width: '80mm', 
        fontFamily: 'monospace',
        fontSize: '12px',
        lineHeight: '1.4'
      }}
    >
      {/* Store Header */}
      <div className="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
        <div className="font-bold text-lg">{siteName}</div>
        {siteConfig?.telefono_contacto && (
          <div className="text-xs">Tel: {siteConfig.telefono_contacto}</div>
        )}
        {siteConfig?.email_contacto && (
          <div className="text-xs">{siteConfig.email_contacto}</div>
        )}
      </div>

      {/* Receipt Title */}
      <div className="text-center font-bold mb-2">
        RECIBO DE VENTA
      </div>

      {/* Order Info */}
      <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
        <div className="flex justify-between">
          <span>Pedido:</span>
          <span className="font-bold">{pedido.pedido_id?.slice(-8).toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span>Fecha:</span>
          <span>{new Date(pedido.created_at).toLocaleDateString('es-PA')}</span>
        </div>
        <div className="flex justify-between">
          <span>Hora:</span>
          <span>{new Date(pedido.created_at).toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Customer */}
      <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
        <div className="font-bold">CLIENTE:</div>
        <div>{cliente?.nombre}</div>
        {cliente?.telefono && <div>Tel: {cliente.telefono}</div>}
      </div>

      {/* Student */}
      <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
        <div className="font-bold">ESTUDIANTE:</div>
        <div>{pedido.estudiante_nombre}</div>
      </div>

      {/* Items Header */}
      <div className="font-bold border-b border-gray-400 pb-1 mb-1">
        <div className="flex justify-between">
          <span>PRODUCTO</span>
          <span>SUBTOTAL</span>
        </div>
      </div>

      {/* Items */}
      <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
        {pedido.items?.map((item, index) => (
          <div key={index} className="mb-1">
            <div className="text-xs truncate">{item.name}</div>
            <div className="flex justify-between text-xs">
              <span>{item.cantidad} x ${item.price_unitario?.toFixed(2)}</span>
              <span>${(item.cantidad * item.price_unitario)?.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-b border-double border-gray-600 pb-2 mb-2">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>${pedido.total?.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>ITBMS (7%):</span>
          <span>$0.00</span>
        </div>
        <div className="flex justify-between font-bold text-lg mt-1">
          <span>TOTAL:</span>
          <span>${pedido.total?.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Method */}
      <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
        <div className="flex justify-between">
          <span>Método de Pago:</span>
          <span className="font-bold uppercase">
            {pedido.metodo_pago === 'transferencia_bancaria' ? 'TRANSFER.' : pedido.metodo_pago?.toUpperCase()}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Estado:</span>
          <span className={pedido.estado === 'completado' ? 'font-bold' : ''}>
            {pedido.estado?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Notes */}
      {pedido.notas && (
        <div className="border-b border-dashed border-gray-400 pb-2 mb-2 text-xs">
          <div className="font-bold">NOTAS:</div>
          <div>{pedido.notas}</div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center mt-3">
        <div className="text-sm font-bold">¡GRACIAS POR SU COMPRA!</div>
        <div className="text-xs mt-1">{siteName}</div>
        <div className="text-xs mt-2">
          --------------------------------
        </div>
        <div className="text-xs">
          {new Date().toLocaleDateString('es-PA')} {new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );

  // Normal Receipt Component
  const NormalReceipt = () => (
    <div 
      ref={printRef}
      className="bg-card rounded-xl border border-border p-8 print-receipt"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-serif text-2xl font-bold mb-2">
          {siteName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Recibo de Pedido
        </p>
      </div>

      <Separator className="my-6" />

      {/* Order Info */}
      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div>
          <p className="text-muted-foreground">Número de Pedido</p>
          <p className="font-mono font-bold">{pedido.pedido_id}</p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground">Fecha</p>
          <p className="font-bold">
            {new Date(pedido.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Customer Info */}
      <div className="bg-muted rounded-lg p-4 mb-6">
        <h3 className="font-bold mb-2">Cliente</h3>
        <p>{cliente?.nombre}</p>
        <p className="text-sm text-muted-foreground">{cliente?.email}</p>
        {cliente?.telefono && (
          <p className="text-sm text-muted-foreground">{cliente?.telefono}</p>
        )}
        {cliente?.direccion && (
          <p className="text-sm text-muted-foreground">{cliente?.direccion}</p>
        )}
      </div>

      {/* Student Info */}
      <div className="bg-muted rounded-lg p-4 mb-6">
        <h3 className="font-bold mb-2">Estudiante</h3>
        <p>{pedido.estudiante_nombre}</p>
      </div>

      {/* Items Table */}
      <div className="mb-6">
        <h3 className="font-bold mb-4">Productos</h3>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3">Producto</th>
                <th className="text-center p-3">Cant.</th>
                <th className="text-right p-3">Precio</th>
                <th className="text-right p-3">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {pedido.items?.map((item, index) => (
                <tr key={index} className="border-t">
                  <td className="p-3">{item.name}</td>
                  <td className="p-3 text-center">{item.cantidad}</td>
                  <td className="p-3 text-right">${item.price_unitario?.toFixed(2)}</td>
                  <td className="p-3 text-right font-medium">
                    ${(item.cantidad * item.price_unitario)?.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted font-bold">
              <tr className="border-t-2">
                <td colSpan="3" className="p-3 text-right">Total:</td>
                <td className="p-3 text-right text-lg">${pedido.total?.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payment Info */}
      <div className="grid grid-cols-2 gap-4 text-sm mb-6">
        <div>
          <p className="text-muted-foreground">Método de Pago</p>
          <p className="font-bold capitalize">
            {pedido.metodo_pago === 'transferencia_bancaria' ? 'Transferencia Bancaria' : pedido.metodo_pago}
          </p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground">Estado</p>
          <p className={`font-bold capitalize ${
            pedido.estado === 'completado' ? 'text-green-600' : 
            pedido.estado === 'cancelado' ? 'text-red-600' : 'text-yellow-600'
          }`}>
            {pedido.estado}
          </p>
        </div>
      </div>

      {pedido.notas && (
        <div className="mt-6">
          <p className="text-sm text-muted-foreground">Notas:</p>
          <p className="text-sm">{pedido.notas}</p>
        </div>
      )}

      {/* Footer */}
      <div className="text-center mt-8 pt-6 border-t border-border">
        <p className="text-xs text-muted-foreground">
          ¡Gracias por su compra!
        </p>
        <p className="text-xs text-muted-foreground">
          {siteName} {siteConfig?.email_contacto ? `- ${siteConfig.email_contacto}` : ''}
        </p>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 md:px-8 py-8 max-w-3xl" data-testid="receipt-page">
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-8 no-print">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>
        <div className="flex gap-3">
          {/* Print Mode Toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setPrintMode('normal')}
              className={`px-3 py-2 text-sm ${printMode === 'normal' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
            >
              Normal
            </button>
            <button
              onClick={() => setPrintMode('thermal')}
              className={`px-3 py-2 text-sm ${printMode === 'thermal' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
            >
              <ReceiptIcon className="h-4 w-4 inline mr-1" />
              Térmica (80mm)
            </button>
          </div>
          <Button onClick={handlePrint} className="rounded-full" data-testid="print-button">
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Receipt Preview */}
      <div className={`flex justify-center ${printMode === 'thermal' ? 'bg-gray-100 p-8 rounded-xl' : ''}`}>
        {printMode === 'thermal' ? <ThermalReceipt /> : <NormalReceipt />}
      </div>

      {/* Thermal Print CSS */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          ${printMode === 'thermal' ? `
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              width: 80mm;
              margin: 0;
              padding: 0;
            }
            .thermal-receipt {
              width: 80mm !important;
              padding: 3mm !important;
            }
          ` : ''}
        }
      `}</style>
    </div>
  );
}
