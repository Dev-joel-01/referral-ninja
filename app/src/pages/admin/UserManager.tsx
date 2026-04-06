import { useState, useMemo, useCallback } from 'react';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GlassCard } from '@/components/layout/GlassCard';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import type { Profile } from '@/types';

interface UserWithStats extends Profile {
  referral_count: number;
  total_earned: number;
}

// Query keys
const userKeys = {
  all: ['users'] as const,
  list: (search: string) => [...userKeys.all, 'list', search] as const,
  stats: () => [...userKeys.all, 'stats'] as const,
};

// SINGLE efficient query using Supabase joins/aggregations
// Replaces N+1 queries with 1 query
const fetchUsersWithStats = async (searchQuery: string): Promise<UserWithStats[]> => {
  // Use Supabase RPC or a single optimized query
  // Option 1: If you have a database view (recommended)
  const { data, error } = await supabase
    .from('user_stats_view') // Create this view in Supabase
    .select('*')
    .order('created_at', { ascending: false });
  
  // Option 2: Without view - fetch referrals separately but efficiently
  if (!data || error) {
    // Fallback to batched queries
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, legal_name, username, email, phone_number, avatar_url, is_admin, payment_status, joined_at, created_at')
      .order('created_at', { ascending: false });
    
    if (profileError) throw profileError;
    if (!profiles) return [];
    
    // Batch fetch all referral stats in ONE query
    const userIds = profiles.map(p => p.id);
    const { data: referrals, error: refError } = await supabase
      .from('referrals')
      .select('referrer_id, earned_amount, status')
      .in('referrer_id', userIds)
      .eq('status', 'completed');
    
    if (refError) throw refError;
    
    // Aggregate in memory (much faster than N queries)
    const referralMap = new Map<string, { count: number; earned: number }>();
    referrals?.forEach(r => {
      const existing = referralMap.get(r.referrer_id) || { count: 0, earned: 0 };
      existing.count++;
      existing.earned += r.earned_amount || 0;
      referralMap.set(r.referrer_id, existing);
    });
    
    return profiles.map(profile => ({
      ...profile,
      referral_count: referralMap.get(profile.id)?.count || 0,
      total_earned: referralMap.get(profile.id)?.earned || 0,
    }));
  }
  
  // Filter client-side for search (with large datasets, move to server-side)
  if (searchQuery) {
    const lower = searchQuery.toLowerCase();
    return data.filter(u => 
      u.legal_name.toLowerCase().includes(lower) ||
      u.username.toLowerCase().includes(lower) ||
      u.email.toLowerCase().includes(lower)
    );
  }
  
  return data;
};

// Fetch aggregated stats for the header cards
const fetchUserStats = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('payment_status, is_admin', { count: 'exact' });
  
  if (error) throw error;
  
  return {
    total: data?.length || 0,
    paid: data?.filter(u => u.payment_status === 'completed').length || 0,
    admins: data?.filter(u => u.is_admin).length || 0,
    pending: data?.filter(u => u.payment_status === 'pending').length || 0,
  };
};

export function UserManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();
  
  // Debounced search to prevent excessive re-fetches
  const debouncedSearch = useMemo(() => {
    let timeout: NodeJS.Timeout;
    return (value: string) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setSearchQuery(value), 300);
    };
  }, []);

  // Main users query with caching
  const { 
    data: users = [], 
    isLoading, 
    isFetching,
    error 
  } = useQuery({
    queryKey: userKeys.list(searchQuery),
    queryFn: () => fetchUsersWithStats(searchQuery),
    staleTime: 2 * 60 * 1000, // 2 minutes for admin data
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData, // Keep data during search
  });

  // Stats query (separate for faster header load)
  const { data: stats } = useQuery({
    queryKey: userKeys.stats(),
    queryFn: fetchUserStats,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Prefetch user details on hover (for future detail view)
  const prefetchUser = useCallback((userId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['users', 'detail', userId],
      queryFn: async () => {
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
        return data;
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);

  // Memoized filtered users (if not using server-side search)
  const filteredUsers = useMemo(() => users, [users]);

  // Memoized stat cards to prevent re-render
  const StatCards = useMemo(() => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <GlassCard padding="md">
        <p className="stat-label">Total Users</p>
        <p className="stat-value">{stats?.total ?? <Skeleton className="h-8 w-16" />}</p>
      </GlassCard>
      <GlassCard padding="md">
        <p className="stat-label">Paid Users</p>
        <p className="stat-value">{stats?.paid ?? <Skeleton className="h-8 w-16" />}</p>
      </GlassCard>
      <GlassCard padding="md">
        <p className="stat-label">Admins</p>
        <p className="stat-value">{stats?.admins ?? <Skeleton className="h-8 w-16" />}</p>
      </GlassCard>
      <GlassCard padding="md">
        <p className="stat-label">Pending Payment</p>
        <p className="stat-value">{stats?.pending ?? <Skeleton className="h-8 w-16" />}</p>
      </GlassCard>
    </div>
  ), [stats]);

  // Loading skeleton for table
  const TableSkeleton = () => (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="h-10 w-10 rounded-full bg-ninja-green/10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 bg-ninja-green/10 w-1/4" />
            <Skeleton className="h-3 bg-ninja-green/10 w-1/3" />
          </div>
          <Skeleton className="h-4 bg-ninja-green/10 w-20" />
          <Skeleton className="h-4 bg-ninja-green/10 w-16" />
        </div>
      ))}
    </div>
  );

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Failed to load users</p>
        <button 
          onClick={() => queryClient.invalidateQueries({ queryKey: userKeys.all })}
          className="mt-4 px-4 py-2 bg-ninja-green text-ninja-black rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

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
            defaultValue={searchQuery}
            onChange={(e) => debouncedSearch(e.target.value)}
            placeholder="Search users..."
            className="input-field pl-10 w-full sm:w-80"
          />
          {isFetching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-ninja-green">
              ⟳
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      {StatCards}

      {/* Users Table */}
      <GlassCard padding="lg">
        {isLoading ? (
          <TableSkeleton />
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
                  <tr 
                    key={user.id} 
                    className="border-b border-ninja-green/10 hover:bg-ninja-green/5 transition-colors"
                    onMouseEnter={() => prefetchUser(user.id)}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-ninja-green/20 flex items-center justify-center overflow-hidden">
                          {user.avatar_url ? (
                            <img 
                              src={user.avatar_url} 
                              alt={user.username}
                              className="w-full h-full object-cover"
                              loading="lazy"
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