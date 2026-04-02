# Referral Ninja - Backend Implementation Summary

## Overview

The Referral Ninja backend is built on **Supabase**, providing a complete serverless backend solution with PostgreSQL database, authentication, storage, and edge functions.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│                     https://xc7ekcqgf2aka.ok.kimi.link          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SUPABASE PLATFORM                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  PostgreSQL  │  │    Auth      │  │   Storage Buckets    │  │
│  │   Database   │  │  (GoTrue)    │  │  - avatars           │  │
│  │              │  │              │  │  - task-images       │  │
│  │ 10 Tables    │  │  JWT Tokens  │  │  - mafullu-images    │  │
│  │ RLS Policies │  │  Sessions    │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  EDGE FUNCTIONS (Deno)                   │  │
│  │  - mpesa-stk-push    (M-Pesa payment initiation)        │  │
│  │  - mpesa-callback    (Payment confirmation handler)     │  │
│  │  - send-email        (Brevo email service)              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  M-Pesa      │  │    Brevo     │  │   (Optional)         │  │
│  │  Daraja API  │  │   Email      │  │   Custom Domain      │  │
│  │              │  │   Service    │  │                      │  │
│  │ STK Push     │  │              │  │                      │  │
│  │ Callbacks    │  │ Templates:   │  │                      │  │
│  │              │  │ - Password   │  │                      │  │
│  │              │  │   Reset      │  │                      │  │
│  │              │  │ - Withdrawal │  │                      │  │
│  │              │  │ - Welcome    │  │                      │  │
│  │              │  │ - Payment    │  │                      │  │
│  │              │  │ - Referral   │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### Tables

#### 1. `profiles`
Extends `auth.users` with additional user information.
```sql
- id (uuid, PK, FK to auth.users)
- legal_name (text)
- username (text, unique)
- email (text, unique)
- phone_number (text)
- avatar_url (text)
- referral_code (text, unique)
- referred_by (uuid, FK to profiles)
- joined_at (timestamp)
- password_reset_count (int)
- is_admin (boolean)
- payment_status (text)
- payment_verified_at (timestamp)
```

#### 2. `tasks`
Stores available jobs and opportunities.
```sql
- id (uuid, PK)
- title (text)
- description (text)
- task_type (text: remote/local_intern/local_job)
- website_link (text)
- images (text[])
- click_count (int)
- posted_by (uuid, FK to profiles)
- is_active (boolean)
- created_at (timestamp)
```

#### 3. `task_clicks`
Tracks user interactions with tasks.
```sql
- id (uuid, PK)
- task_id (uuid, FK to tasks)
- user_id (uuid, FK to profiles)
- clicked_at (timestamp)
```

#### 4. `referrals`
Tracks referral relationships and earnings.
```sql
- id (uuid, PK)
- referrer_id (uuid, FK to profiles)
- referred_id (uuid, FK to profiles)
- status (text: pending/completed)
- earned_amount (int)
- created_at (timestamp)
- completed_at (timestamp)
```

#### 5. `payments`
Records all payment transactions.
```sql
- id (uuid, PK)
- user_id (uuid, FK to profiles)
- payment_type (text: registration/mafullu/withdrawal)
- amount (int)
- status (text: pending/completed/failed)
- mpesa_receipt (text)
- phone_number (text)
- merchant_request_id (text)
- checkout_request_id (text)
- created_at (timestamp)
- updated_at (timestamp)
```

#### 6. `withdrawals`
Manages withdrawal requests.
```sql
- id (uuid, PK)
- user_id (uuid, FK to profiles)
- amount (int)
- status (text: pending/processing/completed/rejected)
- verification_code (text)
- phone_number (text)
- requested_at (timestamp)
- processed_at (timestamp)
- processed_by (uuid, FK to profiles)
```

#### 7. `mafullu_content`
Stores premium content packs.
```sql
- id (uuid, PK)
- title (text)
- content (text)
- images (text[])
- is_purchased (boolean)
- purchased_by (uuid, FK to profiles)
- purchased_at (timestamp)
- created_at (timestamp)
```

#### 8. `mafullu_purchases`
Tracks premium content purchases.
```sql
- id (uuid, PK)
- user_id (uuid, FK to profiles)
- content_id (uuid, FK to mafullu_content)
- amount (int)
- payment_status (text)
- purchased_at (timestamp)
```

#### 9. `password_resets`
Manages password reset codes.
```sql
- id (uuid, PK)
- user_id (uuid, FK to profiles)
- reset_code (text)
- expires_at (timestamp)
- used_at (timestamp)
- created_at (timestamp)
```

#### 10. `admin_logs`
Tracks admin activities.
```sql
- id (uuid, PK)
- admin_id (uuid, FK to profiles)
- action (text)
- details (jsonb)
- created_at (timestamp)
```

## Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:

1. **Users can only access their own data**
2. **Admins can access all data**
3. **Public data (like active tasks) is readable by all authenticated users**

Example policy:
```sql
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);
```

## Database Functions

### `increment_task_clicks(task_id UUID)`
Increments the click count for a task.

