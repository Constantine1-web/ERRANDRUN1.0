# ⚡ ErrandRun — Complete Product & UI/UX Specification

## 1. Executive Summary & Brand Identity
* **Product Name:** ErrandRun
* **Tagline:** On-Demand Peer-to-Peer Campus Logistics Network.
* **Target Audience:** Nigerian university students (undergraduates, postgraduates) and verified student gig-workers across campuses (UNILAG, UI, OAU, UNIBEN, Covenant, FUTO, etc.).
* **Core Value Proposition:** Fast, affordable, peer-to-peer campus deliveries (cafeteria food, project printing/bookstore runs, administrative clearance queue standing, and gate parcel pickups) secured by **Paystack Escrow** and verified by **Student ID vetting**.
* **Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion, Leaflet Maps, Supabase (PostgreSQL & Realtime), Paystack API.

---

## 2. Global Navigation & Layout Architecture

### A. Public Navigation (Landing Page & Auth)
* **Navbar Items:**
  * Logo: `⚡ ErrandRun` (gradient text, clickable back to `/`).
  * Links: `Sign In` (Ghost button), `Become a Runner` (Subtle outlined badge), `Get Started` (Primary CTA button).

### B. Dashboard Shell (`/dashboard/layout.tsx`)
* **Header Bar (Top):**
  * Logo / Brand link.
  * Live User Status Pill: Avatar, Full Name, Matric Number, Role Badge (`User` | `Runner` | `Admin`), and In-App Wallet Balance badge (`₦X,XXX`).
  * Mobile Hamburger menu button.
* **Sidebar Navigation (Left):**
  * `🏠 Home` (`/dashboard/user`) — Student dashboard & active errands.
  * `⚡ Errands` (`/dashboard/errands`) — Errand history & status logs.
  * `🚲 Runner Hub` (`/dashboard/runner`) — *(Visible only to approved Runners & Admins)* Task claim feed & active jobs.
  * `💳 Wallet` (`/dashboard/wallet`) — Balance, deposits, transaction ledger.
  * `🛡️ Admin Vetting` (`/dashboard/admin`) — *(Visible to Admins)* Vetting, live errands, disputes, and analytics.
  * `👤 Profile` (`/dashboard/profile`) — Account details, verification badge, and rating stars.
  * `🚪 Sign Out` — Disconnects session and redirects to `/`.

---

## 3. Screen-by-Screen UI, Buttons & Feature Specifications

### 🖥️ Screen 1: Modern Campus Landing Page (`/`)
* **Goal:** Educate students, calculate real-time pricing, and drive signups for both Requesters and Student Runners.
* **Key UI Sections & Elements:**
  1. **Hero Section:**
     * Pill Badge: `🛡️ On-Demand Peer-to-Peer Campus Logistics Network`.
     * Headline: *"Campus Logistics, Fast & Simplified."*
     * Subheadline: Value summary (cafeteria food, clearance queues, printing, parcel drop-offs).
     * **Buttons:**
       * `[Request an Errand →]` — Primary CTA, redirects to `/signup?role=user`.
       * `[🚲 Earn as a Runner]` — Secondary Glass CTA, redirects to `/signup?role=runner`.
     * **KPI Bar:** Starts at ₦800 • 15–30 Mins avg delivery • Paystack Escrow • GPS Real-Time Maps.
  2. **Campus Use Cases Grid (4 Cards):**
     * 🍲 *Food & Cafeteria Delivery* (Tag: Food & Dining)
     * 📜 *Clearance & Queue Standing* (Tag: Administrative)
     * 📚 *Printing & Handout Pickups* (Tag: Academic)
     * 🎒 *Campus Gate & Parcel Pickups* (Tag: Logistics)
  3. **3-Step "How It Works" Section:**
     * `01. Post Your Errand` → `02. Secure Escrow Payment` → `03. Live Tracking & Drop-off`.
  4. **Interactive Dynamic Price Estimator (Live Calculator):**
     * **Controls:**
       * Errand Category Tabs: `[Food Delivery]` | `[Academic / Print]` | `[Queue / Parcel]`.
       * Distance Slider: Range from `0.5 km` to `5.0 km` (live updates fee).
       * Checkbox: `[x] Queue complexity surcharge (+₦500)`.
     * **Live Output Card:**
       * Big Calculated Total Fee (e.g., `₦1,450`).
       * Itemized breakdown: Base Fee, Distance Surcharge, Queue Allowance, and Runner Take-Home (80%).
       * **Button:** `[Post This Errand →]` (links to signup/create page).
  5. **Safety & Security Standards Section:**
     * Vetted Student ID Credentials • Escrow Protection • 1–5 Star Community Ratings.
  6. **Footer:** Copyright, Quick Links, Admin Portal access link.

