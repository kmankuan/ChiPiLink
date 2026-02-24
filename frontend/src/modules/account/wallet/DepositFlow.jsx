/**
 * DepositFlow — Step-based deposit dialog with 4 configurable payment methods.
 * Step 1: Enter amount
 * Step 2: Select method (card grid)
 * Step 3: Method-specific content (instructions, Yappy redirect, under construction)
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, ArrowRight, DollarSign, Smartphone, Banknote,
  CreditCard, Building2, Loader2, CheckCircle2, Construction,
  Copy, Check, Mail
} from 'lucide-react';
import { StatusAnimation } from '@/components/ui/StatusAnimation';
import RESOLVED_API_URL from '@/config/apiUrl';

const API_URL = RESOLVED_API_URL;

const ICON_MAP = {
  smartphone: Smartphone,
  banknote: Banknote,
  'credit-card': CreditCard,
  'building-2': Building2,
};

export default function DepositFlow({ open, onOpenChange, token, onSuccess }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [methods, setMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    if (open) {
      fetchMethods();
      setStep(1);
      setAmount('');
      setSelectedMethod(null);
      setSubmitted(false);
    }
  }, [open]);

  const fetchMethods = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/wallet/deposit-methods`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMethods(data.methods || []);
      }
    } catch (err) {
      console.error('Error fetching deposit methods:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmitDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0 || !selectedMethod || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/wallet/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency: 'USD',
          payment_method: selectedMethod.id === 'transfer' ? 'bank_transfer' : selectedMethod.id
        })
      });
      if (res.ok) {
        setSubmitted(true);
        const { toast } = await import('sonner');
        toast.success(t('wallet.depositPending', 'Your deposit request has been submitted and is pending admin approval.'));
        onSuccess?.();
      } else {
        const err = await res.json().catch(() => ({}));
        const { toast } = await import('sonner');
        toast.error(err.detail || t('wallet.depositError', 'Error submitting deposit request'));
      }
    } catch (error) {
      console.error('Error submitting deposit:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleYappyRedirect = () => {
    // Redirect to Yappy via the platform store Yappy integration
    window.open(`${API_URL}/api/platform-store/yappy/cdn`, '_blank');
  };

  const parsedAmount = parseFloat(amount) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {t('wallet.depositTitle', 'Deposit Funds')}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && t('wallet.depositStep1', 'Enter the amount you want to deposit')}
            {step === 2 && t('wallet.depositStep2', 'Choose your payment method')}
            {step === 3 && !submitted && t('wallet.depositStep3', 'Follow the instructions to complete your deposit')}
            {step === 3 && submitted && t('wallet.depositSuccess', 'Your request has been submitted')}
          </DialogDescription>
        </DialogHeader>

        {/* ─── Step 1: Amount ─── */}
        {step === 1 && (
          <div className="space-y-4 pt-2">
            <div>
              <Label>{t('wallet.amount', 'Amount')} (USD)</Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-9 text-lg"
                  data-testid="deposit-amount-input"
                  autoFocus
                />
              </div>
            </div>
            {/* Quick amounts */}
            <div className="flex gap-2">
              {[5, 10, 25, 50].map((v) => (
                <Button
                  key={v}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setAmount(String(v))}
                  data-testid={`quick-amount-${v}`}
                >
                  ${v}
                </Button>
              ))}
            </div>
            <Button
              onClick={() => setStep(2)}
              className="w-full gap-2"
              disabled={!amount || parsedAmount <= 0}
              data-testid="deposit-next-btn"
            >
              {t('common.next', 'Next')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* ─── Step 2: Method Selection ─── */}
        {step === 2 && (
          <div className="space-y-4 pt-2">
            {/* Amount badge */}
            <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2">
              <span className="text-sm text-muted-foreground">{t('wallet.amount', 'Amount')}</span>
              <span className="font-bold text-lg">${parsedAmount.toFixed(2)}</span>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {methods.map((method) => {
                  const Icon = ICON_MAP[method.icon] || DollarSign;
                  const isDisabled = method.status === 'under_construction';
                  return (
                    <Card
                      key={method.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isDisabled ? 'opacity-60' : ''
                      } ${selectedMethod?.id === method.id ? 'ring-2 ring-primary border-primary' : ''}`}
                      onClick={() => { setSelectedMethod(method); setStep(3); }}
                      data-testid={`method-${method.id}`}
                    >
                      <CardContent className="p-4 text-center space-y-2">
                        <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <p className="font-medium text-sm">{method.label}</p>
                        {isDisabled && (
                          <Badge variant="outline" className="text-[10px]">
                            <Construction className="h-2.5 w-2.5 mr-1" />
                            {t('wallet.underConstruction', 'Coming Soon')}
                          </Badge>
                        )}
                        {!isDisabled && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{method.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <Button variant="outline" onClick={() => setStep(1)} className="w-full gap-2" data-testid="deposit-back-btn">
              <ArrowLeft className="h-4 w-4" />
              {t('common.back', 'Back')}
            </Button>
          </div>
        )}

        {/* ─── Step 3: Method Content ─── */}
        {step === 3 && selectedMethod && !submitted && (
          <div className="space-y-4 pt-2">
            {/* Summary */}
            <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                {(() => { const Icon = ICON_MAP[selectedMethod.icon] || DollarSign; return <Icon className="h-4 w-4 text-primary" />; })()}
                <span className="text-sm font-medium">{selectedMethod.label}</span>
              </div>
              <span className="font-bold text-lg">${parsedAmount.toFixed(2)}</span>
            </div>

            {/* Under Construction */}
            {selectedMethod.status === 'under_construction' && (
              <div className="text-center py-8 space-y-4">
                <StatusAnimation type="building_bars" color="#f59e0b" />
                <p className="text-muted-foreground font-medium">
                  {selectedMethod.config?.under_construction_label || t('wallet.underConstruction', 'Coming Soon')}
                </p>
                <Button variant="outline" onClick={() => { setSelectedMethod(null); setStep(2); }} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  {t('wallet.chooseAnother', 'Choose another method')}
                </Button>
              </div>
            )}

            {/* Yappy */}
            {selectedMethod.id === 'yappy' && selectedMethod.status !== 'under_construction' && (
              <div className="space-y-4">
                <div className="text-center py-4 space-y-2">
                  <Smartphone className="h-10 w-10 text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    {t('wallet.yappyDesc', 'You will be redirected to Yappy to complete payment')}
                  </p>
                </div>
                <Button onClick={handleSubmitDeposit} className="w-full gap-2" disabled={submitting} data-testid="deposit-yappy-btn">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                  {t('wallet.payWithYappy', 'Pay with Yappy')}
                </Button>
              </div>
            )}

            {/* Cash */}
            {selectedMethod.id === 'cash' && selectedMethod.status !== 'under_construction' && (
              <div className="space-y-4">
                {selectedMethod.instructions && (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none bg-muted/30 rounded-lg p-4"
                    dangerouslySetInnerHTML={{ __html: selectedMethod.instructions }}
                    data-testid="cash-instructions"
                  />
                )}
                <Button onClick={handleSubmitDeposit} className="w-full gap-2" disabled={submitting} data-testid="deposit-cash-btn">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {t('wallet.confirmDeposit', 'Confirm Deposit Request')}
                </Button>
              </div>
            )}

            {/* Transfer */}
            {selectedMethod.id === 'transfer' && selectedMethod.status !== 'under_construction' && (
              <div className="space-y-4">
                {selectedMethod.instructions && (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none bg-muted/30 rounded-lg p-4"
                    dangerouslySetInnerHTML={{ __html: selectedMethod.instructions }}
                    data-testid="transfer-instructions"
                  />
                )}

                {/* Bank Details */}
                {selectedMethod.config && (
                  <div className="space-y-2 bg-secondary/50 rounded-lg p-4">
                    {selectedMethod.config.bank_name && (
                      <DetailRow label={t('wallet.bankName', 'Bank')} value={selectedMethod.config.bank_name} onCopy={handleCopy} field="bank" copied={copiedField} />
                    )}
                    {selectedMethod.config.account_holder && (
                      <DetailRow label={t('wallet.accountHolder', 'Account Holder')} value={selectedMethod.config.account_holder} onCopy={handleCopy} field="holder" copied={copiedField} />
                    )}
                    {selectedMethod.config.account_number && (
                      <DetailRow label={t('wallet.accountNumber', 'Account Number')} value={selectedMethod.config.account_number} onCopy={handleCopy} field="account" copied={copiedField} />
                    )}
                    {selectedMethod.config.account_type && (
                      <DetailRow label={t('wallet.accountType', 'Account Type')} value={selectedMethod.config.account_type} field="type" />
                    )}
                    {selectedMethod.config.alert_email && (
                      <DetailRow label={t('wallet.alertEmail', 'Alert Email')} value={selectedMethod.config.alert_email} onCopy={handleCopy} field="email" copied={copiedField} icon={<Mail className="h-3 w-3" />} />
                    )}
                    {selectedMethod.config.additional_notes && (
                      <>
                        <Separator className="my-2" />
                        <p className="text-xs text-muted-foreground italic">{selectedMethod.config.additional_notes}</p>
                      </>
                    )}
                  </div>
                )}

                <Button onClick={handleSubmitDeposit} className="w-full gap-2" disabled={submitting} data-testid="deposit-transfer-btn">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {t('wallet.confirmDeposit', 'Confirm Deposit Request')}
                </Button>
              </div>
            )}

            {/* Back button for non-under-construction methods */}
            {selectedMethod.status !== 'under_construction' && (
              <Button variant="outline" onClick={() => { setSelectedMethod(null); setStep(2); }} className="w-full gap-2" data-testid="deposit-back-step3-btn">
                <ArrowLeft className="h-4 w-4" />
                {t('common.back', 'Back')}
              </Button>
            )}
          </div>
        )}

        {/* ─── Step 3: Success ─── */}
        {step === 3 && submitted && (
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-lg">{t('wallet.depositSubmitted', 'Request Submitted')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('wallet.depositPendingMsg', 'Your deposit of')} <strong>${parsedAmount.toFixed(2)}</strong> {t('wallet.depositPendingVia', 'via')} <strong>{selectedMethod?.label}</strong> {t('wallet.depositPendingApproval', 'is pending admin approval.')}
              </p>
            </div>
            <Button onClick={() => onOpenChange(false)} className="w-full" data-testid="deposit-done-btn">
              {t('common.done', 'Done')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Detail Row helper ─── */
function DetailRow({ label, value, onCopy, field, copied, icon }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
        {icon}
        {label}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-sm font-mono font-medium truncate">{value}</span>
        {onCopy && (
          <button
            onClick={() => onCopy(value, field)}
            className="p-1 rounded hover:bg-muted transition-colors shrink-0"
            data-testid={`copy-${field}`}
          >
            {copied === field ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
          </button>
        )}
      </div>
    </div>
  );
}
