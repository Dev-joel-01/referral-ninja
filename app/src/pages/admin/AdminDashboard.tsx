import { useMemo, useCallback } from 'react';
import { 
  Users, 
  Briefcase, 
  Wallet, 
  TrendingUp,
  DollarSign,
  Activity,
  RefreshCw
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GlassCard } from '@/components/layout/GlassCard';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AdminStats {
  totalUsers: number;
  totalTasks: number;
  totalPayments: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  totalRevenue: number;
}

interface ActivityItem {
  type: 'user' | 'payment' | 'withdrawal' | 'task';
  message: string;
  time: string;
}

// Query keys
const adminKeys = {
  all: ['admin'] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
  activity: () => [...adminKeys.all, 'activity'] as const,
};

// Parallel stats fetching - all 6 queries fire simultaneously
const fetchAdminStats = async (): Promise<AdminStats> => {
  const [
    usersResult,
    tasksResult,
    paymentsResult,
    withdrawalsResult
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('tasks').select('*', { count: 'exact', head: true }),
    supabase.from('payments').select('amount, status'),
    supabase.from('withdrawals').select('status'),
  ]);

  // Handle errors
  if (usersResult.error) throw usersResult.error;
  if (tasksResult.error) throw tasksResult.error;
  if (paymentsResult.error) throw paymentsResult.error;
  if (withdrawalsResult.error) throw withdrawalsResult.error;

  const payments = paymentsResult.data || [];
  const withdrawals = withdrawalsResult.data || [];

  return {
    totalUsers: usersResult.count || 0,
    totalTasks: tasksResult.count || 0,
    totalPayments: payments.length,
    totalWithdrawals: withdrawals.length,
    pendingWithdrawals: withdrawals.filter(w => w.status === 'pending').length,
    totalRevenue: payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0),
  };
};

