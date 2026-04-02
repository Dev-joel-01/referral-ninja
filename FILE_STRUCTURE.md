# Referral Ninja - Complete File Structure

## Project Root (`/app/`)

### Configuration Files
```
package.json          # NPM dependencies and scripts
vite.config.ts        # Vite + PWA configuration
tsconfig.json         # TypeScript configuration
tailwind.config.js    # Tailwind CSS configuration
postcss.config.js     # PostCSS configuration
components.json       # shadcn/ui configuration
index.html            # HTML entry point
.eslintrc.js          # ESLint configuration
.env.example          # Environment variables template
```

### Documentation
```
README.md             # Main project documentation
SETUP.md              # Detailed setup guide
QUICK_START.md        # Quick reference
BACKEND_SUMMARY.md    # Backend architecture docs
```

## Frontend (`/app/src/`)

### Entry Points
```
main.tsx              # React entry point
App.tsx               # Main app component with routing
App.css               # App-specific styles
index.css             # Global styles + Tailwind
```

### Types (`/app/src/types/`)
```
index.ts              # TypeScript interfaces and types
```

### Hooks (`/app/src/hooks/`)
```
useAuth.tsx           # Authentication context and hook
use-mobile.ts         # Mobile detection hook
```

### Libraries (`/app/src/lib/`)
```
supabase.ts           # Supabase client and helpers
utils.ts              # Utility functions (cn helper)
constants.ts          # App constants and config
```

### Layout Components (`/app/src/components/layout/`)
```
CursorGlow.tsx        # Green cursor glow effect
GlassCard.tsx         # Glass-morphism card component
Sidebar.tsx           # Navigation sidebar
```

### Common Components (`/app/src/components/common/`)
```
ProtectedRoute.tsx    # Route guard for auth
DemoModeBanner.tsx    # Demo mode notification banner
```

### UI Components (`/app/src/components/ui/`)
```
button.tsx            # Button component
input.tsx             # Input component
dialog.tsx            # Dialog/Modal component
card.tsx              # Card component
tabs.tsx              # Tabs component
table.tsx             # Table component
badge.tsx             # Badge component
avatar.tsx            # Avatar component
sonner.tsx            # Toast notifications
... (50+ shadcn components)
```

### Pages (`/app/src/pages/`)

#### Auth Pages
```
SignupPage.tsx        # User registration with payment
LoginPage.tsx         # User login
ForgotPasswordPage.tsx # Password reset flow
```

#### User Pages
```
DashboardPage.tsx     # User dashboard with stats
ProfilePage.tsx       # User profile view
TaskZonePage.tsx      # Browse tasks by category
ReferralsPage.tsx     # Referral stats and QR code
PaymentsPage.tsx      # Withdrawals and history
SettingsPage.tsx      # Account settings
MafulluPage.tsx       # Premium content purchase
```

#### Admin Pages (`/app/src/pages/admin/`)
```
AdminDashboard.tsx    # Admin overview dashboard
TaskManager.tsx       # Create/edit/delete tasks
UserManager.tsx       # View and manage users
PaymentManager.tsx    # Approve/reject withdrawals
MafulluManager.tsx    # Manage premium content
```

## Backend (`/app/supabase/`)

### Database Schema (`/app/supabase/migrations/`)
```
001_initial_schema.sql # Complete database setup
```

### Edge Functions (`/app/supabase/functions/`)

#### M-Pesa Integration
```
mpesa-stk-push/
  index.ts            # Initiate M-Pesa STK push

mpesa-callback/
  index.ts            # Handle payment callbacks
```

#### Email Service
```
send-email/
  index.ts            # Send emails via Brevo
```

### Configuration
```
config.toml           # Supabase project configuration
```

## All Files List

### Root Level
- `.env.example`
- `BACKEND_SUMMARY.md`
- `components.json`
- `eslint.config.js`
- `index.html`
- `info.md`
- `package.json`
- `postcss.config.js`
- `QUICK_START.md`
- `README.md`
- `SETUP.md`
- `tailwind.config.js`
- `tsconfig.app.json`
- `tsconfig.json`
- `tsconfig.node.json`
- `vite.config.ts`

