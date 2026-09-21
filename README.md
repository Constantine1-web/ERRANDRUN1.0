# ERRANDRUN 1.0

A premium, mission-critical gig-economy marketplace designed specifically for university students. Built with Next.js 15, Tailwind CSS, and Supabase.

---

## Current Project Status (Updated: September 2026)

The ERRANDRUN platform is in active development and has successfully completed its core infrastructural phases.

### ✅ Phase G: Communications & Notification Engine
- **Transactional Outbox Pattern**: Notifications are reliably decoupled from API requests via PostgreSQL triggers (`trigger_errand_outbox`).
- **Realtime Integration**: UI components (like `NotificationBell`) subscribe to Supabase Realtime for instant toasts.
- **Secure Guest Tracking**: Dynamic UI portal (`/track/[token]`) for off-platform recipients to monitor errand delivery statuses safely.
- **Worker Queues**: CRON endpoint (`/api/cron/process-outbox`) strictly handles idempotency and multi-channel delivery (Resend/Email, SMS).

### ✅ Phase H: Institutional-Grade Financial Ledger
- **Double-Entry Accounting**: Replaced superficial wallet balances with a robust Chart of Accounts (`Student Wallet Liability`, `Runner Payable`, `System Escrow`, `Withdrawal Clearing`).
- **PostgreSQL Boundaries**: Hard constraints and atomic RPCs (`process_funding`, `reserve_errand_funds`, `request_withdrawal`) ensure all Naira movements are mathematically perfect (SUM(DEBITS) = SUM(CREDITS)).
- **Circuit Breakers**: Global kill-switches (`financial_settings`) to pause operations instantly in case of fraud.
- **Immutability Triggers**: `POSTED` ledgers cannot be updated or deleted, effectively acting as an airtight financial log.

### ✅ Dashboard Modules
- **Runner Console** (`/dashboard/runner`): Fully functional with "Go Online/Offline" status toggles, Active Mission counts, Driver Scores, and Wallet links. Verified via the strict Runner Application pipeline.
- **Wallet Hub** (`/dashboard/wallet`): Connected to Phase H RPCs. Displays live balances parsed from `financial_operations` and interacts natively with the Paystack funding lifecycle.
- **Admin Command Room** (`/dashboard/admin`):
  - **Verification Queue**: Process runner applications and KYC.
  - **Financial Ledger Hub**: Monitor platform metrics, toggle circuit breakers, and run the **"One Naira Story"** tracer to follow the lifecycle of funds.

### ⏳ Remaining Implementation (Upcoming)
- **Live Errand Radar**: Mapbox/OSM integration for real-time runner tracking and dynamic route pricing visualization.
- **Disputes & Rating**: Workflow execution for adjudicating failed deliveries and impacting driver scores.
- **Insurance Systems**: Full UI hookup for opting into damage/loss protection.

---

## Tech Stack & Design System

- **Framework**: Next.js 15 (App Router, Server Actions)
- **Database & Auth**: Supabase (PostgreSQL, Row Level Security, Realtime)
- **Styling**: Tailwind CSS, Framer Motion (Glassmorphism, Dark/Light Mode, Premium shadows)
- **Icons**: Lucide React
- **Payments**: Paystack

## Environment Setup

Duplicate `.env.example` to `.env.local` and configure your keys:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Paystack
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key

# Base
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Security Posture

- **Row Level Security (RLS)**: Enforced across all tables. Users can only query their own profiles and financial operations.
- **PostgreSQL Triggers**: Financial integrity is mathematically enforced at the database level; the frontend never modifies balances directly.
- **Role-Based Access Control**: Guard components (`AdminGuard`, `RunnerGuard`) restrict dashboard modules to properly vetted personnel.

## Running the Project

```bash
npm install
npm run dev
```

For major database architectural updates (Phase G & H), apply the migration files located in the `scratch/` directory directly into your Supabase SQL Editor.

---
*Built with ⚡️ for the campus economy.*
