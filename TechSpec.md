# Referral Ninja - Technical Specification

## 1. System Architecture

### Stack Overview
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Email Service**: Brevo (Sendinblue) API
- **Payment Gateway**: M-Pesa STK Push (Daraja API)
- **QR Codes**: qrcode library
- **Animations**: GSAP + ScrollTrigger
- **PWA**: Vite PWA Plugin

### Database Schema (Supabase)

```sql
-- Users table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  legal_name text not null,
  username text unique not null,
  email text unique not null,
  phone_number text not null,
  avatar_url text,
  referral_code text unique not null,
  referred_by uuid references public.profiles(id),
  joined_at timestamp with time zone default now(),
  password_reset_count integer default 0,
  is_admin boolean default false,
  payment_status text default 'pending', -- pending, completed, failed
  payment_verified_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Tasks table
create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  task_type text not null, -- remote, local_intern, local_job
  website_link text,
  images text[] default '{}',
  click_count integer default 0,
  posted_by uuid references public.profiles(id),
  created_at timestamp with time zone default now(),
  is_active boolean default true
);

-- Task clicks tracking
create table public.task_clicks (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  clicked_at timestamp with time zone default now(),
  unique(task_id, user_id)
);

-- Mafullu content table
create table public.mafullu_content (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  images text[] default '{}',
  is_purchased boolean default false,
  purchased_by uuid references public.profiles(id),
  purchased_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Mafullu purchases
create table public.mafullu_purchases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  content_id uuid references public.mafullu_content(id) on delete cascade,
  amount integer default 300,
  payment_status text default 'pending',
  purchased_at timestamp with time zone default now()
);

-- Referrals tracking
create table public.referrals (
  id uuid default gen_random_uuid() primary key,
  referrer_id uuid references public.profiles(id) on delete cascade,
  referred_id uuid references public.profiles(id) on delete cascade,
  status text default 'pending', -- pending, completed
  earned_amount integer default 0,
  created_at timestamp with time zone default now(),
  completed_at timestamp with time zone,
  unique(referred_id)
);

-- Payments table
create table public.payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  payment_type text not null, -- registration, mafullu, withdrawal
  amount integer not null,
  status text default 'pending', -- pending, completed, failed
  mpesa_receipt text,
  phone_number text,
  merchant_request_id text,
  checkout_request_id text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Withdrawals table
create table public.withdrawals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  amount integer not null,
  status text default 'pending', -- pending, processing, completed, rejected
  verification_code text,
  phone_number text not null,
  requested_at timestamp with time zone default now(),
  processed_at timestamp with time zone,
  processed_by uuid references public.profiles(id)
);

-- Password reset tracking
create table public.password_resets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  reset_code text not null,
  expires_at timestamp with time zone not null,
  used_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Admin activity log
create table public.admin_logs (
  id uuid default gen_random_uuid() primary key,
  admin_id uuid references public.profiles(id),
  action text not null,
  details jsonb,
  created_at timestamp with time zone default now()
);
```

### Row Level Security (RLS) Policies

```sql
-- Profiles policies
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

-- Tasks policies
create policy "Anyone can view active tasks"
  on public.tasks for select
  using (is_active = true);

create policy "Admins can manage tasks"
  on public.tasks for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

-- Similar policies for other tables...
```

## 2. Component Inventory

### shadcn/ui Components (Built-in)
- Button
- Card
- Input
- Label
- Form
- Dialog
- DropdownMenu
- Avatar
- Badge
- Tabs
- Accordion
- Toast
- Skeleton
- Progress
- Separator
- ScrollArea
- Sheet
- Table

### Custom Components

#### Layout Components
- `CursorGlow` - Cursor-following green ambience effect
- `GlassCard` - Glass-morphism card component
- `Sidebar` - Navigation sidebar
- `TopNav` - Top navigation bar
- `ProtectedRoute` - Route guard for authenticated users

#### Page Components
- `SignupPage` - User registration with payment
- `LoginPage` - User authentication
- `ForgotPasswordPage` - Password reset flow
- `DashboardPage` - User dashboard with stats
- `ProfilePage` - User profile view
- `TaskZonePage` - Task browsing by category
- `ReferralsPage` - Referral stats and leaderboard
- `PaymentsPage` - Withdrawals and payment history
- `SettingsPage` - Account settings
- `AdminDashboard` - Admin management panel