### `increment_reset_count(user_id UUID)`
Increments the password reset count for a user.

### `complete_referral()`
Trigger function that automatically completes a referral when payment is confirmed.

### `handle_new_user()`
Trigger function that creates a profile when a new user signs up.

## Edge Functions

### 1. `mpesa-stk-push`
**Purpose**: Initiates M-Pesa STK push to user's phone

**Input**:
```json
{
  "phoneNumber": "254712345678",
  "amount": 200,
  "accountReference": "REG-user-id",
  "transactionDesc": "Referral Ninja Registration"
}
```

**Output**:
```json
{
  "success": true,
  "message": "STK push initiated successfully",
  "data": { ... }
}
```

**Environment Variables**:
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_PASSKEY`
- `MPESA_SHORTCODE`
- `MPESA_CALLBACK_URL`

### 2. `mpesa-callback`
**Purpose**: Handles M-Pesa payment callbacks

**Input**: M-Pesa callback payload

**Output**:
```json
{
  "success": true,
  "message": "Callback processed successfully"
}
```

**Actions**:
- Updates payment status
- Updates user payment_status
- Triggers referral completion

### 3. `send-email`
**Purpose**: Sends emails via Brevo API

**Input**:
```json
{
  "to": "user@example.com",
  "template": "password-reset",
  "data": { "code": "12345678" }
}
```

**Templates**:
- `password-reset` - 8-digit reset code
- `withdrawal-verification` - 6-digit verification code
- `welcome` - Welcome email with referral code
- `payment-confirmation` - Payment receipt
- `referral-joined` - New referral notification

**Environment Variables**:
- `BREVO_API_KEY`
- `BREVO_FROM_EMAIL`
- `BREVO_FROM_NAME`

## Storage Buckets

### `avatars`
- **Public**: Yes
- **File Size Limit**: 5MB
- **Allowed Types**: image/png, image/jpeg, image/jpg, image/webp
- **Purpose**: User profile pictures

### `task-images`
- **Public**: Yes
- **File Size Limit**: 10MB
- **Allowed Types**: image/png, image/jpeg, image/jpg, image/webp
- **Purpose**: Task/job listing images

### `mafullu-images`
- **Public**: Yes
- **File Size Limit**: 10MB
- **Allowed Types**: image/png, image/jpeg, image/jpg, image/webp
- **Purpose**: Premium content images

## Triggers

### `on_auth_user_created`
Fires when a new user is created in `auth.users`.
- Creates a profile in `profiles` table
- Generates unique referral code
- Sets default values

### `complete_referral_on_payment`
Fires when a payment is updated.
- If payment status changes to `completed`
- Updates referral status to `completed`
- Sets earned_amount to 100

## Security Features

1. **RLS Policies**: All tables have row-level security
2. **JWT Authentication**: All API requests are authenticated
3. **Input Validation**: Zod schemas validate all inputs
4. **Rate Limiting**: Built into Supabase Auth
5. **HTTPS**: All communications are encrypted

## Pricing Integration

### Registration Fee: KSh 200
- User pays via M-Pesa STK push
- 50% (KSh 100) goes to referrer
- Payment verified via callback

### Mafullu Content: KSh 300
- One-time purchase per content pack
- Auto-assigns available content
- Content becomes downloadable after payment

### Withdrawal: Min KSh 500
- Email verification required (6-digit code)
- Admin approval required
- Sent to user's M-Pesa number

## Setup Checklist

- [ ] Create Supabase project
- [ ] Run database migration (`001_initial_schema.sql`)
- [ ] Create storage buckets (avatars, task-images, mafullu-images)
- [ ] Deploy edge functions (mpesa-stk-push, mpesa-callback, send-email)
- [ ] Configure environment variables
- [ ] Create admin user
- [ ] Test payment flow
- [ ] Test email delivery
- [ ] Deploy frontend

## API Endpoints

### Supabase REST API
```
https://your-project.supabase.co/rest/v1/{table}
```

### Edge Functions
```
POST https://your-project.supabase.co/functions/v1/mpesa-stk-push
POST https://your-project.supabase.co/functions/v1/mpesa-callback
POST https://your-project.supabase.co/functions/v1/send-email
```

## Monitoring

### Supabase Dashboard
- Database usage
- Auth activity
- Storage usage
- Edge function logs

### Key Metrics
- User registrations
- Payment success rate
- Referral conversion rate
- Withdrawal processing time

## Scaling Considerations

1. **Database**: Upgrade to paid plan for production
2. **Storage**: Monitor bucket sizes
3. **Edge Functions**: Check execution limits
4. **Rate Limiting**: Configure based on usage

## Backup & Recovery

Supabase provides automatic backups for paid plans. For free plans:
- Export data regularly via SQL dumps
- Store backups in external storage
- Test recovery procedures

---

## Next Steps

1. Follow the [SETUP.md](./SETUP.md) guide to configure your Supabase project
2. Set up M-Pesa Daraja API credentials
3. Configure Brevo email service
4. Deploy edge functions
5. Test all features
6. Go live!
