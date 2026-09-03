'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import toast from 'react-hot-toast';

function WalletContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentReference = searchParams.get('reference') || searchParams.get('payment_reference');

  const { user } = useAppStore();
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const fetchWalletData = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (walletError && walletError.code !== 'PGRST116') throw walletError;

      let walletId = walletData?.id;

      if (!walletData) {
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert([{ user_id: user.id, balance: 0, total_earned: 0, total_spent: 0 }])
          .select()
          .single();

        if (createError) throw createError;
        setWallet(newWallet);
        walletId = newWallet?.id;
      } else {
        setWallet(walletData);
      }

      const { data: txData, error: txError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', walletId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (txError) throw txError;
      setTransactions(txData || []);
    } catch (error) {
      console.error('Failed to fetch wallet data:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  useEffect(() => {
    if (!paymentReference) return;

    const verifyDeposit = async () => {
      setVerifying(true);
      try {
        const response = await fetch(`/api/payments?reference=${encodeURIComponent(paymentReference)}`);
        const result = await response.json();
        if (result?.success) {
          toast.success('Deposit confirmed! Your wallet has been credited.');
          await fetchWalletData();
          router.replace('/dashboard/wallet');
        } else {
          toast.error(result?.error || 'Payment verification was not successful.');
        }
      } catch (error) {
        console.error('Deposit verification failed', error);
        toast.error('Payment verification failed. Please contact support.');
      } finally {
        setVerifying(false);
      }
    };

    verifyDeposit();
  }, [paymentReference, fetchWalletData, router]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(depositAmount);
    
    if (!amount || amount < 100) {
      toast.error('Please enter a valid amount (minimum ₦100)');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          amount,
          email: user?.email,
          errandId: null
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to initialize payment');
      }

      window.location.href = result.data.authorization_url;
    } catch (error: any) {
      console.error('Deposit error:', error);
      toast.error(error.message || 'Unable to process deposit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── STRIPPED: Awaiting redesign ──
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Campus Wallet</h1>
      <button onClick={() => setIsAddFundsOpen(true)}>Add Funds</button>

      {verifying && <p>Verifying your Paystack deposit, please wait...</p>}

      <div>
        <h2>Available Balance: ₦{wallet?.balance?.toLocaleString() || '0.00'}</h2>
        <p>Total Earned: ₦{wallet?.total_earned?.toLocaleString() || '0'}</p>
        <p>Total Spent: ₦{wallet?.total_spent?.toLocaleString() || '0'}</p>
      </div>

      <div>
        <h3>Transaction History</h3>
        {transactions.length === 0 ? <p>No transactions recorded yet.</p> : (
          <div>
            {transactions.map((tx) => (
              <div key={tx.id} style={{ border: '1px solid gray', padding: '10px', margin: '10px 0' }}>
                <p>{tx.description || 'Transaction'} - {new Date(tx.created_at).toLocaleDateString()}</p>
                <p>
                  {tx.transaction_type === 'credit' ? '+' : '-'}₦{Math.abs(tx.amount).toLocaleString()} ({tx.status})
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {isAddFundsOpen && (
        <div style={{ border: '1px solid black', padding: '20px', marginTop: '20px' }}>
          <h2>Top Up Wallet</h2>
          <form onSubmit={handleDeposit}>
            <label>Amount (₦):</label>
            <input
              type="number"
              min="100"
              step="100"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              required
            />
            <button type="submit" disabled={loading || !depositAmount}>Proceed to Checkout</button>
            <button type="button" onClick={() => setIsAddFundsOpen(false)}>Cancel</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WalletContent />
    </Suspense>
  );
}
