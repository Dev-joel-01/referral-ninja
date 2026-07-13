import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Wallet, 
  TrendingUp, 
  ArrowDownLeft, 
  ArrowUpRight,
  Loader2,
  AlertCircle,
  Smartphone,
  RefreshCw
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GlassCard } from '@/components/layout/GlassCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { MINIMUM_WITHDRAWAL } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const withdrawalSchema = z.object({
  amount: z.number().min(MINIMUM_WITHDRAWAL, `Minimum withdrawal is KSh ${MINIMUM_WITHDRAWAL}`),
  phoneNumber: z.string().regex(/^254[0-9]{9}$/, 'Phone number must be in format 254XXXXXXXXX'),
});

type WithdrawalFormData = z.infer<typeof withdrawalSchema>;

interface Withdrawal {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  phone_number: string;
  requested_at: string;
  processed_at: string | null;
}

interface PaymentStats {
  availableBalance: number;
  totalWithdrawn: number;
  totalEarned: number;
}

// Query keys
const paymentKeys = queryKeys.payment;

// Parallel data fetching
const fetchPaymentData = async (userId: string): Promise<{ stats: PaymentStats; withdrawals: Withdrawal[] }> => {
  const [referralsResult, withdrawalsResult] = await Promise.all([
    supabase
      .from('referrals')
      .select('earned_amount')
      .eq('referrer_id', userId)
      .eq('status', 'completed'),
    
    supabase
      .from('withdrawals')
      .select('*')
      .eq('user_id', userId)
      .order('requested_at', { ascending: false }),
  ]);

  if (referralsResult.error) throw referralsResult.error;
  if (withdrawalsResult.error) throw withdrawalsResult.error;

  const totalEarned = referralsResult.data?.reduce((sum, r) => sum + r.earned_amount, 0) || 0;
  const withdrawals = withdrawalsResult.data || [];
  const totalWithdrawn = withdrawals
    .filter(w => w.status === 'completed')
    .reduce((sum, w) => sum + w.amount, 0);

  return {
    stats: {
      totalEarned,
      totalWithdrawn,
      availableBalance: totalEarned - totalWithdrawn,
    },
    withdrawals,
  };
};

