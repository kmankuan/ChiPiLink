/**
 * BankAlertTab — Parse bank transfer alerts and process wallet top-ups
 * Admin pastes the bank notification text, system extracts amount + email,
 * confirms user match, then processes the top-up.
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  FileText, Loader2, CheckCircle2, User, DollarSign,
  ArrowRight, AlertTriangle, Clock, CreditCard, Mail
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function BankAlertTab({ token }) {
  const [alertText, setAlertText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [userMatch, setUserMatch] = useState(null);
  const [editEmail, setEditEmail] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/wallet/admin/bank-alert-logs?limit=15`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) { /* silent */ }
    finally { setLoadingLogs(false); }
  }, [token]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleParse = async () => {
    if (!alertText.trim()) return;
    setParsing(true);
    setParsed(null);
    setUserMatch(null);
    try {
      const res = await fetch(`${API}/api/wallet/admin/parse-bank-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ alert_text: alertText }),
      });
      const data = await res.json();
      if (res.ok) {
        setParsed(data.parsed);
        setUserMatch(data.user_match);
        setEditEmail(data.parsed?.email || '');
        setEditAmount(data.parsed?.amount?.toString() || '');
        if (!data.parsed?.amount) toast.warning('No se pudo extraer el monto');
        if (!data.parsed?.email) toast.warning('No se encontr\u00f3 email en la descripci\u00f3n');
      } else {
        toast.error(data.detail || 'Error parsing alert');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setParsing(false);
    }
  };

  const handleProcess = async () => {
    if (!editEmail || !editAmount) {
      toast.error('Email y monto son requeridos');
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch(`${API}/api/wallet/admin/process-bank-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          alert_text: alertText,
          email: editEmail,
          amount: parseFloat(editAmount),
          description: `Bank transfer top-up${parsed?.sender ? ` from ${parsed.sender}` : ''}`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Top-up $${parseFloat(editAmount).toFixed(2)} applied to ${editEmail}. New balance: $${data.new_balance?.toFixed(2)}`);
        setAlertText('');
        setParsed(null);
        setUserMatch(null);
        setEditEmail('');
        setEditAmount('');
        fetchLogs();
      } else {
        toast.error(data.detail || 'Error processing alert');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setAlertText('');
    setParsed(null);
    setUserMatch(null);
    setEditEmail('');
    setEditAmount('');
  };

  return (
    <div className="space-y-5" data-testid="bank-alert-tab">
      {/* Parser Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Bank Transfer Alert Parser
          </CardTitle>
          <CardDescription className="text-xs">
            Paste the bank notification text below. The system will extract the amount and customer email automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Area */}
          <Textarea
            data-testid="bank-alert-textarea"
            placeholder={"Pega aqu\u00ed la alerta de transferencia bancaria...\n\nEjemplo:\nKA SHUN FUNG te envi\u00f3 la siguiente transacci\u00f3n:\nMonto: US$386.55\nDescripci\u00f3n: recarga jimmy@email.com"}
            value={alertText}
            onChange={(e) => setAlertText(e.target.value)}
            className="min-h-[140px] font-mono text-xs"
          />

          <div className="flex gap-2">
            <Button
              onClick={handleParse}
              disabled={!alertText.trim() || parsing}
              className="gap-1.5 text-xs"
              data-testid="parse-alert-btn"
            >
              {parsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
              Parse Alert
            </Button>
            {parsed && (
              <Button variant="outline" onClick={handleReset} className="text-xs" data-testid="reset-alert-btn">
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Parsed Results */}
      {parsed && (
        <Card className="border-blue-200 dark:border-blue-900" data-testid="parsed-results">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Parsed Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Extracted fields */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <FieldCard icon={<DollarSign className="h-4 w-4" />} label="Amount" value={parsed.amount ? `$${parsed.amount.toFixed(2)}` : 'Not found'} ok={!!parsed.amount} />
              <FieldCard icon={<Mail className="h-4 w-4" />} label="Email" value={parsed.email || 'Not found'} ok={!!parsed.email} />
              <FieldCard icon={<User className="h-4 w-4" />} label="Sender" value={parsed.sender || 'N/A'} ok={!!parsed.sender} />
              <FieldCard icon={<CreditCard className="h-4 w-4" />} label="Product #" value={parsed.product || 'N/A'} ok={!!parsed.product} />
            </div>

            {parsed.description && (
              <div className="text-xs text-muted-foreground px-1">
                <span className="font-medium">Description:</span> {parsed.description}
              </div>
            )}

            {/* User match */}
            {userMatch ? (
              <div className="flex items-center gap-3 p-3 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    User found: {userMatch.name || userMatch.email}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {userMatch.email} &middot; Current balance: ${userMatch.current_balance?.toFixed(2)}
                  </p>
                </div>
              </div>
            ) : parsed.email ? (
              <div className="flex items-center gap-3 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  No user found with email: {parsed.email}. You can edit the email below.
                </p>
              </div>
            ) : null}

            {/* Editable fields for confirmation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
                <Input
                  data-testid="edit-email-input"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="user@email.com"
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Amount (USD)</label>
                <Input
                  data-testid="edit-amount-input"
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="0.00"
                  className="text-sm"
                />
              </div>
            </div>

            <Button
              onClick={handleProcess}
              disabled={!editEmail || !editAmount || processing}
              className="w-full gap-2"
              data-testid="process-alert-btn"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Confirm Top-Up: ${editAmount ? parseFloat(editAmount).toFixed(2) : '0.00'} to {editEmail || '...'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Logs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Bank Alert Processed ({logs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingLogs ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : logs.length > 0 ? (
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/30 text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300 text-[10px] px-1.5 py-0 shrink-0">
                      top-up
                    </Badge>
                    <span className="font-medium">${log.amount?.toFixed(2)}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate text-muted-foreground">{log.email}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                    {log.processed_at ? new Date(log.processed_at).toLocaleString(undefined, {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    }) : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No bank alerts processed yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FieldCard({ icon, label, value, ok }) {
  return (
    <div className={`flex items-center gap-2.5 p-2.5 rounded-md border ${ok ? 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20' : 'border-muted bg-muted/20'}`}>
      <div className={ok ? 'text-green-600' : 'text-muted-foreground'}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className={`text-xs font-medium truncate ${ok ? '' : 'text-muted-foreground'}`}>{value}</p>
      </div>
    </div>
  );
}
