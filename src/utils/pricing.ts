import type { ErrandCategory, ErrandPriority, PricingBreakdown } from '@/types';

// Base fee structure for Nigerian universities
const BASE_FEES: Record<ErrandCategory, { min: number; max: number }> = {
  academic: { min: 800, max: 1500 },
  food_delivery: { min: 1000, max: 2000 },
  campus_errand: { min: 800, max: 1500 },
  personal: { min: 1500, max: 3000 },
  custom: { min: 2000, max: 7000 },
};

// Distance surcharge rates (per km)
const DISTANCE_SURCHARGE_PER_KM = 100;
const MAX_DISTANCE_KM = 15;

// Queue complexity fee
const QUEUE_COMPLEXITY_FEE = 500;

// Weather surge multiplier
const WEATHER_SURGE = 1.1;

// Urgency multipliers
const URGENCY_MULTIPLIERS: Record<ErrandPriority, number> = {
  low: 0.9,
  normal: 1.0,
  high: 1.3,
  urgent: 1.6,
};

// Platform fee percentage (20%)
const PLATFORM_FEE_PERCENTAGE = 0.2;

/**
 * Calculate pricing based on errand details
 */
export function calculatePricing(
  category: ErrandCategory, // Still useful for metrics, but no longer dictates base fee
  priority: ErrandPriority = 'normal',
  distanceKm: number = 0,
  hasQueueComplexity: boolean = false,
  weatherSurgeApplied: boolean = false
): PricingBreakdown {
  // Ensure minimum distance of 1km for calculation
  const effectiveDistance = Math.max(1, distanceKm);
  
  // Rate is strictly 800 Naira per KM
  const baseFee = Math.round(effectiveDistance * 800);

  // We no longer need a separate distance surcharge because base fee IS the distance fee
  const distanceSurcharge = 0;

  // Queue complexity fee (flat 500 Naira if applicable)
  const queueComplexityFee = hasQueueComplexity ? QUEUE_COMPLEXITY_FEE : 0;

  // Weather surge (10% on top of base fee)
  const weatherSurge = weatherSurgeApplied ? baseFee * (WEATHER_SURGE - 1) : 0;

  // Get urgency multiplier
  const urgencyMultiplier = URGENCY_MULTIPLIERS[priority];

  // Calculate subtotal before multiplier
  const subtotal = baseFee + distanceSurcharge + queueComplexityFee + weatherSurge;

  // Apply urgency multiplier
  const totalFeeBeforePlatformFee = subtotal * urgencyMultiplier;

  // Calculate platform fee (20% of total)
  const platformFee = totalFeeBeforePlatformFee * PLATFORM_FEE_PERCENTAGE;

  // Total fee after platform deduction
  const totalFee = totalFeeBeforePlatformFee + platformFee;

  // Runner amount (80% of total before platform fee)
  const runnerAmount = totalFeeBeforePlatformFee;

  return {
    baseFee: Math.round(baseFee),
    distanceSurcharge: Math.round(distanceSurcharge),
    queueComplexityFee: Math.round(queueComplexityFee),
    weatherSurge: Math.round(weatherSurge),
    urgencyMultiplier,
    totalFee: Math.round(totalFee),
    platformFee: Math.round(platformFee),
    runnerAmount: Math.round(runnerAmount),
  };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // Multiply straight-line distance by ~1.3 to approximate actual road/walking distance
  return R * c * 1.3;
}

/**
 * Format currency (Nigerian Naira)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Calculate runner's earnings after platform fee
 */
export function calculateRunnerEarnings(totalFee: number): number {
  return Math.round(totalFee * (1 - PLATFORM_FEE_PERCENTAGE));
}

/**
 * Get color for priority badge
 */
export function getPriorityColor(priority: ErrandPriority): string {
  const colors: Record<ErrandPriority, string> = {
    low: '#6B7280',
    normal: '#3B82F6',
    high: '#F59E0B',
    urgent: '#EF4444',
  };
  return colors[priority];
}

/**
 * Get human-readable time estimate
 */
export function getTimeEstimate(priority: ErrandPriority): string {
  const estimates: Record<ErrandPriority, string> = {
    low: '2-3 hours',
    normal: '45 mins - 1 hour',
    high: '20-30 mins',
    urgent: '10-15 mins',
  };
  return estimates[priority];
}

/**
 * Calculate if errand qualifies for urgent pricing
 */
export function shouldApplyUrgentPricing(timeUntilDeadline: number): boolean {
  // If deadline is within 30 minutes, apply urgent pricing
  return timeUntilDeadline <= 30;
}

/**
 * Estimate queue complexity based on pickup location
 */
export function estimateQueueComplexity(location: string): boolean {
  // Queue-prone locations on campus
  const queueProneLocations = ['library', 'registrar', 'exam', 'clearance', 'bursary', 'admission'];
  return queueProneLocations.some((loc) => location.toLowerCase().includes(loc));
}
