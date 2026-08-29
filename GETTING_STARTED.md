# 🚀 ErrandRun - Getting Started

Welcome to ErrandRun! This guide will get you from zero to running the app in 30 minutes.

## ⚡ TL;DR (Quick Start)

```bash
# 1. Install dependencies
npm ci

# 2. Copy and configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase and Paystack keys

# 3. Start dev server
npm run dev

# 4. Open browser
# http://localhost:3000
```

---

## 📚 Documentation Quick Links

| Document | Purpose | Read Time |
|----------|---------|-----------|
| **[README.md](./README.md)** | Project overview & features | 5 min |
| **[SETUP.md](./SETUP.md)** | Detailed setup instructions | 15 min |
| **[IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md)** | Feature roadmap & tasks | 20 min |
| **[FILE_STRUCTURE.md](./FILE_STRUCTURE.md)** | File organization guide | 10 min |
| **[project.json](./project.json)** | Project metadata | Reference |

---

## 🎯 What's Included

### ✅ Already Built (Phase 1 - 40% Complete)

**Infrastructure**
- Next.js 15 project structure with App Router
- TypeScript strict mode
- Tailwind CSS with premium design system
- Supabase PostgreSQL database with 14 tables
- Row Level Security (RLS) on all tables

**Features**
- 🔐 Authentication (Magic Links + Google OAuth)
- 💰 Dynamic pricing engine (20% platform fee)
- 🗂️ Database schema for complete platform
- 🎨 Premium glassmorphic UI components
- 📱 Mobile-first responsive design
- 🔄 Real-time Supabase subscriptions
- 💳 Paystack payment integration
- 📊 Session tracking with non-blocking logging
- 🏃 Multi-step runner application wizard

**Pages Completed**
- Landing page
- Login page
- Signup page
- User home dashboard
- User profile page
- User wallet page
- Dashboard layout with navigation

### ⏳ In Progress (Phase 2 - 40%)

- Errand creation form
- Errand listing with filters
- Real-time tracking visualization
- Runner dashboard
- Admin vetting panel
- Payment verification & wallet crediting

### 📋 TODO (Phase 3 - 20%)

- Smart task matching algorithm
- Insurance system UI
- Ratings and disputes system
- Advanced analytics
- Messaging system

---

## 🛠️ Prerequisites

Before you start, make sure you have:

