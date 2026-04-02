// App Constants

export const APP_NAME = 'Referral Ninja';
export const APP_TAGLINE = 'Turn referrals into income';

// Payment Constants
export const REGISTRATION_FEE = 200; // KSh
export const REFERRAL_COMMISSION = 100; // KSh (50% of registration fee)
export const MAFULLU_PRICE = 300; // KSh
export const MINIMUM_WITHDRAWAL = 500; // KSh

// Password Reset
export const MAX_PASSWORD_RESETS = 3;

// Payment Verification
export const PAYMENT_CHECK_INTERVAL = 5000; // 5 seconds
export const PAYMENT_CHECK_MAX_ATTEMPTS = 6; // 30 seconds total

// Withdrawal Verification
export const WITHDRAWAL_CODE_EXPIRY = 10 * 60 * 1000; // 10 minutes

// Admin Credentials (for demo purposes)
export const ADMIN_CREDENTIALS = {
  email: 'admin@referralninja.co.ke',
  password: 'Admin@Ninja2026!',
};

export const TEST_USER_CREDENTIALS = {
  email: 'testuser@example.com',
  password: 'Test@User123!',
};

// Supabase Storage Buckets
export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  TASK_IMAGES: 'task-images',
  MAFULLU_IMAGES: 'mafullu-images',
};

// Task Types
export const TASK_TYPES = {
  REMOTE: 'remote',
  LOCAL_INTERN: 'local_intern',
  LOCAL_JOB: 'local_job',
} as const;

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

// Withdrawal Status
export const WITHDRAWAL_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
} as const;

// Referral Status
export const REFERRAL_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
} as const;
