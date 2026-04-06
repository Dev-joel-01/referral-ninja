import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

export const userKeys = {
  all: ['user'] as const,
  current: () => [...userKeys.all, 'current'] as const,
  profile: (id: string) => [...userKeys.all, 'profile', id] as const,
};

// Current user with caching - prevents auth flickering
export function useCurrentUser() {
  return useQuery({
    queryKey: userKeys.current(),
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) return null;
      
      // Fetch profile data in parallel
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      return { ...user, profile } as User;
    },
    // User session is stable - cache aggressively
    staleTime: 10 * 60 * 1000,
    // Refetch on window focus to catch session expiration
    refetchOnWindowFocus: true,
  });
}

// Optimistic profile update
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: Partial<User>) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', updates.id);
      if (error) throw error;
      return data;
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: userKeys.current() });
      const previousUser = queryClient.getQueryData(userKeys.current());
      
      queryClient.setQueryData(userKeys.current(), (old: any) => ({
        ...old,
        profile: { ...old?.profile, ...newData },
      }));
      
      return { previousUser };
    },
    onError: (err, newData, context) => {
      queryClient.setQueryData(userKeys.current(), context?.previousUser);
    },
  });
}