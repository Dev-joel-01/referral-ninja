import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ReferralStats } from '@/types';

export const referralKeys = {
  all: ['referrals'] as const,
  stats: (userId: string) => [...referralKeys.all, 'stats', userId] as const,
  list: (userId: string) => [...referralKeys.all, 'list', userId] as const,
};

// Real-time referral stats with background updates
export function useReferralStats(userId: string) {
  return useQuery({
    queryKey: referralKeys.stats(userId),
    queryFn: async () => {
      const { data, error } = await (supabase.from('referrals') as any)
        .select('status, count')
        .eq('referrer_id', userId)
        .group('status');
      
      if (error) throw error;
      
      const rows = (data || []) as Array<{ status: string; count: number }>;
      
      // Calculate totals
      const stats: ReferralStats = {
        total: rows.reduce((acc: number, curr) => acc + curr.count, 0),
        successful: rows.find((d) => d.status === 'successful')?.count || 0,
        pending: rows.find((d) => d.status === 'pending')?.count || 0,
        earnings: 0, // Calculate from successful * 100
      };
      
      return stats;
    },
    enabled: !!userId,
    // Referral stats can update frequently - shorter stale time
    staleTime: 30 * 1000, // 30 seconds
    // Enable real-time feel with background refetching
    refetchInterval: 60 * 1000, // Poll every minute
  });
}

// Optimistic referral creation
export function useCreateReferral() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase
        .from('referrals')
        .insert({ email, status: 'pending' });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate all referral queries
      queryClient.invalidateQueries({ queryKey: referralKeys.all });
    },
  });
}