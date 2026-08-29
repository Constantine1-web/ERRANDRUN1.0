'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { ErrandCategory, ErrandPriority } from '@/types';
import { calculatePricing, estimateQueueComplexity, getTimeEstimate } from '@/utils/pricing';

interface DynamicPricingCardProps {
  category: ErrandCategory;
  priority?: ErrandPriority;
  distanceKm?: number;
  pickupLocation?: string;
  onChange?: (pricing: any) => void;
  interactive?: boolean;
}

export function DynamicPricingCard({
  category,
  priority = 'normal',
  distanceKm = 2,
  pickupLocation = '',
  onChange,
  interactive = true,
}: DynamicPricingCardProps) {
  const [selectedPriority, setSelectedPriority] = useState<ErrandPriority>(priority);
  const [selectedDistance, setSelectedDistance] = useState(distanceKm);

  const hasQueueComplexity = useMemo(
    () => estimateQueueComplexity(pickupLocation),
    [pickupLocation]
  );

  const pricing = useMemo(
    () =>
      calculatePricing(
        category,
        selectedPriority,
        selectedDistance,
        hasQueueComplexity,
        false
      ),
    [category, selectedPriority, selectedDistance, hasQueueComplexity]
  );

  React.useEffect(() => {
    onChange?.(pricing);
  }, [pricing, onChange]);

  const priorities: ErrandPriority[] = ['low', 'normal', 'high', 'urgent'];

  return (
    <motion.div
      className="glass-card rounded-2xl p-6 backdrop-blur-glass border border-white/10 bg-white/[0.03]"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-white/60 mb-1">Price Estimate</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-white">₦{Math.floor(pricing.totalFee).toLocaleString()}</span>
          <span className="text-sm text-white/40">Total</span>
        </div>
      </div>

      {/* Priority Selection */}
      {interactive && (
        <div className="mb-6 pb-6 border-b border-white/5">
          <label className="block text-xs font-medium text-white/60 mb-3 uppercase tracking-wide">
            Priority
          </label>
          <div className="grid grid-cols-4 gap-2">
            {priorities.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPriority(p)}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 ${
                  selectedPriority === p
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-white/5 text-white/60 border border-transparent hover:bg-white/10'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-xs text-white/40 mt-2">{getTimeEstimate(selectedPriority)}</p>
        </div>
      )}

      {/* Distance Control */}
      {interactive && (
        <div className="mb-6 pb-6 border-b border-white/5">
          <div className="flex justify-between items-center mb-3">
            <label className="text-xs font-medium text-white/60 uppercase tracking-wide">
              Distance
            </label>
            <span className="text-sm font-medium text-white">{selectedDistance.toFixed(1)} km</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="15"
            step="0.5"
            value={selectedDistance}
            onChange={(e) => setSelectedDistance(parseFloat(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      )}

      {/* Breakdown */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-white/60 uppercase tracking-wide mb-4">
          Breakdown
        </h4>

        {[
          { label: 'Base fee', value: pricing.baseFee },
          ...(pricing.distanceSurcharge > 0
            ? [{ label: 'Distance surcharge', value: pricing.distanceSurcharge }]
            : []),
          ...(pricing.queueComplexityFee > 0
            ? [{ label: 'Queue complexity fee', value: pricing.queueComplexityFee }]
            : []),
          ...(pricing.weatherSurge > 0 ? [{ label: 'Weather surge', value: pricing.weatherSurge }] : []),
        ].map((item, idx) => (
          <motion.div
            key={item.label}
            className="flex justify-between items-center text-sm"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <span className="text-white/60">{item.label}</span>
            <span className="text-white font-medium">₦{item.value.toLocaleString()}</span>
          </motion.div>
        ))}

        {/* Multiplier Note */}
        {pricing.urgencyMultiplier !== 1 && (
          <div className="text-xs text-white/40 italic mt-2">
            {selectedPriority} priority ({pricing.urgencyMultiplier}x)
          </div>
        )}

        {/* Divider */}
        <div className="my-4 h-px bg-white/5" />

        {/* Summary */}
        <div className="space-y-2 bg-white/5 rounded-lg p-3">
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Subtotal</span>
            <span className="text-white font-medium">₦{Math.floor(pricing.runnerAmount).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Platform fee (20%)</span>
            <span className="text-white/40 font-medium">₦{Math.floor(pricing.platformFee).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm font-bold pt-2 border-t border-white/10">
            <span className="text-white">Runner receives</span>
            <span className="text-green-400">₦{Math.floor(pricing.runnerAmount).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Trust Note */}
      <p className="text-xs text-white/40 mt-6 leading-relaxed">
        This estimate is based on distance, priority level, and current market conditions. Final price may vary
        based on real-time factors.
      </p>
    </motion.div>
  );
}