### Source Code (src/)
- `App.css`
- `App.tsx`
- `index.css`
- `main.tsx`

#### Components (src/components/)
**Layout:**
- `layout/CursorGlow.tsx`
- `layout/GlassCard.tsx`
- `layout/Sidebar.tsx`

**Common:**
- `common/DemoModeBanner.tsx`
- `common/ProtectedRoute.tsx`

**UI (50+ components):**
- `ui/accordion.tsx`
- `ui/alert-dialog.tsx`
- `ui/alert.tsx`
- `ui/aspect-ratio.tsx`
- `ui/avatar.tsx`
- `ui/badge.tsx`
- `ui/breadcrumb.tsx`
- `ui/button-group.tsx`
- `ui/button.tsx`
- `ui/calendar.tsx`
- `ui/card.tsx`
- `ui/carousel.tsx`
- `ui/chart.tsx`
- `ui/checkbox.tsx`
- `ui/collapsible.tsx`
- `ui/command.tsx`
- `ui/context-menu.tsx`
- `ui/dialog.tsx`
- `ui/drawer.tsx`
- `ui/dropdown-menu.tsx`
- `ui/empty.tsx`
- `ui/field.tsx`
- `ui/form.tsx`
- `ui/hover-card.tsx`
- `ui/input-group.tsx`
- `ui/input-otp.tsx`
- `ui/input.tsx`
- `ui/item.tsx`
- `ui/kbd.tsx`
- `ui/label.tsx`
- `ui/menubar.tsx`
- `ui/navigation-menu.tsx`
- `ui/pagination.tsx`
- `ui/popover.tsx`
- `ui/progress.tsx`
- `ui/radio-group.tsx`
- `ui/resizable.tsx`
- `ui/scroll-area.tsx`
- `ui/select.tsx`
- `ui/separator.tsx`
- `ui/sheet.tsx`
- `ui/sidebar.tsx`
- `ui/skeleton.tsx`
- `ui/slider.tsx`
- `ui/sonner.tsx`
- `ui/spinner.tsx`
- `ui/switch.tsx`
- `ui/table.tsx`
- `ui/tabs.tsx`
- `ui/textarea.tsx`
- `ui/toggle-group.tsx`
- `ui/toggle.tsx`
- `ui/tooltip.tsx`

#### Hooks (src/hooks/)
- `hooks/use-mobile.ts`
- `hooks/useAuth.tsx`

#### Libraries (src/lib/)
- `lib/constants.ts`
- `lib/supabase.ts`
- `lib/utils.ts`

#### Pages (src/pages/)
**Auth:**
- `pages/ForgotPasswordPage.tsx`
- `pages/LoginPage.tsx`
- `pages/SignupPage.tsx`

**User:**
- `pages/DashboardPage.tsx`
- `pages/MafulluPage.tsx`
- `pages/PaymentsPage.tsx`
- `pages/ProfilePage.tsx`
- `pages/ReferralsPage.tsx`
- `pages/SettingsPage.tsx`
- `pages/TaskZonePage.tsx`

**Admin:**
- `pages/admin/AdminDashboard.tsx`
- `pages/admin/MafulluManager.tsx`
- `pages/admin/PaymentManager.tsx`
- `pages/admin/TaskManager.tsx`
- `pages/admin/UserManager.tsx`

#### Types (src/types/)
- `types/index.ts`

### Supabase Backend (supabase/)
- `config.toml`

**Functions:**
- `functions/mpesa-callback/index.ts`
- `functions/mpesa-stk-push/index.ts`
- `functions/send-email/index.ts`

**Migrations:**
- `migrations/001_initial_schema.sql`

## Total File Count
- **Root files**: 17
- **Source files**: 90+
- **Total**: 100+ files

## Key Files to Modify for Setup

1. **`.env`** (create from `.env.example`)
   - Add your Supabase URL and anon key

2. **`supabase/config.toml`**
   - Update project_id to match your Supabase project

3. **`supabase/migrations/001_initial_schema.sql`**
   - Run this in Supabase SQL Editor

4. **Environment Variables in Supabase Dashboard**
   - MPESA_CONSUMER_KEY
   - MPESA_CONSUMER_SECRET
   - MPESA_PASSKEY
   - BREVO_API_KEY
