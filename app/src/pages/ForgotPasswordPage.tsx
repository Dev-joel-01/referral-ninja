import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Loader2, Mail, Check, Lock, Eye, EyeOff } from 'lucide-react';
import { GlassCard } from '@/components/layout/GlassCard';
import { CursorGlow } from '@/components/layout/CursorGlow';
import { DemoModeBanner } from '@/components/common/DemoModeBanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

const codeSchema = z.object({
  code: z.string().length(8, 'Code must be 8 digits'),
});

const passwordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, 'Password must contain uppercase, lowercase, number, and symbol'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type EmailFormData = z.infer<typeof emailSchema>;
type CodeFormData = z.infer<typeof codeSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

type Step = 'email' | 'code' | 'password' | 'success';

export function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  const codeForm = useForm<CodeFormData>({
    resolver: zodResolver(codeSchema),
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const sendResetCode = async (data: EmailFormData) => {
    setIsSubmitting(true);
    setError('');

    try {
      // Check if user exists
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, password_reset_count')
        .eq('email', data.email)
        .single();

      if (userError || !userData) {
        throw new Error('No account found with this email');
      }

      // Check reset count
      if (userData.password_reset_count >= 3) {
        throw new Error('Maximum password resets reached for this account');
      }

      // Generate 8-digit code
      const resetCode = Math.floor(10000000 + Math.random() * 90000000).toString();

      // Store reset code
      const { error: resetError } = await supabase
        .from('password_resets')
        .insert({
          user_id: userData.id,
          reset_code: resetCode,
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
        });

      if (resetError) throw resetError;

      // Send email via edge function
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: data.email,
          subject: 'Password Reset Code - Referral Ninja',
          template: 'password-reset',
          data: { code: resetCode },
        },
      });

      if (emailError) {
        console.error('Email error:', emailError);
        // Continue anyway - code is stored
      }

      setEmail(data.email);
      setStep('code');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyCode = async (data: CodeFormData) => {
    setIsSubmitting(true);
    setError('');

    try {
      const { data: userData } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (!userData) throw new Error('User not found');

      const { data: resetData, error: resetError } = await supabase
        .from('password_resets')
        .select('*')
        .eq('user_id', userData.id)
        .eq('reset_code', data.code)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (resetError || !resetData) {
        throw new Error('Invalid or expired code');
      }

      setStep('password');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPassword = async (data: PasswordFormData) => {
    setIsSubmitting(true);
    setError('');

    try {
      const { data: userData } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (!userData) throw new Error('User not found');

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (updateError) throw updateError;

      // Mark code as used
      await supabase
        .from('password_resets')
        .update({ used_at: new Date().toISOString() })
        .eq('user_id', userData.id)
        .is('used_at', null);

      // Increment reset count
      await supabase.rpc('increment_reset_count', { user_id: userData.id });

      setStep('success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ninja-black relative overflow-hidden">
      <DemoModeBanner />
      <CursorGlow />
      
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-ninja-green/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-ninja-green/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <GlassCard className="w-full max-w-md" glow>
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-ninja-green/20 border border-ninja-green/30 mb-4">
              <Lock className="w-8 h-8 text-ninja-green" />
            </div>
            <h1 className="text-3xl md:text-4xl font-heading font-light text-ninja-mint mb-2">
              Reset Password
            </h1>
            <p className="text-ninja-sage">
              {step === 'email' && 'Enter your email to receive a reset code'}
              {step === 'code' && 'Enter the 8-digit code sent to your email'}
              {step === 'password' && 'Create a new password'}
              {step === 'success' && 'Your password has been reset'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Email */}
          {step === 'email' && (
            <form onSubmit={emailForm.handleSubmit(sendResetCode)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-ninja-mint">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ninja-sage" />
                  <Input
                    id="email"
                    type="email"
                    {...emailForm.register('email')}
                    placeholder="john@example.com"
                    className={cn(
                      'input-field pl-10',
                      emailForm.formState.errors.email && 'border-red-500/50'
                    )}
                  />
                </div>
                {emailForm.formState.errors.email && (
                  <p className="text-red-400 text-sm">{emailForm.formState.errors.email.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary h-12 text-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Reset Code
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Step 2: Code */}
          {step === 'code' && (
            <form onSubmit={codeForm.handleSubmit(verifyCode)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-ninja-mint">
                  8-Digit Code
                </Label>
                <Input
                  id="code"
                  {...codeForm.register('code')}
                  placeholder="00000000"
                  maxLength={8}
                  className={cn(
                    'input-field text-center text-2xl tracking-widest',
                    codeForm.formState.errors.code && 'border-red-500/50'
                  )}
                />
                {codeForm.formState.errors.code && (
                  <p className="text-red-400 text-sm">{codeForm.formState.errors.code.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary h-12 text-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify Code
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-full text-center text-ninja-sage hover:text-ninja-green text-sm"
              >
                Didn't receive code? Try again
              </button>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === 'password' && (
            <form onSubmit={passwordForm.handleSubmit(resetPassword)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-ninja-mint">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...passwordForm.register('password')}
                    placeholder="••••••••"
                    className={cn(
                      'input-field pr-10',
                      passwordForm.formState.errors.password && 'border-red-500/50'
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
                {passwordForm.formState.errors.password && (
                  <p className="text-red-400 text-sm">{passwordForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-ninja-mint">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    {...passwordForm.register('confirmPassword')}
                    placeholder="••••••••"
                    className={cn(
                      'input-field pr-10',
                      passwordForm.formState.errors.confirmPassword && 'border-red-500/50'
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
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-red-400 text-sm">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary h-12 text-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    Reset Password
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-ninja-green/30 flex items-center justify-center border border-ninja-green mx-auto">
                <Check className="w-10 h-10 text-ninja-green" />
              </div>
              <p className="text-ninja-sage">
                Your password has been successfully reset.
              </p>
              <a href="/login" className="btn-primary inline-flex items-center">
                Go to Login
                <ArrowRight className="w-5 h-5 ml-2" />
              </a>
            </div>
          )}

          {/* Back to Login */}
          {step !== 'success' && (
            <p className="text-center text-ninja-sage mt-6">
              Remember your password?{' '}
              <a href="/login" className="text-ninja-green hover:underline font-medium">
                Log in
              </a>
            </p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
