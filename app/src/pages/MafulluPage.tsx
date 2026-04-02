import { useEffect, useState } from 'react';
import { 
  FileText, 
  Lock, 
  Download, 
  Check, 
  Loader2,
  Smartphone
} from 'lucide-react';
import { GlassCard } from '@/components/layout/GlassCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';

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

export function MafulluPage() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<MafulluPurchase[]>([]);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showContentDialog, setShowContentDialog] = useState(false);
  const [selectedContent, setSelectedContent] = useState<MafulluContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      fetchPurchases();
    }
  }, [user]);

  const fetchPurchases = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('mafullu_purchases')
        .select('*, content:mafullu_content(*)')
        .eq('user_id', user!.id)
        .eq('payment_status', 'completed')
        .order('purchased_at', { ascending: false });

      if (data) {
        setPurchases(data as MafulluPurchase[]);
      }
    } catch (error) {
      console.error('Error fetching purchases:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async () => {
    setIsPurchasing(true);
    setPaymentStatus('processing');
    setMessage('Processing payment...');

    try {
      // Get available content
      const { data: availableContent, error: contentError } = await supabase
        .from('mafullu_content')
        .select('*')
        .eq('is_purchased', false)
        .limit(1)
        .single();

      if (contentError || !availableContent) {
        throw new Error('No Mafullu content available at the moment');
      }

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

      // Initiate M-Pesa payment
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
      }

      // Poll for payment status
      let attempts = 0;
      const maxAttempts = 12; // 60 seconds
      
      const checkPayment = setInterval(async () => {
        attempts++;
        
        const { data: paymentStatus } = await supabase
          .from('mafullu_purchases')
          .select('payment_status')
          .eq('id', purchase.id)
          .single();

        if (paymentStatus?.payment_status === 'completed') {
          clearInterval(checkPayment);
          
          // Mark content as purchased
          await supabase
            .from('mafullu_content')
            .update({ 
              is_purchased: true, 
              purchased_by: user!.id,
              purchased_at: new Date().toISOString(),
            })
            .eq('id', availableContent.id);

          setPaymentStatus('success');
          setMessage('Payment successful! Your content is ready.');
          fetchPurchases();
          
          setTimeout(() => {
            setShowPurchaseDialog(false);
            setPaymentStatus('idle');
          }, 2000);
        } else if (attempts >= maxAttempts) {
          clearInterval(checkPayment);
          setPaymentStatus('error');
          setMessage('Payment timeout. Please try again.');
        }
      }, 5000);

    } catch (error: any) {
      setPaymentStatus('error');
      setMessage(error.message || 'Failed to process purchase');
    } finally {
      setIsPurchasing(false);
    }
  };

  const viewContent = (content: MafulluContent) => {
    setSelectedContent(content);
    setShowContentDialog(true);
  };

  const downloadContent = () => {
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
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-light text-ninja-mint">Mafullu</h1>
        <p className="text-ninja-sage">Unlock exclusive curated content</p>
      </div>

      {/* Purchase Card */}
      <GlassCard padding="lg" className="border-ninja-green/30">
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
      </GlassCard>

      {/* My Purchases */}
      <GlassCard padding="lg">
        <h2 className="text-xl font-heading text-ninja-mint mb-4">My Purchases</h2>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-ninja-green animate-spin" />
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

            {message && (
              <div className={`
                p-3 rounded-xl text-sm text-center w-full
                ${paymentStatus === 'success' 
                  ? 'bg-ninja-green/10 border border-ninja-green/30 text-ninja-green'
                  : paymentStatus === 'error'
                  ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                  : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
                }
              `}>
                {message}
              </div>
            )}

            <div className="w-full space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-ninja-black/50 border border-ninja-green/10">
                <Smartphone className="w-5 h-5 text-ninja-green" />
                <div>
                  <p className="text-ninja-sage text-sm">Payment method</p>
                  <p className="text-ninja-mint">M-Pesa ({user?.phone_number})</p>
                </div>
              </div>
            </div>

            <Button
              onClick={handlePurchase}
              disabled={isPurchasing || paymentStatus === 'success'}
              className="btn-primary w-full h-12"
            >
              {isPurchasing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : paymentStatus === 'success' ? (
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
