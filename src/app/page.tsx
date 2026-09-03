'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { calculatePricing, formatCurrency } from '@/utils/pricing';

export default function LandingPage() {
  const [calcCategory, setCalcCategory] = useState<'academic' | 'food_delivery' | 'campus_errand'>('food_delivery');
  const [calcDistance, setCalcDistance] = useState(1.5);
  const [calcQueue, setCalcQueue] = useState(false);

  const dynamicDemoPrice = calculatePricing(calcCategory, 'normal', calcDistance, calcQueue, false);

  // ── STRIPPED: Awaiting redesign ──
  return (
    <div style={{ padding: '40px 20px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h1>ERRANDRUN</h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>Campus errand marketplace — UI awaiting redesign</p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <Link href="/login">Sign In</Link>
        <Link href="/signup">Sign Up</Link>
      </div>
    </div>
  );
}