- **Node.js 18+** - [Download](https://nodejs.org)
- **npm or yarn** - Comes with Node.js
- **Git** - For version control
- **A text editor** - VS Code recommended
- **Supabase account** - [Free tier](https://supabase.com)
- **Paystack account** - [Test account](https://paystack.com)

---

## 🚀 5-Minute Setup

### Step 1: Clone and Install (2 min)
```bash
cd ERRANDRUN1.0
npm ci
```

### Step 2: Configure Environment (1 min)
```bash
cp .env.example .env.local
# Edit .env.local - see SETUP.md for detailed instructions
```

### Step 3: Start Development Server (1 min)
```bash
npm run dev
# Opens at http://localhost:3000
```

### Step 4: Test the App (1 min)
- Visit http://localhost:3000
- Click "Join Now" to signup
- Check your email for magic link
- Create an account and explore

---

## 📖 Key Features Explained

### 1. **Dynamic Pricing** 💰
Automatically calculates fees based on:
- Category (Academic, Food, Campus, Personal, Custom)
- Distance (₦100 per km)
- Priority level (Normal 1x → Urgent 1.6x)
- Queue complexity (₦500 if in queue location)
- Automatically deducts 20% platform fee

**Try it:** Go to dashboard, see pricing card adjusts in real-time

### 2. **Authentication** 🔐
Two ways to login:
- **Magic Link** - Email OTP (password-less)
- **Google OAuth** - Sign in with Google account

**Try it:** Signup → Check email for link → Verify

### 3. **Session Tracking** 📊
Non-blocking logging that doesn't slow down the app:
- Tracks login/logout
- Calculates session duration
- Records device type
- Uses `navigator.sendBeacon` for background apps

### 4. **Real-Time Updates** ⚡
Supabase Realtime subscriptions for live data:
- Errand status changes
- Tracking location updates
- Profile changes
- Automatic UI updates

### 5. **Runner Application** 🏃
Multi-step wizard for runners:
- Step 1: Academic verification
- Step 2: Transport method & availability
- Step 3: Document upload
- Submits to admin for verification

**Try it:** Dashboard → Become a Runner → Complete wizard

---

## 🏗️ Architecture Overview

```
ErrandRun (Frontend + Backend)
├── Frontend (Next.js)
│   ├── Pages (Authentication, Dashboard)
│   ├── Components (Pricing, Wizard)
│   ├── Hooks (Session Tracking, Real-Time)
│   └── Utils (Pricing, Formatting)
│
├── Backend (Supabase)
│   ├── PostgreSQL Database
│   ├── Auth (Magic Links, OAuth)
│   ├── Storage (Verification documents)
│   ├── Realtime (Live updates)
│   └── Edge Functions (Ready)
│
├── External Services
│   ├── Paystack (Payments)
│   └── Google (OAuth)
│
└── Deployment
    ├── Frontend: Vercel
    ├── Backend: Supabase Cloud
    └── Payments: Paystack
```

---

## 📊 Database Structure

14 interconnected tables:

```
Core Data
├── profiles (users with role & verification)
├── runner_apps (runner applications)
└── errands (errand listings)

Tracking & Status
├── errand_tracking (real-time updates)
├── task_history (completion records)
└── sessions (activity logging)

Financial
├── payments (transactions)
├── wallets (user balances)
└── wallet_transactions (history)

Insurance
├── insurance_plans (available plans)
└── user_insurance (subscriptions)

Community
├── ratings (reviews)
└── disputes (resolution)

Optimization
├── task_matching_preferences (runner matching)
```

All tables have Row Level Security (RLS) for data protection.

---

## 🔧 Common Commands

```bash
# Start development
npm run dev

# Build for production
npm run build
npm start

# Type checking
npm run type-check

# Linting & formatting
npm run lint
npm run format

# Database (if using Supabase local)
supabase start
supabase status
supabase stop

# Install dependencies
npm ci    # Use this for exact versions
```

---

## 🎨 Design Highlights

### Premium Aesthetic
- **Glass cards** with blur effect
- **Dark theme** optimized for eyes
- **Gradient accents** (Blue, Purple, Neon)
- **Asymmetric layouts** for premium feel

### Mobile-First
- **Sticky bottom navigation** (like native apps)
- **Touch-optimized buttons**
- **Full viewport awareness**
- **No persistent hover states**

### Animations
- Smooth page transitions
- Shimmer loading skeletons
- Tap scale feedback (scale: 0.98)
- Framer Motion-powered

---

## 🆘 Troubleshooting

### "Port 3000 already in use"
```bash
# Use different port
npm run dev -- -p 3001
```

### "NEXT_PUBLIC_SUPABASE_URL not set"
```bash
# Edit .env.local and ensure variables are set
# Restart dev server after changes
npm run dev
```

### "Can't connect to Supabase"
```bash
# Start local Supabase
supabase start

# Or configure cloud Supabase in .env.local
```

### "Payment not working"
- Check Paystack keys are in .env.local
- Use test card: 4111111111111111
- Verify API keys are for test environment

---

## 📱 Testing the App

### Test Account
1. Signup with any email
2. Complete magic link verification
3. Fill in profile (Student ID, etc.)
4. Explore dashboard

### Test Runner Application
1. Go to dashboard
2. Click "Become a Runner"
3. Complete 3-step wizard
4. Upload test document
5. Submit application

### Test Pricing
1. View pricing card on home
2. Adjust distance slider
3. Change priority level
4. Watch price update in real-time

### Test Payment (Paystack)
1. Go to wallet page
2. Click "Add Funds"
3. Use test card: 4111111111111111
4. Expiry: Any future date (12/25)
5. CVV: Any 3 digits (123)
6. Monitor payment flow

---

## 📈 What to Build Next

Based on the **IMPLEMENTATION_ROADMAP.md**, priority order:

### Week 1-2: Errand Features
1. Errand creation form
2. Errand listing with filters
3. Errand detail view
4. Real-time status tracking

### Week 3: Runner Features
1. Available tasks display
2. Task acceptance workflow
3. Earnings tracking
4. Task completion

### Week 4: Admin & Advanced
1. Runner vetting dashboard
2. Smart matching algorithm
3. Insurance system
4. Ratings & disputes

---

## 💡 Pro Tips

1. **Use TypeScript** - Strict mode catches errors early
2. **Check existing components** - Follow patterns before writing new code
3. **Test on mobile** - Use Chrome DevTools mobile view
4. **Read the database schema** - Understand data relationships
5. **Use Supabase Studio** - Great UI for managing data
6. **Check the hooks** - Reuse real-time patterns
7. **Follow the pricing util** - Pattern for server calculations

---

## 📚 Learning Resources

- [Next.js Docs](https://nextjs.org/docs) - Framework
- [Supabase Docs](https://supabase.com/docs) - Database
- [Tailwind Docs](https://tailwindcss.com/docs) - Styling
- [React Docs](https://react.dev) - UI Library
- [TypeScript Docs](https://www.typescriptlang.org/docs) - Type safety

---

## 🎓 Code Patterns to Follow

### 1. **Fetch Data**
```typescript
const { data, error } = await supabase
  .from('table')
  .select('*')
  .eq('column', value);
```

### 2. **Use Store**
```typescript
const { user, setUser } = useAppStore();
```

### 3. **Real-Time Subscription**
```typescript
const { errands, loading } = useRealtimeErrands(userId);
```

### 4. **Calculate Pricing**
```typescript
import { calculatePricing } from '@/utils/pricing';
const pricing = calculatePricing('academic', 'high', 2.5);
```

### 5. **Create Component**
```typescript
'use client';
import { motion } from 'framer-motion';

export function MyComponent() {
  return <motion.div>...</motion.div>;
}
```

---

## ✅ Pre-Launch Checklist

Before going live:
- [ ] Test authentication flows
- [ ] Verify Paystack payments
- [ ] Check mobile responsiveness
- [ ] Test real-time updates
- [ ] Review RLS policies
- [ ] Set production environment variables
- [ ] Configure custom domain
- [ ] Enable HTTPS
- [ ] Test error handling
- [ ] Performance testing

---

## 🚀 Ready to Start?

1. **Read:** README.md (5 min)
2. **Setup:** Follow SETUP.md (15 min)
3. **Code:** Check IMPLEMENTATION_ROADMAP.md (20 min)
4. **Build:** Start Phase 2 features

**All documentation is in this folder. Start with README.md!**

---

## 📞 Questions?

Check these resources in order:
1. README.md - Feature overview
2. SETUP.md - Common setup issues
3. IMPLEMENTATION_ROADMAP.md - Feature details
4. FILE_STRUCTURE.md - File organization
5. Code comments - In the actual files

---

**🎉 Welcome to ErrandRun! Let's build something amazing for Nigerian students!**

Start now: `npm run dev` → http://localhost:3000
