// hooks/use-auth.ts
import { useQuery, useQueryClient,  } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { Profile } from '@/types';

export const authKeys = queryKeys.auth;

// Core query - this is your single source of truth
export function useAuthUser() {
  return useQuery({
    queryKey: authKeys.user(),
    queryFn: async () => {
      // 1. Get session (local, instant)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user) return null;

      // 2. Validate + get fresh user data (network)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) return null;

      // 3. Get profile (network)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) throw profileError;

      return { ...user, ...profile } as Profile;
    },
    staleTime: 5 * 60 * 1000,  // 5min before re-fetch
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

// Convenience hook with derived state (replaces your AuthContext)
export function useAuth() {
  const { data: user, isLoading, error } = useAuthUser();
  const queryClient = useQueryClient();

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.is_admin || false,
    error,
    // Actions manipulate the cache directly
    refreshUser: () => queryClient.invalidateQueries({ queryKey: authKeys.user() }),
    logout: () => supabase.auth.signOut().then(() => {
      queryClient.setQueryData(authKeys.user(), null);
      queryClient.clear(); // Optional: clear all cached data on logout
    }),
  };
}