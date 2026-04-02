# Referral Ninja - Quick Start Guide

## Live Application
**URL**: https://xc7ekcqgf2aka.ok.kimi.link

## Default Credentials

### Admin Account
- **Email**: `admin@referralninja.co.ke`
- **Password**: `Admin@Ninja2026!`

### Test User
- **Email**: `testuser@example.com`
- **Password**: `Test@User123!`

## To Make It Fully Functional

### Step 1: Create Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Sign up for free
3. Create a new project

### Step 2: Run Database Setup
1. In Supabase, go to **SQL Editor**
2. Copy contents of `supabase/migrations/001_initial_schema.sql`
3. Paste and run

### Step 3: Create Storage Buckets
1. Go to **Storage**
2. Create 3 buckets:
   - `avatars` (Public)
   - `task-images` (Public)
   - `mafullu-images` (Public)

### Step 4: Deploy Edge Functions
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy functions
supabase functions deploy mpesa-stk-push
supabase functions deploy mpesa-callback
supabase functions deploy send-email
```

### Step 5: Set Environment Variables
In Supabase Dashboard → Project Settings → API → Edge Functions:

```
# Supabase (auto-filled)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# M-Pesa (from developer.safaricom.co.ke)
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_PASSKEY=
MPESA_SHORTCODE=174379
MPESA_CALLBACK_URL=https://your-project.supabase.co/functions/v1/mpesa-callback

# Brevo (from brevo.com)
BREVO_API_KEY=
BREVO_FROM_EMAIL=noreply@referralninja.co.ke
BREVO_FROM_NAME=Referral Ninja
```

### Step 6: Update Frontend
Create `.env` file:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Step 7: Create Admin User
1. In Supabase → Authentication → Users
2. Add user: `admin@referralninja.co.ke`
3. Run SQL:
```sql
UPDATE public.profiles SET is_admin = TRUE WHERE email = 'admin@referralninja.co.ke';
```

### Step 8: Rebuild & Deploy
```bash
npm run build
# Deploy dist/ folder to your hosting
```

## File Structure

```
referral-ninja/
├── src/                    # Frontend code
│   ├── components/         # UI components
│   ├── pages/             # Page components
│   ├── hooks/             # React hooks
│   ├── lib/               # Utilities
│   └── types/             # TypeScript types
├── supabase/              # Backend code
│   ├── migrations/        # Database schema
│   ├── functions/         # Edge functions
│   └── config.toml       # Supabase config
├── dist/                  # Built app (deploy this)
├── SETUP.md              # Detailed setup guide
├── BACKEND_SUMMARY.md    # Backend documentation
└── README.md             # Main documentation
```

## Features Checklist

### User Features
- [x] Sign up with M-Pesa payment (KSh 200)
- [x] Login/Logout
- [x] Dashboard with stats
- [x] Task Zone (Remote, Local Intern, Local Jobs)
- [x] Referrals with QR code
- [x] Payments & Withdrawals (min KSh 500)
- [x] Mafullu premium content (KSh 300)
- [x] Settings & Password reset

### Admin Features
- [x] Admin Dashboard
- [x] Task Manager
- [x] User Manager
- [x] Payment Manager
- [x] Mafullu Manager

### Technical Features
- [x] Glass-morphism UI
- [x] Green cursor glow effect
- [x] PWA support
- [x] Responsive design
- [x] Dark theme

## Need Help?

1. Read [SETUP.md](./SETUP.md) for detailed instructions
2. Read [BACKEND_SUMMARY.md](./BACKEND_SUMMARY.md) for backend details
3. Check Supabase docs: [supabase.com/docs](https://supabase.com/docs)

## M-Pesa Test Credentials (Sandbox)

- **Phone**: 254708374149
- **PIN**: 1234
- **OTP**: Any 6 digits

---

**Your Referral Ninja app is ready!** 🚀