#### Feature Components
- `PaymentVerifier` - Auto-checks M-Pesa payment status
- `QRCodeGenerator` - Generates referral QR codes
- `TaskCard` - Task display card
- `StatsCard` - Dashboard stat display
- `Leaderboard` - Top referrers list
- `ImageUploader` - Drag-drop image upload

## 3. Animation Implementation Plan

| Animation | Library | Implementation Approach | Complexity |
|-----------|---------|------------------------|------------|
| Cursor green glow | CSS + React | Transform-based div following mouse | Low |
| Hero entrance | GSAP | Timeline with staggered word reveals | Medium |
| Hero scroll exit | GSAP ScrollTrigger | scrub-based y/opacity animation | Medium |
| How It Works cards | GSAP ScrollTrigger | 3-phase pinned with stagger | High |
| Task Zone stack | GSAP ScrollTrigger | Card stack with depth animation | High |
| Dashboard parallax | GSAP ScrollTrigger | Flowing section with y transforms | Medium |
| Mafullu reveal | GSAP ScrollTrigger | 3-phase pinned with image stagger | High |
| Testimonials | GSAP ScrollTrigger | 3-phase pinned card stagger | High |
| Pricing split | GSAP ScrollTrigger | Left/right card entrance | Medium |
| FAQ accordion | Framer Motion | AnimatePresence for expand/collapse | Low |
| Button hover | CSS | Transform translateY + static glow | Low |
| Card hover | CSS | Transform scale | Low |

### Global Snap Configuration
```javascript
// Snap to pinned section centers only
const snapConfig = {
  snapTo: (progress, self) => {
    // Calculate pinned ranges and snap to settle centers
    // Implementation in global scroll handler
  },
  duration: { min: 0.18, max: 0.55 },
  delay: 0,
  ease: "power2.out"
};
```

## 4. Project File Structure

```
/mnt/okcomputer/output/app/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service worker
│   ├── icons/                 # PWA icons
│   └── images/                # Static images
├── src/
│   ├── components/
│   │   ├── ui/               # shadcn components
│   │   ├── layout/
│   │   │   ├── CursorGlow.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopNav.tsx
│   │   │   └── GlassCard.tsx
│   │   ├── auth/
│   │   │   ├── SignupForm.tsx
│   │   │   ├── LoginForm.tsx
│   │   │   └── PasswordResetForm.tsx
│   │   ├── dashboard/
│   │   │   ├── StatsCard.tsx
│   │   │   ├── ReferralLink.tsx
│   │   │   └── Leaderboard.tsx
│   │   ├── tasks/
│   │   │   ├── TaskCard.tsx
│   │   │   └── TaskList.tsx
│   │   ├── payments/
│   │   │   ├── PaymentVerifier.tsx
│   │   │   └── WithdrawalForm.tsx
│   │   └── common/
│   │       ├── ImageUploader.tsx
│   │       ├── QRCodeGenerator.tsx
│   │       └── ProtectedRoute.tsx
│   ├── pages/
│   │   ├── LandingPage.tsx   # Public landing with sections
│   │   ├── SignupPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── ForgotPasswordPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── TaskZonePage.tsx
│   │   ├── ReferralsPage.tsx
│   │   ├── PaymentsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── MafulluPage.tsx
│   │   └── admin/
│   │       ├── AdminDashboard.tsx
│   │       ├── TaskManager.tsx
│   │       ├── UserManager.tsx
│   │       ├── PaymentManager.tsx
│   │       └── MafulluManager.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── usePayment.ts
│   │   ├── useReferral.ts
│   │   ├── useTasks.ts
│   │   └── useScrollAnimation.ts
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── brevo.ts
│   │   ├── mpesa.ts
│   │   ├── utils.ts
│   │   └── constants.ts
│   ├── types/
│   │   └── index.ts
│   ├── styles/
│   │   └── globals.css
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── functions/
│       ├── verify-payment/
│       ├── process-withdrawal/
│       └── send-email/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## 5. Package Installation List

### Core Dependencies
```bash
# Animation
npm install gsap @gsap/react

# QR Code generation
npm install qrcode

# Supabase
npm install @supabase/supabase-js

# Form handling
npm install react-hook-form zod @hookform/resolvers

# Routing
npm install react-router-dom

