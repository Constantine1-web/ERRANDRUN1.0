// Database Types
export type UserRole = 'user' | 'runner' | 'admin';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
export type TransportMethod = 'foot' | 'bicycle' | 'shuttle' | 'motorcycle';
export type ErrandCategory = 'academic' | 'food_delivery' | 'campus_errand' | 'personal' | 'custom';
export type ErrandStatus = 'payment_pending' | 'unassigned' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
export type ErrandPriority = 'low' | 'normal' | 'high' | 'urgent';
export type RunnerAppStatus = 'pending' | 'approved' | 'denied';
export type PaymentMethod = 'paystack' | 'wallet' | 'bank_transfer';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type InsuranceCoverage = 'basic' | 'standard' | 'premium';
export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'closed';
export type ResolutionType = 'refund' | 'partial_refund' | 'no_action' | 'compensation';
export type TransactionType = 'credit' | 'debit';

// Profile Type
export interface Profile {
  id: string;
  full_name: string;
  student_id: string;
  phone_number: string;
  role: UserRole;
  avatar_url?: string;
  bio?: string;
  verification_status: VerificationStatus;
  rating: number;
  total_ratings: number;
  total_errands: number;
  insurance_plan_id?: string;
  created_at: string;
  updated_at: string;
}

// Runner Application
export interface RunnerApp {
  id: string;
  user_id: string;
  reg_number: string;
  campus_record_checked: boolean;
  transport_method: TransportMethod;
  availability_schedule: Record<string, string[]>;
  document_proof_url: string;
  status: RunnerAppStatus;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

// Errand Type
export interface Errand {
  id: string;
  requester_id: string;
  runner_id?: string;
  category: ErrandCategory;
  title: string;
  description: string;
  pickup_location: string;
  delivery_location: string;
  pickup_coordinates?: { lat: number; lng: number };
  delivery_coordinates?: { lat: number; lng: number };
  base_fee: number;
  distance_surcharge: number;
  queue_complexity_fee: number;
  weather_surge: number;
  urgency_multiplier: number;
  total_fee: number;
  platform_fee: number;
  runner_amount: number;
  status: ErrandStatus;
  priority: ErrandPriority;
  estimated_completion_time?: string;
  actual_completion_time?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Errand Tracking
export interface ErrandTracking {
  id: string;
  errand_id: string;
  status_update: string;
  current_location?: { lat: number; lng: number };
  runner_notes?: string;
  timestamp: string;
}

// Rating
export interface Rating {
  id: string;
  errandId: string;
  raterId: string;
  rateeId: string;
  rating: number;
  review?: string;
  categories?: Record<string, number>;
  createdAt: string;
}

// Dispute
export interface Dispute {
  id: string;
  errandId: string;
  initiatorId: string;
  respondentId: string;
  reason: string;
  description: string;
  status: DisputeStatus;
  resolutionType?: ResolutionType;
  resolutionAmount?: number;
  adminNotes?: string;
  createdAt: string;
  resolvedAt?: string;
  updatedAt: string;
}

// Payment
export interface Payment {
  id: string;
  userId: string;
  errandId?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  reference?: string;
  paystackReference?: string;
  notes?: string;
  createdAt: string;
  completedAt?: string;
}

// Wallet
export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  lastUpdated: string;
}

// Wallet Transaction
export interface WalletTransaction {
  id: string;
  walletId: string;
  transactionType: TransactionType;
  amount: number;
  referenceId?: string;
  referenceType?: string;
  description?: string;
  balanceAfter: number;
  createdAt: string;
}

// Insurance Plan
export interface InsurancePlan {
  id: string;
  name: string;
  description?: string;
  monthlyPremium: number;
  coverageAmount: number;
  coverageType: InsuranceCoverage;
  isActive: boolean;
  createdAt: string;
}

// User Insurance
export interface UserInsurance {
  id: string;
  userId: string;
  insurancePlanId: string;
  status: 'active' | 'inactive' | 'suspended' | 'expired';
  startDate: string;
  endDate: string;
  premiumPaid: number;
  lastPaymentDate?: string;
  claimsFiled: number;
  claimsApproved: number;
  createdAt: string;
  updatedAt: string;
}

// Task Matching Preferences
export interface TaskMatchingPreferences {
  id: string;
  runnerId: string;
  preferredCategories: ErrandCategory[];
  maxDistanceKm: number;
  preferredTimeSlots: Record<string, string[]>;
  acceptanceRate: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// Task History
export interface TaskHistory {
  id: string;
  runnerId: string;
  errandId: string;
  completionTimeMinutes: number;
  ratingReceived?: number;
  acceptanceStatus: 'accepted' | 'declined' | 'missed';
  createdAt: string;
}

// Pricing Components
export interface PricingBreakdown {
  baseFee: number;
  distanceSurcharge: number;
  queueComplexityFee: number;
  weatherSurge: number;
  urgencyMultiplier: number;
  totalFee: number;
  platformFee: number;
  runnerAmount: number;
}

// Session
export interface SessionLog {
  id: string;
  userId: string;
  loginAt: string;
  logoutAt?: string;
  durationSeconds?: number;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  createdAt: string;
}
