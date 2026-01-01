import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * YappyButton Component
 * Integrates with Yappy Comercial payment system
 * 
 * @param {Object} props
 * @param {string} props.orderId - Order ID (max 15 alphanumeric chars)
 * @param {number} props.subtotal - Order subtotal
 * @param {number} props.taxes - Taxes amount (default 0)
 * @param {number} props.discount - Discount amount (default 0)
 * @param {number} props.total - Total amount (calculated if not provided)
 * @param {function} props.onSuccess - Callback when payment is initiated successfully
 * @param {function} props.onError - Callback when payment fails
 * @param {boolean} props.disabled - Disable the button
 */
export default function YappyButton({
  orderId,
  subtotal,
  taxes = 0,
  discount = 0,
  total,
  onSuccess,
  onError,
  disabled = false,
  className = ''
}) {
  const [loading, setLoading] = useState(true);
  const [yappyActive, setYappyActive] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadYappyConfig();
  }, []);

  const loadYappyConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/platform-store/yappy/cdn`);
      if (response.data.activo) {
        setYappyActive(true);
      }
    } catch (error) {
      console.error('Error loading Yappy config:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadYappyScript = () => {
    // Check if script already exists
    if (document.querySelector('script[data-yappy-btn]')) {
      scriptLoaded.current = true;
      return;
    }

    const script = document.createElement('script');
    script.src = cdnUrl;
    script.async = true;
    script.setAttribute('data-yappy-btn', 'true');
    script.onload = () => {
      scriptLoaded.current = true;
    };
    document.body.appendChild(script);
  };

  const initiatePayment = async (phoneNumber) => {
    if (!phoneNumber || phoneNumber.length < 8) {
      toast.error('Número de teléfono inválido');
      return;
    }

    setProcessing(true);

    try {
      // Clean phone number (remove spaces, dashes, country code)
      const cleanPhone = phoneNumber.replace(/[\s\-\+]/g, '').replace(/^507/, '');

      const response = await axios.post(`${API_URL}/api/platform-store/yappy/create-order`, null, {
        params: {
          order_id: orderId,
          alias_yappy: cleanPhone,
          subtotal: subtotal,
          taxes: taxes,
          discount: discount,
          total: total || (subtotal + taxes - discount)
        }
      });

      if (response.data.success) {
        toast.success('Solicitud de pago enviada. Revisa tu app de Yappy.');
        onSuccess?.(response.data);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Error al procesar pago';
      toast.error(errorMsg);
      onError?.(error);
    } finally {
      setProcessing(false);
    }
  };

  // Handle Yappy button click (from web component)
  const handleYappyClick = () => {
    const phoneInput = document.querySelector('.yappy-phone-input');
    if (phoneInput) {
      initiatePayment(phoneInput.value);
    }
  };

  if (loading) {
    return (
      <Button disabled className={className}>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Cargando...
      </Button>
    );
  }

  if (!yappyActive) {
    return null; // Don't show button if Yappy is not active
  }

  const calculatedTotal = total || (subtotal + taxes - discount);

  return (
    <div className={`yappy-payment-container ${className}`}>
      {/* Custom Yappy Button */}
      <div className="bg-gradient-to-r from-[#00D4AA] to-[#00B894] rounded-lg p-4 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
            <span className="font-bold text-lg">Pagar con Yappy</span>
          </div>
          <span className="text-2xl font-bold">${calculatedTotal.toFixed(2)}</span>
        </div>
        
        <div className="flex gap-2">
          <input
            type="tel"
            placeholder="6XXX-XXXX"
            className="yappy-phone-input flex-1 px-3 py-2 rounded bg-white/20 text-white placeholder-white/70 border border-white/30 focus:outline-none focus:border-white"
            maxLength={9}
          />
          <Button
            onClick={handleYappyClick}
            disabled={disabled || processing}
            className="bg-white text-[#00D4AA] hover:bg-white/90 font-bold"
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Pagar'
            )}
          </Button>
        </div>
        
        <p className="text-xs mt-2 opacity-80">
          Ingresa tu número de Yappy y confirma el pago en tu app
        </p>
      </div>
    </div>
  );
}
