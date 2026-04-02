import { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  CheckCircle,
  XCircle,
  Crown,
  Calendar,
  Phone,
  Mail
} from 'lucide-react';
import { GlassCard } from '@/components/layout/GlassCard';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import type { Profile } from '@/types';

interface UserWithStats extends Profile {
  referral_count: number;
  total_earned: number;
}

export function UserManager() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithStats[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter(
      (user) =>
        user.legal_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const usersWithStats = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: referrals } = await supabase
            .from('referrals')
            .select('earned_amount')
            .eq('referrer_id', profile.id)
            .eq('status', 'completed');

          const referralCount = referrals?.length || 0;
          const totalEarned = referrals?.reduce((sum, r) => sum + r.earned_amount, 0) || 0;

          return { ...profile, referral_count: referralCount, total_earned: totalEarned };
        })
      );

      setUsers(usersWithStats);
      setFilteredUsers(usersWithStats);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-light text-ninja-mint">User Manager</h1>
          <p className="text-ninja-sage">Manage platform users</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ninja-sage" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="input-field pl-10 w-full sm:w-80"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard padding="md">
          <p className="stat-label">Total Users</p>
          <p className="stat-value">{users.length}</p>
        </GlassCard>
        <GlassCard padding="md">
          <p className="stat-label">Paid Users</p>
          <p className="stat-value">{users.filter((u) => u.payment_status === 'completed').length}</p>
        </GlassCard>
        <GlassCard padding="md">
          <p className="stat-label">Admins</p>
          <p className="stat-value">{users.filter((u) => u.is_admin).length}</p>
        </GlassCard>
        <GlassCard padding="md">
          <p className="stat-label">Pending Payment</p>
          <p className="stat-value">{users.filter((u) => u.payment_status === 'pending').length}</p>
        </GlassCard>
      </div>

      {/* Users Table */}
      <GlassCard padding="lg">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ninja-green" />
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ninja-green/20">
                  <th className="text-left py-3 px-4 text-ninja-sage font-medium">User</th>
                  <th className="text-left py-3 px-4 text-ninja-sage font-medium">Contact</th>
                  <th className="text-left py-3 px-4 text-ninja-sage font-medium">Joined</th>
                  <th className="text-center py-3 px-4 text-ninja-sage font-medium">Payment</th>
                  <th className="text-center py-3 px-4 text-ninja-sage font-medium">Referrals</th>
                  <th className="text-right py-3 px-4 text-ninja-sage font-medium">Earned</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-ninja-green/10 hover:bg-ninja-green/5">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-ninja-green/20 flex items-center justify-center overflow-hidden">
                          {user.avatar_url ? (
                            <img 
                              src={user.avatar_url} 
                              alt={user.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-ninja-green font-medium">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-ninja-mint font-medium flex items-center gap-2">
                            {user.legal_name}
                            {user.is_admin && (
                              <Crown className="w-4 h-4 text-yellow-400" />
                            )}
                          </p>
                          <p className="text-ninja-sage text-sm">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <p className="text-ninja-sage text-sm flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </p>
                        <p className="text-ninja-sage text-sm flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {user.phone_number}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-ninja-sage text-sm flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(user.joined_at), 'dd MMM yyyy')}
                      </p>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {user.payment_status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-ninja-green/20 text-ninja-green text-xs">
                          <CheckCircle className="w-3 h-3" />
                          Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
                          <XCircle className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-ninja-mint font-medium">{user.referral_count}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-ninja-green font-medium">
                        KSh {user.total_earned.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-ninja-green/30 mx-auto mb-4" />
            <p className="text-ninja-sage">No users found</p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
