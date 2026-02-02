/**
 * TransfersDialog - Dialog for transferring funds between connections
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Send,
  Loader2,
  Wallet,
  ArrowRight,
  Users,
  AlertCircle,
  Mail
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function TransfersDialog({ 
  open, 
  onOpenChange, 
  token, 
  walletBalance,
  preselectedUser = null 
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [connections, setConnections] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  // For inviting unregistered users
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    if (open) {
      loadConnections();
      if (preselectedUser) {
        setSelectedUser(preselectedUser);
      }
    } else {
      resetForm();
    }
  }, [open, preselectedUser]);

  const loadConnections = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/conexiones/mis-conexiones`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Filter only connections that allow transfers
        const transferable = (data.conexiones || []).filter(
          c => c.permisos?.transferir_wallet
        );
        setConnections(transferable);
      }
    } catch (err) {
      console.error('Error loading connections:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedUser(null);
    setAmount('');
    setMessage('');
    setShowInvite(false);
    setInviteEmail('');
    setInviteName('');
  };

  const handleTransfer = async () => {
    if (!selectedUser || !amount || parseFloat(amount) <= 0) {
      toast.error(t('transfers.selectValidRecipient'));
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum > (walletBalance?.USD || 0)) {
      toast.error(t('transferencias.insufficientFunds'));
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${API}/api/conexiones/transferir`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          para_usuario_id: selectedUser.user_id,
          monto: amountNum,
          mensaje: message || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error in transfer');

      toast.success(t('transferencias.success'));
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast.error(t('transfers.enterEmail'));
      return;
    }

    setSendingInvite(true);
    try {
      const res = await fetch(`${API}/api/conexiones/invitar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: inviteEmail,
          nombre: inviteName || null,
          mensaje: `I'm inviting you to register on ChiPiLink to transfer funds to you.`,
          monto_transferir: parseFloat(amount) || null
        })
      });

      const data = await res.json();
      
      if (data.existe) {
        toast.info(t('transfers.userAlreadyRegistered'));
        return;
      }
      
      if (!res.ok) throw new Error(data.detail || 'Error');

      toast.success(t('transfers.invitationSent'));
      setShowInvite(false);
      setInviteEmail('');
      setInviteName('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSendingInvite(false);
    }
  };

  const getSubtypeLabel = (subtype) => {
    const key = `conexiones.subtypes.${subtype}`;
    const translated = t(key);
    return translated !== key ? translated : subtype;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            {t('transferencias.title')}
          </DialogTitle>
          <DialogDescription>
            {t('transferencias.subtitle')}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : showInvite ? (
          // Invitation form
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {t('transferencias.notRegistered')} {t('transferencias.inviteToRegister')}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t('transfers.emailRequired')}</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={t('dependents.emailPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('transfers.nameOptional')}</Label>
              <Input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder={t('transfers.personName')}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowInvite(false)}
                className="flex-1"
              >
                {t('transfers.back')}
              </Button>
              <Button
                onClick={handleInvite}
                disabled={sendingInvite || !inviteEmail}
                className="flex-1"
              >
                {sendingInvite ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    {t('transfers.sendInvitation')}
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          // Transfer form
          <div className="space-y-4">
            {/* Available balance */}
            <div className="p-4 bg-primary/10 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                <span className="text-sm">{t('transferencias.yourBalance')}</span>
              </div>
              <span className="text-xl font-bold text-primary">
                ${walletBalance?.USD?.toFixed(2) || '0.00'}
              </span>
            </div>

            {/* Recipient selection */}
            {!selectedUser ? (
              <div className="space-y-2">
                <Label>{t('transferencias.selectRecipient')}</Label>
                {connections.length === 0 ? (
                  <div className="text-center py-6 border rounded-lg">
                    <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">
                      {t('transfers.noTransferPermission')}
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setShowInvite(true)}
                    >
                      {t('transferencias.searchOther')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {connections.map((con) => (
                      <button
                        key={con.conexion_id}
                        className="w-full p-3 flex items-center gap-3 rounded-lg border hover:bg-muted/50 text-left transition-colors"
                        onClick={() => setSelectedUser(con)}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={con.usuario_avatar} />
                          <AvatarFallback>
                            {con.usuario_nombre?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{con.usuario_nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {getSubtypeLabel(con.subtipo)}
                          </p>
                        </div>
                        {con.usuario_estado === 'acudido' && (
                          <Badge variant="secondary" className="text-xs">
                            {t('acudidos.accountStatus.acudido')}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {connections.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setShowInvite(true)}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {t('transferencias.searchOther')}
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Selected user */}
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Avatar>
                    <AvatarImage src={selectedUser.usuario_avatar} />
                    <AvatarFallback>
                      {selectedUser.usuario_nombre?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{selectedUser.usuario_nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {getSubtypeLabel(selectedUser.subtipo)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedUser(null)}
                  >
                    {t('transfers.change')}
                  </Button>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label>{t('transferencias.amount')} *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={walletBalance?.USD || 0}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="pl-8 text-xl font-bold"
                    />
                  </div>
                  {selectedUser?.permisos?.limite_transferencia_diario && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {t('transferencias.dailyLimit')}: $
                      {selectedUser.permisos.limite_transferencia_diario.toFixed(2)}
                    </p>
                  )}
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label>{t('transferencias.message')}</Label>
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('transferencias.messageHint')}
                  />
                </div>

                {/* Summary */}
                {amount && parseFloat(amount) > 0 && (
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">{t('transfers.you')}</p>
                        <p className="font-bold">-${parseFloat(amount).toFixed(2)}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground truncate max-w-[100px]">
                          {selectedUser.usuario_nombre}
                        </p>
                        <p className="font-bold text-green-600">
                          +${parseFloat(amount).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Transfer button */}
                <Button
                  onClick={handleTransfer}
                  disabled={sending || !amount || parseFloat(amount) <= 0}
                  className="w-full"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {t('transferencias.transfer')}
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Keep backward compatibility with old name
export { TransfersDialog as TransferenciasDialog };