# Date formatting
npm install date-fns

# Icons
npm install lucide-react

# Class utilities
npm install clsx tailwind-merge
```

### PWA Dependencies
```bash
npm install vite-plugin-pwa -D
npm install workbox-window -D
```

### Development Dependencies
```bash
# Already included with shadcn init
# - typescript
# - vite
# - tailwindcss
# - @types/react
# - @types/react-dom
# - eslint
```

## 6. API Integration Details

### M-Pesa Integration (Daraja API)
```typescript
// STK Push for payments
interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  shortcode: string;
  callbackUrl: string;
}

// Payment flow:
// 1. Initiate STK Push to user's phone
// 2. User enters PIN on phone
// 3. M-Pesa sends callback to our endpoint
// 4. Verify payment status
// 5. Update user payment_status to 'completed'
```

### Brevo Email Integration
```typescript
interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

// Email types:
// - Welcome email after signup
// - Payment confirmation
// - Withdrawal verification code
// - Password reset code
// - Referral joined notification
```

### Supabase Edge Functions
```typescript
// verify-payment: Checks M-Pesa payment status
// process-withdrawal: Handles withdrawal requests
// send-email: Sends emails via Brevo
```

## 7. Authentication Flow

### Signup Flow
1. User fills registration form
2. Upload avatar to Supabase Storage
3. Create auth user in Supabase Auth
4. Create profile in profiles table
5. Initiate M-Pesa STK Push (KSh 200)
6. Poll for payment verification (30s, 5s intervals)
7. If payment confirmed → activate account
8. If payment fails → delete user data

### Login Flow
1. User enters email/password
2. Supabase Auth validates
3. Fetch user profile
4. Redirect to dashboard

### Password Reset Flow
1. User clicks "Forgot Password"
2. Enter email → receive 8-digit code
3. Enter code → validate
4. Enter new password (must match confirm)
5. Update password in Supabase Auth
6. Track reset count (max 3 per account)

## 8. Payment Flows

### Registration Payment
- Amount: KSh 200
- 50% (KSh 100) goes to referrer if referred
- Auto-verification with polling

### Mafullu Purchase
- Amount: KSh 300
- Auto-assigns available content
- Content becomes downloadable

### Withdrawal
- Minimum: KSh 500
- 6-digit verification code sent to email
- Admin approval required
- Processing time: within 1 hour

## 9. Admin Credentials

```
Admin Email: admin@referralninja.co.ke
Admin Password: Admin@Ninja2026!

Test User Email: testuser@example.com
Test User Password: Test@User123!
```

## 10. Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# M-Pesa (Daraja)
MPESA_CONSUMER_KEY=your-consumer-key
MPESA_CONSUMER_SECRET=your-consumer-secret
MPESA_PASSKEY=your-passkey
MPESA_SHORTCODE=your-shortcode
MPESA_CALLBACK_URL=https://your-api.com/callback

# Brevo (Sendinblue)
BREVO_API_KEY=your-api-key
BREVO_FROM_EMAIL=noreply@referralninja.co.ke
BREVO_FROM_NAME=Referral Ninja

# App
VITE_APP_URL=https://referralninja.co.ke
```

## 11. PWA Configuration

```json
{
  "name": "Referral Ninja",
  "short_name": "RefNinja",
  "description": "Turn referrals into income",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#050B06",
  "theme_color": "#39FF14",
  "icons": [
    { "src": "/icons/icon-72x72.png", "sizes": "72x72" },
    { "src": "/icons/icon-96x96.png", "sizes": "96x96" },
    { "src": "/icons/icon-128x128.png", "sizes": "128x128" },
    { "src": "/icons/icon-144x144.png", "sizes": "144x144" },
    { "src": "/icons/icon-152x152.png", "sizes": "152x152" },
    { "src": "/icons/icon-192x192.png", "sizes": "192x192" },
    { "src": "/icons/icon-384x384.png", "sizes": "384x384" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512" }
  ]
}
```

## 12. Security Considerations

- All API keys stored in Supabase Edge Functions (not client-side)
- RLS policies enforce data isolation
- Password validation: min 8 chars, alphanumeric + symbols
- Rate limiting on auth endpoints
- Input sanitization on all forms
- HTTPS only (enforced by Supabase)
- CORS configured for production domain only