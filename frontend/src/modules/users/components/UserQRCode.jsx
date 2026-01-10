/**
 * UserQRCode Component - Código QR del usuario para check-in y pagos
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { QrCode, RefreshCw, Copy, Check, Wallet, CreditCard, LogIn, Shield } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function UserQRCode({ token, wallet }) {
  const { t, i18n } = useTranslation();
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);

  const lang = i18n.language || 'es';

  useEffect(() => {
    if (token) {
      fetchQRCode();
    }
  }, [token]);

  const fetchQRCode = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/qr/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setQrData(data.qr_code);
      }
    } catch (error) {
      console.error('Error fetching QR:', error);
    } finally {
      setLoading(false);
    }
  };

  const regenerateQR = async () => {
    setRegenerating(true);
    try {
      const res = await fetch(`${API_URL}/api/qr/me/regenerate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setQrData(data.qr_code);
        toast.success(texts[lang].regenerated);
      }
    } catch (error) {
      console.error('Error regenerating QR:', error);
      toast.error(texts[lang].regenerateError);
    } finally {
      setRegenerating(false);
    }
  };

  const copyQRString = async () => {
    if (qrData?.qr_string) {
      await navigator.clipboard.writeText(qrData.qr_string);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(texts[lang].copied);
    }
  };

  const texts = {
    es: {
      title: 'Mi Código QR',
      subtitle: 'Usa este código para check-in y pagos rápidos',
      showQR: 'Mostrar QR',
      regenerate: 'Regenerar',
      regenerating: 'Regenerando...',
      regenerated: 'Código QR regenerado',
      regenerateError: 'Error al regenerar QR',
      copy: 'Copiar código',
      copied: 'Código copiado',
      scanInfo: 'El personal del club puede escanear este código para:',
      checkin: 'Check-in rápido',
      payUSD: 'Pagar con USD',
      payPoints: 'Pagar con ChipiPoints',
      balance: 'Saldo disponible',
      noWallet: 'Sin billetera',
      securityNote: 'No compartas este código. Si lo pierdes, regenera uno nuevo.',
      fullscreen: 'Pantalla completa',
      close: 'Cerrar'
    },
    en: {
      title: 'My QR Code',
      subtitle: 'Use this code for quick check-in and payments',
      showQR: 'Show QR',
      regenerate: 'Regenerate',
      regenerating: 'Regenerating...',
      regenerated: 'QR code regenerated',
      regenerateError: 'Error regenerating QR',
      copy: 'Copy code',
      copied: 'Code copied',
      scanInfo: 'Club staff can scan this code to:',
      checkin: 'Quick check-in',
      payUSD: 'Pay with USD',
      payPoints: 'Pay with ChipiPoints',
      balance: 'Available balance',
      noWallet: 'No wallet',
      securityNote: "Don't share this code. If you lose it, regenerate a new one.",
      fullscreen: 'Fullscreen',
      close: 'Close'
    },
    zh: {
      title: '我的二维码',
      subtitle: '使用此代码快速签到和支付',
      showQR: '显示二维码',
      regenerate: '重新生成',
      regenerating: '正在重新生成...',
      regenerated: '二维码已重新生成',
      regenerateError: '重新生成二维码时出错',
      copy: '复制代码',
      copied: '代码已复制',
      scanInfo: '俱乐部工作人员可扫描此代码以:',
      checkin: '快速签到',
      payUSD: '用美元支付',
      payPoints: '用积分支付',
      balance: '可用余额',
      noWallet: '无钱包',
      securityNote: '不要分享此代码。如果丢失，请重新生成。',
      fullscreen: '全屏',
      close: '关闭'
    }
  };

  const txt = texts[lang] || texts.es;

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="user-qr-code">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          {txt.title}
        </CardTitle>
        <CardDescription>{txt.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Code Display */}
        <div className="flex flex-col items-center">
          <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
            <DialogTrigger asChild>
              <div 
                className="p-4 bg-white rounded-xl cursor-pointer hover:shadow-lg transition-shadow"
                data-testid="qr-display"
              >
                {qrData?.qr_string && (
                  <QRCodeSVG
                    value={qrData.qr_string}
                    size={180}
                    level="H"
                    includeMargin={true}
                    imageSettings={{
                      src: "/logo192.png",
                      x: undefined,
                      y: undefined,
                      height: 30,
                      width: 30,
                      excavate: true,
                    }}
                  />
                )}
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>{txt.fullscreen}</DialogTitle>
              </DialogHeader>
              <div className="flex justify-center p-4 bg-white rounded-xl">
                {qrData?.qr_string && (
                  <QRCodeSVG
                    value={qrData.qr_string}
                    size={280}
                    level="H"
                    includeMargin={true}
                  />
                )}
              </div>
              <div className="text-center text-sm text-muted-foreground">
                {txt.scanInfo}
              </div>
            </DialogContent>
          </Dialog>

          <p className="text-xs text-muted-foreground mt-2">
            ID: {qrData?.qr_id}
          </p>
        </div>

        {/* Available Balance */}
        {wallet && (
          <div className="grid grid-cols-2 gap-2 p-3 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">USD</p>
              <p className="font-bold text-green-600">${wallet.balance_usd?.toFixed(2) || '0.00'}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">ChipiPoints</p>
              <p className="font-bold text-purple-600">{wallet.balance_points?.toLocaleString() || 0}</p>
            </div>
          </div>
        )}

        {/* Capabilities */}
        <div className="space-y-2">
          <p className="text-sm font-medium">{txt.scanInfo}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <LogIn className="h-3 w-3" />
              {txt.checkin}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1 text-green-600 border-green-200">
              <Wallet className="h-3 w-3" />
              {txt.payUSD}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1 text-purple-600 border-purple-200">
              <CreditCard className="h-3 w-3" />
              {txt.payPoints}
            </Badge>
          </div>
        </div>

        {/* Security Note */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-sm">
          <Shield className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-amber-800 dark:text-amber-200">{txt.securityNote}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={copyQRString}
            data-testid="copy-qr-btn"
          >
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? txt.copied : txt.copy}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={regenerateQR}
            disabled={regenerating}
            data-testid="regenerate-qr-btn"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
            {regenerating ? txt.regenerating : txt.regenerate}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
