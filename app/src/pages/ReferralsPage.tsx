import { useEffect, useState, useRef } from 'react';
import { 
  Users, 
  TrendingUp, 
  Wallet, 
  Copy, 
  Check, 
  QrCode,
  Award,
  Download,
  Share2
} from 'lucide-react';
import { GlassCard } from '@/components/layout/GlassCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import QRCode from 'qrcode';
import { cn } from '@/lib/utils';

interface Referral {
  id: string;
  referred: {
    legal_name: string;
    username: string;
    avatar_url: string | null;
    joined_at: string;
  };
  status: string;
  earned_amount: number;
  created_at: string;
}

interface TopReferrer {
  id: string;
  username: string;
  avatar_url: string | null;
  referral_count: number;
  total_earned: number;
}

export function ReferralsPage() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState({
    totalReferrals: 0,
    totalEarned: 0,
    totalWithdrawn: 0,
    availableBalance: 0,
  });
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
  const [copied, setCopied] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const referralLink = user ? `${window.location.origin}/signup?ref=${user.referral_code}` : '';

  useEffect(() => {
    if (user) {
      fetchReferralData();
    }
  }, [user]);

  useEffect(() => {
    if (referralLink && showQRDialog) {
      generateQRCode();
    }
  }, [referralLink, showQRDialog]);

  const fetchReferralData = async () => {
    try {
      // Fetch user's referrals
      const { data: referralData } = await supabase
        .from('referrals')
        .select('*, referred:profiles!referred_id(legal_name, username, avatar_url, joined_at)')
        .eq('referrer_id', user!.id)
        .order('created_at', { ascending: false });

      if (referralData) {
        setReferrals(referralData as Referral[]);
        
        const completed = referralData.filter((r) => r.status === 'completed');
        const totalEarned = completed.reduce((sum, r) => sum + r.earned_amount, 0);

        // Fetch withdrawals
        const { data: withdrawals } = await supabase
          .from('withdrawals')
          .select('amount')
          .eq('user_id', user!.id)
          .eq('status', 'completed');

        const totalWithdrawn = withdrawals?.reduce((sum, w) => sum + w.amount, 0) || 0;

        setStats({
          totalReferrals: completed.length,
          totalEarned,
          totalWithdrawn,
          availableBalance: totalEarned - totalWithdrawn,
        });
      }

      // Fetch top referrers
      const { data: topRefs } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('payment_status', 'completed')
        .limit(10);

      const topRefsWithStats = await Promise.all(
        (topRefs || []).map(async (ref) => {
          const { data: refData } = await supabase
            .from('referrals')
            .select('earned_amount')
            .eq('referrer_id', ref.id)
            .eq('status', 'completed');
          
          const referralCount = refData?.length || 0;
          const totalEarned = refData?.reduce((sum, r) => sum + r.earned_amount, 0) || 0;
          
          return { ...ref, referral_count: referralCount, total_earned: totalEarned };
        })
      );

      setTopReferrers(topRefsWithStats
        .filter((r) => r.referral_count > 0)
        .sort((a, b) => b.referral_count - a.referral_count)
        .slice(0, 5));
    } catch (error) {
      console.error('Error fetching referral data:', error);
    }
  };

  const generateQRCode = async () => {
    try {
      const url = await QRCode.toDataURL(referralLink, {
        width: 400,
        margin: 2,
        color: {
          dark: '#39FF14',
          light: '#050B06',
        },
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQRCode = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.href = qrCodeUrl;
      link.download = `referral-qr-${user?.username}.png`;
      link.click();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-light text-ninja-mint">Referrals</h1>
        <p className="text-ninja-sage">Track your referrals and earnings</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard padding="md" hover>
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label mb-1">Total Referrals</p>
              <p className="stat-value">{stats.totalReferrals}</p>
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
              <p className="stat-value">KSh {stats.totalEarned.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-ninja-green/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-ninja-green" />
            </div>
          </div>
        </GlassCard>

        <GlassCard padding="md" hover>
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label mb-1">Withdrawn</p>
              <p className="stat-value">KSh {stats.totalWithdrawn.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-ninja-green/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-ninja-green" />
            </div>
          </div>
        </GlassCard>

        <GlassCard padding="md" hover className="border-ninja-green/40">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label mb-1 text-ninja-green">Available</p>
              <p className="stat-value text-ninja-green">KSh {stats.availableBalance.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-ninja-green/30 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-ninja-green" />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Referral Link & QR */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard padding="lg">
            <h2 className="text-xl font-heading text-ninja-mint mb-4">Your Referral Link</h2>
            <p className="text-ninja-sage mb-4">
              Share this link with friends and earn KSh 100 for each successful signup!
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
              <div className="flex gap-2">
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
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setShowQRDialog(true)}
                  variant="outline"
                  className="btn-outline"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  QR Code
                </Button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'Join Referral Ninja',
                      text: 'Sign up using my referral link!',
                      url: referralLink,
                    });
                  }
                }}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-ninja-green/10 border border-ninja-green/20 text-ninja-green hover:bg-ninja-green/20 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={() => setShowQRDialog(true)}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-ninja-green/10 border border-ninja-green/20 text-ninja-green hover:bg-ninja-green/20 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download QR
              </button>
            </div>
          </GlassCard>

          {/* My Referrals */}
          <GlassCard padding="lg">
            <h2 className="text-xl font-heading text-ninja-mint mb-4">My Referrals</h2>
            
            {referrals.length > 0 ? (
              <div className="space-y-3">
                {referrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-ninja-black/50 border border-ninja-green/10"
                  >
                    <div className="w-12 h-12 rounded-full bg-ninja-green/20 flex items-center justify-center overflow-hidden">
                      {referral.referred.avatar_url ? (
                        <img 
                          src={referral.referred.avatar_url} 
                          alt={referral.referred.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-ninja-green font-medium">
                          {referral.referred.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-ninja-mint font-medium truncate">
                        {referral.referred.legal_name}
                      </p>
                      <p className="text-ninja-sage text-sm">
                        @{referral.referred.username}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        referral.status === 'completed' 
                          ? 'bg-ninja-green/20 text-ninja-green' 
                          : 'bg-yellow-500/20 text-yellow-400'
                      )}>
                        {referral.status === 'completed' ? 'Completed' : 'Pending'}
                      </span>
                      {referral.earned_amount > 0 && (
                        <p className="text-ninja-green text-sm mt-1">
                          +KSh {referral.earned_amount}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-ninja-green/30 mx-auto mb-4" />
                <p className="text-ninja-sage">No referrals yet</p>
                <p className="text-ninja-sage/70 text-sm mt-1">
                  Share your referral link to start earning!
                </p>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Top 5 Referrers */}
        <GlassCard padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-ninja-green" />
            <h2 className="text-xl font-heading text-ninja-mint">Top 5 Referrers</h2>
          </div>
          
          <div className="space-y-3">
            {topReferrers.map((referrer, index) => (
              <div
                key={referrer.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-ninja-black/50 border border-ninja-green/10"
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
                <div className="text-ninja-green font-medium text-sm">
                  KSh {referrer.total_earned.toLocaleString()}
                </div>
              </div>
            ))}
            
            {topReferrers.length === 0 && (
              <p className="text-ninja-sage text-center py-4">No referrers yet</p>
            )}
          </div>
        </GlassCard>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="bg-ninja-dark/95 backdrop-blur-xl border-ninja-green/20 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading text-ninja-mint text-center">
              Your Referral QR Code
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-4 py-4">
            {qrCodeUrl && (
              <div className="p-4 rounded-xl bg-white">
                <img 
                  src={qrCodeUrl} 
                  alt="Referral QR Code"
                  className="w-64 h-64"
                />
              </div>
            )}
            <p className="text-ninja-sage text-sm text-center">
              Scan this code to visit your referral link
            </p>
            <Button onClick={downloadQRCode} className="btn-primary w-full">
              <Download className="w-4 h-4 mr-2" />
              Download QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
