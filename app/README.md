# Referral Ninja

A full-stack referral platform with glass-morphism design, M-Pesa payments, and PWA capabilities.

![Referral Ninja](https://xc7ekcqgf2aka.ok.kimi.link)

## Features

### User Features
- **User Registration** with M-Pesa payment integration (KSh 200)
- **Login/Logout** with secure authentication
- **Dashboard** with stats (tasks applied, referrals, earnings)
- **Task Zone** - Browse remote jobs, local internships, and local jobs
- **Referrals** - Share referral link, track earnings, view QR code
- **Payments** - Withdraw earnings (min KSh 500) with email verification
- **Mafullu** - Purchase premium content packs (KSh 300)
- **Settings** - View profile, reset password (max 3 times)

### Admin Features
- **Admin Dashboard** - Overview of platform stats
- **Task Manager** - Create, edit, delete tasks
- **User Manager** - View all users, search, filter
- **Payment Manager** - Approve/reject withdrawals
- **Mafullu Manager** - Add premium content, track purchases

### Technical Features
- **Glass-morphism UI** with dark theme
- **Green ambience cursor effect**
- **PWA support** - Install as mobile/desktop app
- **Responsive design** - Works on all devices
- **Real-time updates** via Supabase

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Payments**: M-Pesa Daraja API
- **Email**: Brevo (Sendinblue) API
- **PWA**: Vite PWA Plugin

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd referral-ninja
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Set Up Supabase Backend

Follow the detailed setup guide in [SETUP.md](./SETUP.md):

1. Create Supabase project
2. Run database migrations
3. Set up storage buckets
4. Deploy edge functions
5. Configure environment variables

### 4. Run Development Server

```bash
npm run dev
```

### 5. Build for Production

```bash
npm run build
```

The built files will be in the `dist/` folder.

## Default Credentials

### Admin Account
- **Email**: `admin@referralninja.co.ke`
- **Password**: `Admin@Ninja2026!`

### Test User
- **Email**: `testuser@example.com`
- **Password**: `Test@User123!`

## Project Structure

```
referral-ninja/
├── src/
│   ├── components/       # Reusable UI components
│   ├── pages/           # Page components
│   │   ├── admin/       # Admin panel pages
│   │   └── ...          # User pages
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility functions
│   ├── types/           # TypeScript types
│   └── App.tsx          # Main app component
├── supabase/
│   ├── migrations/      # Database migrations
│   ├── functions/       # Edge Functions
│   └── config.toml     # Supabase config
├── public/              # Static assets
├── dist/               # Built frontend
├── .env.example        # Environment template
├── SETUP.md           # Detailed setup guide
└── README.md          # This file
```

## Edge Functions

### M-Pesa Integration
- `mpesa-stk-push` - Initiates STK push to user's phone
- `mpesa-callback` - Handles M-Pesa payment callbacks

### Email Service
- `send-email` - Sends emails via Brevo API

## Database Schema

### Tables
- `profiles` - User profiles and settings
- `tasks` - Available jobs/tasks
- `task_clicks` - Track user task interactions
- `referrals` - Referral relationships
- `payments` - Payment records
- `withdrawals` - Withdrawal requests
- `mafullu_content` - Premium content
- `mafullu_purchases` - Content purchases
- `password_resets` - Password reset tracking

## API Reference

### Authentication
All API calls use Supabase client. See `src/lib/supabase.ts` for helper functions.

### Edge Functions
- `POST /functions/v1/mpesa-stk-push` - Initiate payment
- `POST /functions/v1/mpesa-callback` - Payment callback
- `POST /functions/v1/send-email` - Send email

## Customization

### Colors
Edit `tailwind.config.js` to change the color scheme:

```javascript
colors: {
  ninja: {
    black: '#050B06',
    dark: '#0A1A0D',
    green: '#39FF14',
    mint: '#E8FFE8',
    sage: '#9AB89A',
  }
}
```

### Pricing
Edit `src/lib/constants.ts` to change pricing:

```typescript
export const REGISTRATION_FEE = 200;    // KSh
export const REFERRAL_COMMISSION = 100; // KSh
export const MAFULLU_PRICE = 300;       // KSh
export const MINIMUM_WITHDRAWAL = 500;  // KSh
```

## Deployment

### Static Hosting
Upload the `dist/` folder to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- Firebase Hosting

### Supabase Hosting
1. Build the project: `npm run build`
2. Upload `dist/` to Supabase Storage
3. Enable static hosting in Supabase

## Troubleshooting

### Common Issues

**Issue**: "Invalid Supabase credentials"
- Check your `.env` file has correct values
- Verify Supabase project is active

**Issue**: "M-Pesa payment not working"
- Ensure M-Pesa sandbox credentials are correct
- Check callback URL is accessible

**Issue**: "Emails not sending"
- Verify Brevo API key is valid
- Check sender email is verified in Brevo

See [SETUP.md](./SETUP.md) for detailed troubleshooting.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For support, email support@referralninja.co.ke or open an issue on GitHub.

---

Built with ❤️ using React, Supabase, and M-Pesa.