// Optimized activity feed - parallel fetch with limit
const fetchRecentActivity = async (): Promise<ActivityItem[]> => {
  const [recentUsers, recentPayments, recentWithdrawals] = await Promise.all([
    supabase
      .from('profiles')
      .select('legal_name, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    
    supabase
      .from('payments')
      .select('amount, created_at, user:profiles(legal_name)')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5),
    
    supabase
      .from('withdrawals')
      .select('amount, status, created_at, user:profiles(legal_name)')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const activity: ActivityItem[] = [
    ...(recentUsers.data || []).map((u) => ({
      type: 'user' as const,
      message: `New user registered: ${u.legal_name}`,
      time: u.created_at,
    })),
    ...(recentPayments.data || []).map((p: any) => ({
      type: 'payment' as const,
      message: `Payment received: KSh ${p.amount.toLocaleString()} from ${p.user?.legal_name || 'Unknown'}`,
      time: p.created_at,
    })),
    ...(recentWithdrawals.data || []).map((w: any) => ({
      type: 'withdrawal' as const,
      message: `Withdrawal ${w.status}: KSh ${w.amount.toLocaleString()} by ${w.user?.legal_name || 'Unknown'}`,
      time: w.created_at,
    })),
  ];

  // Sort by time and take top 5
  return activity
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 5);
};

export function AdminDashboard() {
  const queryClient = useQueryClient();

  // Stats query with auto-refresh for live monitoring
  const {
    data: stats,
    isLoading: statsLoading,
    isFetching: statsFetching,
    error: statsError,
  } = useQuery({
    queryKey: adminKeys.stats(),
    queryFn: fetchAdminStats,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000, // Auto-refresh every minute
    refetchOnWindowFocus: true,
  });

  // Activity query (separate for faster initial load)
  const {
    data: recentActivity = [],
    isLoading: activityLoading,
  } = useQuery({
    queryKey: adminKeys.activity(),
    queryFn: fetchRecentActivity,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000,
  });

  // Manual refresh handler
  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: adminKeys.all });
  }, [queryClient]);

  // Memoized stat cards to prevent re-render
  const StatCards = useMemo(() => {
    if (statsLoading) {
      return Array.from({ length: 6 }).map((_, i) => (
        <GlassCard key={i} padding="md">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20 bg-ninja-green/10" />
              <Skeleton className="h-8 w-16 bg-ninja-green/10" />
            </div>
            <Skeleton className="h-10 w-10 rounded-xl bg-ninja-green/10" />
          </div>
        </GlassCard>
      ));
    }

    if (!stats) return null;

    const statItems = [
      { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: Users, color: 'default' },
      { label: 'Total Tasks', value: stats.totalTasks.toLocaleString(), icon: Briefcase, color: 'default' },
      { label: 'Total Payments', value: stats.totalPayments.toLocaleString(), icon: DollarSign, color: 'default' },
      { label: 'Total Withdrawals', value: stats.totalWithdrawals.toLocaleString(), icon: Wallet, color: 'default' },
      { label: 'Pending Withdrawals', value: stats.pendingWithdrawals.toLocaleString(), icon: Activity, color: 'warning' },
      { label: 'Total Revenue', value: `KSh ${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'success' },
    ];

    return statItems.map((stat) => (
      <GlassCard 
        key={stat.label} 
        padding="md" 
        hover
        className={cn(
          stat.color === 'warning' && 'border-yellow-500/30',
          stat.color === 'success' && 'border-ninja-green/40'
        )}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className={cn(
              'stat-label mb-1',
              stat.color === 'warning' && 'text-yellow-400',
              stat.color === 'success' && 'text-ninja-green'
            )}>
              {stat.label}
            </p>
            <p className={cn(
              'stat-value',
              stat.color === 'warning' && 'text-yellow-400',
              stat.color === 'success' && 'text-ninja-green'
            )}>
              {stat.value}
            </p>
          </div>
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            stat.color === 'warning' ? 'bg-yellow-500/20' : 
            stat.color === 'success' ? 'bg-ninja-green/30' : 'bg-ninja-green/20'
          )}>
            <stat.icon className={cn(
              'w-5 h-5',
              stat.color === 'warning' ? 'text-yellow-400' : 'text-ninja-green'
            )} />
          </div>
        </div>
      </GlassCard>
    ));
  }, [stats, statsLoading]);

  // Activity icon mapper
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user': return <Users className="w-5 h-5 text-blue-400" />;
      case 'payment': return <DollarSign className="w-5 h-5 text-ninja-green" />;
      case 'withdrawal': return <Wallet className="w-5 h-5 text-yellow-400" />;
      case 'task': return <Briefcase className="w-5 h-5 text-purple-400" />;
      default: return <Activity className="w-5 h-5 text-ninja-sage" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user': return 'bg-blue-500/20';
      case 'payment': return 'bg-ninja-green/20';
      case 'withdrawal': return 'bg-yellow-500/20';
      case 'task': return 'bg-purple-500/20';
      default: return 'bg-ninja-green/10';
    }
  };

  if (statsError) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Failed to load admin data</p>
        <Button onClick={refreshAll} className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-light text-ninja-mint">Admin Dashboard</h1>
          <p className="text-ninja-sage">Overview of platform activity</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshAll}
          disabled={statsFetching}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", statsFetching && "animate-spin")} />
          {statsFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {StatCards}
      </div>

      {/* Recent Activity */}
      <GlassCard padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-heading text-ninja-mint">Recent Activity</h2>
          {statsFetching && <span className="text-xs text-ninja-sage animate-pulse">Live updates</span>}
        </div>
        
        {activityLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="h-10 w-10 rounded-xl bg-ninja-green/10" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4 bg-ninja-green/10" />
                  <Skeleton className="h-3 w-1/2 bg-ninja-green/10" />
                </div>
              </div>
            ))}
          </div>
        ) : recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 rounded-xl bg-ninja-black/50 border border-ninja-green/10 hover:bg-ninja-green/5 transition-colors"
              >
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  getActivityColor(activity.type)
                )}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-ninja-mint truncate">{activity.message}</p>
                  <p className="text-ninja-sage text-sm">
                    {format(new Date(activity.time), 'dd MMM yyyy, HH:mm')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-ninja-sage text-center py-8">No recent activity</p>
        )}
      </GlassCard>

      {/* Quick Links */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <a href="/admin/tasks" className="glass-card-hover p-4 flex items-center gap-3 rounded-xl border border-ninja-green/10 hover:border-ninja-green/30 transition-colors">
          <Briefcase className="w-5 h-5 text-ninja-green" />
          <span className="text-ninja-mint">Manage Tasks</span>
        </a>
        <a href="/admin/users" className="glass-card-hover p-4 flex items-center gap-3 rounded-xl border border-ninja-green/10 hover:border-ninja-green/30 transition-colors">
          <Users className="w-5 h-5 text-ninja-green" />
          <span className="text-ninja-mint">Manage Users</span>
        </a>
        <a href="/admin/payments" className="glass-card-hover p-4 flex items-center gap-3 rounded-xl border border-ninja-green/10 hover:border-ninja-green/30 transition-colors">
          <Wallet className="w-5 h-5 text-ninja-green" />
          <span className="text-ninja-mint">Manage Payments</span>
        </a>
        <a href="/admin/mafullu" className="glass-card-hover p-4 flex items-center gap-3 rounded-xl border border-ninja-green/10 hover:border-ninja-green/30 transition-colors">
          <DollarSign className="w-5 h-5 text-ninja-green" />
          <span className="text-ninja-mint">Mafullu Content</span>
        </a>
      </div>
    </div>
  );
}