---

### 🖥️ Screen 2: Authentication & Registration (`/login`, `/signup`, `/auth/callback`)
* **Goal:** Seamless onboarding with student credential capture and role assignment.
* **Key Features & UI Elements:**
  * **Role Selector Tab:** Toggle between `[Student Requester]` and `[Campus Runner]`.
  * **Input Fields:**
    * Full Name
    * University Email Address (`name@university.edu` or personal email)
    * Secure Password (with minimum 6-character validation)
    * Student Matric / ID Number (e.g. `UI/2023/1049`)
    * Phone Number (WhatsApp accessible)
  * **Buttons & Actions:**
    * `[Create Account / Sign In]` — Primary submit button.
    * `[Send Magic Link Instead]` — Alternative passwordless authentication button.
    * `[Sign in with Google]` — OAuth one-tap sign-in.
    * Switch link: "Already have an account? Sign in" / "Don't have an account? Sign up".

---

### 🖥️ Screen 3: Student / Requester Home Dashboard (`/dashboard/user`)
* **Goal:** High-level overview of active errands, quick creation, and spending summary.
* **Key UI Elements:**
  * **Welcome Header:** *"Hello, [User Name] 👋"* with quick wallet summary and student ID.
  * **Hero CTA Button:** `[⚡ Request New Errand]` (Large gradient button linking to `/dashboard/errands/new`).
  * **Live Active Orders Section:** Real-time card showing active in-flight errands with status pill (`Looking for Runner`, `Assigned`, `In Progress`).
  * **Quick Status Stats:** Total Errands Placed, Total Amount Spent, Active Errands count.
  * **Recent Errands Table:** List of past errands with title, date, runner assigned, total fee, and `[View Details]` button.

---

### 🖥️ Screen 4: Errand Creation & Pricing Screen (`/dashboard/errands/new`)
* **Goal:** Multi-parameter errand builder with dynamic pricing calculation and payment initialization.
* **Key UI Elements & Inputs:**
  * **Category Selector:** Academic, Food Delivery, Campus Errand, Personal, Custom.
  * **Title & Description:** e.g., *"Pick up amala from Sub Buka and deliver to Queen Idia Hall Room B12"*.
  * **Pickup Location & Drop-off Location:** Campus landmarks text inputs (e.g., "Faculty of Tech", "Hostel A Gate").
  * **Optional GPS Coordinate Fields:** Pickup Lat/Lng & Delivery Lat/Lng.
  * **Priority Tier Selector:** `Low` (0.9x), `Normal` (1.0x), `High` (1.2x), `Urgent` (1.5x).
  * **Queue Complexity Checkbox:** `[x] Pickup involves line or clearance queue (+₦500)`.
  * **Dynamic Price Sidebar Card:**
    * Live recalculation: Base Fee + Distance + Queue + Surge = **Total Escrow Fee**.
    * Transparent Runner Payout display (80%).
  * **Submit Button:** `[Create Errand & Pay via Escrow]` — Saves errand with status `payment_pending` and instantly launches the Paystack checkout window.

---

