'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Plus, Loader, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Campus Wallet</h1>
          <p className="text-slate-500 text-xs mt-0.5">Manage your balance, top up via Paystack, or withdraw earnings.</p>
        </div>
        <Button onClick={() => setIsAddFundsOpen(true)} className="gap-1.5 font-bold">
          <Plus className="w-4 h-4" /> Add Funds
        </Button>
      </div>

      {verifying && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 flex items-center gap-3 text-blue-700 text-xs">
            <Loader className="w-4 h-4 animate-spin" />
            <span>Verifying your Paystack deposit, please wait...</span>
          </CardContent>
        </Card>
      )}

      {/* Wallet Balance Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-start sm:items-center justify-between mb-6">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Available Balance</p>
              <h2 className="text-4xl sm:text-5xl font-black text-green-600 font-mono">
                ₦{wallet?.balance?.toLocaleString() || '0.00'}
              </h2>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center">
              <WalletIcon className="w-7 h-7" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-100">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <p className="text-slate-400 text-[11px] font-semibold uppercase mb-0.5">Total Earned</p>
              <p className="text-xl font-bold text-slate-800 font-mono">
                ₦{wallet?.total_earned?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <p className="text-slate-400 text-[11px] font-semibold uppercase mb-0.5">Total Spent</p>
              <p className="text-xl font-bold text-slate-800 font-mono">
                ₦{wallet?.total_spent?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900">Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No transactions recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="py-3.5 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      tx.transaction_type === 'credit' ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {tx.transaction_type === 'credit' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{tx.description || 'Transaction'}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(tx.created_at).toLocaleDateString()} at {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-mono font-bold text-sm block ${
                        tx.transaction_type === 'credit' ? 'text-green-600' : 'text-slate-800'
                      }`}
                    >
                      {tx.transaction_type === 'credit' ? '+' : '-'}₦{Math.abs(tx.amount).toLocaleString()}
                    </span>
                    <Badge variant={tx.status === 'completed' || tx.status === 'success' ? 'success' : tx.status === 'pending' ? 'warning' : 'danger'} className="text-[9px] mt-0.5">
                      {tx.status || 'completed'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Funds Modal */}
      {isAddFundsOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <Card className="max-w-md w-full relative shadow-xl">
            <button 
              onClick={() => setIsAddFundsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-900">Top Up Wallet</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Deposit funds securely via Paystack.</p>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleDeposit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Amount (₦)
                  </label>
                  <Input
                    type="number"
                    min="100"
                    step="100"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="e.g. 2000"
                    className="text-base font-mono"
                    required
                  />
                </div>
                
                <Button 
                  type="submit" 
                  disabled={loading || !depositAmount}
                  isLoading={loading}
                  className="w-full font-bold"
                >
                  Proceed to Paystack Checkout
                </Button>
              </form>
            </CardContent>
          </Card>
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
          <Loader className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      }
    >
      <WalletContent />
    </Suspense>
  );
}
