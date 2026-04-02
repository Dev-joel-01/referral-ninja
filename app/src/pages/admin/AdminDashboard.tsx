import { useEffect, useState } from 'react';
import { 
  Users, 
  Briefcase, 
  Wallet, 
  TrendingUp,
  DollarSign,
  Activity
} from 'lucide-react';
import { GlassCard } from '@/components/layout/GlassCard';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface AdminStats {
  totalUsers: number;
  totalTasks: number;
  totalPayments: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  totalRevenue: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalTasks: 0,
    totalPayments: 0,
    totalWithdrawals: 0,
    pendingWithdrawals: 0,
    totalRevenue: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      // Fetch total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch total tasks
      const { count: totalTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true });

      // Fetch payments
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, status');

      const totalPayments = payments?.length || 0;
      const totalRevenue = payments
        ?.filter((p) => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0) || 0;

      // Fetch withdrawals
      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select('status');

      const totalWithdrawals = withdrawals?.length || 0;
      const pendingWithdrawals = withdrawals?.filter((w) => w.status === 'pending').length || 0;

      setStats({
        totalUsers: totalUsers || 0,
        totalTasks: totalTasks || 0,
        totalPayments,
        totalWithdrawals,
        pendingWithdrawals,
        totalRevenue,
      });

      // Fetch recent activity
      const { data: recentUsers } = await supabase
        .from('profiles')
        .select('legal_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: recentPayments } = await supabase
        .from('payments')
        .select('amount, created_at, user:profiles(legal_name)')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);

      const activity = [
        ...(recentUsers || []).map((u) => ({
          type: 'user',
          message: `New user registered: ${u.legal_name}`,
          time: u.created_at,
        })),
        ...(recentPayments || []).map((p: any) => ({
          type: 'payment',
          message: `Payment received: KSh ${p.amount} from ${p.user?.legal_name}`,
          time: p.created_at,
        })),
      ]
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 5);

      setRecentActivity(activity);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ninja-green" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-light text-ninja-mint">Admin Dashboard</h1>
        <p className="text-ninja-sage">Overview of platform activity</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <GlassCard padding="md" hover>
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label mb-1">Total Users</p>
              <p className="stat-value">{stats.totalUsers.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-ninja-green/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-ninja-green" />
            </div>
          </div>
        </GlassCard>

        <GlassCard padding="md" hover>
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label mb-1">Total Tasks</p>
              <p className="stat-value">{stats.totalTasks.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-ninja-green/20 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-ninja-green" />
            </div>
          </div>
        </GlassCard>

        <GlassCard padding="md" hover>
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label mb-1">Total Payments</p>
              <p className="stat-value">{stats.totalPayments.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-ninja-green/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-ninja-green" />
            </div>
          </div>
        </GlassCard>

        <GlassCard padding="md" hover>
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label mb-1">Total Withdrawals</p>
              <p className="stat-value">{stats.totalWithdrawals.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-ninja-green/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-ninja-green" />
            </div>
          </div>
        </GlassCard>

        <GlassCard padding="md" hover className="border-yellow-500/30">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label mb-1 text-yellow-400">Pending Withdrawals</p>
              <p className="stat-value text-yellow-400">{stats.pendingWithdrawals.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-yellow-400" />
            </div>
          </div>
        </GlassCard>

        <GlassCard padding="md" hover className="border-ninja-green/40">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label mb-1 text-ninja-green">Total Revenue</p>
              <p className="stat-value text-ninja-green">KSh {stats.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-ninja-green/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-ninja-green" />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Recent Activity */}
      <GlassCard padding="lg">
        <h2 className="text-xl font-heading text-ninja-mint mb-4">Recent Activity</h2>
        
        {recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 rounded-xl bg-ninja-black/50 border border-ninja-green/10"
              >
                <div className={`
                  w-10 h-10 rounded-xl flex items-center justify-center
                  ${activity.type === 'user' ? 'bg-blue-500/20' : 'bg-ninja-green/20'}
                `}>
                  {activity.type === 'user' ? (
                    <Users className="w-5 h-5 text-blue-400" />
                  ) : (
                    <DollarSign className="w-5 h-5 text-ninja-green" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-ninja-mint">{activity.message}</p>
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
        <a href="/admin/tasks" className="glass-card-hover p-4 flex items-center gap-3">
          <Briefcase className="w-5 h-5 text-ninja-green" />
          <span className="text-ninja-mint">Manage Tasks</span>
        </a>
        <a href="/admin/users" className="glass-card-hover p-4 flex items-center gap-3">
          <Users className="w-5 h-5 text-ninja-green" />
          <span className="text-ninja-mint">Manage Users</span>
        </a>
        <a href="/admin/payments" className="glass-card-hover p-4 flex items-center gap-3">
          <Wallet className="w-5 h-5 text-ninja-green" />
          <span className="text-ninja-mint">Manage Payments</span>
        </a>
        <a href="/admin/mafullu" className="glass-card-hover p-4 flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-ninja-green" />
          <span className="text-ninja-mint">Mafullu Content</span>
        </a>
      </div>
    </div>
  );
}
