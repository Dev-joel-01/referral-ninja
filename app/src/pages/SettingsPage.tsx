import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  User, 
  Lock, 
  AlertTriangle,
  Loader2,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';
import { GlassCard } from '@/components/layout/GlassCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, 'Password must contain uppercase, lowercase, number, and symbol'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('error');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (data: PasswordFormData) => {
    setIsSubmitting(true);
    setMessage('');

    try {
      // Check reset count
      if (user && user.password_reset_count >= 3) {
        throw new Error('Maximum password resets reached for this account (3/3)');
      }

      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user!.email,
        password: data.currentPassword,
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (updateError) throw updateError;

      // Increment reset count
      await supabase.rpc('increment_reset_count', { user_id: user!.id });

      // Refresh user data
      await refreshUser();

      setMessageType('success');
      setMessage('Password updated successfully!');
      reset();
    } catch (error: any) {
      setMessageType('error');
      setMessage(error.message || 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetCount = user?.password_reset_count || 0;
  const remainingResets = 3 - resetCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-light text-ninja-mint">Settings</h1>
        <p className="text-ninja-sage">Manage your account settings</p>
      </div>

      {/* Profile Info (Read-only) */}
      <GlassCard padding="lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-ninja-green/20 flex items-center justify-center">
            <User className="w-5 h-5 text-ninja-green" />
          </div>
          <div>
            <h2 className="text-xl font-heading text-ninja-mint">Profile Information</h2>
            <p className="text-ninja-sage text-sm">Your profile details (read-only)</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-ninja-sage">Legal Name</Label>
            <Input
              value={user?.legal_name || ''}
              disabled
              className="input-field opacity-60"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-ninja-sage">Username</Label>
            <Input
              value={user?.username || ''}
              disabled
              className="input-field opacity-60"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-ninja-sage">Email</Label>
            <Input
              value={user?.email || ''}
              disabled
              className="input-field opacity-60"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-ninja-sage">Phone Number</Label>
            <Input
              value={user?.phone_number || ''}
              disabled
              className="input-field opacity-60"
            />
          </div>
        </div>

        <p className="text-ninja-sage text-sm mt-4">
          To update your profile information, please contact support.
        </p>
      </GlassCard>

      {/* Reset Password */}
      <GlassCard padding="lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-ninja-green/20 flex items-center justify-center">
            <Lock className="w-5 h-5 text-ninja-green" />
          </div>
          <div>
            <h2 className="text-xl font-heading text-ninja-mint">Reset Password</h2>
            <p className="text-ninja-sage text-sm">Change your account password</p>
          </div>
        </div>

        {/* Reset Count Warning */}
        <div className={cn(
          'p-4 rounded-xl mb-6 flex items-start gap-3',
          remainingResets === 0 
            ? 'bg-red-500/10 border border-red-500/30' 
            : remainingResets === 1
            ? 'bg-yellow-500/10 border border-yellow-500/30'
            : 'bg-ninja-green/10 border border-ninja-green/20'
        )}>
          <AlertTriangle className={cn(
            'w-5 h-5 flex-shrink-0 mt-0.5',
            remainingResets === 0 ? 'text-red-400' : remainingResets === 1 ? 'text-yellow-400' : 'text-ninja-green'
          )} />
          <div>
            <p className={cn(
              'font-medium',
              remainingResets === 0 ? 'text-red-400' : remainingResets === 1 ? 'text-yellow-400' : 'text-ninja-green'
            )}>
              Password Reset Limit
            </p>
            <p className="text-ninja-sage text-sm mt-1">
              You have used {resetCount} out of 3 password resets allowed for your account.
              {remainingResets > 0 && ` You have ${remainingResets} reset${remainingResets === 1 ? '' : 's'} remaining.`}
              {remainingResets === 0 && ' You have reached the maximum limit.'}
            </p>
          </div>
        </div>

        {message && (
          <div className={cn(
            'p-4 rounded-xl mb-6',
            messageType === 'success' 
              ? 'bg-ninja-green/10 border border-ninja-green/30 text-ninja-green'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          )}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-ninja-mint">
              Current Password
            </Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                {...register('currentPassword')}
                placeholder="••••••••"
                disabled={remainingResets === 0}
                className={cn(
                  'input-field pr-10',
                  errors.currentPassword && 'border-red-500/50'
                )}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ninja-sage hover:text-ninja-mint"
              >
                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-red-400 text-sm">{errors.currentPassword.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-ninja-mint">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                {...register('newPassword')}
                placeholder="••••••••"
                disabled={remainingResets === 0}
                className={cn(
                  'input-field pr-10',
                  errors.newPassword && 'border-red-500/50'
                )}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ninja-sage hover:text-ninja-mint"
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-red-400 text-sm">{errors.newPassword.message}</p>
            )}
            <p className="text-ninja-sage text-xs">
              Must be at least 8 characters with uppercase, lowercase, number, and symbol
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-ninja-mint">
              Confirm New Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                {...register('confirmPassword')}
                placeholder="••••••••"
                disabled={remainingResets === 0}
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

          <Button
            type="submit"
            disabled={isSubmitting || remainingResets === 0}
            className="btn-primary w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Update Password
              </>
            )}
          </Button>
        </form>
      </GlassCard>
    </div>
  );
}
