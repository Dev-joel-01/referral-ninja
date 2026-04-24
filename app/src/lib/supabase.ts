import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Auth helpers
export const signUp = async (email: string, password: string, metadata: Record<string, any>) => {
  const cleanedMetadata = Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== null && value !== undefined)
  );

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: cleanedMetadata,
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) {
    console.error('Supabase auth.signUp error', {
      email,
      metadata: cleanedMetadata,
      error,
    });
  }

  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return { data, error };
};

export const updatePassword = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { data, error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
};

// Profile helpers
export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
};

export const updateProfile = async (userId: string, updates: Record<string, any>) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  return { data, error };
};

export const uploadAvatar = async (userId: string, file: File) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, file);
  
  if (uploadError) throw uploadError;
  
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);
  
  return publicUrl;
};

// Task helpers
export const getTasks = async (type?: string) => {
  let query = supabase
    .from('tasks')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  
  if (type) {
    query = query.eq('task_type', type);
  }
  
  const { data, error } = await query;
  return { data, error };
};

export const recordTaskClick = async (taskId: string, userId: string) => {
  const { error } = await supabase
    .from('task_clicks')
    .upsert({ task_id: taskId, user_id: userId });
  
  if (error) throw error;
  
  // Increment click count
  const { error: updateError } = await supabase.rpc('increment_task_clicks', {
    task_id: taskId,
  });
  
  return { error: updateError };
};

export const getUserTaskClicks = async (userId: string) => {
  const { data, error } = await supabase
    .from('task_clicks')
    .select('task_id')
    .eq('user_id', userId);
  return { data, error };
};

// Referral helpers
export const getReferralStats = async (userId: string) => {
  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', userId);
  return { data, error };
};

export const getTopReferrers = async (limit: number = 5) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .eq('payment_status', 'completed')
    .limit(limit);
  return { data, error };
};

// Payment helpers
export const createPayment = async (payment: any) => {
  const { data, error } = await supabase
    .from('payments')
    .insert(payment)
    .select()
    .single();
  return { data, error };
};

export const getPaymentStatus = async (paymentId: string) => {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single();
  return { data, error };
};

// Withdrawal helpers
export const createWithdrawal = async (withdrawal: any) => {
  const { data, error } = await supabase
    .from('withdrawals')
    .insert(withdrawal)
    .select()
    .single();
  return { data, error };
};

export const getWithdrawals = async (userId: string) => {
  const { data, error } = await supabase
    .from('withdrawals')
    .select('*')
    .eq('user_id', userId)
    .order('requested_at', { ascending: false });
  return { data, error };
};

// Mafullu helpers
export const getAvailableMafullu = async () => {
  const { data, error } = await supabase
    .from('mafullu_content')
    .select('*')
    .eq('is_purchased', false)
    .limit(1)
    .single();
  return { data, error };
};

export const purchaseMafullu = async (userId: string, contentId: string) => {
  const { data, error } = await supabase
    .from('mafullu_purchases')
    .insert({
      user_id: userId,
      content_id: contentId,
      amount: 300,
      payment_status: 'pending',
    })
    .select()
    .single();
  return { data, error };
};

export const getUserMafullu = async (userId: string) => {
  const { data, error } = await supabase
    .from('mafullu_purchases')
    .select('*, content:mafullu_content(*)')
    .eq('user_id', userId)
    .eq('payment_status', 'completed')
    .order('purchased_at', { ascending: false });
  return { data, error };
};

// Admin helpers
export const getAllUsers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  return { data, error };
};

export const getAllPayments = async () => {
  const { data, error } = await supabase
    .from('payments')
    .select('*, user:profiles(*)')
    .order('created_at', { ascending: false });
  return { data, error };
};

export const getPendingWithdrawals = async () => {
  const { data, error } = await supabase
    .from('withdrawals')
    .select('*, user:profiles(*)')
    .eq('status', 'pending')
    .order('requested_at', { ascending: false });
  return { data, error };
};

export const approveWithdrawal = async (withdrawalId: string, adminId: string) => {
  const { data, error } = await supabase
    .from('withdrawals')
    .update({
      status: 'completed',
      processed_at: new Date().toISOString(),
      processed_by: adminId,
    })
    .eq('id', withdrawalId)
    .select()
    .single();
  return { data, error };
};

export const createTask = async (task: any) => {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single();
  return { data, error };
};

export const updateTask = async (taskId: string, updates: any) => {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();
  return { data, error };
};

export const deleteTask = async (taskId: string) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
  return { error };
};

export const createMafulluContent = async (content: any) => {
  const { data, error } = await supabase
    .from('mafullu_content')
    .insert(content)
    .select()
    .single();
  return { data, error };
};
