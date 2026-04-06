// M-Pesa STK Push Edge Function - FIXED VERSION
// Updated: 2026-04-05

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  shortcode: string;
  callbackUrl: string;
}

async function getAccessToken(config: MpesaConfig): Promise<string> {
  const auth = btoa(`${config.consumerKey}:${config.consumerSecret}`);
  
  const response = await fetch(
    'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to get M-Pesa access token');
  }
  
  const data = await response.json();
  return data.access_token;
}

function generatePassword(shortcode: string, passkey: string, timestamp: string): string {
  const str = shortcode + passkey + timestamp;
  return btoa(str);
}

async function initiateStkPush(
  accessToken: string,
  config: MpesaConfig,
  phoneNumber: string,
  amount: number,
  accountReference: string,
  transactionDesc: string
) {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const password = generatePassword(config.shortcode, config.passkey, timestamp);
  
  const formattedPhone = phoneNumber.startsWith('254') 
    ? phoneNumber 
    : `254${phoneNumber.replace(/^0/, '')}`;
  
  const payload = {
    BusinessShortCode: config.shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: amount,
    PartyA: formattedPhone,
    PartyB: config.shortcode,
    PhoneNumber: formattedPhone,
    CallBackURL: config.callbackUrl,
    AccountReference: accountReference,
    TransactionDesc: transactionDesc,
  };
  
  const response = await fetch(
    'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`STK push failed: ${error}`);
  }
  
  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const { phoneNumber, amount, accountReference, transactionDesc } = await req.json();
    
    if (!phoneNumber || !amount || !accountReference) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Extract userId from accountReference (REG-userId)
    const userId = accountReference.replace('REG-', '');
    
    const config: MpesaConfig = {
      consumerKey: Deno.env.get('MPESA_CONSUMER_KEY') || '',
      consumerSecret: Deno.env.get('MPESA_CONSUMER_SECRET') || '',
      passkey: Deno.env.get('MPESA_PASSKEY') || '',
      shortcode: Deno.env.get('MPESA_SHORTCODE') || '174379',
      callbackUrl: Deno.env.get('MPESA_CALLBACK_URL') || '',
    };
    
    if (!config.consumerKey || !config.consumerSecret || !config.passkey) {
      return new Response(
        JSON.stringify({ error: 'M-Pesa configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const accessToken = await getAccessToken(config);
    
    const mpesaResponse = await initiateStkPush(
      accessToken,
      config,
      phoneNumber,
      amount,
      accountReference,
      transactionDesc || 'Referral Ninja Payment'
    );
    
    console.log('M-Pesa STK response:', mpesaResponse);
    
    // ✅ CRITICAL FIX: Update payment record with checkout_request_id
    // This allows the callback to find and update the payment later
    if (mpesaResponse.CheckoutRequestID) {
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          checkout_request_id: mpesaResponse.CheckoutRequestID,
          merchant_request_id: mpesaResponse.MerchantRequestID,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('payment_type', 'registration')
        .eq('status', 'pending');
      
      if (updateError) {
        console.error('Failed to update payment with checkout_request_id:', updateError);
        // Continue anyway - don't fail the STK push
      } else {
        console.log('Payment record updated with checkout_request_id:', mpesaResponse.CheckoutRequestID);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'STK push initiated successfully',
        checkoutRequestId: mpesaResponse.CheckoutRequestID,
        merchantRequestId: mpesaResponse.MerchantRequestID,
        responseCode: mpesaResponse.ResponseCode,
        responseDescription: mpesaResponse.ResponseDescription,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in mpesa-stk-push:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});