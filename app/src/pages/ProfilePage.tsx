import { useState } from 'react';
import { User, Mail, Phone, Calendar } from 'lucide-react';
import { GlassCard } from '@/components/layout/GlassCard';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

export function ProfilePage() {
  const { user } = useAuth();
  const [imageError, setImageError] = useState(false);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ninja-green" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-light text-ninja-mint">Profile</h1>
        <p className="text-ninja-sage">View your account information</p>
      </div>

      {/* Profile Card */}
      <GlassCard padding="lg" className="max-w-2xl">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 rounded-full bg-ninja-green/20 flex items-center justify-center border-2 border-ninja-green/30 overflow-hidden">
              {user.avatar_url && !imageError ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.legal_name}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <span className="text-ninja-green font-heading font-bold text-4xl">
                  {user.legal_name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-ninja-black/50 border border-ninja-green/10">
                <div className="w-10 h-10 rounded-xl bg-ninja-green/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-ninja-green" />
                </div>
                <div>
                  <p className="text-ninja-sage text-sm">Full Name</p>
                  <p className="text-ninja-mint font-medium">{user.legal_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-ninja-black/50 border border-ninja-green/10">
                <div className="w-10 h-10 rounded-xl bg-ninja-green/20 flex items-center justify-center">
                  <span className="text-ninja-green font-bold">@</span>
                </div>
                <div>
                  <p className="text-ninja-sage text-sm">Username</p>
                  <p className="text-ninja-mint font-medium">@{user.username}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-ninja-black/50 border border-ninja-green/10">
                <div className="w-10 h-10 rounded-xl bg-ninja-green/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-ninja-green" />
                </div>
                <div>
                  <p className="text-ninja-sage text-sm">Email Address</p>
                  <p className="text-ninja-mint font-medium">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-ninja-black/50 border border-ninja-green/10">
                <div className="w-10 h-10 rounded-xl bg-ninja-green/20 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-ninja-green" />
                </div>
                <div>
                  <p className="text-ninja-sage text-sm">Phone Number</p>
                  <p className="text-ninja-mint font-medium">{user.phone_number}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-ninja-black/50 border border-ninja-green/10">
                <div className="w-10 h-10 rounded-xl bg-ninja-green/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-ninja-green" />
                </div>
                <div>
                  <p className="text-ninja-sage text-sm">Member Since</p>
                  <p className="text-ninja-mint font-medium">
                    {user.joined_at ? format(new Date(user.joined_at), 'dd MMMM yyyy') : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Referral Code Card */}
      <GlassCard padding="lg" className="max-w-2xl">
        <h2 className="text-xl font-heading text-ninja-mint mb-4">Your Referral Code</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1 p-4 rounded-xl bg-ninja-black/50 border border-ninja-green/20">
            <p className="text-ninja-sage text-sm mb-1">Unique Code</p>
            <p className="text-ninja-green font-mono text-2xl font-bold tracking-wider">
              {user.referral_code}
            </p>
          </div>
        </div>
        <p className="text-ninja-sage mt-4 text-sm">
          Share your referral code with friends and earn KSh 100 for each successful signup!
        </p>
      </GlassCard>
    </div>
  );
}
