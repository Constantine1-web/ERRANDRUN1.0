# ERRANDRUN — PRODUCT, UX & UI REDESIGN MASTER SPECIFICATION

## 0. FIRST: UNDERSTAND WHAT ERRANDRUN ACTUALLY IS
ERRANDRUN is a **campus-focused peer-to-peer errand marketplace for University of Uyo students**.
It connects students who need something done with students who are already moving around campus and can complete those errands for money.
"You need something done. Another student is already in a position to do it. ERRANDRUN connects both sides."
It is NOT simply a food-delivery app. It is a **campus peer-to-peer task network**.

## 1. MOST IMPORTANT DESIGN PRINCIPLE
DO NOT redesign ERRANDRUN as merely a prettier landing page. The redesign must make the entire product understandable from:
**Request → Matching → Acceptance → Pickup → Progress → Delivery → Confirmation → Payment → Rating**
Every major UI decision should support that lifecycle.

## 2. DESIGN FOR THE REAL UNI UYO ENVIRONMENT
Design around realistic Nigerian student behavior:
- Students know campus landmarks better than formal street addresses (e.g. "Faculty of Science", "Hostel B", "beside the blue water tank").
- Students commonly use bank transfers and mobile banking.
- Marketplace liquidity will be a real problem initially. Do NOT pretend there are thousands of Runners online if there aren't.
- Do NOT fabricate reviews, transaction counts, earnings, ratings or completion statistics.

## 3. ERRANDRUN SHOULD FEEL CAMPUS-NATIVE
Use language students actually understand (e.g., "Need something from the faculty?"). Avoid generic corporate tech phrases.

## 4. CORE PRODUCT ARCHITECTURE
Two primary user modes: **STUDENT MODE** and **RUNNER MODE**. Do NOT make them feel like two completely unrelated applications.

## 5. USER ROLES MUST BE CLEAR
A user may potentially be both Student + Runner. Use a clear switch when the user is approved as a Runner.

## 6. THE REQUEST FLOW IS THE HEART OF ERRANDRUN
The Request Errand experience should be extremely simple. Use progressive disclosure.

## 7. STEP 2 — WHERE?
Offer campus locations, "Use my current location", and "Add a landmark / location note".

## 8. STEP 3 — WHERE SHOULD IT GO?
Allow campus locations and custom landmarks.

## 9. STEP 4 — WHEN?
Offer "ASAP" and "Schedule for later".

## 10. STEP 5 — ITEM COST VS RUNNER FEE
Do not confuse Item cost with ERRANDRUN service / Runner fee. The user needs to understand exactly what they are paying for.

## 11. PRICING MUST BE EXPLAINABLE
Build the pricing architecture around understandable variables (e.g., Base Runner Fee + Distance + Approved Extras).

## 12. DO NOT OVERPROMISE REAL-TIME GPS
Do not build a fake animated map just to make the interface look sophisticated. Handle GPS gracefully based on connectivity.

## 13. ERRAND STATUS SYSTEM
Every errand should have explicit states: Draft, Searching, Accepted, Heading to pickup, At pickup, Task in progress, Heading to destination, Arrived, Awaiting confirmation, Completed, Cancelled, Disputed.

## 14. ACTIVE ERRAND SCREEN
This should be one of the best screens in the entire application, showing clear status, ETA, and immediate next actions.

## 15. RUNNER PROFILE
Show enough information to trust the Runner (name, verification status, rating, completed errands) but NO unnecessary personal information.

## 16. RUNNER VERIFICATION
Keep verification realistic for a campus MVP (phone, email, student ID, photo, admin approval). DO NOT automatically copy commercial NIN/BVN models unless legally required.

## 17. RUNNER DASHBOARD
Answer three questions immediately: Am I available? What jobs are nearby? How much will I earn?

## 18. RUNNER AVAILABILITY
Clear ONLINE / OFFLINE control.

