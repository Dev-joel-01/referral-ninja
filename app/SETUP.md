# Referral Ninja - Full Setup Guide

This guide will walk you through setting up the complete Referral Ninja application with all backend functionality.

## Prerequisites

1. **Supabase Account**: Create a free account at [supabase.com](https://supabase.com)
2. **Brevo Account**: Create a free account at [brevo.com](https://brevo.com) for email services
3. **M-Pesa Daraja API**: Register at [developer.safaricom.co.ke](https://developer.safaricom.co.ke) for sandbox access

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Name it "referral-ninja" (or any name you prefer)
3. Choose a region closest to your users (e.g., "East US" for Kenya)
4. Save your **Project URL** and **Anon Key** - you'll need these later

## Step 2: Set Up Database Schema

1. In your Supabase dashboard, go to the **SQL Editor**
2. Create a **New Query**
3. Copy and paste the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Click **Run** to execute the SQL

This will create all tables, policies, functions, and triggers needed for the application.

## Step 3: Set Up Storage Buckets

1. Go to **Storage** in the left sidebar
2. Create the following buckets:
   - `avatars` (Public)
   - `task-images` (Public)
   - `mafullu-images` (Public)

For each bucket:
- Click **New bucket**
- Enter the bucket name
- Toggle **Public bucket** to ON
- Click **Save**

## Step 4: Deploy Edge Functions

### Option A: Using Supabase CLI (Recommended)

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link your project:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

4. Deploy functions:
```bash
supabase functions deploy mpesa-stk-push
supabase functions deploy mpesa-callback
supabase functions deploy send-email
```

### Option B: Using Supabase Dashboard

1. Go to **Edge Functions** in the left sidebar
2. Click **New Function** for each function:
   - `mpesa-stk-push`
   - `mpesa-callback`
   - `send-email`
3. Copy and paste the code from the respective files in `supabase/functions/`

## Step 5: Configure Environment Variables

### In Supabase Dashboard:

Go to **Project Settings** → **API** → **Edge Functions** and add these secrets:

```
# Supabase (auto-populated)
SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# M-Pesa (from Daraja API)
MPESA_CONSUMER_KEY=your-consumer-key
MPESA_CONSUMER_SECRET=your-consumer-secret
MPESA_PASSKEY=your-passkey
MPESA_SHORTCODE=174379
MPESA_CALLBACK_URL=https://your-project.supabase.co/functions/v1/mpesa-callback

# Brevo (from Brevo dashboard)
BREVO_API_KEY=your-brevo-api-key
BREVO_FROM_EMAIL=noreply@referralninja.co.ke
BREVO_FROM_NAME=Referral Ninja
```

### Getting M-Pesa Credentials:

1. Go to [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. Create an account and log in
3. Go to **My Apps** → **Create New App**
4. Select **Daraja Sandbox**
5. Copy your **Consumer Key** and **Consumer Secret**
6. For Passkey, use the sandbox passkey provided or generate one

### Getting Brevo API Key:

1. Go to [brevo.com](https://brevo.com) and log in
2. Go to **SMTP & API** → **API Keys**
3. Click **Create a new API key**
4. Name it "Referral Ninja" and copy the key

## Step 6: Configure Frontend Environment

Create a `.env` file in your project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Replace with your actual Supabase project URL and anon key.

## Step 7: Create Admin User

1. Go to **Authentication** → **Users** in Supabase dashboard
2. Click **Add User** → **Create New User**
3. Enter:
   - Email: `admin@referralninja.co.ke`
   - Password: `Admin@Ninja2026!`
4. Click **Create User**
5. After creation, run this SQL in the SQL Editor:

```sql
UPDATE public.profiles 
SET is_admin = TRUE 
WHERE email = 'admin@referralninja.co.ke';
```

## Step 8: Build and Deploy

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Deploy to your hosting platform (the dist folder contains the built app)

## Step 9: Test the Application

### Test User Registration:
1. Go to your deployed app
2. Click "Create Account"
3. Fill in the registration form
4. Complete M-Pesa payment (use sandbox test credentials)

### Test M-Pesa Sandbox Payments:
Use these test credentials for M-Pesa sandbox:
- **Phone**: 254708374149
- **PIN**: 1234
- **OTP**: Any 6-digit number

### Test Admin Access:
1. Log in with admin credentials
2. Access `/admin` to see the admin dashboard
3. Create tasks, manage users, approve withdrawals

## Troubleshooting

### Issue: "Failed to get M-Pesa access token"
- Check that your M-Pesa credentials are correct
- Ensure you're using the sandbox environment for testing

### Issue: "Brevo API key not configured"
- Verify the BREVO_API_KEY environment variable is set
- Check that the API key has permission to send emails

### Issue: "Database policy violation"
- Ensure all RLS policies were created correctly
- Check that the user is authenticated before making requests

### Issue: "Storage bucket not found"
- Verify the bucket names match exactly: `avatars`, `task-images`, `mafullu-images`
- Ensure buckets are set to public

## Production Deployment Checklist

Before going live:

- [ ] Switch M-Pesa to production credentials
- [ ] Update callback URL to production domain
- [ ] Configure custom domain in Supabase
- [ ] Set up proper email domain (SPF, DKIM records)
- [ ] Enable RLS policies (they should already be enabled)
- [ ] Test all payment flows
- [ ] Test email delivery
- [ ] Review and adjust rate limits
- [ ] Set up monitoring and alerts

## Support

For issues or questions:
1. Check Supabase documentation: [supabase.com/docs](https://supabase.com/docs)
2. Check M-Pesa Daraja documentation: [developer.safaricom.co.ke/docs](https://developer.safaricom.co.ke/docs)
3. Check Brevo documentation: [developers.brevo.com](https://developers.brevo.com)

## File Structure

```
referral-ninja/
├── src/                          # Frontend React code
│   ├── components/               # React components
│   ├── pages/                    # Page components
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utility functions
│   └── types/                    # TypeScript types
├── supabase/                     # Backend configuration
│   ├── migrations/               # Database migrations
│   ├── functions/                # Edge Functions
│   └── config.toml              # Supabase config
├── dist/                         # Built frontend (deploy this)
└── SETUP.md                     # This file
```

## API Endpoints

### Edge Functions:
- `POST /functions/v1/mpesa-stk-push` - Initiate M-Pesa payment
- `POST /functions/v1/mpesa-callback` - M-Pesa callback handler
- `POST /functions/v1/send-email` - Send emails via Brevo

### Database Tables:
- `profiles` - User profiles
- `tasks` - Available tasks/jobs
- `task_clicks` - Task click tracking
- `referrals` - Referral tracking
- `payments` - Payment records
- `withdrawals` - Withdrawal requests
- `mafullu_content` - Premium content
- `mafullu_purchases` - Content purchases
- `password_resets` - Password reset codes

## Security Notes

1. Never commit `.env` files to version control
2. Use strong passwords for admin accounts
3. Regularly rotate API keys
4. Monitor database access logs
5. Enable 2FA on your Supabase account
6. Review RLS policies regularly

---

**You're all set!** Your Referral Ninja application should now be fully functional with all backend services connected.
