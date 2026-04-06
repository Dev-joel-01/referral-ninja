import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Eye, 
  EyeOff, 
  Upload, 
  Check, 
  Loader2, 
  ArrowRight,
  Shield,
  Smartphone
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GlassCard } from '@/components/layout/GlassCard';
import { CursorGlow } from '@/components/layout/CursorGlow';
import { DemoModeBanner } from '@/components/common/DemoModeBanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase, signUp, uploadAvatar } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const signupSchema = z.object({
  legalName: z.string().min(2, 'Legal name must be at least 2 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Please enter a valid email'),
  phoneNumber: z.string().regex(/^254[0-9]{9}$/, 'Phone number must be in format 254XXXXXXXXX'),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, 'Password must contain uppercase, lowercase, number, and symbol'),
  confirmPassword: z.string(),
  referralCode: z.string().optional(),
  agreedToPolicy: z.boolean().refine((val) => val === true, 'You must agree to the terms and policy'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof signupSchema>;

// Types for payment status
type PaymentStatus = 'pending' | 'verifying' | 'success' | 'failed';

// Payment monitoring hook
const usePaymentMonitoring = (
  userId: string | null,
  onSuccess: () => void,
  onFailure: (message: string) => void
) => {
  const [status, setStatus] = useState<PaymentStatus>('pending');
  const [message, setMessage] = useState('Click the button below to pay KSh 200 via M-Pesa');
  const [remainingAttempts, setRemainingAttempts] = useState(6);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  // Start monitoring
  const startMonitoring = useCallback((phoneNumber: string) => {
    if (!userId) return;
    
    setStatus('verifying');
    setMessage('Please check your phone and enter M-Pesa PIN to complete payment...');
    setRemainingAttempts(6);

    // Setup realtime subscription
    channelRef.current = supabase
      .channel(`payment-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new.status === 'completed') {
            cleanup();
            setStatus('success');
            setMessage('Payment verified! Redirecting to dashboard...');
            onSuccess();
          } else if (payload.new.status === 'failed') {
            cleanup();
            setStatus('failed');
            onFailure('Payment failed. Please try again.');
          }
        }
      )
      .subscribe();

    // Fallback polling
    let attempts = 0;
    const maxAttempts = 6;

    const checkPayment = async () => {
      attempts++;
      setRemainingAttempts(maxAttempts - attempts);

      try {
        const { data: payment } = await supabase
          .from('payments')
          .select('status')
          .eq('user_id', userId)
          .eq('payment_type', 'registration')
          .maybeSingle();

        if (payment?.status === 'completed') {
          cleanup();
          setStatus('success');
          onSuccess();
          return true;
        }

        if (payment?.status === 'failed' || attempts >= maxAttempts) {
          cleanup();
          
          if (attempts >= maxAttempts) {
            // Timeout - cleanup
            await supabase
              .from('payments')
              .update({ status: 'failed', updated_at: new Date().toISOString() })
              .eq('user_id', userId)
              .eq('payment_type', 'registration');
            
            await supabase
              .from('profiles')
              .update({ payment_status: 'failed' })
              .eq('id', userId);

            // Note: Cannot delete auth user from client side
            // This requires admin rights - handle via edge function or leave for cleanup job
            
            setStatus('failed');
            onFailure('Payment not received within time limit. Please contact support.');
          }
          return true;
        }

        return false;
      } catch (error) {
        console.error('Payment check error:', error);
        return false;
      }
    };

    // Initial check
    checkPayment().then(shouldStop => {
      if (!shouldStop) {
        intervalRef.current = setInterval(() => {
          checkPayment().then(stop => {
            if (stop && intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          });
        }, 5000);
      }
    });
  }, [userId, cleanup, onSuccess, onFailure]);

  useEffect(() => cleanup, [cleanup]);

  return { status, message, remainingAttempts, startMonitoring, cleanup };
};

export function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const prefillReferralCode = searchParams.get('ref');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      referralCode: prefillReferralCode || '',
      agreedToPolicy: false,
    },
  });

  const agreedToPolicy = watch('agreedToPolicy');
  const phoneNumber = watch('phoneNumber');

  // Payment monitoring
  const {
    status: paymentStatus,
    message: paymentMessage,
    remainingAttempts,
    startMonitoring,
    cleanup: cleanupPayment,
  } = usePaymentMonitoring(
    createdUserId,
    () => {
      // On success - invalidate queries and redirect
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
    },
    (msg) => {
      // On failure
      setTimeout(() => {
        setShowPaymentDialog(false);
        signupMutation.reset();
      }, 3000);
    }
  );

  // Cleanup on unmount
  useEffect(() => cleanupPayment, [cleanupPayment]);

  // Signup mutation - UPDATED to use update() instead of insert()
  const signupMutation = useMutation({
    mutationFn: async (data: SignupFormData) => {
      const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // 1. Create auth user (trigger automatically creates profile)
      const { data: authData, error: authError } = await signUp(
        data.email,
        data.password,
        {
          legal_name: data.legalName,
          username: data.username,
          phone_number: data.phoneNumber,
          referral_code: referralCode,
          referred_by: data.referralCode || null,
        }
      );

      if (authError || !authData.user) {
        throw authError || new Error('Failed to create user');
      }

      const userId = authData.user.id;

      // 2. UPDATE the profile created by trigger (NOT insert)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          legal_name: data.legalName,
          username: data.username,
          email: data.email,
          phone_number: data.phoneNumber,
          referral_code: referralCode,
          referred_by: data.referralCode || null,
          payment_status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (profileError) {
        throw profileError;
      }

      // 3. Upload avatar if provided
      if (avatarFile) {
        try {
          const avatarUrl = await uploadAvatar(userId, avatarFile);
          if (avatarUrl) {
            await supabase
              .from('profiles')
              .update({ avatar_url: avatarUrl })
              .eq('id', userId);
          }
        } catch (avatarError) {
          console.error('Avatar upload error:', avatarError);
          // Continue without avatar - don't fail signup
        }
      }

      // 4. Create referral record if referral code provided
      if (data.referralCode) {
        try {
          const { data: referrer } = await supabase
            .from('profiles')
            .select('id')
            .eq('referral_code', data.referralCode)
            .single();
          
          if (referrer) {
            await supabase.from('referrals').insert({
              referrer_id: referrer.id,
              referred_id: userId,
              status: 'pending',
              earned_amount: 0,
            });
          }
        } catch (referralError) {
          console.error('Referral creation error:', referralError);
          // Continue without referral - don't fail signup
        }
      }

      return { userId, phoneNumber: data.phoneNumber };
    },
    onSuccess: ({ userId }) => {
      setCreatedUserId(userId);
      setShowPaymentDialog(true);
    },
    onError: (error: any) => {
      alert(error.message || 'Failed to create account. Please try again.');
    },
  });

  // Payment initiation mutation
  const paymentMutation = useMutation({
    mutationFn: async ({ userId, phone }: { userId: string; phone: string }) => {
      const formattedPhone = phone.startsWith('254') ? phone : `254${phone.replace(/^0+/, '')}`;

      // Create payment record
      const { data: result, error: rpcError } = await supabase.rpc(
        'initiate_registration_payment',
        { p_user_id: userId, p_phone_number: formattedPhone }
      );

      if (rpcError) throw rpcError;
      if (!result?.success) throw new Error(result?.error || 'Failed to create payment record');

      // Call M-Pesa STK Push
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mpesa-stk-push`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            phoneNumber: formattedPhone,
            amount: 200,
            accountReference: `REG-${userId}`,
            transactionDesc: 'Referral Ninja Registration',
          }),
        }
      );

      const mpesaResult = await response.json();
      if (!mpesaResult.success) {
        throw new Error(mpesaResult.error || 'STK push failed');
      }

      return { userId, phone: formattedPhone };
    },
    onSuccess: ({ userId, phone }) => {
      startMonitoring(phone);
    },
    onError: (error: any) => {
      alert(error.message || 'Failed to initiate payment. Please try again.');
    },
  });

  // File handling
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      const file = files[0];
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const onSubmit = (data: SignupFormData) => {
    signupMutation.mutate(data);
  };

  const handlePayNow = () => {
    if (createdUserId && phoneNumber) {
      paymentMutation.mutate({ userId: createdUserId, phone: phoneNumber });
    }
  };

  const isSubmitting = signupMutation.isPending || paymentMutation.isPending;

  return (
    <div className="min-h-screen bg-ninja-black relative overflow-hidden">
      <DemoModeBanner />
      <CursorGlow />
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-ninja-green/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-ninja-green/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 py-12">
        <GlassCard className="w-full max-w-2xl" glow>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-ninja-green/20 border border-ninja-green/30 mb-4">
              <span className="text-ninja-green font-heading font-bold text-3xl">N</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-heading font-light text-ninja-mint mb-2">
              Create Your Account
            </h1>
            <p className="text-ninja-sage">
              Join Referral Ninja and start earning from referrals
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex justify-center">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  'relative w-32 h-32 rounded-full border-2 border-dashed cursor-pointer transition-all duration-300 overflow-hidden',
                  isDragging 
                    ? 'border-ninja-green bg-ninja-green/20' 
                    : 'border-ninja-green/30 hover:border-ninja-green/50 bg-ninja-dark/50',
                  avatarPreview && 'border-solid'
                )}
              >
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
                    alt="Avatar preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-ninja-sage">
                    <Upload className="w-8 h-8 mb-2" />
                    <span className="text-xs text-center px-2">Drag & drop or click</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* Form Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Legal Name */}
              <div className="space-y-2">
                <Label htmlFor="legalName" className="text-ninja-mint">
                  Legal Name <span className="text-ninja-green">*</span>
                </Label>
                <Input
                  id="legalName"
                  {...register('legalName')}
                  placeholder="John Doe"
                  className={cn(
                    'input-field',
                    errors.legalName && 'border-red-500/50'
                  )}
                />
                {errors.legalName && (
                  <p className="text-red-400 text-sm">{errors.legalName.message}</p>
                )}
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-ninja-mint">
                  Username <span className="text-ninja-green">*</span>
                </Label>
                <Input
                  id="username"
                  {...register('username')}
                  placeholder="johndoe"
                  className={cn(
                    'input-field',
                    errors.username && 'border-red-500/50'
                  )}
                />
                {errors.username && (
                  <p className="text-red-400 text-sm">{errors.username.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-ninja-mint">
                  Email Address <span className="text-ninja-green">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="john@example.com"
                  className={cn(
                    'input-field',
                    errors.email && 'border-red-500/50'
                  )}
                />
                {errors.email && (
                  <p className="text-red-400 text-sm">{errors.email.message}</p>
                )}
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-ninja-mint">
                  Phone Number <span className="text-ninja-green">*</span>
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
                <p className="text-xs text-ninja-sage/70">Format: 254XXXXXXXXX (for M-Pesa)</p>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-ninja-mint">
                  Password <span className="text-ninja-green">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    placeholder="••••••••"
                    className={cn(
                      'input-field pr-10',
                      errors.password && 'border-red-500/50'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ninja-sage hover:text-ninja-mint"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-400 text-sm">{errors.password.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-ninja-mint">
                  Re-enter Password <span className="text-ninja-green">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    {...register('confirmPassword')}
                    placeholder="••••••••"
                    className={cn(
                      'input-field pr-10',
                      errors.confirmPassword && 'border-red-500/50'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ninja-sage hover:text-ninja-mint"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-400 text-sm">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* Referral Code */}
            <div className="space-y-2">
              <Label htmlFor="referralCode" className="text-ninja-mint">
                Referral Code <span className="text-ninja-sage">(Optional)</span>
              </Label>
              <Input
                id="referralCode"
                {...register('referralCode')}
                placeholder="Enter referral code if you have one"
                disabled={!!prefillReferralCode}
                className={cn(
                  'input-field uppercase',
                  prefillReferralCode && 'bg-ninja-green/10 border-ninja-green/30'
                )}
              />
              {prefillReferralCode && (
                <p className="text-xs text-ninja-green">Referral code auto-applied from link</p>
              )}
            </div>

            {/* Policy Checkbox */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="policy"
                checked={agreedToPolicy}
                onCheckedChange={(checked) => setValue('agreedToPolicy', checked as boolean)}
                className={cn(
                  'mt-1 border-ninja-green/30 data-[state=checked]:bg-ninja-green data-[state=checked]:border-ninja-green',
                  errors.agreedToPolicy && 'border-red-500'
                )}
              />
              <div>
                <Label htmlFor="policy" className="text-ninja-sage text-sm cursor-pointer">
                  I agree to the{' '}
                  <a href="#" className="text-ninja-green hover:underline">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="text-ninja-green hover:underline">Privacy Policy</a>
                  {' '}<span className="text-ninja-green">*</span>
                </Label>
                {errors.agreedToPolicy && (
                  <p className="text-red-400 text-sm mt-1">{errors.agreedToPolicy.message}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary h-12 text-lg"
            >
              {signupMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            {/* Login Link */}
            <p className="text-center text-ninja-sage">
              Already have an account?{' '}
              <a href="/login" className="text-ninja-green hover:underline font-medium">
                Log in
              </a>
            </p>
          </form>
        </GlassCard>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="bg-ninja-dark/95 backdrop-blur-xl border-ninja-green/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading text-ninja-mint text-center">
              Complete Registration
            </DialogTitle>
            <DialogDescription className="text-center text-ninja-sage">
              Registration fee: <span className="text-ninja-green font-semibold">KSh 200</span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-6 py-4">
            {paymentStatus === 'pending' && (
              <>
                <div className="w-20 h-20 rounded-full bg-ninja-green/20 flex items-center justify-center border border-ninja-green/30">
                  <Shield className="w-10 h-10 text-ninja-green" />
                </div>
                <p className="text-ninja-sage text-center">{paymentMessage}</p>
                <Button 
                  onClick={handlePayNow} 
                  className="btn-primary w-full"
                  disabled={paymentMutation.isPending}
                >
                  {paymentMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Initiating...
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-5 h-5 mr-2" />
                      Pay with M-Pesa
                    </>
                  )}
                </Button>
              </>
            )}

            {paymentStatus === 'verifying' && (
              <>
                <div className="w-20 h-20 rounded-full bg-ninja-green/20 flex items-center justify-center border border-ninja-green/30">
                  <Loader2 className="w-10 h-10 text-ninja-green animate-spin" />
                </div>
                <p className="text-ninja-sage text-center">{paymentMessage}</p>
                <p className="text-xs text-ninja-sage/70 text-center">
                  Checking payment status... ({remainingAttempts} attempts remaining)
                </p>
              </>
            )}

            {paymentStatus === 'success' && (
              <>
                <div className="w-20 h-20 rounded-full bg-ninja-green/30 flex items-center justify-center border border-ninja-green">
                  <Check className="w-10 h-10 text-ninja-green" />
                </div>
                <p className="text-ninja-green text-center font-medium">{paymentMessage}</p>
              </>
            )}

            {paymentStatus === 'failed' && (
              <>
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
                  <span className="text-red-400 text-3xl">×</span>
                </div>
                <p className="text-red-400 text-center">{paymentMessage}</p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