## 19. REALISTIC RUNNER ECONOMICS
Do NOT display fabricated earning claims. Show actual earnings per errand, today, this week, etc.

## 20. QUEUE ERRANDS NEED SPECIAL HANDLING
Queue standing requires specific inputs: Purpose, expected start time, maximum duration, documents needed, and what to do when it's their turn.

## 21. CUSTOM ERRANDS NEED SAFETY LIMITS
Define Prohibited / Restricted Requests (illegal goods, academic misconduct, etc.).

## 22. SCHOOL-SPECIFIC REALITY
ERRANDRUN is competing with "Bro, please help me collect this." Make the advantage clear: Post once, see price, get runner, track, confirm.

## 23. WHATSAPP SHOULD BE CONSIDERED
Support sharing errand status/links via WhatsApp, but ERRANDRUN must remain the source of truth.

## 24. PAYMENT REALITY
Design for Nigeria (Bank transfer, Card, Wallet). Clearly communicate payment states.

## 25. ESCROW / PAYMENT PROTECTION
Only advertise Escrow if the backend actually supports holding and releasing funds based on confirmation.

## 26. DISPUTES
There must be a real dispute state with clear options for both Customer and Runner, preserving chat, status history, and photos.

## 27. PROOF OF COMPLETION
Support PIN confirmation, photo proof, or simple customer confirmation depending on the errand type.

## 28. CUSTOMER DASHBOARD
Show Active, Upcoming, Completed, Payment activity, and a quick "Request an Errand" action.

## 29. RUNNER DASHBOARD
Show Online status, Available errands, Active errand, Today's earnings, and a quick "Go Online/Offline" toggle.

## 30. NOTIFICATIONS
Build around meaningful events (accepted, arriving, payment released). No spam.

## 31. CHAT
In-app conversation is strictly for completing the errand.

## 32. LOCATION UX
Allow users to choose a campus location and add a descriptive note (e.g., "inside the library, second floor").

## 33. LANDING PAGE REDESIGN
Make each section demonstrate the actual product lifecycle.

## 60. DO NOT BUILD FAKE FUNCTIONALITY
Do NOT create fake live GPS, fake Runner counts, fake reviews, fake transactions. Design the real UI state.

## 61. MVP VS FUTURE FEATURES
Prioritize the MVP (Auth, profiles, request creation, matching, active status, messaging, confirmation, payment status). Push advanced features (live GPS, route optimization) to Phase 2/3.

## 68. FINAL DESIGN PHILOSOPHY
Think of ERRANDRUN as: WhatsApp simplicity + Bolt-like status clarity + Campus-specific context + Peer-to-peer trust.

## 69. DEVELOPMENT INSTRUCTION
1. Inspect existing codebase and routes.
2. Identify what is functional and what is placeholder.
3. Do not remove existing working functionality.
4. Establish a shared design system.
5. Redesign systematically.

## 70. IMPLEMENTATION ORDER
- **PHASE A — PRODUCT FOUNDATION:** Auth, Roles, Profiles, Verification, Navigation, Design system
- **PHASE B — CORE TRANSACTION:** Request creation, Pricing, Matching, Acceptance, Active errand, Completion, Payment
- **PHASE C — TRUST:** Verification, Proof, Ratings, Cancellation, Disputes, Support
- **PHASE D — DASHBOARDS:** Student dashboard, Runner dashboard, History, Earnings, Notifications
- **PHASE E — PUBLIC WEBSITE:** Landing page, How it works, Services, Trust, Pricing, FAQ
- **PHASE F — POLISH:** Responsive, Accessibility, Performance, Animations, Empty/Error states, Dark/light modes

## 71. VERY IMPORTANT: DO NOT REWRITE FROM SCRATCH BLINDLY
Audit the existing codebase. Determine what to KEEP, IMPROVE, REBUILD, REMOVE, and ADD. Do not delete functional features simply because the visual redesign looks cleaner.
