# ErrandRun - Complete Setup Guide

This guide walks you through setting up ErrandRun from scratch to a fully functional local development environment.

## Prerequisites

- Node.js 18+ ([Download](https://nodejs.org))
- Docker Desktop ([Download](https://www.docker.com/products/docker-desktop))
- Git
- A Supabase account ([Create Free](https://supabase.com))
- A Paystack account ([Create Free](https://dashboard.paystack.com))
- Google OAuth credentials ([Setup](https://console.cloud.google.com))

## Step 1: Clone & Install Dependencies

```bash
# Navigate to project directory
cd ERRANDRUN1.0

# Install dependencies
npm ci
```

## Step 2: Setup Supabase Project

### Option A: Local Development (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase stack
supabase start

# This will display your local credentials:
# - API URL: http://localhost:54321
# - Anon Key: [shown in output]
# - Service Role Key: [shown in output]
```

### Option B: Cloud Supabase

1. Go to https://supabase.com
2. Create new project
3. Go to Settings → API Keys
4. Copy the following:
   - Project URL
   - Anon Public Key
   - Service Role Secret Key

## Step 3: Setup Database Schema

```bash
# Method 1: Using Supabase CLI (if using local)
supabase db pull

# Method 2: Manual - Run these in Supabase SQL Editor
# 1. Open Supabase Dashboard → SQL Editor
# 2. Create new query
# 3. Paste contents of scripts/supabase_schema.sql
# 4. Execute
# 5. Repeat for scripts/rls_policies.sql
# 6. Repeat for scripts/seed_data.sql
```

## Step 4: Create Storage Bucket

```bash
# Option A: Using Supabase CLI
supabase storage create verification_docs

# Option B: Manual
# 1. Go to Supabase Dashboard → Storage
# 2. Click "New Bucket"
# 3. Name: "verification_docs"
# 4. Make it private for security
# 5. Click "Create bucket"
```

## Step 5: Configure Environment Variables

```bash
# Copy example to local config
cp .env.example .env.local

# Edit .env.local with your values
```

Fill in `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Paystack (https://dashboard.paystack.com/settings/developer)
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_test_key
PAYSTACK_SECRET_KEY=sk_test_your_test_key

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Feature Flags
NEXT_PUBLIC_ENABLE_INSURANCE=true
NEXT_PUBLIC_ENABLE_DISPUTE_RESOLUTION=true
NEXT_PUBLIC_ENABLE_TASK_MATCHING=true

# Platform Configuration
NEXT_PUBLIC_PLATFORM_FEE_PERCENTAGE=20
```

## Step 6: Setup Google OAuth (Optional but Recommended)

```
1. Go to https://console.cloud.google.com
2. Create new project
3. Enable "Google+ API"
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs:
     - http://localhost:3000/auth/callback
     - http://localhost:54321/auth/v1/callback
5. Copy Client ID and Client Secret to .env.local
6. Go to Supabase Dashboard → Authentication → Providers
7. Enable Google
8. Paste Client ID and Client Secret
```

## Step 7: Configure Supabase Auth (Email)

```
1. Go to Supabase Dashboard → Authentication → Providers
2. Email:
   - Confirm email: OFF (for testing)
   - Enable confirmations and transactional emails
3. URL Configuration:
   - Site URL: http://localhost:3000
   - Redirect URLs:
     - http://localhost:3000/auth/callback
     - http://localhost:3000/dashboard
```

## Step 8: Start Development Server

```bash
# Start Next.js dev server
npm run dev

# Open browser
# http://localhost:3000
```

## Step 9: Test the Application

### Test User Signup
1. Go to http://localhost:3000
2. Click "Join Now"
3. Fill form and submit
4. Check your email for confirmation link (or check Supabase logs)
5. Click confirmation link

### Test Runner Application
1. After signup, go to dashboard
2. Look for "Become a Runner" option
3. Complete the 3-step wizard
4. Upload a verification document

### Test Pricing
1. On dashboard, view the dynamic pricing card
2. Adjust distance slider
3. Change priority level
4. See prices update in real-time

### Test Payment (Paystack)
1. Use Paystack test card: 4111111111111111
2. Expiry: Any future date
3. CVV: Any 3 digits
4. Monitor payment flow

## Useful Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run linting

# Database
npm run db:migrate   # Pull schema changes
npm run db:push      # Push local changes
npm run db:reset     # Reset local database

# Type checking
npm run type-check   # Check TypeScript

# Formatting
npm run format       # Format code with Prettier
```

## File Structure Walkthrough

```
src/
├── app/
│   ├── page.tsx                 # Landing page
│   ├── layout.tsx               # Root layout
│   ├── globals.css              # Global styles
│   └── dashboard/
│       ├── layout.tsx           # Dashboard layout with navigation
│       ├── user/page.tsx        # User home (IMPLEMENTED ✅)
│       ├── wallet/page.tsx      # Wallet page (IMPLEMENTED ✅)
│       ├── profile/page.tsx     # Profile page (IMPLEMENTED ✅)
│       ├── errands/             # [TODO: List & create errands]
│       ├── runner/              # [TODO: Runner workspace]
│       └── admin/               # [TODO: Admin panel]
├── components/
│   ├── dynamic-pricing-card.tsx # Pricing display (IMPLEMENTED ✅)
│   └── runner-wizard.tsx        # Runner application (IMPLEMENTED ✅)
├── lib/
│   ├── supabaseClient.ts        # Supabase client
│   └── store.ts                 # Zustand store
└── utils/
    └── pricing.ts               # Pricing calculations
```

## Troubleshooting

### "Supabase connection refused"
- Make sure Docker is running
- Run `supabase status` to check
- Run `supabase start` again

### "NEXT_PUBLIC_SUPABASE_URL not set"
- Check .env.local file exists
- Verify environment variables are set correctly
- Restart dev server after changing .env.local

### "Google OAuth not working"
- Verify redirect URIs match exactly in Google Console and Supabase
- Check credentials are in .env.local
- Make sure Supabase auth is configured with Google provider

### "Database schema not created"
- Run the SQL files manually in Supabase SQL Editor
- Check for error messages
- Ensure you're using correct database connection

### "Payment not processing"
- Use Paystack test credentials
- Check PAYSTACK_SECRET_KEY is correct
- Verify API rate limits aren't hit

## Database Schema Summary

- **profiles** - User identity and verification
- **runner_apps** - Runner onboarding applications
- **errands** - Errand postings with pricing
- **errand_tracking** - Real-time status updates
- **ratings** - User reviews and ratings
- **disputes** - Dispute resolution
- **payments** - Payment transactions
- **wallets** - User wallet balances
- **insurance_plans** - Available insurance options
- **user_insurance** - User insurance subscriptions
- **sessions** - Activity logging
- **task_matching_preferences** - Runner preferences
- **task_history** - Completion history

## Performance Tips

1. **Database**
   - Indexes are created on frequently queried columns
   - RLS policies reduce data exposure
   - Use pagination on list views

2. **Frontend**
   - Images are optimized via Supabase CDN
   - Zustand store prevents unnecessary re-renders
   - Framer Motion uses GPU acceleration

3. **Backend**
   - Session logging is non-blocking
   - Database queries are optimized
   - Use service role key only server-side

## Security Checklist

- [ ] .env.local is in .gitignore
- [ ] Service role key not exposed in frontend code
- [ ] RLS policies enabled on all tables
- [ ] Sensitive operations use service role key
- [ ] Rate limiting configured on API routes
- [ ] CORS properly configured for Paystack

## Next Steps

After setup:

1. **Create some test data**
   - Create test user accounts
   - Post test errands
   - Create test runner applications

2. **Test all flows**
   - Authentication
   - Errand creation
   - Runner application
   - Payment processing
   - Real-time updates

3. **Implement remaining features**
   - See README.md for feature checklist
   - Use existing components as patterns
   - Follow code style conventions

4. **Deploy to production**
   - Follow deployment instructions in README.md
   - Setup production Supabase project
   - Configure production Paystack account
   - Setup production Google OAuth

## Support Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Framer Motion Documentation](https://www.framer.com/motion/)
- [Paystack Documentation](https://paystack.com/developers)

## Common Next Steps

1. **Implement errand listing page**
   - Create `/src/app/dashboard/errands/page.tsx`
   - Add filter by status, category, priority
   - Implement infinite scroll

2. **Build errand creation flow**
   - Create `/src/components/errand-form.tsx`
   - Integrate dynamic pricing
   - Handle form submission

3. **Add runner dashboard**
   - Create `/src/app/dashboard/runner/page.tsx`
   - Show available tasks
   - Implement task acceptance

4. **Build admin panel**
   - Create `/src/app/dashboard/admin/page.tsx`
   - List runner applications
   - Create approval/rejection workflow

---

**Ready to start? Run `npm run dev` and visit http://localhost:3000!**
