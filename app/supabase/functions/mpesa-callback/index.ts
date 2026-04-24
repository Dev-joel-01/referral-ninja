// @ts-nocheck
// supabase/functions/mpesa-callback/index.ts (UPDATED)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-content',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const callbackData = await req.json();
    console.log('M-Pesa callback received:', JSON.stringify(callbackData, null, 2));

    const { Body } = callbackData;
    if (!Body?.stkCallback) {
      return new Response(
        JSON.stringify({ error: 'Invalid callback data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = Body.stkCallback;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract metadata
    let mpesaReceipt = null;
    let amount = null;
    let phoneNumber = null;

    if (CallbackMetadata?.Item) {
      const items = CallbackMetadata.Item;
      mpesaReceipt = items.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value || null;
      amount = items.find((i: any) => i.Name === 'Amount')?.Value || null;
      phoneNumber = items.find((i: any) => i.Name === 'PhoneNumber')?.Value?.toString() || null;
    }

    // 1. Find payment by checkout_request_id
    const { data: payment, error: findError } = await supabase
      .from('payments')
      .select('*')
      .eq('checkout_request_id', CheckoutRequestID)
      .single();

    if (findError || !payment) {
      console.error('Payment not found:', findError);
      return new Response(
        JSON.stringify({ success: false, error: 'Payment not found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Idempotency check: Already processed?
    if (payment.status === 'completed') {
      console.log('Payment already processed:', payment.id);
      return new Response(
        JSON.stringify({ success: true, message: 'Already processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Update payment status
    const updateData: any = {
      status: ResultCode === 0 ? 'completed' : 'failed',
      merchant_request_id: MerchantRequestID,
      updated_at: new Date().toISOString(),
    };

    if (mpesaReceipt) updateData.mpesa_receipt = mpesaReceipt;
    if (amount !== null) updateData.amount = amount;
    if (phoneNumber) updateData.phone_number = phoneNumber;

    const { error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('checkout_request_id', CheckoutRequestID);

    if (updateError) {
      console.error('Failed to update payment:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Database update failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. If successful, update profiles and referrals
    if (ResultCode === 0) {
      console.log('Payment successful, activating user:', payment.user_id);

      // Update profiles table (triggers realtime notification)
      await supabase
        .from('profiles')
        .update({
          payment_status: 'completed',
          payment_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.user_id);

      // Note: Referral completion is handled by the complete_referral trigger
      // No need to manually update referrals here
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Callback processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});