### 🖥️ Screen 5: Errand Detail, Live Map Tracking & Disputes (`/dashboard/user/errand/[id]`)
* **Goal:** Full lifecycle view of a single errand: live GPS tracking, delivery confirmation, dispute filing, and rating.
* **Key UI Elements:**
  1. **Order Summary Card:** Title, full description, pickup landmark, drop-off point, total fee, platform fee, priority tier.
  2. **Interactive Live Leaflet Map:**
     * Runner's live GPS location marker with popup timestamp.
     * Route polyline path between pickup and drop-off coordinates.
     * Auto-centering map control.
  3. **Live Status Timeline Stream:** Real-time list of tracking updates posted by the runner with exact timestamps.
  4. **Right Actions Card (Dynamic per status):**
     * **If `unassigned` / `payment_pending`:**
       * Status badge: `Looking for Runner`.
       * **Button:** `[🛑 Cancel Errand & Refund]` → Opens confirmation modal and automatically refunds `total_fee` to user's in-app wallet.
     * **If `assigned` / `in_progress`:**
       * Runner Info: Runner name, photo, phone, and rating.
       * **Button:** `[✓ Mark as Completed]` → Releases escrow payment directly into runner's wallet.
       * **Link/Button:** `[⚠️ Report an Issue / File Dispute]` → Opens Dispute Modal.
     * **If `completed`:**
       * Green badge: `✓ Errand Completed`.
       * **Button:** `[⭐ Rate & Review Runner]` → Opens 1–5 Star Rating Modal.
       * Review Display: Shows existing star rating, compliment tags, and comment.
       * **Link:** `[Report a Problem with this Errand]`.
     * **If `disputed`:**
       * Amber banner showing dispute reason, user description, and admin notes.
  5. **Modals on this page:**
     * **⭐ Rating Modal:** Interactive 5-star picker (`★`), compliment pill tags (`⚡ Super Fast`, `🤝 Very Polite`, `📦 Handled Carefully`, `📞 Great Communication`), review comment box, submit button.
     * **🚨 Dispute Modal:** Reason dropdown (`Item missing`, `Damaged goods`, `Unreasonable delay`, `Discrepancy`), detailed explanation textarea, submit claim button.
     * **🛑 Cancel Modal:** Explanation input, `[Keep Errand]` and `[Confirm & Refund]` buttons.

---

### 🖥️ Screen 6: Campus Runner Hub (`/dashboard/runner` & `/dashboard/runner/tasks`)
* **Goal:** Job board for verified student runners to discover, accept, and manage tasks.
* **Key UI Elements:**
  * **Online / Offline Toggle:** Switch to accept new task notifications.
  * **Runner Earnings Metric Cards:** Today's Earnings, Total Completed Tasks, Performance Star Rating (`★ 4.9/5.0`).
  * **Available Tasks Feed:**
    * Task Card: Category tag, Errand Title, Pickup & Delivery landmarks, Distance (km), Estimated completion time.
    * **Runner Earnings Badge:** Highlighted in emerald (e.g. `Earn ₦1,200`).
    * **Buttons:**
      * `[Accept Task]` — Assigns errand to runner, moves status to `assigned`, and opens live tracking room.
      * `[Decline]` — Dismisses card from feed.
  * **Active Task Card:** Highlighted active job with direct button to `[📡 Open GPS Tracking Controller]`.

---

### 🖥️ Screen 7: Runner Live GPS Broadcaster (`/dashboard/runner/track/[id]`)
* **Goal:** Tools for the runner to broadcast step-by-step progress and location to the student requester.
* **Key UI Elements:**
  * **Quick Status Presets:** One-tap pill buttons:
    * `[🏃 Heading to pickup]`
    * `[📍 Arrived at pickup]`
    * `[📦 Item picked up, en route]`
    * `[🏢 Arrived at hostel/faculty]`
    * `[✅ Handed over to recipient]`
  * **Custom Status Textbox:** e.g., *"Standing in queue at counter 2"*.
  * **GPS Auto-Detect Bar:**
    * **Button:** `[📍 Auto-Detect GPS]` — Calls browser `navigator.geolocation` and instantly auto-populates exact Latitude and Longitude.
    * Latitude & Longitude display/override inputs.
  * **Runner Notes Field:** Optional text for specifics ("Left at reception").
  * **Action Buttons:**
    * `[Broadcast Tracking Update]` — Sends realtime update to map.
    * `[Arrived / Completed]` — Signals delivery completion.

---

### 🖥️ Screen 8: Runner Application & Vetting Wizard (`runner-wizard.tsx`)
* **Goal:** 3-step onboarding flow for students applying to become verified runners.
* **Step 1: Academic Verification:**
  * Inputs: Student ID number, Registration Number, Department/Faculty.
* **Step 2: Logistics & Schedule:**
  * Transport Mode Buttons: `🚶 On Foot`, `🚴 Bicycle`, `🚐 Shuttle`, `🏍️ Motorcycle`.
  * Weekly Availability Schedule: Monday–Friday time slot matrix (`9AM`, `12PM`, `3PM`, `6PM`, `9PM`).
* **Step 3: Document Upload:**
  * Drag-and-drop Student ID card / school fee receipt upload (PNG, JPG, PDF up to 5MB).
  * Storage upload to Supabase bucket `verification_docs`.
