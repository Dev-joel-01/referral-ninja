// lib/auth-manager.ts
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { queryClient } from './queryClient';
import { userKeys } from '@/hooks/useUser';

type AuthState = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
};

class AuthManager {
  private state: AuthState = {
    user: null,
    session: null,
    isLoading: true,
  };
  
  private listeners = new Set<() => void>();
  
  constructor() {
    // Initialize from existing session (sync, no network)
    this.init();
    
    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      this.setState({
        user: session?.user ?? null,
        session: session ?? null,
        isLoading: false,
      });
      
      // Sync to React Query
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        queryClient.setQueryData(userKeys.current(), this.state.user);
      }
      if (event === 'SIGNED_OUT') {
        queryClient.setQueryData(userKeys.current(), null);
      }
    });
  }
  
  private async init() {
    const { data: { session } } = await supabase.auth.getSession();
    this.setState({
      user: session?.user ?? null,
      session: session ?? null,
      isLoading: false,
    });
  }
  
  private setState(newState: Partial<AuthState>) {
    this.state = { ...this.state, ...newState };
    this.listeners.forEach(cb => cb());
  }
  
  getState() { return this.state; }
  subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  
  // Centralized token refresh - called only when needed
  async refreshToken() {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data.session;
  }
}

export const authManager = new AuthManager();