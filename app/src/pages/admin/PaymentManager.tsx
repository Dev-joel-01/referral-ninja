import { useEffect, useState } from 'react';
import { 
  Wallet, 
  CheckCircle, 
  XCircle, 
  Clock,
  ArrowDownLeft,
  User,
  Calendar,
  Smartphone
} from 'lucide-react';
import { GlassCard } from '@/components/layout/GlassCard';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface WithdrawalWithUser {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  phone_number: string;
  requested_at: string;
  processed_at: string | null;
  user: {
    legal_name: string;
    username: string;
    email: string;
  };
}

export function PaymentManager() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalWithUser[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<WithdrawalWithUser[]>([]);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalWithUser | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*, user:profiles(legal_name, username, email)')
        .order('requested_at', { ascending: false });

      if (error) throw error;

      const allWithdrawals = (data || []) as WithdrawalWithUser[];
      setWithdrawals(allWithdrawals);
      setPendingWithdrawals(allWithdrawals.filter((w) => w.status === 'pending'));
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const approveWithdrawal = async () => {
    if (!selectedWithdrawal) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
        })
        .eq('id', selectedWithdrawal.id);

      if (error) throw error;

      setShowApproveDialog(false);
      setSelectedWithdrawal(null);
      fetchWithdrawals();
    } catch (error) {
      console.error('Error approving withdrawal:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const rejectWithdrawal = async () => {
    if (!selectedWithdrawal) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString(),
        })
        .eq('id', selectedWithdrawal.id);

      if (error) throw error;

      setShowApproveDialog(false);
      setSelectedWithdrawal(null);
      fetchWithdrawals();
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const openApproveDialog = (withdrawal: WithdrawalWithUser) => {
    setSelectedWithdrawal(withdrawal);
    setShowApproveDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-ninja-green/20 text-ninja-green';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'processing':
        return 'bg-blue-500/20 text-blue-400';
      case 'rejected':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-ninja-green/20 text-ninja-green';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-light text-ninja-mint">Payment Manager</h1>
        <p className="text-ninja-sage">Manage withdrawals and payments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard padding="md">
          <p className="stat-label">Total Withdrawals</p>
          <p className="stat-value">{withdrawals.length}</p>
        </GlassCard>
        <GlassCard padding="md" className="border-yellow-500/30">
          <p className="stat-label text-yellow-400">Pending</p>
          <p className="stat-value text-yellow-400">{pendingWithdrawals.length}</p>
        </GlassCard>
        <GlassCard padding="md">
          <p className="stat-label">Completed</p>
          <p className="stat-value">
            {withdrawals.filter((w) => w.status === 'completed').length}
          </p>
        </GlassCard>
        <GlassCard padding="md" className="border-ninja-green/40">
          <p className="stat-label text-ninja-green">Total Amount</p>
          <p className="stat-value text-ninja-green">
            KSh {withdrawals
              .filter((w) => w.status === 'completed')
              .reduce((sum, w) => sum + w.amount, 0)
              .toLocaleString()}
          </p>
        </GlassCard>
      </div>

      {/* Pending Withdrawals */}
      <GlassCard padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-yellow-400" />
          <h2 className="text-xl font-heading text-ninja-mint">Pending Withdrawals</h2>
          <span className="px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-mono">
            {pendingWithdrawals.length}
          </span>
        </div>

        {pendingWithdrawals.length > 0 ? (
          <div className="space-y-3">
            {pendingWithdrawals.map((withdrawal) => (
              <div
                key={withdrawal.id}
                className="p-4 rounded-xl bg-ninja-black/50 border border-yellow-500/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                      <ArrowDownLeft className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-ninja-mint font-medium flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {withdrawal.user.legal_name}
                      </p>
                      <p className="text-ninja-sage text-sm">@{withdrawal.user.username}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-ninja-sage">
                        <span className="flex items-center gap-1">
                          <Smartphone className="w-3 h-3" />
                          {withdrawal.phone_number}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(withdrawal.requested_at), 'dd MMM yyyy, HH:mm')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-heading text-yellow-400">
                      KSh {withdrawal.amount.toLocaleString()}
                    </p>
                    <Button
                      onClick={() => openApproveDialog(withdrawal)}
                      size="sm"
                      className="mt-2 btn-primary"
                    >
                      Review
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-ninja-sage text-center py-8">No pending withdrawals</p>
        )}
      </GlassCard>

      {/* All Withdrawals */}
      <GlassCard padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-5 h-5 text-ninja-green" />
          <h2 className="text-xl font-heading text-ninja-mint">All Withdrawals</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ninja-green" />
          </div>
        ) : withdrawals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ninja-green/20">
                  <th className="text-left py-3 px-4 text-ninja-sage font-medium">User</th>
                  <th className="text-left py-3 px-4 text-ninja-sage font-medium">Phone</th>
                  <th className="text-left py-3 px-4 text-ninja-sage font-medium">Requested</th>
                  <th className="text-center py-3 px-4 text-ninja-sage font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-ninja-sage font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="border-b border-ninja-green/10 hover:bg-ninja-green/5">
                    <td className="py-4 px-4">
                      <p className="text-ninja-mint font-medium">{withdrawal.user.legal_name}</p>
                      <p className="text-ninja-sage text-sm">@{withdrawal.user.username}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-ninja-sage text-sm">{withdrawal.phone_number}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-ninja-sage text-sm">
                        {format(new Date(withdrawal.requested_at), 'dd MMM yyyy')}
                      </p>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs',
                        getStatusColor(withdrawal.status)
                      )}>
                        {getStatusIcon(withdrawal.status)}
                        {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-ninja-mint font-medium">
                        KSh {withdrawal.amount.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-ninja-sage text-center py-8">No withdrawals found</p>
        )}
      </GlassCard>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="bg-ninja-dark/95 backdrop-blur-xl border-ninja-green/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading text-ninja-mint">
              Review Withdrawal
            </DialogTitle>
            <DialogDescription className="text-ninja-sage">
              Approve or reject this withdrawal request
            </DialogDescription>
          </DialogHeader>

          {selectedWithdrawal && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-xl bg-ninja-black/50 border border-ninja-green/10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-ninja-green/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-ninja-green" />
                  </div>
                  <div>
                    <p className="text-ninja-mint font-medium">{selectedWithdrawal.user.legal_name}</p>
                    <p className="text-ninja-sage text-sm">@{selectedWithdrawal.user.username}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-ninja-sage flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    {selectedWithdrawal.phone_number}
                  </p>
                  <p className="text-ninja-sage flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Requested {format(new Date(selectedWithdrawal.requested_at), 'dd MMM yyyy, HH:mm')}
                  </p>
                </div>
              </div>

              <div className="text-center">
                <p className="text-ninja-sage text-sm mb-1">Amount</p>
                <p className="text-4xl font-heading text-ninja-green">
                  KSh {selectedWithdrawal.amount.toLocaleString()}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={rejectWithdrawal}
                  disabled={isProcessing}
                  variant="outline"
                  className="flex-1 bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={approveWithdrawal}
                  disabled={isProcessing}
                  className="flex-1 btn-primary"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