* **Submit Button:** `[Submit Application for Admin Review]`.

---

### 🖥️ Screen 9: In-App Wallet & Financial Hub (`/dashboard/wallet`)
* **Goal:** Manage deposits, escrow debits, runner earnings, and transaction history.
* **Key UI Elements:**
  * **Available Balance Hero Card:** Big balance display (e.g. `₦14,250.00`).
  * **Stats Sub-Bar:** Total Earned (Emerald) • Total Spent (Rose).
  * **Button:** `[+ Add Funds]` → Opens Top-Up Modal.
  * **Add Funds Modal:**
    * Amount input in Naira (minimum ₦100).
    * `[Proceed to Paystack Payment]` → Redirects to Paystack checkout and automatically credits balance on verification.
  * **Verifying Deposit Banner:** Real-time feedback spinner when returning from Paystack.
  * **Transaction History Ledger:**
    * List of credits (+) and debits (-), transaction type (`deposit`, `errand_fee`, `refund`, `errand_completion`), reference ID, date, and updated balance after transaction.

---

### 🖥️ Screen 10: User Profile & Reputation (`/dashboard/profile`)
* **Goal:** View and update personal information, verification credentials, and reviews.
* **Key UI Elements:**
  * Profile Avatar, Full Name, Email, Phone number.
  * Student Matric Number with Verification Status badge (`Verified` / `Pending` / `Unverified`).
  * Runner Rating Card: Overall score (e.g., `★ 4.85 / 5.0`) based on completed task reviews.
  * Editable Bio & Department details.
  * `[Save Profile Changes]` button.

---

### 🖥️ Screen 11: Comprehensive Admin Operations Portal (`/dashboard/admin`)
* **Goal:** Full platform control: anti-fraud vetting, live order interventions, dispute arbitration, and analytics.
* **Key Tabs & Modules:**
  1. **📊 Platform Metrics (Top KPIs):**
     * Pending Vetting count, Verified Runners count, Completed Tasks count, Platform Commission Revenue (20%).
  2. **🛡️ Tab 1: Runner Vetting Hub:**
     * Status Filter: `[Pending]` | `[Approved]` | `[Denied]` | `[All]`.
     * Live Search by Name, Student ID, Matric, or Phone.
     * Application Card:
       * Candidate name, matric number, transport mode, applied date.
       * **Button:** `[Inspect Uploaded Document]` → Launches high-res ID Document modal preview.
       * Admin Review Notes input field.
       * **Buttons:** `[✓ Approve & Verify Runner]` (Sets role to `runner`, verification to `verified`) and `[✕ Reject]`.
  3. **📦 Tab 2: All Campus Errands (Live Control Center):**
     * Filter by `all`, `unassigned`, `assigned`, `in_progress`, `completed`, `cancelled`.
     * Live table showing Errand ID, Title, Pickup/Drop-off, Requester, Runner, Total Fee.
     * **Inspect Modal:** Detailed fee breakdown (Total, Platform fee, Runner payout), timeline logs.
     * **Admin Actions:** `[Cancel Errand]`, `[Force Complete]`, `[Unassign Runner]`.
  4. **👥 Tab 3: User & Runner Directory:**
     * Searchable table of all registered accounts.
     * Displays Name, Student ID, Phone, Role, Verification Status, Star Rating.
     * Role dropdown selector: Instantly switch between `User`, `Runner`, `Admin`.
  5. **⚖️ Tab 4: Dispute Arbitration Center:**
     * List of open claims filed by users/runners.
     * Displays dispute reason, detailed explanation, initiator vs respondent, and errand value.
     * Admin arbitration notes input.
     * **Action Buttons:** `[Refund Requester]`, `[Compensate Runner]`, `[Dismiss Claim]`.
  6. **📈 Tab 5: Financial & Marketplace Analytics:**
     * Gross Marketplace Volume (GMV), Total Runner Payouts, Order Fulfillment Rate %, Community Registered count.

---

