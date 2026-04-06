// Centralized query keys for TanStack Query
// This ensures consistent cache invalidation and prevents key collisions

export const queryKeys = {
  // Auth queries
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
  },

  // User queries
  user: {
    all: ['user'] as const,
    current: () => [...queryKeys.user.all, 'current'] as const,
    profile: (id: string) => [...queryKeys.user.all, 'profile', id] as const,
    list: (search: string) => [...queryKeys.user.all, 'list', search] as const,
    stats: () => [...queryKeys.user.all, 'stats'] as const,
  },

  // Referral queries
  referral: {
    all: ['referrals'] as const,
    stats: (userId: string) => [...queryKeys.referral.all, 'stats', userId] as const,
    list: (userId: string) => [...queryKeys.referral.all, 'list', userId] as const,
    topReferrers: () => [...queryKeys.referral.all, 'topReferrers'] as const,
  },

  // Task queries
  task: {
    all: ['tasks'] as const,
    list: (activeTab: string) => [...queryKeys.task.all, 'list', activeTab] as const,
    clicked: (userId: string) => [...queryKeys.task.all, 'clicked', userId] as const,
    detail: (id: string) => [...queryKeys.task.all, 'detail', id] as const,
  },

  // Payment queries
  payment: {
    all: ['payments'] as const,
    list: (userId: string) => [...queryKeys.payment.all, 'list', userId] as const,
    withdrawals: () => [...queryKeys.payment.all, 'withdrawals'] as const,
    stats: (userId: string) => [...queryKeys.payment.all, 'stats', userId] as const,
  },

  // Dashboard queries
  dashboard: {
    all: ['dashboard'] as const,
    stats: (userId: string) => [...queryKeys.dashboard.all, 'stats', userId] as const,
    topReferrers: () => [...queryKeys.dashboard.all, 'topReferrers'] as const,
  },

  // Admin queries
  admin: {
    all: ['admin'] as const,
    stats: () => [...queryKeys.admin.all, 'stats'] as const,
    activity: () => [...queryKeys.admin.all, 'activity'] as const,
  },

  // Mafullu queries
  mafullu: {
    all: ['mafullu'] as const,
    list: () => [...queryKeys.mafullu.all, 'list'] as const,
    purchased: (userId: string) => [...queryKeys.mafullu.all, 'purchased', userId] as const,
    available: () => [...queryKeys.mafullu.all, 'available'] as const,
  },
} as const;