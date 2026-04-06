import { useMemo, useCallback } from 'react';
import { 
  Briefcase, 
  Users, 
  Wallet, 
  TrendingUp, 
  Calendar,
  Copy,
  Check,
  ExternalLink,
  Award
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GlassCard } from '@/components/layout/GlassCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DashboardStats {
  tasksApplied: number;
  referrals: number;
  totalEarned: number;
  totalWithdrawn: number;
  availableBalance: number;
}

interface TopReferrer {
  id: string;
  username: string;
  avatar_url: string | null;
  referral_count: number;
}

// Query keys for granular cache control
const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: (userId: string) => [...dashboardKeys.all, 'stats', userId] as const,
  topReferrers: () => [...dashboardKeys.all, 'topReferrers'] as const,
};

// Parallel data fetching - all requests fire simultaneously
const fetchDashboardStats = async (userId: string): Promise<DashboardStats> => {
  // Fire all independent queries in parallel
  const [taskClicksResult, referralsResult, withdrawalsResult] = await Promise.all([
    // Task clicks count
    supabase
      .from('task_clicks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    
    // Referrals (we need the actual data to count)
    supabase
      .from('referrals')
      .select('id, earned_amount')
      .eq('referrer_id', userId)
      .eq('status', 'completed'),
    
    // Withdrawals
    supabase
      .from('withdrawals')
      .select('amount')
      .eq('user_id', userId)
      .eq('status', 'completed'),
  ]);

  // Handle errors
  if (taskClicksResult.error) throw taskClicksResult.error;
  if (referralsResult.error) throw referralsResult.error;
  if (withdrawalsResult.error) throw withdrawalsResult.error;

  const referralCount = referralsResult.data?.length || 0;
  const totalEarned = referralsResult.data?.reduce((sum, r) => sum + (r.earned_amount || 0), 0) || 0;
  const totalWithdrawn = withdrawalsResult.data?.reduce((sum, w) => sum + w.amount, 0) || 0;

  return {
    tasksApplied: taskClicksResult.count || 0,
    referrals: referralCount,
    totalEarned,
    totalWithdrawn,
    availableBalance: totalEarned - totalWithdrawn,
  };
};

// Optimized top referrers - single query with join or efficient batch
const fetchTopReferrers = async (): Promise<TopReferrer[]> => {
  // Option 1: Use the database view we created earlier
  const { data, error } = await supabase
    .from('user_stats_view')
    .select('id, username, avatar_url, referral_count')
    .eq('payment_status', 'completed')
    .order('referral_count', { ascending: false })
    .limit(5);

  if (error) throw error;
  
  return (data || []).map(u => ({
    ...u,
    referral_count: u.referral_count || 0,
  }));
};

export function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Stats query with background refresh
  const {
    data: stats,
    isLoading: statsLoading,
    isFetching: statsFetching,
    error: statsError,
  } = useQuery({
    queryKey: dashboardKeys.stats(user?.id || ''),
    queryFn: () => fetchDashboardStats(user!.id),
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds - balance between fresh and fast
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000, // Auto-refresh every minute for real-time earnings
    refetchOnWindowFocus: true,
  });

  // Top referrers query (shared across all users - good for caching)
  const {
    data: topReferrers = [],
    isLoading: referrersLoading,
  } = useQuery({
    queryKey: dashboardKeys.topReferrers(),
    queryFn: fetchTopReferrers,
    staleTime: 5 * 60 * 1000, // 5 minutes - doesn't change often
    gcTime: 10 * 60 * 1000,
  });

  // Copy link with optimistic UI
  const [copied, setCopied] = useMemo(() => {
    let timeout: NodeJS.Timeout;
    return [
      false,
      (value: boolean) => {
        clearTimeout(timeout);
        if (value) {
          timeout = setTimeout(() => setCopied(false), 2000);
        }
      }
    ];
  }, []);

  const referralLink = useMemo(() => {
    if (!user) return '';
    return `${window.location.origin}/signup?ref=${user.referral_code}`;
  }, [user]);

  const copyReferralLink = useCallback(() => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
  }, [referralLink, setCopied]);

  // Manual refresh handler
  const refreshDashboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: dashboardKeys.stats(user?.id || '') });
  }, [queryClient, user?.id]);

  // Loading state component
  const StatSkeleton = () => (
    <GlassCard padding="md">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20 bg-ninja-green/10" />
          <Skeleton className="h-8 w-16 bg-ninja-green/10" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl bg-ninja-green/10" />
      </div>
    </GlassCard>
  );

  if (statsError) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Failed to load dashboard data</p>
        <Button onClick={refreshDashboard} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-ninja-green/20 flex items-center justify-center border border-ninja-green/30 overflow-hidden">
            {user?.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt={user.legal_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-ninja-green font-heading font-bold text-2xl">
                {user?.legal_name?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-light text-ninja-mint">
              Hello, {user?.legal_name?.split(' ')[0]}
            </h1>
            <p className="text-ninja-sage flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Joined {user?.joined_at ? format(new Date(user.joined_at), 'dd MMM yyyy') : 'N/A'}
              {statsFetching && <span className="text-xs animate-pulse">(updating...)</span>}
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshDashboard}
          disabled={statsFetching}
        >
          {statsFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <GlassCard padding="md" hover>
              <div className="flex items-start justify-between">
                <div>
                  <p className="stat-label mb-1">Tasks Applied</p>
                  <p className="stat-value">{stats?.tasksApplied}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-ninja-green/20 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-ninja-green" />
                </div>
              </div>
            </GlassCard>

            <GlassCard padding="md" hover>
              <div className="flex items-start justify-between">
                <div>
                  <p className="stat-label mb-1">Referrals</p>
                  <p className="stat-value">{stats?.referrals}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-ninja-green/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-ninja-green" />
                </div>
              </div>
            </GlassCard>

            <GlassCard padding="md" hover>
              <div className="flex items-start justify-between">
                <div>
                  <p className="stat-label mb-1">Total Earned</p>
                  <p className="stat-value">KSh {stats?.totalEarned.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-ninja-green/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-ninja-green" />
                </div>
              </div>
            </GlassCard>

            <GlassCard padding="md" hover className="border-ninja-green/40">
              <div className="flex items-start justify-between">
                <div>
                  <p className="stat-label mb-1 text-ninja-green">Available</p>
                  <p className="stat-value text-ninja-green">
                    KSh {stats?.availableBalance.toLocaleString()}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-ninja-green/30 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-ninja-green" />
                </div>
              </div>
            </GlassCard>
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Referral Link Card */}
        <GlassCard className="lg:col-span-2" padding="lg">
          <h2 className="text-xl font-heading text-ninja-mint mb-4">Your Referral Link</h2>
          <p className="text-ninja-sage mb-4">
            Share this link with friends and earn KSh 100 for each person who joins using your link!
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="w-full input-field pr-4 font-mono text-sm"
              />
            </div>
            <Button
              onClick={copyReferralLink}
              className={cn(
                'btn-primary',
                copied && 'bg-ninja-green/80'
              )}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-ninja-green/10 border border-ninja-green/20">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-ninja-green" />
              <div>
                <p className="text-ninja-mint font-medium">How it works</p>
                <p className="text-ninja-sage text-sm">
                  When someone signs up using your link and pays the registration fee, 
                  you earn KSh 100 (50% of their fee).
                </p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Top Referrers */}
        <GlassCard padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-ninja-green" />
            <h2 className="text-xl font-heading text-ninja-mint">Top 5 Referrers</h2>
          </div>
          
          <div className="space-y-3">
            {referrersLoading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-8 w-8 rounded-full bg-ninja-green/10" />
                  <Skeleton className="h-10 w-10 rounded-full bg-ninja-green/10" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-24 bg-ninja-green/10" />
                    <Skeleton className="h-3 w-16 bg-ninja-green/10" />
                  </div>
                </div>
              ))
            ) : topReferrers.length > 0 ? (
              topReferrers.map((referrer, index) => (
                <div
                  key={referrer.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-ninja-black/50 border border-ninja-green/10 hover:bg-ninja-green/5 transition-colors"
                >
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                    index === 0 && 'bg-yellow-500/20 text-yellow-400',
                    index === 1 && 'bg-gray-400/20 text-gray-300',
                    index === 2 && 'bg-orange-600/20 text-orange-400',
                    index > 2 && 'bg-ninja-green/20 text-ninja-green'
                  )}>
                    {index + 1}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-ninja-green/20 flex items-center justify-center overflow-hidden">
                    {referrer.avatar_url ? (
                      <img 
                        src={referrer.avatar_url} 
                        alt={referrer.username}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-ninja-green font-medium">
                        {referrer.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-ninja-mint font-medium truncate">@{referrer.username}</p>
                    <p className="text-ninja-sage text-sm">{referrer.referral_count} referrals</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-ninja-sage text-center py-4">No referrers yet</p>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <a href="/tasks" className="glass-card-hover p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ninja-green/20 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-ninja-green" />
          </div>
          <div>
            <p className="text-ninja-mint font-medium">Browse Tasks</p>
            <p className="text-ninja-sage text-sm">Find opportunities</p>
          </div>
          <ExternalLink className="w-4 h-4 text-ninja-sage ml-auto" />
        </a>

        <a href="/referrals" className="glass-card-hover p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ninja-green/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-ninja-green" />
          </div>
          <div>
            <p className="text-ninja-mint font-medium">My Referrals</p>
            <p className="text-ninja-sage text-sm">View your network</p>
          </div>
          <ExternalLink className="w-4 h-4 text-ninja-sage ml-auto" />
        </a>

        <a href="/payments" className="glass-card-hover p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ninja-green/20 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-ninja-green" />
          </div>
          <div>
            <p className="text-ninja-mint font-medium">Withdraw</p>
            <p className="text-ninja-sage text-sm">Min: KSh 500</p>
          </div>
          <ExternalLink className="w-4 h-4 text-ninja-sage ml-auto" />
        </a>

        <a href="/profile" className="glass-card-hover p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ninja-green/20 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-ninja-green" />
          </div>
          <div>
            <p className="text-ninja-mint font-medium">Profile</p>
            <p className="text-ninja-sage text-sm">Edit your info</p>
          </div>
          <ExternalLink className="w-4 h-4 text-ninja-sage ml-auto" />
        </a>
      </div>
    </div>
  );
}