export function PaymentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [message, setMessage] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WithdrawalFormData>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      phoneNumber: user?.phone_number || '',
    },
  });

  // Main data query
  const {
    data: paymentData,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: paymentKeys.stats(user?.id || ''),
    queryFn: () => fetchPaymentData(user!.id),
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000, // Auto-refresh for live balance
  });

  // Withdrawal mutation
  const withdrawalMutation = useMutation({
    mutationFn: async (data: WithdrawalFormData) => {
      const { error: withdrawalError } = await supabase
        .from('withdrawals')
        .insert({
          user_id: user!.id,
          amount: data.amount,
          phone_number: data.phoneNumber,
          status: 'pending',
        });

      if (withdrawalError) throw withdrawalError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
      setMessage('Withdrawal request submitted for admin approval.');
      setShowWithdrawDialog(false);
      reset();
      setTimeout(() => setMessage(''), 3000);
    },
    onError: (error: any) => {
      setMessage(error.message || 'Failed to submit withdrawal');
    },
  });

  // Stats derived from data
  const stats = paymentData?.stats || { availableBalance: 0, totalWithdrawn: 0, totalEarned: 0 };
  const withdrawals = paymentData?.withdrawals || [];

  const initiateWithdrawal = useCallback(async (data: WithdrawalFormData) => {
    if (data.amount > stats.availableBalance) {
      setMessage('Insufficient balance');
      return;
    }

    setMessage('');

    withdrawalMutation.mutate(data);
  }, [stats.availableBalance, withdrawalMutation]);

  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: paymentKeys.all });
  }, [queryClient]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-ninja-green/20 text-ninja-green';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'processing': return 'bg-blue-500/20 text-blue-400';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      default: return 'bg-ninja-green/20 text-ninja-green';
    }
  };

  // Loading skeletons
  const StatSkeleton = () => (
    <GlassCard padding="md">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24 bg-ninja-green/10" />
          <Skeleton className="h-8 w-20 bg-ninja-green/10" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl bg-ninja-green/10" />
      </div>
    </GlassCard>
  );

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Failed to load payment data</p>
        <Button onClick={refreshData} className="mt-4">
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
          <h1 className="text-3xl font-heading font-light text-ninja-mint">Payments</h1>
          <p className="text-ninja-sage">Manage your earnings and withdrawals</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshData}
          disabled={isFetching}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", isFetching && "animate-spin")} />
          {isFetching ? 'Updating...' : 'Refresh'}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <GlassCard padding="md" className="flex items-center justify-center">
              <Skeleton className="h-20 w-32 bg-ninja-green/10" />
            </GlassCard>
          </>
        ) : (
          <>
            <GlassCard padding="md" hover className="border-ninja-green/40">
              <div className="flex items-start justify-between">
                <div>
                  <p className="stat-label mb-1 text-ninja-green">Available Balance</p>
                  <p className="stat-value text-ninja-green">
                    KSh {stats.availableBalance.toLocaleString()}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-ninja-green/30 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-ninja-green" />
                </div>
              </div>
            </GlassCard>

            <GlassCard padding="md" hover>
              <div className="flex items-start justify-between">
                <div>
                  <p className="stat-label mb-1">Total Withdrawn</p>
                  <p className="stat-value">KSh {stats.totalWithdrawn.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-ninja-green/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-ninja-green" />
                </div>
              </div>
            </GlassCard>

            <GlassCard padding="md" className="flex items-center justify-center">
              <div className="text-center">
                <p className="text-ninja-sage text-sm mb-2">Withdrawal Limit</p>
                <p className="text-2xl font-heading text-ninja-mint">KSh {MINIMUM_WITHDRAWAL}</p>
                <p className="text-ninja-sage text-xs mt-1">Minimum per withdrawal</p>
              </div>
            </GlassCard>
          </>
        )}
      </div>

      {/* Withdraw Button */}
      <GlassCard padding="lg">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-heading text-ninja-mint mb-1">Withdraw Funds</h2>
            <p className="text-ninja-sage text-sm">
              Withdraw your earnings to your M-Pesa account
            </p>
          </div>
          <Button
            onClick={() => setShowWithdrawDialog(true)}
            disabled={stats.availableBalance < MINIMUM_WITHDRAWAL || isLoading}
            className="btn-primary"
          >
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Withdraw
          </Button>
        </div>
        
        {stats.availableBalance < MINIMUM_WITHDRAWAL && !isLoading && (
          <div className="mt-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-400" />
            <p className="text-yellow-400 text-sm">
              You need at least KSh {MINIMUM_WITHDRAWAL} to withdraw. Keep referring!
            </p>
          </div>
        )}
      </GlassCard>

      {/* Withdrawal History */}
      <GlassCard padding="lg">
        <h2 className="text-xl font-heading text-ninja-mint mb-4">Withdrawal History</h2>
        
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-xl bg-ninja-green/10" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24 bg-ninja-green/10" />
                    <Skeleton className="h-3 w-32 bg-ninja-green/10" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 bg-ninja-green/10 rounded-full" />
              </div>
            ))}
          </div>
        ) : withdrawals.length > 0 ? (
          <div className="space-y-3">
            {withdrawals.map((withdrawal) => (
              <div
                key={withdrawal.id}
                className="flex items-center justify-between p-4 rounded-xl bg-ninja-black/50 border border-ninja-green/10 hover:bg-ninja-green/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    withdrawal.status === 'completed' ? 'bg-ninja-green/20' : 'bg-yellow-500/20'
                  )}>
                    {withdrawal.status === 'completed' ? (
                      <ArrowDownLeft className="w-5 h-5 text-ninja-green" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5 text-yellow-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-ninja-mint font-medium">
                      KSh {withdrawal.amount.toLocaleString()}
                    </p>
                    <p className="text-ninja-sage text-sm">
                      {format(new Date(withdrawal.requested_at), 'dd MMM yyyy, HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium',
                    getStatusColor(withdrawal.status)
                  )}>
                    {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                  </span>
                  <p className="text-ninja-sage text-sm mt-1">
                    {withdrawal.phone_number}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Wallet className="w-12 h-12 text-ninja-green/30 mx-auto mb-4" />
            <p className="text-ninja-sage">No withdrawals yet</p>
          </div>
        )}
      </GlassCard>

      {/* Withdrawal Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent className="bg-ninja-dark/95 backdrop-blur-xl border-ninja-green/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading text-ninja-mint">
              Withdraw Funds
            </DialogTitle>
            <DialogDescription className="text-ninja-sage">
              Enter the amount you want to withdraw
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(initiateWithdrawal)} className="space-y-4">
            {message && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {message}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-ninja-mint">
                Amount (KSh)
              </Label>
              <Input
                id="amount"
                type="number"
                {...register('amount', { valueAsNumber: true })}
                placeholder={String(MINIMUM_WITHDRAWAL)}
                min={MINIMUM_WITHDRAWAL}
                max={stats.availableBalance}
                className={cn(
                  'input-field',
                  errors.amount && 'border-red-500/50'
                )}
              />
              {errors.amount && (
                <p className="text-red-400 text-sm">{errors.amount.message}</p>
              )}
              <p className="text-ninja-sage text-xs">
                Available: KSh {stats.availableBalance.toLocaleString()}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-ninja-mint">
                M-Pesa Phone Number
              </Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ninja-sage" />
                <Input
                  id="phoneNumber"
                  {...register('phoneNumber')}
                  placeholder="254712345678"
                  className={cn(
                    'input-field pl-10',
                    errors.phoneNumber && 'border-red-500/50'
                  )}
                />
              </div>
              {errors.phoneNumber && (
                <p className="text-red-400 text-sm">{errors.phoneNumber.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={withdrawalMutation.isPending}
              className="w-full btn-primary h-12"
            >
              {withdrawalMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-5 h-5 mr-2" />
                  Continue
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}