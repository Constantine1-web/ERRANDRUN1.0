'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils/pricing';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  X,
  CreditCard,
  TrendingUp,
  ArrowDown
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

function WalletContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentReference = searchParams.get('reference') || searchParams.get('payment_reference');

  const { user } = useAppStore();
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('2000');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Withdraw state
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [withdrawing, setWithdrawing] = useState(false);

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
        .limit(25);

      if (txError) throw txError;
      setTransactions(txData || []);
    } catch (error) {
      console.error('Failed to fetch wallet data:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  // Paystack verification callback
  useEffect(() => {
    if (!paymentReference) return;

    const verifyDeposit = async () => {
      setVerifying(true);
      try {
        const response = await fetch(`/api/payments?reference=${encodeURIComponent(paymentReference)}`);
        const result = await response.json();
        if (result?.success) {
          toast.success('Deposit confirmed! Funds credited to your wallet.');
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
          errandId: null,
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

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount < 2000) return toast.error('Minimum payout is ₦2,000');
    if (withdrawAmount > (wallet?.balance || 0)) return toast.error('Insufficient wallet balance');

    setWithdrawing(true);
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, amount: withdrawAmount }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Withdrawal failed');

      toast.success('Payout request submitted for bank transfer!');
      setIsWithdrawOpen(false);
      await fetchWalletData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit withdrawal');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-8 animate-fadeIn">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Escrow & Treasury
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Campus Money Hub
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent money movement for your campus task requests and runner earnings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user?.role === 'runner' || user?.role === 'admin' ? (
            <Button
              variant="outline"
              size="lg"
              onClick={() => setIsWithdrawOpen(true)}
              className="text-xs font-bold"
            >
              <Building2 className="w-4 h-4 mr-1.5 text-emerald-600" />
              Request Payout
            </Button>
          ) : null}
          <Button
            variant="primary"
            size="lg"
            onClick={() => setIsAddFundsOpen(true)}
            className="text-xs font-bold shadow-sm"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Top Up Balance
          </Button>
        </div>
      </div>

      {verifying && (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold flex items-center gap-2.5 animate-pulse">
          <Clock className="w-4 h-4 text-blue-600 animate-spin" />
          <span>Verifying your Paystack transaction with campus treasury…</span>
        </div>
      )}

      {/* ── FINANCIAL TELEMETRY SURFACE ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Available Balance */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Available Balance
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <p className="text-3xl sm:text-4xl font-black text-emerald-600 font-mono tracking-tight">
            ₦{wallet?.balance?.toLocaleString('en-NG') || '0.00'}
          </p>
          <span className="text-[11px] text-slate-400 block pt-1">
            Secured for errands or ready for runner withdrawal
          </span>
        </div>

        {/* Total Earned */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Total Career Earnings
          </span>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
            ₦{wallet?.total_earned?.toLocaleString('en-NG') || '0'}
          </p>
          <span className="text-[11px] text-emerald-600 font-semibold block pt-1">
            Earned from completed errands
          </span>
        </div>

        {/* Total Spent */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Total Dispatched / Spent
          </span>
          <p className="text-2xl sm:text-3xl font-black text-slate-700 font-mono tracking-tight">
            ₦{wallet?.total_spent?.toLocaleString('en-NG') || '0'}
          </p>
          <span className="text-[11px] text-slate-400 block pt-1">
            Settled via protected escrow
          </span>
        </div>
      </div>

      {/* ── TRANSACTION LEDGER ── */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Transaction History</h2>
            <p className="text-xs text-slate-400">All credits, deposits, refunds, and errand payments.</p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400">
            {transactions.length} Records
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No transactions recorded on your campus ledger yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => {
              const isCredit = tx.transaction_type === 'credit';
              return (
                <div
                  key={tx.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/50 rounded-xl px-2 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        isCredit
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {isCredit ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">
                        {tx.description || (isCredit ? 'Wallet Top-Up' : 'Errand Payment')}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {new Date(tx.created_at).toLocaleDateString()} at{' '}
                        {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right flex sm:flex-col items-center sm:items-end justify-between">
                    <span
                      className={`font-mono font-black text-base ${
                        isCredit ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {isCredit ? '+' : '-'}₦{Math.abs(tx.amount).toLocaleString('en-NG')}
                    </span>
                    <Badge
                      variant={
                        tx.status === 'completed' || tx.status === 'success' ? 'success' :
                        tx.status === 'pending' ? 'warning' : 'danger'
                      }
                      className="text-[9px] uppercase font-bold"
                    >
                      {tx.status || 'completed'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── TOP UP MODAL ── */}
      {isAddFundsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-slate-900">Fund Campus Wallet</h3>
              </div>
              <button onClick={() => setIsAddFundsOpen(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <p className="text-xs text-slate-500">
              Instant card or bank transfer deposit processed securely via Paystack escrow.
            </p>

            {/* Quick Presets */}
            <div className="grid grid-cols-4 gap-2">
              {['1000', '2000', '5000', '10000'].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setDepositAmount(amt)}
                  className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                    depositAmount === amt
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  ₦{Number(amt).toLocaleString()}
                </button>
              ))}
            </div>

            <form onSubmit={handleDeposit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Amount (₦)</label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-300 font-mono text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={loading}
                className="w-full font-bold shadow-md"
              >
                Proceed to Paystack (₦{Number(depositAmount || 0).toLocaleString()})
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ── WITHDRAW MODAL ── */}
      {isWithdrawOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Request Runner Payout</h3>
              <button onClick={() => setIsWithdrawOpen(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <p className="text-xs text-slate-500">
              Available Balance: <strong className="text-emerald-600">₦{wallet?.balance?.toLocaleString() || 0}</strong>. Minimum payout is <strong>₦2,000</strong>.
            </p>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Amount (₦)</label>
                <input
                  type="number"
                  min="2000"
                  step="500"
                  value={withdrawAmount || ''}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  placeholder="Min ₦2,000"
                  className="w-full h-11 px-4 rounded-xl border border-slate-300 font-mono text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={withdrawing}
                className="w-full font-bold bg-emerald-600 hover:bg-emerald-700"
              >
                Confirm Bank Payout
              </Button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Loading Money Hub…</div>}>
      <WalletContent />
    </Suspense>
  );
}
