# ErrandRun - Campus Logistics Platform

A premium peer-to-peer campus logistics and errand-running platform for Nigerian university students.

## Project Status

✅ **Completed:**
- [x] Next.js 15 + React 19 + TypeScript project structure
- [x] Tailwind CSS + Shadcn UI configuration
- [x] Comprehensive PostgreSQL database schema with 14+ tables
- [x] Row Level Security (RLS) policies
- [x] Zustand global state management
- [x] Supabase client configuration
- [x] Premium glassmorphic UI design system
- [x] Dynamic pricing calculation engine with multiple factors
- [x] Session tracking with non-blocking logging
- [x] Paystack payment integration (initialization & verification)
- [x] Multi-step runner application wizard
- [x] Authentication pages (login, signup, callback)
- [x] Dashboard layout with sticky bottom navigation
- [x] Real-time hooks for Supabase Realtime subscriptions
- [x] User dashboard home page

⏳ **In Progress:**
- [ ] Dashboard pages (errands, wallet, profile)
- [ ] Admin runner application vetting system
- [ ] Errand tracking in real-time
- [ ] Insurance system (plans, claims, coverage)
- [ ] Ratings and dispute resolution
- [ ] Smart task matching algorithm
- [ ] Wallet management and transactions
- [ ] Advanced runner matching preferences

## Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript
- **Styling:** Tailwind CSS, Shadcn UI, Framer Motion
- **State Management:** Zustand
- **Backend/Database:** Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Payments:** Paystack
- **Animations:** Framer Motion
- **UI Components:** Radix UI, Lucide Icons

## Database Schema

### Core Tables
1. **profiles** - User profiles with verification status
2. **runner_apps** - Runner application with verification documents
3. **errands** - Errand listings with pricing breakdown
4. **errand_tracking** - Real-time location and status updates
5. **ratings** - User ratings and reviews
6. **disputes** - Dispute resolution system
7. **sessions** - Session logging for analytics
8. **payments** - Payment transactions via Paystack
9. **wallets** - User wallet balances
10. **wallet_transactions** - Transaction history
11. **insurance_plans** - Available insurance plans
12. **user_insurance** - User insurance subscriptions
13. **task_matching_preferences** - Runner preferences
14. **task_history** - Task completion history

## Environment Setup

### 1. Install Dependencies
```bash
npm ci
```

### 2. Environment Variables
Copy `.env.example` to `.env.local` and fill in:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_public_key
PAYSTACK_SECRET_KEY=your_secret_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup
```bash
# Start Supabase local stack
supabase start

# Apply schema
supabase db pull  # or manually run scripts/supabase_schema.sql

# Apply RLS policies
# Run scripts/rls_policies.sql

# Seed data
# Run scripts/seed_data.sql
```

### 4. Run Development Server
```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page
│   ├── globals.css             # Global styles
│   ├── providers.tsx           # Theme & toast providers
│   ├── (auth)/                 # Auth routes
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── auth/callback/page.tsx
│   ├── api/
│   │   ├── session-logger/     # Session logging
│   │   └── payments/           # Paystack integration
│   └── dashboard/
│       ├── layout.tsx          # Dashboard shell with nav
│       ├── user/page.tsx       # User home
│       ├── errands/            # [NEEDS IMPLEMENTATION]
│       ├── wallet/             # [NEEDS IMPLEMENTATION]
│       ├── profile/            # [NEEDS IMPLEMENTATION]
│       ├── runner/             # [NEEDS IMPLEMENTATION]
│       └── admin/              # [NEEDS IMPLEMENTATION]
├── components/
│   ├── dynamic-pricing-card.tsx # Pricing display
│   └── runner-wizard.tsx        # Multi-step runner application
├── hooks/
│   ├── useSessionTracker.ts    # Session tracking
│   └── useRealtimeErrands.ts   # Real-time subscriptions
├── lib/
│   ├── supabaseClient.ts       # Supabase initialization
│   └── store.ts                # Zustand store
├── types/
│   └── index.ts                # TypeScript definitions
└── utils/
    └── pricing.ts              # Pricing calculations
```

## Remaining Implementation Tasks

### 1. Dashboard Pages

#### `/dashboard/errands`
- List all errands (posted, active, completed)
- Filter by status, category, priority
- Create errand form with dynamic pricing
- Errand details and status tracking

#### `/dashboard/wallet`
- Display wallet balance
- Transaction history
- Deposit/withdraw functionality
- Payment methods management

#### `/dashboard/profile`
- User profile editing
- Student verification status
- Insurance plan selection
- Settings and preferences

#### `/dashboard/runner`
- Runner-specific home with available tasks
- Runner earnings and statistics
- Task acceptance/completion workflow
- Real-time location updates

#### `/dashboard/admin`
- Runner application vetting dashboard
- Application grid with status badges
- Side drawer with verification details
- File preview and approval/rejection

### 2. Errand Management Features

