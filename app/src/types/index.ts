export interface Profile {
  id: string;
  legal_name: string;
  username: string;
  email: string;
  phone_number: string;
  avatar_url: string | null;
  referral_code: string;
  referred_by: string | null;
  joined_at: string;
  password_reset_count: number;
  is_admin: boolean;
  payment_status: 'pending' | 'completed' | 'failed';
  payment_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  task_type: 'remote' | 'local_intern' | 'local_job';
  website_link: string | null;
  images: string[];
  click_count: number;
  posted_by: string | null;
  created_at: string;
  is_active: boolean;
}

export interface TaskClick {
  id: string;
  task_id: string;
  user_id: string;
  clicked_at: string;
}

export interface MafulluContent {
  id: string;
  title: string;
  content: string;
  images: string[];
  is_purchased: boolean;
  purchased_by: string | null;
  purchased_at: string | null;
  created_at: string;
}

export interface MafulluPurchase {
  id: string;
  user_id: string;
  content_id: string;
  amount: number;
  payment_status: 'pending' | 'completed' | 'failed';
  purchased_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  status: 'pending' | 'completed';
  earned_amount: number;
  created_at: string;
  completed_at: string | null;
}

export interface Payment {
  id: string;
  user_id: string;
  payment_type: 'registration' | 'mafullu' | 'withdrawal';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  mpesa_receipt: string | null;
  phone_number: string | null;
  merchant_request_id: string | null;
  checkout_request_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  verification_code: string | null;
  phone_number: string;
  requested_at: string;
  processed_at: string | null;
  processed_by: string | null;
}

export interface PasswordReset {
  id: string;
  user_id: string;
  reset_code: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface AdminLog {
  id: string;
  admin_id: string;
  action: string;
  details: Record<string, any>;
  created_at: string;
}

export interface UserStats {
  tasksApplied: number;
  referrals: number;
  totalEarned: number;
  totalWithdrawn: number;
  availableBalance: number;
}

export interface SignupData {
  legalName: string;
  username: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  referralCode?: string;
  avatar?: File;
  agreedToPolicy: boolean;
}

export interface TaskFormData {
  title: string;
  description: string;
  taskType: 'remote' | 'local_intern' | 'local_job';
  websiteLink?: string;
  images: File[];
}

export interface WithdrawalFormData {
  amount: number;
  phoneNumber: string;
}

export interface MafulluFormData {
  title: string;
  content: string;
  images: File[];
}

// Database type for Supabase
export type Database = any;
