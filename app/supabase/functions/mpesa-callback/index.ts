// M-Pesa Callback Handler
// This function handles M-Pesa payment callbacks

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const callbackData = await req.json();
    console.log('M-Pesa callback received:', JSON.stringify(callbackData));
    
    // Extract data from callback
    const { Body } = callbackData;
    
    if (!Body || !Body.stkCallback) {
      return new Response(
        JSON.stringify({ error: 'Invalid callback data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { stkCallback } = Body;
    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback;
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Extract receipt number if payment was successful
    let mpesaReceiptNumber = null;
    if (ResultCode === 0 && CallbackMetadata && CallbackMetadata.Item) {
      const receiptItem = CallbackMetadata.Item.find(
        (item: any) => item.Name === 'MpesaReceiptNumber'
      );
      if (receiptItem) {
        mpesaReceiptNumber = receiptItem.Value;
      }
    }
    
    // Update payment record
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: ResultCode === 0 ? 'completed' : 'failed',
        mpesa_receipt: mpesaReceiptNumber,
        merchant_request_id: MerchantRequestID,
        checkout_request_id: CheckoutRequestID,
        updated_at: new Date().toISOString(),
      })
      .eq('merchant_request_id', MerchantRequestID);
    
    if (updateError) {
      console.error('Error updating payment:', updateError);
    }
    
    // If payment was successful, update user's payment status
    if (ResultCode === 0) {
      // Get the payment record to find the user
      const { data: payment } = await supabase
        .from('payments')
        .select('user_id, payment_type')
        .eq('merchant_request_id', MerchantRequestID)
        .single();
      
      if (payment) {
        if (payment.payment_type === 'registration') {
          // Update user's payment status
          await supabase
            .from('profiles')
            .update({
              payment_status: 'completed',
              payment_verified_at: new Date().toISOString(),
            })
            .eq('id', payment.user_id);
        } else if (payment.payment_type === 'mafullu') {
          // Update mafullu purchase status
          await supabase
            .from('mafullu_purchases')
            .update({
              payment_status: 'completed',
            })
            .eq('user_id', payment.user_id)
            .eq('payment_status', 'pending');
        }
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Callback processed successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in mpesa-callback:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
