/**
 * ChipiWallet Component - Billetera digital con USD y ChipiPoints
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw, History, Gift, CreditCard, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ChipiWallet({ token }) {
  const { t, i18n } = useTranslation();
  const [wallet, setWallet] = useState(null);
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('cash');
  const [convertPoints, setConvertPoints] = useState('');
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);

  const lang = i18n.language || 'es';

  useEffect(() => {
    if (token) {
      fetchWalletData();
    }
  }, [token]);

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [summaryRes, transactionsRes, historyRes] = await Promise.all([
        fetch(`${API_URL}/api/wallet/summary`, { headers }),
        fetch(`${API_URL}/api/wallet/transactions?limit=20`, { headers }),
        fetch(`${API_URL}/api/wallet/points/history?limit=20`, { headers })
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data.summary);
        setWallet(data.summary);
      }

      if (transactionsRes.ok) {
        const data = await transactionsRes.json();
        setTransactions(data.transactions || []);
      }

      if (historyRes.ok) {
        const data = await historyRes.json();
        setPointsHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;

    try {
      const res = await fetch(`${API_URL}/api/wallet/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(depositAmount),
          currency: 'USD',
          payment_method: depositMethod
        })
      });

      if (res.ok) {
        setIsDepositOpen(false);
        setDepositAmount('');
        fetchWalletData();
      }
    } catch (error) {
      console.error('Error depositing:', error);
    }
  };

  const handleConvertPoints = async () => {
    if (!convertPoints || parseInt(convertPoints) <= 0) return;

    try {
      const res = await fetch(`${API_URL}/api/wallet/points/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          points: parseInt(convertPoints)
        })
      });

      if (res.ok) {
        setIsConvertOpen(false);
        setConvertPoints('');
        fetchWalletData();
      }
    } catch (error) {
      console.error('Error converting:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : 'es-PA', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(lang, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getTransactionIcon = (type) => {
    const icons = {
      deposit: <ArrowDownLeft className="h-4 w-4 text-green-500" />,
      purchase: <ArrowUpRight className="h-4 w-4 text-red-500" />,
      transfer_in: <ArrowDownLeft className="h-4 w-4 text-green-500" />,
      transfer_out: <ArrowUpRight className="h-4 w-4 text-orange-500" />,
      reward: <Gift className="h-4 w-4 text-purple-500" />,
      bonus: <Gift className="h-4 w-4 text-purple-500" />,
    };
    return icons[type] || <CreditCard className="h-4 w-4" />;
  };

  const texts = {
    es: {
      title: 'ChipiWallet',
      subtitle: 'Tu billetera digital',
      balance: 'Saldo',
      points: 'ChipiPoints',
      totalValue: 'Valor Total',
      deposit: 'Depositar',
      convert: 'Convertir',
      transactions: 'Transacciones',
      pointsHistory: 'Historial de Puntos',
      stats: 'Estadísticas',
      deposited: 'Depositado',
      spent: 'Gastado',
      earned: 'Ganados',
      noTransactions: 'Sin transacciones aún',
      depositTitle: 'Depositar Fondos',
      depositDesc: 'Agrega dinero a tu billetera',
      amount: 'Monto',
      method: 'Método de Pago',
      cash: 'Efectivo',
      card: 'Tarjeta',
      yappy: 'Yappy',
      convertTitle: 'Convertir ChipiPoints',
      convertDesc: 'Convierte tus puntos a USD',
      pointsToConvert: 'Puntos a convertir',
      youWillReceive: 'Recibirás aproximadamente',
      confirm: 'Confirmar'
    },
    en: {
      title: 'ChipiWallet',
      subtitle: 'Your digital wallet',
      balance: 'Balance',
      points: 'ChipiPoints',
      totalValue: 'Total Value',
      deposit: 'Deposit',
      convert: 'Convert',
      transactions: 'Transactions',
      pointsHistory: 'Points History',
      stats: 'Statistics',
      deposited: 'Deposited',
      spent: 'Spent',
      earned: 'Earned',
      noTransactions: 'No transactions yet',
      depositTitle: 'Deposit Funds',
      depositDesc: 'Add money to your wallet',
      amount: 'Amount',
      method: 'Payment Method',
      cash: 'Cash',
      card: 'Card',
      yappy: 'Yappy',
      convertTitle: 'Convert ChipiPoints',
      convertDesc: 'Convert your points to USD',
      pointsToConvert: 'Points to convert',
      youWillReceive: 'You will receive approximately',
      confirm: 'Confirm'
    },
    zh: {
      title: 'ChipiWallet',
      subtitle: '您的数字钱包',
      balance: '余额',
      points: 'ChipiPoints',
      totalValue: '总价值',
      deposit: '充值',
      convert: '转换',
      transactions: '交易记录',
      pointsHistory: '积分历史',
      stats: '统计',
      deposited: '已充值',
      spent: '已花费',
      earned: '已获得',
      noTransactions: '暂无交易',
      depositTitle: '充值',
      depositDesc: '向您的钱包添加资金',
      amount: '金额',
      method: '支付方式',
      cash: '现金',
      card: '银行卡',
      yappy: 'Yappy',
      convertTitle: '转换 ChipiPoints',
      convertDesc: '将积分转换为美元',
      pointsToConvert: '转换积分数量',
      youWillReceive: '您将获得约',
      confirm: '确认'
    }
  };

  const txt = texts[lang] || texts.es;
  const conversionRate = summary?.points_config?.conversion_rate || 0.008;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="wallet-loading">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="chipi-wallet">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* USD Balance */}
        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-green-100">{txt.balance} USD</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2" data-testid="balance-usd">
              <DollarSign className="h-6 w-6" />
              {formatCurrency(summary?.balance_usd)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="w-full" data-testid="deposit-btn">
                  <ArrowDownLeft className="h-4 w-4 mr-2" />
                  {txt.deposit}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{txt.depositTitle}</DialogTitle>
                  <DialogDescription>{txt.depositDesc}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>{txt.amount}</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      data-testid="deposit-amount-input"
                    />
                  </div>
                  <div>
                    <Label>{txt.method}</Label>
                    <Select value={depositMethod} onValueChange={setDepositMethod}>
                      <SelectTrigger data-testid="deposit-method-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">{txt.cash}</SelectItem>
                        <SelectItem value="card">{txt.card}</SelectItem>
                        <SelectItem value="yappy">{txt.yappy}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleDeposit} className="w-full" data-testid="confirm-deposit-btn">
                    {txt.confirm}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* ChipiPoints Balance */}
        <Card className="bg-gradient-to-br from-purple-500 to-violet-600 text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-purple-100">{txt.points}</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2" data-testid="balance-points">
              <Gift className="h-6 w-6" />
              {(summary?.balance_points || 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-purple-100 mb-2">
              ≈ {formatCurrency(summary?.points_value_usd)}
            </p>
            <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="w-full"
                  disabled={!summary?.balance_points}
                  data-testid="convert-btn"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {txt.convert}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{txt.convertTitle}</DialogTitle>
                  <DialogDescription>{txt.convertDesc}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>{txt.pointsToConvert}</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={convertPoints}
                      onChange={(e) => setConvertPoints(e.target.value)}
                      max={summary?.balance_points || 0}
                      data-testid="convert-points-input"
                    />
                  </div>
                  {convertPoints && (
                    <p className="text-sm text-muted-foreground">
                      {txt.youWillReceive}: {formatCurrency(parseInt(convertPoints) * conversionRate)}
                    </p>
                  )}
                  <Button onClick={handleConvertPoints} className="w-full" data-testid="confirm-convert-btn">
                    {txt.confirm}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Total Value */}
        <Card className="bg-gradient-to-br from-slate-700 to-slate-800 text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-300">{txt.totalValue}</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2" data-testid="total-balance">
              <Wallet className="h-6 w-6" />
              {formatCurrency(summary?.total_balance)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm text-slate-300">
              <div className="flex justify-between">
                <span>{txt.deposited}:</span>
                <span>{formatCurrency(summary?.stats?.total_deposited)}</span>
              </div>
              <div className="flex justify-between">
                <span>{txt.spent}:</span>
                <span>{formatCurrency(summary?.stats?.total_spent)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions & History */}
      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions" data-testid="transactions-tab">
            <History className="h-4 w-4 mr-2" />
            {txt.transactions}
          </TabsTrigger>
          <TabsTrigger value="points" data-testid="points-tab">
            <Gift className="h-4 w-4 mr-2" />
            {txt.pointsHistory}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardContent className="pt-6">
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8" data-testid="no-transactions">
                  {txt.noTransactions}
                </p>
              ) : (
                <div className="space-y-3" data-testid="transactions-list">
                  {transactions.map((txn) => (
                    <div 
                      key={txn.transaction_id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(txn.transaction_type)}
                        <div>
                          <p className="font-medium text-sm">{txn.description || txn.transaction_type}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(txn.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          ['deposit', 'transfer_in', 'reward', 'bonus'].includes(txn.transaction_type)
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {['deposit', 'transfer_in', 'reward', 'bonus'].includes(txn.transaction_type) ? '+' : '-'}
                          {txn.currency === 'USD' 
                            ? formatCurrency(txn.amount)
                            : `${txn.amount.toLocaleString()} pts`
                          }
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {txn.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="points">
          <Card>
            <CardContent className="pt-6">
              {pointsHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {txt.noTransactions}
                </p>
              ) : (
                <div className="space-y-3" data-testid="points-history-list">
                  {pointsHistory.map((item) => (
                    <div 
                      key={item.history_id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Gift className={`h-4 w-4 ${item.points > 0 ? 'text-green-500' : 'text-red-500'}`} />
                        <div>
                          <p className="font-medium text-sm">
                            {item.description?.[lang] || item.description?.es || item.earn_type || item.action}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${item.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.points > 0 ? '+' : ''}{item.points.toLocaleString()} pts
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Balance: {item.balance_after?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
