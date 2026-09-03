'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabaseClient';
import { usePaystackPayment } from 'react-paystack';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils/pricing';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function UserDashboard() {
  const { user } = useAppStore();
  const router = useRouter();
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(1000);

  useEffect(() => {
    if (user?.id) {
      supabase.from('wallets').select('balance').eq('user_id', user.id).single()
        .then(({data}) => {
          if (data) setWalletBalance(Number(data.balance));
        });
    }
  }, [user]);

  const config = {
    reference: (new Date()).getTime().toString(),
    email: user?.email || 'user@example.com',
    amount: topUpAmount * 100,
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
  };

  const initializePayment = usePaystackPayment(config);

  const onSuccess = (reference: any) => {
    toast.loading('Verifying payment...', { id: 'verify' });
    fetch('/api/wallet/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference: reference.reference, userId: user?.id })
    }).then(res => res.json()).then(data => {
      if (data.success) {
        setWalletBalance(data.balance);
        toast.success('Wallet credited successfully!', { id: 'verify' });
        setIsToppingUp(false);
      } else {
        toast.error(data.error || 'Verification failed', { id: 'verify' });
      }
    }).catch(() => toast.error('Error verifying payment', { id: 'verify' }));
  };

  const onClose = () => {
    toast.error('Payment cancelled');
  };

  // ── STRIPPED: Awaiting redesign ──
  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.fullName || 'Student'}</p>
      <p>Balance: {formatCurrency(walletBalance)}</p>
      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        <Link href="/dashboard/errands/new">Post Errand</Link>
        <Link href="/dashboard/errands">My Errands</Link>
        <Link href="/dashboard/wallet">Wallet</Link>
      </div>
    </div>
  );
}
