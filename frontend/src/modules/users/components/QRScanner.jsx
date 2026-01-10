/**
 * QR Scanner Component - Scanner para staff (check-in y pagos)
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function QRScanner({ token }) {
  const { t, i18n } = useTranslation();
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

  const lang = i18n.language || 'es';

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
      toast.error(texts[lang].cameraError);
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
        toast.success(texts[lang].scanSuccess);
      } else {
        toast.error(data.detail || texts[lang].scanError);
      }
    } catch (error) {
      console.error('Error scanning QR:', error);
      toast.error(texts[lang].scanError);
    } finally {
      setLoading(false);
    }
  };

  const processAction = async (action) => {
    if (!scanResult) return;

    // Validar para pagos
    if (action === 'pay_usd' || action === 'pay_points') {
      if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
        toast.error(texts[lang].invalidAmount);
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
        toast.success(data.result?.message?.[lang] || texts[lang].actionSuccess);
        
        // Actualizar resultado con nuevos balances
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
        toast.error(data.detail || texts[lang].actionError);
      }
    } catch (error) {
      console.error('Error processing action:', error);
      toast.error(texts[lang].actionError);
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

  const texts = {
    es: {
      title: 'Escáner QR',
      subtitle: 'Escanea códigos QR de clientes para check-in y pagos',
      startCamera: 'Iniciar Cámara',
      stopCamera: 'Detener Cámara',
      manualEntry: 'Entrada Manual',
      placeholder: 'Pega el código QR aquí...',
      scan: 'Escanear',
      scanning: 'Escaneando...',
      scanSuccess: 'QR escaneado correctamente',
      scanError: 'Error al escanear QR',
      cameraError: 'Error al acceder a la cámara',
      userInfo: 'Información del Cliente',
      balance: 'Saldo',
      membership: 'Membresía',
      visitsLeft: 'visitas restantes',
      actions: 'Acciones Disponibles',
      checkin: 'Check-in',
      payUSD: 'Cobrar USD',
      payPoints: 'Cobrar ChipiPoints',
      amount: 'Monto',
      description: 'Descripción (opcional)',
      confirm: 'Confirmar',
      cancel: 'Cancelar',
      processing: 'Procesando...',
      actionSuccess: 'Acción completada',
      actionError: 'Error al procesar acción',
      invalidAmount: 'Ingresa un monto válido',
      insufficientBalance: 'Saldo insuficiente',
      newScan: 'Nuevo Escaneo',
      noMembership: 'Sin membresía activa'
    },
    en: {
      title: 'QR Scanner',
      subtitle: 'Scan customer QR codes for check-in and payments',
      startCamera: 'Start Camera',
      stopCamera: 'Stop Camera',
      manualEntry: 'Manual Entry',
      placeholder: 'Paste QR code here...',
      scan: 'Scan',
      scanning: 'Scanning...',
      scanSuccess: 'QR scanned successfully',
      scanError: 'Error scanning QR',
      cameraError: 'Error accessing camera',
      userInfo: 'Customer Information',
      balance: 'Balance',
      membership: 'Membership',
      visitsLeft: 'visits left',
      actions: 'Available Actions',
      checkin: 'Check-in',
      payUSD: 'Charge USD',
      payPoints: 'Charge ChipiPoints',
      amount: 'Amount',
      description: 'Description (optional)',
      confirm: 'Confirm',
      cancel: 'Cancel',
      processing: 'Processing...',
      actionSuccess: 'Action completed',
      actionError: 'Error processing action',
      invalidAmount: 'Enter a valid amount',
      insufficientBalance: 'Insufficient balance',
      newScan: 'New Scan',
      noMembership: 'No active membership'
    },
    zh: {
      title: '二维码扫描器',
      subtitle: '扫描客户二维码进行签到和支付',
      startCamera: '启动相机',
      stopCamera: '停止相机',
      manualEntry: '手动输入',
      placeholder: '在此粘贴二维码...',
      scan: '扫描',
      scanning: '扫描中...',
      scanSuccess: '二维码扫描成功',
      scanError: '扫描二维码时出错',
      cameraError: '访问相机时出错',
      userInfo: '客户信息',
      balance: '余额',
      membership: '会员资格',
      visitsLeft: '剩余访问次数',
      actions: '可用操作',
      checkin: '签到',
      payUSD: '收取美元',
      payPoints: '收取积分',
      amount: '金额',
      description: '描述（可选）',
      confirm: '确认',
      cancel: '取消',
      processing: '处理中...',
      actionSuccess: '操作完成',
      actionError: '处理操作时出错',
      invalidAmount: '请输入有效金额',
      insufficientBalance: '余额不足',
      newScan: '新扫描',
      noMembership: '无有效会员资格'
    }
  };

  const txt = texts[lang] || texts.es;

  return (
    <div className="space-y-4" data-testid="qr-scanner">
      {/* Scanner Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {txt.title}
          </CardTitle>
          <CardDescription>{txt.subtitle}</CardDescription>
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
              {txt.startCamera}
            </Button>
          )}

          {/* Manual Entry */}
          {!scanResult && (
            <div className="space-y-2">
              <Label>{txt.manualEntry}</Label>
              <div className="flex gap-2">
                <Input
                  placeholder={txt.placeholder}
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
                    txt.scan
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
                {txt.userInfo}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={resetScanner}>
                {txt.newScan}
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
                  {scanResult.profile?.display_name || 'Usuario'}
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
                  <span className="font-medium">{txt.membership}</span>
                </div>
                <Badge variant="secondary">
                  {scanResult.membership.visits_remaining} {txt.visitsLeft}
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-amber-800 dark:text-amber-200">
                <AlertCircle className="h-5 w-5" />
                <span>{txt.noMembership}</span>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <p className="font-medium">{txt.actions}</p>
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
                    <span className="text-xs">{txt.checkin}</span>
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
                    <span className="text-xs">{txt.payUSD}</span>
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
                    <span className="text-xs">{txt.payPoints}</span>
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
                      <Label>{txt.amount}</Label>
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
                      <Label>{txt.description}</Label>
                      <Input
                        placeholder="Compra en tienda..."
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
                    {txt.cancel}
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
                        {txt.processing}
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        {txt.confirm}
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
