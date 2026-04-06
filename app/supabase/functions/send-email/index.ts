// @ts-nocheck
// Email Sending Edge Function using Brevo (Sendinblue)
// This function sends emails for various purposes

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Email templates
const emailTemplates: Record<string, (data: any) => { subject: string; html: string }> = {
  'password-reset': (data) => ({
    subject: 'Password Reset Code - Referral Ninja',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #050B06; color: #E8FFE8; border: 1px solid #39FF14;">
        <div style="text-align: center; padding: 20px; border-bottom: 1px solid #39FF14;">
          <h1 style="color: #39FF14; margin: 0;">Referral Ninja</h1>
          <p style="color: #9AB89A; margin: 10px 0;">Turn referrals into income</p>
        </div>
        <div style="padding: 30px 20px;">
          <h2 style="color: #39FF14;">Password Reset Request</h2>
          <p style="color: #E8FFE8; line-height: 1.6;">
            You requested a password reset for your Referral Ninja account. 
            Use the code below to reset your password:
          </p>
          <div style="background-color: #0A1A0D; border: 1px solid #39FF14; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; color: #39FF14; letter-spacing: 8px;">${data.code}</span>
          </div>
          <p style="color: #9AB89A; font-size: 14px;">
            This code will expire in 30 minutes. If you didn't request this reset, 
            please ignore this email.
          </p>
        </div>
        <div style="text-align: center; padding: 20px; border-top: 1px solid #39FF14; color: #9AB89A; font-size: 12px;">
          <p>© 2026 Referral Ninja. All rights reserved.</p>
        </div>
      </div>
    `,
  }),
  
  'withdrawal-verification': (data) => ({
    subject: 'Withdrawal Verification Code - Referral Ninja',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #050B06; color: #E8FFE8; border: 1px solid #39FF14;">
        <div style="text-align: center; padding: 20px; border-bottom: 1px solid #39FF14;">
          <h1 style="color: #39FF14; margin: 0;">Referral Ninja</h1>
          <p style="color: #9AB89A; margin: 10px 0;">Turn referrals into income</p>
        </div>
        <div style="padding: 30px 20px;">
          <h2 style="color: #39FF14;">Withdrawal Verification</h2>
          <p style="color: #E8FFE8; line-height: 1.6;">
            You requested a withdrawal of <strong style="color: #39FF14;">KSh ${data.amount}</strong> from your Referral Ninja account.
            Use the code below to verify your withdrawal:
          </p>
          <div style="background-color: #0A1A0D; border: 1px solid #39FF14; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; color: #39FF14; letter-spacing: 8px;">${data.code}</span>
          </div>
          <p style="color: #9AB89A; font-size: 14px;">
            This code will expire in 10 minutes. If you didn't request this withdrawal, 
            please secure your account immediately.
          </p>
        </div>
        <div style="text-align: center; padding: 20px; border-top: 1px solid #39FF14; color: #9AB89A; font-size: 12px;">
          <p>© 2026 Referral Ninja. All rights reserved.</p>
        </div>
      </div>
    `,
  }),
  
  'welcome': (data) => ({
    subject: 'Welcome to Referral Ninja!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #050B06; color: #E8FFE8; border: 1px solid #39FF14;">
        <div style="text-align: center; padding: 20px; border-bottom: 1px solid #39FF14;">
          <h1 style="color: #39FF14; margin: 0;">Referral Ninja</h1>
          <p style="color: #9AB89A; margin: 10px 0;">Turn referrals into income</p>
        </div>
        <div style="padding: 30px 20px;">
          <h2 style="color: #39FF14;">Welcome, ${data.name}!</h2>
          <p style="color: #E8FFE8; line-height: 1.6;">
            Thank you for joining Referral Ninja! Your account has been successfully created.
          </p>
          <div style="background-color: #0A1A0D; border: 1px solid #39FF14; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="color: #39FF14; margin-top: 0;">Your Referral Code</h3>
            <p style="color: #E8FFE8; font-size: 24px; font-weight: bold; letter-spacing: 4px;">${data.referralCode}</p>
            <p style="color: #9AB89A; font-size: 14px;">
              Share this code with friends and earn KSh 100 for each successful signup!
            </p>
          </div>
          <p style="color: #E8FFE8; line-height: 1.6;">
            Start exploring tasks, applying to opportunities, and building your referral network today.
          </p>
        </div>
        <div style="text-align: center; padding: 20px; border-top: 1px solid #39FF14; color: #9AB89A; font-size: 12px;">
          <p>© 2026 Referral Ninja. All rights reserved.</p>
        </div>
      </div>
    `,
  }),
  
  'payment-confirmation': (data) => ({
    subject: 'Payment Confirmation - Referral Ninja',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #050B06; color: #E8FFE8; border: 1px solid #39FF14;">
        <div style="text-align: center; padding: 20px; border-bottom: 1px solid #39FF14;">
          <h1 style="color: #39FF14; margin: 0;">Referral Ninja</h1>
          <p style="color: #9AB89A; margin: 10px 0;">Turn referrals into income</p>
        </div>
        <div style="padding: 30px 20px;">
          <h2 style="color: #39FF14;">Payment Successful!</h2>
          <p style="color: #E8FFE8; line-height: 1.6;">
            Your payment of <strong style="color: #39FF14;">KSh ${data.amount}</strong> has been received successfully.
          </p>
          <div style="background-color: #0A1A0D; border: 1px solid #39FF14; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p style="color: #E8FFE8; margin: 5px 0;"><strong>Receipt Number:</strong> ${data.receiptNumber}</p>
            <p style="color: #E8FFE8; margin: 5px 0;"><strong>Amount:</strong> KSh ${data.amount}</p>
            <p style="color: #E8FFE8; margin: 5px 0;"><strong>Date:</strong> ${data.date}</p>
          </div>
          <p style="color: #E8FFE8; line-height: 1.6;">
            Thank you for your payment. You can now access all features of Referral Ninja.
          </p>
        </div>
        <div style="text-align: center; padding: 20px; border-top: 1px solid #39FF14; color: #9AB89A; font-size: 12px;">
          <p>© 2026 Referral Ninja. All rights reserved.</p>
        </div>
      </div>
    `,
  }),
  
  'referral-joined': (data) => ({
    subject: 'Someone Joined Using Your Referral!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #050B06; color: #E8FFE8; border: 1px solid #39FF14;">
        <div style="text-align: center; padding: 20px; border-bottom: 1px solid #39FF14;">
          <h1 style="color: #39FF14; margin: 0;">Referral Ninja</h1>
          <p style="color: #9AB89A; margin: 10px 0;">Turn referrals into income</p>
        </div>
        <div style="padding: 30px 20px;">
          <h2 style="color: #39FF14;">Great News!</h2>
          <p style="color: #E8FFE8; line-height: 1.6;">
            <strong>${data.referredName}</strong> just joined Referral Ninja using your referral link!
          </p>
          <div style="background-color: #0A1A0D; border: 1px solid #39FF14; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <p style="color: #39FF14; font-size: 24px; font-weight: bold; margin: 0;">+KSh 100</p>
            <p style="color: #9AB89A; font-size: 14px; margin: 5px 0;">Earned from this referral</p>
          </div>
          <p style="color: #E8FFE8; line-height: 1.6;">
            Keep sharing your referral link to earn more! Your total earnings are now <strong style="color: #39FF14;">KSh ${data.totalEarned}</strong>.
          </p>
        </div>
        <div style="text-align: center; padding: 20px; border-top: 1px solid #39FF14; color: #9AB89A; font-size: 12px;">
          <p>© 2026 Referral Ninja. All rights reserved.</p>
        </div>
      </div>
    `,
  }),
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const { to, subject, template, data } = await req.json();
    
    // Validate inputs
    if (!to || !template) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, template' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get Brevo API key from environment
    const brevoApiKey = Deno.env.get('BREVO_API_KEY') || '';
    
    if (!brevoApiKey) {
      return new Response(
        JSON.stringify({ error: 'Brevo API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get email template
    const templateFn = emailTemplates[template];
    if (!templateFn) {
      return new Response(
        JSON.stringify({ error: `Unknown template: ${template}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { subject: templateSubject, html } = templateFn(data);
    
    // Send email via Brevo API
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': brevoApiKey,
      },
      body: JSON.stringify({
        sender: {
          name: Deno.env.get('BREVO_FROM_NAME') || 'Referral Ninja',
          email: Deno.env.get('BREVO_FROM_EMAIL') || 'noreply@referralninja.co.ke',
        },
        to: [{ email: to }],
        subject: subject || templateSubject,
        htmlContent: html,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Brevo API error:', errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }
    
    const result = await response.json();
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        messageId: result.messageId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in send-email:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
