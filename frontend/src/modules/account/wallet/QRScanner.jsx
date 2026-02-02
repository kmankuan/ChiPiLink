/**
 * QR Scanner Component - Staff scanner for check-in and payments
 */
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  QrCode, Camera, X, Check, AlertCircle, User, Wallet, 
  CreditCard, LogIn, DollarSign, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function QRScanner({ token }) {
  const { t } = useTranslation();
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [selectedAction, setSelectedAction] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setScanning(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error(t('qrScanner.cameraError'));
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const scanQRCode = async (qrString) => {
    if (!qrString) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/qr/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ qr_string: qrString })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setScanResult(data.scan_result);
        stopCamera();
        toast.success(t('qrScanner.scanSuccess'));
      } else {
        toast.error(data.detail || t('qrScanner.scanError'));
      }
    } catch (error) {
      console.error('Error scanning QR:', error);
      toast.error(t('qrScanner.scanError'));
    } finally {
      setLoading(false);
    }
  };

  const processAction = async (action) => {
    if (!scanResult) return;

    // Validate for payments
    if (action === 'pay_usd' || action === 'pay_points') {
      if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
        toast.error(t('qrScanner.invalidAmount'));
        return;
      }
    }

    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/qr/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          qr_string: manualInput,
          action: action,
          amount: action !== 'checkin' ? parseFloat(paymentAmount) : null,
          description: paymentDescription || null
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(t('qrScanner.actionSuccess'));
        
        // Update result with new balances
        if (data.user_info?.wallet) {
          setScanResult(prev => ({
            ...prev,
            wallet: data.user_info.wallet
          }));
        }
        
        setSelectedAction(null);
        setPaymentAmount('');
        setPaymentDescription('');
      } else {
        toast.error(data.detail || t('qrScanner.actionError'));
      }
    } catch (error) {
      console.error('Error processing action:', error);
      toast.error(t('qrScanner.actionError'));
    } finally {
      setProcessing(false);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setManualInput('');
    setSelectedAction(null);
    setPaymentAmount('');
    setPaymentDescription('');
  };

  return (
    <div className="space-y-4" data-testid="qr-scanner">
      {/* Scanner Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {t('qrScanner.title')}
          </CardTitle>
          <CardDescription>{t('qrScanner.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera View */}
          {scanning && (
            <div className="relative aspect-square max-w-sm mx-auto bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 border-2 border-dashed border-white/50 m-8 rounded-lg" />
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2"
                onClick={stopCamera}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Camera Button */}
          {!scanning && !scanResult && (
            <Button onClick={startCamera} className="w-full" data-testid="start-camera-btn">
              <Camera className="h-4 w-4 mr-2" />
              {t('qrScanner.startCamera')}
            </Button>
          )}

          {/* Manual Entry */}
          {!scanResult && (
            <div className="space-y-2">
              <Label>{t('qrScanner.manualEntry')}</Label>
              <div className="flex gap-2">
                <Input
                  placeholder={t('qrScanner.placeholder')}
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  data-testid="qr-input"
                />
                <Button 
                  onClick={() => scanQRCode(manualInput)}
                  disabled={!manualInput || loading}
                  data-testid="scan-btn"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    t('qrScanner.scan')
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scan Result */}
      {scanResult && (
        <Card data-testid="scan-result">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                {t('qrScanner.userInfo')}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={resetScanner}>
                {t('qrScanner.newScan')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User Info */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                  {(scanResult.profile?.display_name || 'U')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg">
                  {scanResult.profile?.display_name || t('profile.user')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  ID: {scanResult.user_id?.slice(-8)}
                </p>
              </div>
            </div>

            {/* Balances */}
            {scanResult.wallet && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">USD</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${scanResult.wallet.balance_usd?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">ChipiPoints</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {scanResult.wallet.balance_points?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            )}

            {/* Membership */}
            {scanResult.membership?.membership_id ? (
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">{t('qrScanner.membership')}</span>
                </div>
                <Badge variant="secondary">
                  {scanResult.membership.visits_remaining} {t('qrScanner.visitsLeft')}
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-amber-800 dark:text-amber-200">
                <AlertCircle className="h-5 w-5" />
                <span>{t('qrScanner.noMembership')}</span>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <p className="font-medium">{t('qrScanner.actions')}</p>
              <div className="grid grid-cols-3 gap-2">
                {/* Check-in Button */}
                {scanResult.membership?.membership_id && (
                  <Button
                    variant={selectedAction === 'checkin' ? 'default' : 'outline'}
                    className="flex-col h-auto py-3"
                    onClick={() => setSelectedAction(selectedAction === 'checkin' ? null : 'checkin')}
                    data-testid="action-checkin"
                  >
                    <LogIn className="h-5 w-5 mb-1" />
                    <span className="text-xs">{t('qrScanner.checkin')}</span>
                  </Button>
                )}

                {/* Pay USD Button */}
                {scanResult.wallet?.balance_usd > 0 && (
                  <Button
                    variant={selectedAction === 'pay_usd' ? 'default' : 'outline'}
                    className="flex-col h-auto py-3"
                    onClick={() => setSelectedAction(selectedAction === 'pay_usd' ? null : 'pay_usd')}
                    data-testid="action-pay-usd"
                  >
                    <DollarSign className="h-5 w-5 mb-1 text-green-600" />
                    <span className="text-xs">{t('qrScanner.payUSD')}</span>
                  </Button>
                )}

                {/* Pay Points Button */}
                {scanResult.wallet?.balance_points > 0 && (
                  <Button
                    variant={selectedAction === 'pay_points' ? 'default' : 'outline'}
                    className="flex-col h-auto py-3"
                    onClick={() => setSelectedAction(selectedAction === 'pay_points' ? null : 'pay_points')}
                    data-testid="action-pay-points"
                  >
                    <Wallet className="h-5 w-5 mb-1 text-purple-600" />
                    <span className="text-xs">{t('qrScanner.payPoints')}</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Action Form */}
            {selectedAction && (
              <div className="p-4 border rounded-lg space-y-4" data-testid="action-form">
                {selectedAction !== 'checkin' && (
                  <>
                    <div>
                      <Label>{t('qrScanner.amount')}</Label>
                      <Input
                        type="number"
                        placeholder={selectedAction === 'pay_usd' ? '0.00' : '0'}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        data-testid="amount-input"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Max: {selectedAction === 'pay_usd' 
                          ? `$${scanResult.wallet?.balance_usd?.toFixed(2)}` 
                          : scanResult.wallet?.balance_points?.toLocaleString()
                        }
                      </p>
                    </div>
                    <div>
                      <Label>{t('qrScanner.description')}</Label>
                      <Input
                        placeholder={t('qrScanner.description')}
                        value={paymentDescription}
                        onChange={(e) => setPaymentDescription(e.target.value)}
                        data-testid="description-input"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedAction(null)}
                  >
                    {t('qrScanner.cancel')}
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => processAction(selectedAction)}
                    disabled={processing}
                    data-testid="confirm-action-btn"
                  >
                    {processing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        {t('qrScanner.processing')}
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        {t('qrScanner.confirm')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