## 4. Backend API Architecture & Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/payments` | `POST` | Initialize Paystack transaction for wallet top-up or errand escrow. |
| `/api/payments` | `GET` | Verify Paystack payment by reference and activate errand or credit wallet. |
| `/api/payments/webhook` | `POST` | Server-to-server webhook with HMAC-SHA512 validation for automatic crediting. |
| `/api/errands/accept` | `POST` | Runner claims an unassigned errand (`status: 'assigned'`). |
| `/api/errands/decline` | `POST` | Runner declines a task assignment. |
| `/api/errands/complete` | `POST` | User/Runner confirms delivery; credits runner's wallet & updates status to `completed`. |
| `/api/errands/cancel` | `POST` | Requester cancels unassigned errand; refunds total fee to wallet. |
| `/api/tracking` | `POST` / `GET` | Broadcasts and queries real-time GPS coordinates and milestone text updates. |
| `/api/ratings` | `POST` / `GET` | Submits 1–5 star reviews, compliment tags, and recalculates runner average score. |
| `/api/disputes` | `POST` / `GET` | User files a dispute claim on an errand (`status: 'disputed'`). |
| `/api/admin/runners` | `GET` / `POST` | Admin queries applications and approves/rejects runner verification. |
| `/api/admin/errands` | `GET` / `POST` | Admin queries all platform tasks and executes cancel/complete/unassign actions. |
| `/api/admin/users` | `GET` / `POST` | Admin queries user directory and changes user roles and verification statuses. |
| `/api/admin/disputes` | `GET` / `POST` | Admin queries open disputes and executes refunds or compensations. |
| `/api/admin/stats` | `GET` | Returns gross volume, revenue, completion rate, and user statistics. |

---

## 5. Database Schema Structure (PostgreSQL / Supabase)

* `profiles`: `id`, `full_name`, `student_id`, `phone_number`, `role` (`user`|`runner`|`admin`), `verification_status` (`unverified`|`pending`|`verified`|`rejected`), `rating`, `total_ratings`, `avatar_url`, `created_at`.
* `runner_apps`: `id`, `user_id`, `reg_number`, `transport_method`, `availability_schedule`, `document_proof_url`, `status` (`pending`|`approved`|`denied`), `admin_notes`, `created_at`.
* `errands`: `id`, `requester_id`, `runner_id`, `category`, `title`, `description`, `pickup_location`, `delivery_location`, `pickup_coordinates`, `delivery_coordinates`, `base_fee`, `distance_surcharge`, `queue_complexity_fee`, `weather_surge`, `total_fee`, `platform_fee`, `runner_amount`, `priority`, `status` (`payment_pending`|`unassigned`|`assigned`|`in_progress`|`completed`|`cancelled`|`disputed`), `created_at`.
* `payments`: `id`, `user_id`, `errand_id`, `amount`, `payment_method`, `reference`, `status` (`pending`|`completed`|`failed`), `created_at`.
* `wallets`: `id`, `user_id`, `balance`, `total_earned`, `total_spent`, `last_updated`.
* `wallet_transactions`: `id`, `wallet_id`, `transaction_type` (`credit`|`debit`), `amount`, `reference_id`, `reference_type` (`payment`|`refund`|`errand_completion`), `description`, `balance_after`, `created_at`.
* `tracking_updates`: `id`, `errand_id`, `runner_id`, `status_update`, `current_location` (`{lat, lng}`), `runner_notes`, `timestamp`.
* `ratings`: `id`, `errand_id`, `rater_id`, `ratee_id`, `rating` (1–5), `review`, `categories` (text array), `created_at`.
* `disputes`: `id`, `errand_id`, `initiator_id`, `respondent_id`, `reason`, `description`, `status` (`open`|`under_review`|`resolved`|`closed`), `resolution_type`, `resolution_amount`, `admin_notes`, `created_at`.

---

## 6. Design System & Visual Language Guidelines
* **Theme:** Sleek Glassmorphism Dark Mode.
* **Palette:**
  * Background: `#0B0F17` (Deep Dark Base) with translucent card layers (`rgba(255, 255, 255, 0.05)`).
  * Primary Accent: `#38BDF8` / `#0284C7` (Electric Sky Blue / Cyan).
  * Secondary Accent: `#A855F7` (Vibrant Purple).
  * Success / Earnings: `#10B981` / `#34D399` (Emerald Green).
  * Warning / Pending: `#F59E0B` (Warm Amber).
  * Danger / Cancellation / Dispute: `#EF4444` / `#F43F5E` (Crimson Rose).
* **Typography:** Bold sans-serif headers with clean letter-spacing, monospace font for Matric/IDs and Currency numbers.
* **Responsiveness:** 100% mobile-first responsive with touch-friendly tap targets (minimum 44px) and collapsible sliding drawers.
