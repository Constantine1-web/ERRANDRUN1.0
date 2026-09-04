import { z } from 'zod';

export const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const CreateErrandSchema = z.object({
  category: z.enum(['academic', 'food_delivery', 'campus_errand', 'personal', 'custom']),
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(120, 'Title cannot exceed 120 characters'),
  description: z.string().trim().max(1000, 'Description cannot exceed 1000 characters').optional().default(''),
  pickup_location: z.string().trim().min(2, 'Pickup location required').max(255),
  delivery_location: z.string().trim().min(2, 'Delivery destination required').max(255),
  pickup_coordinates: CoordinatesSchema.nullable().optional(),
  delivery_coordinates: CoordinatesSchema.nullable().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  has_queue: z.boolean().optional().default(false),
  is_bulky: z.boolean().optional().default(false),
  notes: z.string().trim().max(500).optional(),
});

export const WithdrawSchema = z.object({
  amount: z.number().int('Amount must be a whole integer').min(2000, 'Minimum withdrawal is ₦2,000').max(1000000, 'Maximum single withdrawal is ₦1,000,000'),
});

export const VerifyPinSchema = z.object({
  errandId: z.string().uuid('Invalid errand ID format'),
  pin: z.string().regex(/^\d{4}$/, 'Delivery PIN must be exactly 4 numeric digits'),
});

export const AcceptErrandSchema = z.object({
  errandId: z.string().uuid('Invalid errand ID format'),
});

export const DeclineErrandSchema = z.object({
  errandId: z.string().uuid('Invalid errand ID format'),
});

export const CancelErrandSchema = z.object({
  errandId: z.string().uuid('Invalid errand ID format'),
  reason: z.string().trim().max(500, 'Reason cannot exceed 500 characters').optional(),
});

export const DisputeSchema = z.object({
  errandId: z.string().uuid('Invalid errand ID format'),
  reason: z.string().trim().min(2, 'Reason required').max(100),
  description: z.string().trim().min(5, 'Description must be at least 5 characters').max(2000),
});

export const RatingSchema = z.object({
  errandId: z.string().uuid('Invalid errand ID format'),
  rating: z.number().min(1).max(5),
  review: z.string().trim().max(1000).optional(),
  categories: z.record(z.string(), z.number()).optional(),
});

export const TrackingUpdateSchema = z.object({
  errandId: z.string().uuid('Invalid errand ID format'),
  statusUpdate: z.string().trim().min(2).max(100),
  currentLocation: CoordinatesSchema.optional().nullable(),
  runnerNotes: z.string().trim().max(500).optional().nullable(),
});

export const AdminUserUpdateSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  role: z.enum(['user', 'runner', 'admin']).optional(),
  verificationStatus: z.enum(['unverified', 'pending', 'verified', 'rejected', 'expired']).optional(),
});

export const AdminDisputeResolveSchema = z.object({
  disputeId: z.string().uuid('Invalid dispute ID format'),
  resolutionType: z.enum(['refund', 'partial_refund', 'no_action', 'compensation']).optional().default('no_action'),
  resolutionAmount: z.number().min(0).max(500000).optional().nullable(),
  adminNotes: z.string().trim().max(1000).optional().nullable(),
  status: z.enum(['open', 'under_review', 'resolved', 'closed']).optional().default('resolved'),
  addRunnerStrike: z.boolean().optional().default(false),
  addCustomerStrike: z.boolean().optional().default(false),
});

export const AdminProcessPayoutSchema = z.object({
  transactionId: z.string().uuid('Invalid transaction ID format'),
});
