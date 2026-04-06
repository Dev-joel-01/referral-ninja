import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { authKeys } from './useAuth';

export function useAuthListener() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_IN') {
        queryClient.invalidateQueries({ queryKey: authKeys.user() });
      }
      if (event === 'SIGNED_OUT') {
        queryClient.setQueryData(authKeys.user(), null);
      }
      if (event === 'TOKEN_REFRESHED') {
        queryClient.invalidateQueries({ queryKey: authKeys.user() });
      }
    });

    return () => subscription.unsubscribe();
  }, []);
}
