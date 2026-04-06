import { useState, useMemo, useCallback } from 'react';
import { 
  Wallet, 
  CheckCircle, 
  XCircle, 
  Clock,
  ArrowDownLeft,
  User,
  Calendar,
  Smartphone,
  RefreshCw
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GlassCard } from '@/components/layout/GlassCard';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
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
  processed_by: string | null;
  user: {
    legal_name: string;
    username: string;
    email: string;
  };
  processor?: {
    legal_name: string;
    username: string;
  } | null;
}

// Query keys
const paymentKeys = {
  all: ['payments'] as const,
  withdrawals: () => [...paymentKeys.all, 'withdrawals'] as const,
  stats: () => [...paymentKeys.all, 'stats'] as const,
};

// FIXED: Explicit foreign key specification
const fetchWithdrawals = async (): Promise<WithdrawalWithUser[]> => {
  const { data, error } = await supabase
    .from('withdrawals')
    .select(`
      *,
      user:profiles!withdrawals_user_id_fkey(legal_name, username, email),
      processor:profiles!withdrawals_processed_by_fkey(legal_name, username)
    `)
    .order('requested_at', { ascending: false });

  if (error) throw error;
  return (data || []) as WithdrawalWithUser[];
};

// Optimized stats calculation (client-side to reduce queries)
const calculateStats = (withdrawals: WithdrawalWithUser[]) => {
  const completed = withdrawals.filter(w => w.status === 'completed');
  return {
    total: withdrawals.length,
    pending: withdrawals.filter(w => w.status === 'pending').length,
    completed: completed.length,
    totalAmount: completed.reduce((sum, w) => sum + w.amount, 0),
  };
};

