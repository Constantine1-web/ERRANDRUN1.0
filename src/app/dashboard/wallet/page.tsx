'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Plus, Loader } from 'lucide-react';
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
        // Create wallet if doesn't exist
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

      // Fetch transactions
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

  // Handle Paystack callback verification
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
      alert('Please enter a valid amount (minimum ₦100)');
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

      // Redirect to Paystack
      window.location.href = result.data.authorization_url;
    } catch (error) {
      console.error('Deposit error:', error);
      alert('Unable to process deposit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-white mb-8">Wallet</h1>

      {verifying && (
        <div className="glass-card rounded-2xl p-4 mb-6 border border-primary-500/30 flex items-center gap-3 text-primary-400">
          <Loader className="w-5 h-5 animate-spin" />
          <span>Verifying your Paystack deposit, please wait...</span>
        </div>
      )}

      {/* Wallet Balance Card */}
      <motion.div
        className="glass-card rounded-3xl p-8 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-white/60 text-sm mb-2">Available Balance</p>
            <h2 className="text-5xl font-bold text-white">
              ₦{wallet?.balance?.toLocaleString() || '0.00'}
            </h2>
          </div>
          <WalletIcon className="w-16 h-16 text-primary-400/30" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-white/10">
          <div>
            <p className="text-white/60 text-xs mb-1">Total Earned</p>
            <p className="text-2xl font-bold text-green-400">
              ₦{wallet?.total_earned?.toLocaleString() || '0'}
            </p>
          </div>
          <div>
            <p className="text-white/60 text-xs mb-1">Total Spent</p>
            <p className="text-2xl font-bold text-red-400">
              ₦{wallet?.total_spent?.toLocaleString() || '0'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <button 
          onClick={() => setIsAddFundsOpen(true)}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Funds
        </button>
      </motion.div>

      {/* Transaction History */}
      <motion.div
        className="glass-card rounded-3xl p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-2xl font-bold text-white mb-6">Transaction History</h3>

        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/60">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all"
              >
                <div className="flex items-center gap-4">
                  {tx.transaction_type === 'credit' ? (
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <ArrowDownLeft className="w-5 h-5 text-green-400" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                      <ArrowUpRight className="w-5 h-5 text-red-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-white font-medium">{tx.description || 'Transaction'}</p>
                    <p className="text-xs text-white/40">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-bold ${tx.transaction_type === 'credit' ? 'text-green-400' : 'text-red-400'}`}
                >
                  {tx.transaction_type === 'credit' ? '+' : '-'}₦{Math.abs(tx.amount).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Add Funds Modal */}
      {isAddFundsOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-3xl p-6 max-w-md w-full relative"
          >
            <button 
              onClick={() => setIsAddFundsOpen(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white"
            >
              ✕
            </button>
            <h3 className="text-2xl font-bold text-white mb-2">Add Funds</h3>
            <p className="text-white/60 text-sm mb-6">Top up your wallet balance.</p>
            
            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Amount (₦)
                </label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Enter amount (e.g. 5000)"
                  className="input-field w-full text-lg"
                  required
                />
              </div>
              
              <button 
                type="submit" 
                disabled={loading || !depositAmount}
                className="btn-primary w-full disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Proceed to Payment'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
          <Loader className="w-8 h-8 text-primary-400 animate-spin" />
        </div>
      }
    >
      <WalletContent />
    </Suspense>
  );
}
