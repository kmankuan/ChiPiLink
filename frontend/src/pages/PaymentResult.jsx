import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { CheckCircle, XCircle, Clock, ArrowLeft, Home } from 'lucide-react';

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const status = searchParams.get('status');
  const orderId = searchParams.get('orderId');

  const getStatusConfig = () => {
    switch (status) {
      case 'E':
        return {
          icon: CheckCircle,
          title: '¡Pago Exitoso!',
          message: 'Tu pago ha sido procesado correctamente.',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'R':
        return {
          icon: XCircle,
          title: 'Pago Rechazado',
          message: 'El pago no pudo ser completado. Por favor intenta de nuevo.',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'C':
        return {
          icon: XCircle,
          title: 'Pago Cancelado',
          message: 'Has cancelado el proceso de pago.',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      case 'X':
        return {
          icon: Clock,
          title: 'Pago Expirado',
          message: 'El tiempo para completar el pago ha expirado.',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
      default:
        return {
          icon: Clock,
          title: 'Estado Desconocido',
          message: 'No pudimos determinar el estado de tu pago.',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className={`max-w-md w-full ${config.bgColor} ${config.borderColor}`}>
        <CardContent className="py-12 text-center">
          <Icon className={`h-20 w-20 mx-auto ${config.color} mb-6`} />
          
          <h1 className={`text-2xl font-bold mb-2 ${config.color}`}>
            {config.title}
          </h1>
          
          <p className="text-gray-600 mb-2">
            {config.message}
          </p>
          
          {orderId && (
            <p className="text-sm text-gray-500 mb-6">
              Pedido: #{orderId}
            </p>
          )}
          
          <div className="flex gap-3 justify-center">
            {status !== 'E' && (
              <Button
                variant="outline"
                onClick={() => navigate(`/checkout/${orderId}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Intentar de nuevo
              </Button>
            )}
            <Button onClick={() => navigate('/')}>
              <Home className="h-4 w-4 mr-2" />
              Ir al inicio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
