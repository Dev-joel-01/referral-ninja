import { useState, useCallback } from 'react';
import { 
  FileText, 
  Lock, 
  Download, 
  Check, 
  Loader2,
  Smartphone,
  RefreshCw
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GlassCard } from '@/components/layout/GlassCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface MafulluContent {
  id: string;
  title: string;
  content: string;
  images: string[];
  purchased_at: string;
}

interface MafulluPurchase {
  id: string;
  content: MafulluContent;
  purchased_at: string;
  payment_status: string;
}

// Query keys
const mafulluKeys = queryKeys.mafullu;

// Fetch user's purchases
const fetchPurchases = async (userId: string): Promise<MafulluPurchase[]> => {
  const { data, error } = await supabase
    .from('mafullu_purchases')
    .select('*, content:mafullu_content(*)')
    .eq('user_id', userId)
    .eq('payment_status', 'completed')
    .order('purchased_at', { ascending: false });

  if (error) throw error;
  return (data || []) as MafulluPurchase[];
};

// Check available content
const fetchAvailableContent = async () => {
  const { data, error } = await supabase
    .from('mafullu_content')
    .select('*')
    .eq('is_purchased', false)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data;
};

export function MafulluPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showContentDialog, setShowContentDialog] = useState(false);
  const [selectedContent, setSelectedContent] = useState<MafulluContent | null>(null);
  const [purchaseStatus, setPurchaseStatus] = useState<'idle' | 'processing' | 'polling' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // Purchases query
  const {
    data: purchases = [],
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: queryKeys.mafullu.purchased(user?.id || ''),
    queryFn: () => fetchPurchases(user!.id),
    enabled: !!user,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Available content query
  const {
    data: availableContent,
    isLoading: isCheckingAvailability,
  } = useQuery({
    queryKey: mafulluKeys.available(),
    queryFn: fetchAvailableContent,
    staleTime: 30 * 1000,
    enabled: showPurchaseDialog, // Only check when dialog opens
  });

  // Purchase mutation with polling
  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!availableContent) throw new Error('No content available');
      
      setPurchaseStatus('processing');
      setStatusMessage('Initiating payment...');

      // Create purchase record
      const { data: purchase, error: purchaseError } = await supabase
        .from('mafullu_purchases')
        .insert({
          user_id: user!.id,
          content_id: availableContent.id,
          amount: 300,
          payment_status: 'pending',
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Initiate M-Pesa
      const { error: mpesaError } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phoneNumber: user!.phone_number,
          amount: 300,
          accountReference: `MAFULLU-${purchase.id}`,
          transactionDesc: 'Mafullu Content Purchase',
        },
      });

      if (mpesaError) {
        console.error('M-Pesa error:', mpesaError);
        // Don't throw - M-Pesa might still work via callback
      }

      setPurchaseStatus('polling');
      setStatusMessage('Waiting for M-Pesa confirmation... Check your phone!');

      // Poll for payment status
      return new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 12; // 60 seconds
        
        const poll = setInterval(async () => {
          attempts++;
          
          const { data: statusData } = await supabase
            .from('mafullu_purchases')
            .select('payment_status')
            .eq('id', purchase.id)
            .single();

          if (statusData?.payment_status === 'completed') {
            clearInterval(poll);
            
            // Mark content as purchased
            await supabase
              .from('mafullu_content')
              .update({ 
                is_purchased: true, 
                purchased_by: user!.id,
                purchased_at: new Date().toISOString(),
              })
              .eq('id', availableContent.id);

            resolve();
          } else if (attempts >= maxAttempts) {
            clearInterval(poll);
            reject(new Error('Payment timeout. Please check your M-Pesa messages.'));
          }
        }, 5000);
      });
    },
    onSuccess: () => {
      setPurchaseStatus('success');
      setStatusMessage('Payment successful! Your content is ready.');
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: mafulluKeys.all });
      
      // Close dialog after delay
      setTimeout(() => {
        setShowPurchaseDialog(false);
        setPurchaseStatus('idle');
        setStatusMessage('');
      }, 2000);
    },
    onError: (error: any) => {
      setPurchaseStatus('error');
      setStatusMessage(error.message || 'Failed to process purchase');
    },
  });

  const handlePurchase = useCallback(() => {
    purchaseMutation.mutate();
  }, [purchaseMutation]);

  const viewContent = useCallback((content: MafulluContent) => {
    setSelectedContent(content);
    setShowContentDialog(true);
  }, []);

  const downloadContent = useCallback(() => {
    if (!selectedContent) return;
    
    const content = `
${selectedContent.title}
${'='.repeat(selectedContent.title.length)}

${selectedContent.content}

Downloaded from Referral Ninja on ${format(new Date(), 'dd MMMM yyyy')}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedContent.title.replace(/\s+/g, '-').toLowerCase()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }, [selectedContent]);

  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: mafulluKeys.all });
  }, [queryClient]);

  const hasContentAvailable = !!availableContent && !isCheckingAvailability;

  // Loading skeletons
  const PurchaseSkeleton = () => (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      <div className="flex items-start gap-4">
        <Skeleton className="h-16 w-16 rounded-2xl bg-ninja-green/10" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 bg-ninja-green/10" />
          <Skeleton className="h-4 w-64 bg-ninja-green/10" />
          <Skeleton className="h-8 w-24 bg-ninja-green/10" />
        </div>
      </div>
      <Skeleton className="h-14 w-32 bg-ninja-green/10" />
    </div>
  );

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Failed to load purchases</p>
        <Button onClick={refreshData} className="mt-4">
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
          <h1 className="text-3xl font-heading font-light text-ninja-mint">Mafullu</h1>
          <p className="text-ninja-sage">Unlock exclusive curated content</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshData}
          disabled={isFetching}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", isFetching && "animate-spin")} />
          {isFetching ? 'Updating...' : 'Refresh'}
        </Button>
      </div>

      {/* Purchase Card */}
      <GlassCard padding="lg" className="border-ninja-green/30">
        {isLoading ? (
          <PurchaseSkeleton />
        ) : (
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-ninja-green/20 flex items-center justify-center border border-ninja-green/30">
                <Lock className="w-8 h-8 text-ninja-green" />
              </div>
              <div>
                <h2 className="text-2xl font-heading text-ninja-mint mb-1">
                  Unlock Premium Content
                </h2>
                <p className="text-ninja-sage max-w-md">
                  Get access to curated info packs including vetted remote openings, 
                  local internship contacts, and quick application templates.
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <span className="text-3xl font-heading text-ninja-green">
                    KSh 300
                  </span>
                  <span className="text-ninja-sage text-sm">
                    One-time purchase
                  </span>
                </div>
              </div>
            </div>
            
            <Button
              onClick={() => setShowPurchaseDialog(true)}
              className="btn-primary h-14 px-8 text-lg"
            >
              <Lock className="w-5 h-5 mr-2" />
              Unlock Now
            </Button>
          </div>
        )}
      </GlassCard>

      {/* My Purchases */}
      <GlassCard padding="lg">
        <h2 className="text-xl font-heading text-ninja-mint mb-4">My Purchases</h2>
        
        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full bg-ninja-green/5 rounded-xl" />
            ))}
          </div>
        ) : purchases.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="p-4 rounded-xl bg-ninja-black/50 border border-ninja-green/10 hover:border-ninja-green/30 transition-colors cursor-pointer"
                onClick={() => viewContent(purchase.content)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-ninja-green/20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-ninja-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-ninja-mint font-medium truncate">
                      {purchase.content.title}
                    </h3>
                    <p className="text-ninja-sage text-sm">
                      Purchased {format(new Date(purchase.purchased_at), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <Check className="w-5 h-5 text-ninja-green" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-ninja-green/30 mx-auto mb-4" />
            <p className="text-ninja-sage">No purchases yet</p>
            <p className="text-ninja-sage/70 text-sm mt-1">
              Unlock your first Mafullu pack above!
            </p>
          </div>
        )}
      </GlassCard>

      {/* Purchase Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent className="bg-ninja-dark/95 backdrop-blur-xl border-ninja-green/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading text-ninja-mint text-center">
              Purchase Mafullu
            </DialogTitle>
            <DialogDescription className="text-center text-ninja-sage">
              Complete payment to unlock exclusive content
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-6 py-4">
            <div className="w-20 h-20 rounded-full bg-ninja-green/20 flex items-center justify-center border border-ninja-green/30">
              <Lock className="w-10 h-10 text-ninja-green" />
            </div>

            <div className="text-center">
              <p className="text-4xl font-heading text-ninja-green mb-1">KSh 300</p>
              <p className="text-ninja-sage text-sm">One-time purchase</p>
            </div>

            {statusMessage && (
              <div className={cn(
                'p-3 rounded-xl text-sm text-center w-full',
                purchaseStatus === 'success' && 'bg-ninja-green/10 border border-ninja-green/30 text-ninja-green',
                purchaseStatus === 'error' && 'bg-red-500/10 border border-red-500/30 text-red-400',
                purchaseStatus === 'polling' && 'bg-blue-500/10 border border-blue-500/30 text-blue-400 animate-pulse',
                purchaseStatus === 'processing' && 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
              )}>
                {purchaseStatus === 'polling' && (
                  <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                )}
                {statusMessage}
              </div>
            )}

            <div className="w-full space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-ninja-black/50 border border-ninja-green/10">
                <Smartphone className="w-5 h-5 text-ninja-green" />
                <div>
                  <p className="text-ninja-sage text-sm">Payment method</p>
                  <p className="text-ninja-mint">{user?.phone_number}</p>
                </div>
              </div>
              
              {!hasContentAvailable && !isCheckingAvailability && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
                  No content available at the moment. Please check back later.
                </div>
              )}
            </div>

            <Button
              onClick={handlePurchase}
              disabled={purchaseMutation.isPending || purchaseStatus === 'success' || !hasContentAvailable}
              className="btn-primary w-full h-12"
            >
              {purchaseMutation.isPending || purchaseStatus === 'polling' ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : purchaseStatus === 'success' ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Completed!
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  Pay KSh 300
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Content View Dialog */}
      <Dialog open={showContentDialog} onOpenChange={setShowContentDialog}>
        <DialogContent className="bg-ninja-dark/95 backdrop-blur-xl border-ninja-green/20 max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedContent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-heading text-ninja-mint">
                  {selectedContent.title}
                </DialogTitle>
                <DialogDescription className="text-ninja-sage">
                  View the selected Mafullu content and download it for offline access.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Images */}
                {selectedContent.images && selectedContent.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {selectedContent.images.map((img, idx) => (
                      <div key={idx} className="aspect-video rounded-xl overflow-hidden border border-ninja-green/10">
                        <img 
                          src={img} 
                          alt={`${selectedContent.title} - ${idx + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Content */}
                <div className="p-4 rounded-xl bg-ninja-black/50 border border-ninja-green/10">
                  <pre className="text-ninja-mint whitespace-pre-wrap font-sans">
                    {selectedContent.content}
                  </pre>
                </div>

                {/* Download Button */}
                <Button onClick={downloadContent} className="btn-primary w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Content
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}