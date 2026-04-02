import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Wallet, 
  TrendingUp, 
  ArrowDownLeft, 
  ArrowUpRight,
  Loader2,
  Check,
  AlertCircle,
  Smartphone,
  Mail
} from 'lucide-react';
import { GlassCard } from '@/components/layout/GlassCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const withdrawalSchema = z.object({
  amount: z.number().min(500, 'Minimum withdrawal is KSh 500'),
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

export function PaymentsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    availableBalance: 0,
    totalWithdrawn: 0,
  });
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingWithdrawal, setPendingWithdrawal] = useState<WithdrawalFormData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WithdrawalFormData>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      phoneNumber: user?.phone_number || '',
    },
  });

  useEffect(() => {
    if (user) {
      fetchPaymentData();
    }
  }, [user]);

  const fetchPaymentData = async () => {
    try {
      // Fetch referrals for earnings
      const { data: referrals } = await supabase
        .from('referrals')
        .select('earned_amount')
        .eq('referrer_id', user!.id)
        .eq('status', 'completed');

      const totalEarned = referrals?.reduce((sum, r) => sum + r.earned_amount, 0) || 0;

      // Fetch withdrawals
      const { data: withdrawalData } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user!.id)
        .order('requested_at', { ascending: false });

      if (withdrawalData) {
        setWithdrawals(withdrawalData);
        const totalWithdrawn = withdrawalData
          .filter((w) => w.status === 'completed')
          .reduce((sum, w) => sum + w.amount, 0);
        
        setStats({
          availableBalance: totalEarned - totalWithdrawn,
          totalWithdrawn,
        });
      }
    } catch (error) {
      console.error('Error fetching payment data:', error);
    }
  };

  const initiateWithdrawal = async (data: WithdrawalFormData) => {
    if (data.amount > stats.availableBalance) {
      setMessage('Insufficient balance');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      // Generate 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Store code in password_resets table (reusing for verification)
      const { error: codeError } = await supabase
        .from('password_resets')
        .insert({
          user_id: user!.id,
          reset_code: code,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        });

      if (codeError) throw codeError;

      // Send email with code
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: user!.email,
          subject: 'Withdrawal Verification Code - Referral Ninja',
          template: 'withdrawal-verification',
          data: { 
            code,
            amount: data.amount,
          },
        },
      });

      if (emailError) {
        console.error('Email error:', emailError);
      }

      setPendingWithdrawal(data);
      setShowWithdrawDialog(false);
      setShowVerificationDialog(true);
      setMessage('Verification code sent to your email');
    } catch (error: any) {
      setMessage(error.message || 'Failed to initiate withdrawal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyAndWithdraw = async () => {
    if (!pendingWithdrawal || !verificationCode) return;

    setIsVerifying(true);
    setMessage('');

    try {
      // Verify code
      const { data: codeData, error: codeError } = await supabase
        .from('password_resets')
        .select('*')
        .eq('user_id', user!.id)
        .eq('reset_code', verificationCode)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (codeError || !codeData) {
        throw new Error('Invalid or expired verification code');
      }

      // Mark code as used
      await supabase
        .from('password_resets')
        .update({ used_at: new Date().toISOString() })
        .eq('id', codeData.id);

      // Create withdrawal request
      const { error: withdrawalError } = await supabase
        .from('withdrawals')
        .insert({
          user_id: user!.id,
          amount: pendingWithdrawal.amount,
          phone_number: pendingWithdrawal.phoneNumber,
          status: 'pending',
        });

      if (withdrawalError) throw withdrawalError;

      setMessage('Withdrawal request submitted successfully!');
      setShowVerificationDialog(false);
      setPendingWithdrawal(null);
      setVerificationCode('');
      fetchPaymentData();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setIsVerifying(false);
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-light text-ninja-mint">Payments</h1>
        <p className="text-ninja-sage">Manage your earnings and withdrawals</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <GlassCard padding="md" hover className="border-ninja-green/40">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label mb-1 text-ninja-green">Available Balance</p>
              <p className="stat-value text-ninja-green">KSh {stats.availableBalance.toLocaleString()}</p>
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
            <p className="text-2xl font-heading text-ninja-mint">KSh 500</p>
            <p className="text-ninja-sage text-xs mt-1">Minimum per withdrawal</p>
          </div>
        </GlassCard>
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
            disabled={stats.availableBalance < 500}
            className="btn-primary"
          >
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Withdraw
          </Button>
        </div>
        
        {stats.availableBalance < 500 && (
          <div className="mt-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-400" />
            <p className="text-yellow-400 text-sm">
              You need at least KSh 500 to withdraw. Keep referring!
            </p>
          </div>
        )}
      </GlassCard>

      {/* Withdrawal History */}
      <GlassCard padding="lg">
        <h2 className="text-xl font-heading text-ninja-mint mb-4">Withdrawal History</h2>
        
        {withdrawals.length > 0 ? (
          <div className="space-y-3">
            {withdrawals.map((withdrawal) => (
              <div
                key={withdrawal.id}
                className="flex items-center justify-between p-4 rounded-xl bg-ninja-black/50 border border-ninja-green/10"
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
                placeholder="500"
                min={500}
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
              disabled={isSubmitting}
              className="w-full btn-primary h-12"
            >
              {isSubmitting ? (
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

      {/* Verification Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent className="bg-ninja-dark/95 backdrop-blur-xl border-ninja-green/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading text-ninja-mint">
              Verify Withdrawal
            </DialogTitle>
            <DialogDescription className="text-ninja-sage">
              Enter the 6-digit code sent to your email
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {message && (
              <div className={cn(
                'p-3 rounded-xl text-sm',
                message.includes('success') 
                  ? 'bg-ninja-green/10 border border-ninja-green/30 text-ninja-green'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
              )}>
                {message}
              </div>
            )}

            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-ninja-green/20 flex items-center justify-center">
                <Mail className="w-8 h-8 text-ninja-green" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="code" className="text-ninja-mint text-center block">
                Verification Code
              </Label>
              <Input
                id="code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className="input-field text-center text-2xl tracking-widest"
              />
            </div>

            <Button
              onClick={verifyAndWithdraw}
              disabled={isVerifying || verificationCode.length !== 6}
              className="w-full btn-primary h-12"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Confirm Withdrawal
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
