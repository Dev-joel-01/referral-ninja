// M-Pesa Callback Handler
// Updated: 2026-04-04 13:51

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
    
    // ✅ FIXED: Extract all metadata items (not just receipt)
    let mpesaReceiptNumber = null;
    let amount = null;
    let phoneNumber = null;
    
    if (CallbackMetadata && CallbackMetadata.Item) {
      const items = CallbackMetadata.Item;
      
      const receiptItem = items.find((item: any) => item.Name === 'MpesaReceiptNumber');
      mpesaReceiptNumber = receiptItem?.Value || null;
      
      const amountItem = items.find((item: any) => item.Name === 'Amount');
      amount = amountItem?.Value || null;
      
      const phoneItem = items.find((item: any) => item.Name === 'PhoneNumber');
      phoneNumber = phoneItem?.Value?.toString() || null;
    }
    
    // ✅ FIXED: Build update data dynamically
    const updateData: any = {
      status: ResultCode === 0 ? 'completed' : 'failed',
      merchant_request_id: MerchantRequestID,
      updated_at: new Date().toISOString(),
    };
    
    if (mpesaReceiptNumber) updateData.mpesa_receipt = mpesaReceiptNumber;
    if (amount !== null) updateData.amount = amount;
    if (phoneNumber) updateData.phone_number = phoneNumber;
    
    console.log('Updating payment:', { CheckoutRequestID, updateData });
    
    // ✅ CRITICAL FIX: Update by checkout_request_id (not merchant_request_id)
    // This matches how your signup code stores it
    const { data: updatedPayments, error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('checkout_request_id', CheckoutRequestID)  // ✅ FIXED
      .select();
    
    if (updateError) {
      console.error('Error updating payment:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Database update failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // ✅ FIXED: Handle case where no payment record found
    if (!updatedPayments || updatedPayments.length === 0) {
      console.warn('Payment not found for checkout_request_id:', CheckoutRequestID);
      return new Response(
        JSON.stringify({ success: false, error: 'Payment record not found', checkoutRequestId: CheckoutRequestID }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const payment = updatedPayments[0];
    console.log('Payment updated:', payment.id);
    
    // If payment was successful, update user's payment status
    if (ResultCode === 0) {
      console.log('Activating user:', payment.user_id);
      
      if (payment.payment_type === 'registration') {
        await supabase
          .from('profiles')
          .update({
            payment_status: 'completed',
            payment_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.user_id);
      } else if (payment.payment_type === 'mafullu') {
        await supabase
          .from('mafullu_purchases')
          .update({
            payment_status: 'completed',
            purchased_at: new Date().toISOString(),
          })
          .eq('user_id', payment.user_id)
          .eq('payment_status', 'pending');
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Callback processed successfully',
        paymentId: payment.id,
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