export function PaymentManager() {
  const queryClient = useQueryClient();
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalWithUser | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  // Main withdrawals query with real-time updates
  const {
    data: withdrawals = [],
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: paymentKeys.withdrawals(),
    queryFn: fetchWithdrawals,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000, // Auto-refresh for admin monitoring
  });

  // Derived stats (auto-updates when withdrawals change)
  const stats = useMemo(() => calculateStats(withdrawals), [withdrawals]);

  // Derived lists (no additional queries)
  const pendingWithdrawals = useMemo(
    () => withdrawals.filter(w => w.status === 'pending'),
    [withdrawals]
  );

  // Optimistic mutation for approval
  const approveMutation = useMutation({
    mutationFn: async (withdrawalId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('withdrawals')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          processed_by: user?.id,
        })
        .eq('id', withdrawalId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (withdrawalId) => {
      await queryClient.cancelQueries({ queryKey: paymentKeys.withdrawals() });
      const previousData = queryClient.getQueryData<WithdrawalWithUser[]>(paymentKeys.withdrawals());
      const { data: { user } } = await supabase.auth.getUser();

      // Optimistically update status
      queryClient.setQueryData<WithdrawalWithUser[]>(
        paymentKeys.withdrawals(),
        (old) => old?.map(w => 
          w.id === withdrawalId 
            ? { 
                ...w, 
                status: 'completed', 
                processed_at: new Date().toISOString(),
                processed_by: user?.id || null,
              }
            : w
        ) || []
      );

      return { previousData };
    },
    onError: (_err, _withdrawalId, context) => {
      queryClient.setQueryData(paymentKeys.withdrawals(), context?.previousData);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.withdrawals() });
    },
  });

  // Optimistic mutation for rejection
  const rejectMutation = useMutation({
    mutationFn: async (withdrawalId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('withdrawals')
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString(),
          processed_by: user?.id,
        })
        .eq('id', withdrawalId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (withdrawalId) => {
      await queryClient.cancelQueries({ queryKey: paymentKeys.withdrawals() });
      const previousData = queryClient.getQueryData<WithdrawalWithUser[]>(paymentKeys.withdrawals());
      const { data: { user } } = await supabase.auth.getUser();

      queryClient.setQueryData<WithdrawalWithUser[]>(
        paymentKeys.withdrawals(),
        (old) => old?.map(w => 
          w.id === withdrawalId 
            ? { 
                ...w, 
                status: 'rejected', 
                processed_at: new Date().toISOString(),
                processed_by: user?.id || null,
              }
            : w
        ) || []
      );

      return { previousData };
    },
    onError: (_err, _withdrawalId, context) => {
      queryClient.setQueryData(paymentKeys.withdrawals(), context?.previousData);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.withdrawals() });
    },
  });

  // Combined loading state
  const isProcessing = approveMutation.isPending || rejectMutation.isPending;

  const openDialog = useCallback((withdrawal: WithdrawalWithUser) => {
    setSelectedWithdrawal(withdrawal);
    setShowDialog(true);
  }, []);

  const closeDialog = useCallback(() => {
    setShowDialog(false);
    setSelectedWithdrawal(null);
  }, []);

  const handleApprove = useCallback(() => {
    if (!selectedWithdrawal) return;
    approveMutation.mutate(selectedWithdrawal.id, {
      onSuccess: closeDialog,
    });
  }, [selectedWithdrawal, approveMutation, closeDialog]);

  const handleReject = useCallback(() => {
    if (!selectedWithdrawal) return;
    rejectMutation.mutate(selectedWithdrawal.id, {
      onSuccess: closeDialog,
    });
  }, [selectedWithdrawal, rejectMutation, closeDialog]);

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

  // Loading skeletons
  const StatSkeleton = () => (
    <GlassCard padding="md">
      <Skeleton className="h-4 w-20 bg-ninja-green/10 mb-2" />
      <Skeleton className="h-8 w-16 bg-ninja-green/10" />
    </GlassCard>
  );

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Failed to load withdrawals</p>
        <Button 
          onClick={() => queryClient.invalidateQueries({ queryKey: paymentKeys.all })}
          className="mt-4"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-light text-ninja-mint">Payment Manager</h1>
          <p className="text-ninja-sage">Manage withdrawals and payments</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: paymentKeys.all })}
          disabled={isFetching}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", isFetching && "animate-spin")} />
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <GlassCard padding="md">
              <p className="stat-label">Total Withdrawals</p>
              <p className="stat-value">{stats.total}</p>
            </GlassCard>
            <GlassCard padding="md" className="border-yellow-500/30">
              <p className="stat-label text-yellow-400">Pending</p>
              <p className="stat-value text-yellow-400">{stats.pending}</p>
            </GlassCard>
            <GlassCard padding="md">
              <p className="stat-label">Completed</p>
              <p className="stat-value">{stats.completed}</p>
            </GlassCard>
            <GlassCard padding="md" className="border-ninja-green/40">
              <p className="stat-label text-ninja-green">Total Amount</p>
              <p className="stat-value text-ninja-green">
                KSh {stats.totalAmount.toLocaleString()}
              </p>
            </GlassCard>
          </>
        )}
      </div>

      {/* Pending Withdrawals */}
      <GlassCard padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-yellow-400" />
          <h2 className="text-xl font-heading text-ninja-mint">Pending Withdrawals</h2>
          <span className="px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-mono">
            {stats.pending}
          </span>
          {isFetching && <span className="text-xs text-ninja-sage animate-pulse">(updating...)</span>}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full bg-ninja-green/5 rounded-xl" />
            ))}
          </div>
        ) : pendingWithdrawals.length > 0 ? (
          <div className="space-y-3">
            {pendingWithdrawals.map((withdrawal) => (
              <div
                key={withdrawal.id}
                className="p-4 rounded-xl bg-ninja-black/50 border border-yellow-500/20 hover:border-yellow-500/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                      <ArrowDownLeft className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-ninja-mint font-medium flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {withdrawal.user?.legal_name || 'Unknown User'}
                      </p>
                      <p className="text-ninja-sage text-sm">@{withdrawal.user?.username || 'unknown'}</p>
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
                      onClick={() => openDialog(withdrawal)}
                      size="sm"
                      className="mt-2 btn-primary"
                      disabled={isProcessing}
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
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full bg-ninja-green/5 rounded-xl" />
            ))}
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
                  <tr 
                    key={withdrawal.id} 
                    className="border-b border-ninja-green/10 hover:bg-ninja-green/5 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <p className="text-ninja-mint font-medium">{withdrawal.user?.legal_name || 'Unknown'}</p>
                      <p className="text-ninja-sage text-sm">@{withdrawal.user?.username || 'unknown'}</p>
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

      {/* Review Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
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
                    <p className="text-ninja-mint font-medium">{selectedWithdrawal.user?.legal_name || 'Unknown'}</p>
                    <p className="text-ninja-sage text-sm">@{selectedWithdrawal.user?.username || 'unknown'}</p>
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
                  onClick={handleReject}
                  disabled={isProcessing}
                  variant="outline"
                  className="flex-1 bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="flex-1 btn-primary"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {approveMutation.isPending ? 'Processing...' : 'Approve'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}