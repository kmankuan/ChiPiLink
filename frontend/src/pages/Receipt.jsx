import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';
import { Printer, ArrowLeft, Loader2, Download } from 'lucide-react';

export default function Receipt() {
  const { pedidoId } = useParams();
  const [searchParams] = useSearchParams();
  const shouldPrint = searchParams.get('print') === 'true';
  const { t } = useTranslation();
  const { api } = useAuth();
  const navigate = useNavigate();
  const printRef = useRef();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Recibo-${pedidoId}`,
    onAfterPrint: () => toast.success('Impresión completada')
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
      console.error('Error fetching receipt:', error);
      toast.error('Error al cargar recibo');
      navigate('/pedidos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { pedido, cliente } = data;

  return (
    <div className="container mx-auto px-4 md:px-8 py-8 max-w-3xl" data-testid="receipt-page">
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-8 no-print">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>
        <div className="flex gap-3">
          <Button onClick={handlePrint} className="rounded-full" data-testid="print-button">
            <Printer className="h-4 w-4 mr-2" />
            Imprimir Recibo
          </Button>
        </div>
      </div>

      {/* Receipt Content */}
      <div 
        ref={printRef}
        className="bg-card rounded-xl border border-border p-8 print-receipt"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-2xl font-bold mb-2">
            Librería Escolar
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
              {new Date(pedido.fecha_creacion).toLocaleDateString()}
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

        <Separator className="my-6" />

        {/* Items */}
        <table className="w-full mb-6">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 text-sm font-medium">Libro</th>
              <th className="text-center py-2 text-sm font-medium">Cant.</th>
              <th className="text-right py-2 text-sm font-medium">Precio</th>
              <th className="text-right py-2 text-sm font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {pedido.items?.map((item, idx) => (
              <tr key={idx} className="border-b border-border/50">
                <td className="py-3 text-sm">{item.nombre_libro}</td>
                <td className="py-3 text-sm text-center">{item.cantidad}</td>
                <td className="py-3 text-sm text-right">
                  ${item.precio_unitario?.toFixed(2)}
                </td>
                <td className="py-3 text-sm text-right font-medium">
                  ${(item.cantidad * item.precio_unitario)?.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total */}
        <div className="flex justify-end">
          <div className="w-48">
            <div className="flex justify-between py-2 text-lg font-bold">
              <span>TOTAL</span>
              <span>${pedido.total?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Payment & Status */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-muted-foreground">Método de Pago</p>
            <p className="font-bold capitalize">
              {pedido.metodo_pago === 'transferencia_bancaria' 
                ? 'Transferencia Bancaria' 
                : 'Yappy'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">Estado</p>
            <p className="font-bold capitalize">{t(`status.${pedido.estado}`)}</p>
          </div>
        </div>

        {/* Payment Status */}
        <div className={`text-center p-4 rounded-lg ${
          pedido.pago_confirmado 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
        }`}>
          {pedido.pago_confirmado 
            ? '✓ Pago Confirmado'
            : '⏳ Pendiente de Confirmación de Pago'}
        </div>

        {/* Notes */}
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
            Librería Escolar - educación.pa
          </p>
        </div>
      </div>
    </div>
  );
}