Create these components and pages:
- `ErrandCard` - Display errand details
- `ErrandCreationForm` - Multi-step form with pricing preview
- `ErrandTracking` - Real-time tracking map
- `ErrandDetail` - Full errand page with messaging
- Smart matching algorithm for runner assignment

### 3. Insurance System

Create:
- `InsurancePlans` component - Display available plans
- `InsuranceSelector` - UI for plan selection
- Insurance claims management
- Coverage verification

### 4. Ratings & Disputes

Create:
- `RatingForm` - Rate errand/runner
- `RatingDisplay` - Show ratings on profiles
- `DisputeForm` - File disputes
- `DisputeResolution` - Admin panel for dispute handling

### 5. Smart Task Matching

Implement:
- Runner preference matching algorithm
- Location-based matching
- Rating/completion-based matching
- Queue detection for pricing adjustments
- Weather surge detection

### 6. Payment Flow

Complete:
- Wallet crediting after Paystack payment
- Payment status webhooks
- Refund processing
- Runner payout system

## Key Features Implementation Guide

### Dynamic Pricing ✅
Located in `/src/utils/pricing.ts`
- Base fees by category
- Distance surcharges (per km)
- Queue complexity detection
- Weather surge multiplier
- Urgency multiplier
- 20% platform fee calculation
- Runner earnings calculation

### Session Tracking ✅
Located in `/src/hooks/useSessionTracker.ts`
- Non-blocking logging via `navigator.sendBeacon`
- Visibility change detection (backgrounding)
- Session duration calculation
- Device type detection

### Real-Time Updates ✅
Located in `/src/hooks/useRealtimeErrands.ts`
- Supabase Realtime subscriptions
- Live errand updates
- Tracking location updates
- Profile changes

### Authentication
Implemented:
- Magic Link (email OTP)
- Google OAuth
- Session management
- Protected routes

**Needs:**
- OAuth provider configuration in Supabase
- Email template customization
- Password reset flow

## UI/UX Design System

### Colors
- **Primary:** #0066FF (Electric Blue)
- **Accent:** #9D4EDD (Purple), #00FF41 (Neon Green)
- **Dark Base:** #0B0F19
- **Dark Secondary:** #121824

### Components
- Glass cards with `backdrop-filter: blur(12px)`
- Asymmetric layouts with left-aligned text
- Premium shadows and borders
- Mobile-first responsive design

### Animations
- Framer Motion for layout transitions
- Shimmer skeleton loaders
- Tap scale micro-interactions (scale: 0.98)
- Smooth page transitions

## Performance Optimizations

Implemented:
- Non-blocking session logging
- Image optimization (Supabase CDN)
- Database indexing on frequently queried columns
- RLS policies for data security
- Lightweight Zustand store

Recommended:
- Implement pagination for errand lists
- Cache frequently accessed data
- Optimize image sizes
- Use ISR for static content
- Database connection pooling

## Security

Implemented:
- Supabase Auth (with OAuth)
- Row Level Security (RLS) policies on all tables
- Service role key only for server-side operations
- Secure storage of sensitive tokens in .env.local

Checklist:
- [ ] Enable CORS properly for Paystack
- [ ] Implement rate limiting on API routes
- [ ] Add CSRF protection
- [ ] Validate all user inputs
- [ ] Implement proper error handling
- [ ] Add logging for security events
- [ ] Regular security audits

## Testing Checklist

- [ ] Authentication (login, signup, logout)
- [ ] Session tracking (login/logout logging)
- [ ] Errand creation with dynamic pricing
- [ ] Runner application submission
- [ ] Real-time errand updates
- [ ] Paystack payment flow
- [ ] Insurance plan selection
- [ ] Wallet functionality
- [ ] Rating and disputes
- [ ] Mobile responsiveness
- [ ] Dark mode consistency
- [ ] Accessibility (WCAG 2.1)

## Deployment

### Vercel
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add PAYSTACK_SECRET_KEY
vercel env add NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
vercel deploy
```

### Database
- Migrate Supabase to production
- Update API URLs in environment variables
- Configure custom domain

## Key Code Patterns

### Creating a Supabase Query
```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', value);
```

### Using Zustand Store
```typescript
const { user, setUser } = useAppStore();
```

### Real-Time Subscription
```typescript
const { errands, loading } = useRealtimeErrands(userId);
```

### Price Calculation
```typescript
import { calculatePricing } from '@/utils/pricing';
const pricing = calculatePricing('academic', 'high', 2, true, false);
```

## Contributing

1. Follow the established code structure
2. Use TypeScript for type safety
3. Implement components as client components with 'use client'
4. Use Tailwind CSS for styling
5. Test responsive design on mobile
6. Follow the premium design system

## Support

For issues or questions:
1. Check this README
2. Review existing code patterns
3. Check Supabase documentation
4. Check Next.js 15 documentation

---

**Built with ❤️ for Nigerian university students**
