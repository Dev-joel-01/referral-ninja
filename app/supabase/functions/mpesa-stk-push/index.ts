// M-Pesa STK Push Edge Function
// This function initiates an STK push to the user's phone

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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

// Get access token from Safaricom
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

// Generate password for STK push
function generatePassword(shortcode: string, passkey: string, timestamp: string): string {
  const str = shortcode + passkey + timestamp;
  return btoa(str);
}

// Initiate STK push
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
  
  // Format phone number (remove 254 prefix if present and add it back)
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const { phoneNumber, amount, accountReference, transactionDesc } = await req.json();
    
    // Validate inputs
    if (!phoneNumber || !amount || !accountReference) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get M-Pesa configuration from environment variables
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
    
    // Get access token
    const accessToken = await getAccessToken(config);
    
    // Initiate STK push
    const result = await initiateStkPush(
      accessToken,
      config,
      phoneNumber,
      amount,
      accountReference,
      transactionDesc || 'Referral Ninja Payment'
    );
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'STK push initiated successfully',
        data: result,
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
