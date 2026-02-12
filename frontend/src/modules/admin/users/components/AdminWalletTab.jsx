/**
 * AdminWalletTab - Wallet management for admin panel
 * Allows admins to view user wallets, top-up, and deduct balances
 */
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Wallet, ArrowUpCircle, ArrowDownCircle, Search, Loader2,
  RefreshCw, DollarSign, Users, TrendingUp
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AdminWalletTab({ token }) {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [adjustDialog, setAdjustDialog] = useState(null); // { user, action: 'topup' | 'deduct' }
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustDescription, setAdjustDescription] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [stats, setStats] = useState({ totalUsers: 0, totalBalance: 0, usersWithBalance: 0 });

  const fetchUsersWithWallets = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all users with wallets in one call
      const res = await axios.get(`${API_URL}/api/wallet/admin/all-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const usersWithWallets = res.data.users || [];

      setUsers(usersWithWallets);

      // Calculate stats
      const totalBalance = usersWithWallets.reduce(
        (sum, u) => sum + (u.wallet?.balance_usd || 0), 0
      );
      const usersWithBalance = usersWithWallets.filter(
        u => (u.wallet?.balance_usd || 0) > 0
      ).length;

      setStats({
        totalUsers: usersWithWallets.length,
        totalBalance,
        usersWithBalance
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error loading users');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsersWithWallets();
  }, [fetchUsersWithWallets]);

  const handleAdjust = async () => {
    if (!adjustDialog || !adjustAmount || parseFloat(adjustAmount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    setAdjusting(true);
    try {
      await axios.post(
        `${API_URL}/api/wallet/admin/adjust/${adjustDialog.user.user_id}`,
        {
          amount: parseFloat(adjustAmount),
          action: adjustDialog.action,
          description: adjustDescription || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(
        adjustDialog.action === 'topup'
          ? `$${adjustAmount} added to ${adjustDialog.user.name || adjustDialog.user.email}`
          : `$${adjustAmount} deducted from ${adjustDialog.user.name || adjustDialog.user.email}`
      );

      setAdjustDialog(null);
      setAdjustAmount('');
      setAdjustDescription('');
      fetchUsersWithWallets();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error adjusting wallet');
    } finally {
      setAdjusting(false);
    }
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">{t("common.users")}</p>
              <p className="text-2xl font-bold" data-testid="total-users-stat">{stats.totalUsers}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">{t("common.totalBalance")}</p>
              <p className="text-2xl font-bold" data-testid="total-balance-stat">${stats.totalBalance.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">{t("common.withBalance")}</p>
              <p className="text-2xl font-bold" data-testid="users-with-balance-stat">{stats.usersWithBalance}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Refresh */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by name or email..."
            className="pl-10"
            data-testid="wallet-search-input"
          />
        </div>
        <Button variant="outline" onClick={fetchUsersWithWallets} disabled={loading} data-testid="refresh-wallets-btn">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.users")}</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">{t("common.balance")}</TableHead>
                <TableHead className="text-right">{t("common.totalDeposited")}</TableHead>
                <TableHead className="text-right">{t("common.totalSpent")}</TableHead>
                <TableHead className="text-center">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.user_id} data-testid={`wallet-row-${user.user_id}`}>
                    <TableCell className="font-medium">
                      {user.name || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={user.wallet?.balance_usd > 0 ? 'default' : 'secondary'}
                        className={user.wallet?.balance_usd > 0 ? 'bg-green-100 text-green-800' : ''}
                      >
                        ${(user.wallet?.balance_usd || 0).toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      ${(user.wallet?.total_deposited || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      ${(user.wallet?.total_spent || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-green-700 border-green-300 hover:bg-green-50"
                          onClick={() => setAdjustDialog({ user, action: 'topup' })}
                          data-testid={`topup-btn-${user.user_id}`}
                        >
                          <ArrowUpCircle className="h-3 w-3" />
                          Top Up
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-red-700 border-red-300 hover:bg-red-50"
                          onClick={() => setAdjustDialog({ user, action: 'deduct' })}
                          data-testid={`deduct-btn-${user.user_id}`}
                        >
                          <ArrowDownCircle className="h-3 w-3" />
                          Deduct
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Adjust Dialog */}
      <Dialog open={!!adjustDialog} onOpenChange={() => setAdjustDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {adjustDialog?.action === 'topup' ? (
                <ArrowUpCircle className="h-5 w-5 text-green-600" />
              ) : (
                <ArrowDownCircle className="h-5 w-5 text-red-600" />
              )}
              {adjustDialog?.action === 'topup' ? 'Top Up Wallet' : 'Deduct from Wallet'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">{adjustDialog?.user?.name || 'N/A'}</p>
              <p className="text-sm text-muted-foreground">{adjustDialog?.user?.email}</p>
              <p className="text-sm mt-1">
                Current balance: <span className="font-bold">${(adjustDialog?.user?.wallet?.balance_usd || 0).toFixed(2)}</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label>Amount (USD)</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="0.00"
                data-testid="adjust-amount-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={adjustDescription}
                onChange={(e) => setAdjustDescription(e.target.value)}
                placeholder="Reason for adjustment..."
                rows={2}
                data-testid="adjust-description-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdjust}
              disabled={adjusting || !adjustAmount || parseFloat(adjustAmount) <= 0}
              className={adjustDialog?.action === 'topup' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              data-testid="confirm-adjust-btn"
            >
              {adjusting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {adjustDialog?.action === 'topup' ? 'Confirm Top Up' : 'Confirm Deduction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
