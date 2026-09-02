const fs = require('fs');

let content = fs.readFileSync('src/app/dashboard/admin/page.tsx', 'utf8');

// 1. Import Wallet icon if not imported
if (!content.includes('Wallet,')) {
    content = content.replace('TrendingUp,', 'TrendingUp, Wallet,');
}

// 2. Update activeTab type definition
content = content.replace(
    /useState<'applications' \| 'errands' \| 'users' \| 'disputes' \| 'stats'>/,
    "useState<'applications' | 'errands' | 'users' | 'disputes' | 'stats' | 'payouts'>"
);

// 3. Add to tabs array
content = content.replace(
    /\{ id: 'stats', label: 'Financial Analytics', icon: TrendingUp \},/g,
    "{ id: 'stats', label: 'Financial Analytics', icon: TrendingUp },\n          { id: 'payouts', label: 'Runner Payouts', icon: Wallet },"
);

// 4. Add state for payouts
const stateVars =   const [payouts, setPayouts] = useState<any[]>([]);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [processingPayoutId, setProcessingPayoutId] = useState<string | null>(null);;
content = content.replace(
    /const \[stats, setStats\] = useState<any>\(null\);/,
    const [stats, setStats] = useState<any>(null);\n
);

// 5. Add fetchPayouts
const fetchPayoutsFunc =   const fetchPayouts = async () => {
    setLoadingPayouts(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, profiles(full_name, bank_name, account_number, account_name)')
        .eq('type', 'withdrawal')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayouts(data || []);
    } catch (err: any) {
      toast.error('Failed to load pending payouts');
    } finally {
      setLoadingPayouts(false);
    }
  };;
content = content.replace(
    /const fetchStats = async \(\) => \{/,
    ${fetchPayoutsFunc}\n\n  const fetchStats = async () => {
);

// 6. Update useEffect to fetch payouts
content = content.replace(
    /if \(activeTab === 'disputes'\) fetchDisputes\(\);/g,
    "if (activeTab === 'disputes') fetchDisputes();\n    if (activeTab === 'payouts') fetchPayouts();"
);
content = content.replace(
    /fetchDisputes\]\);/g,
    "fetchDisputes, fetchPayouts]);"
);

// 7. Process Payout Function
const processPayoutFunc = 
  const handleProcessPayout = async (transactionId: string) => {
    setProcessingPayoutId(transactionId);
    try {
      const res = await fetch('/api/admin/payouts/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success('Payout processed successfully!');
      fetchPayouts(); // Refresh list
    } catch (err: any) {
      toast.error(err.message || 'Failed to process payout');
    } finally {
      setProcessingPayoutId(null);
    }
  };
;
content = content.replace(
    /const handleResolveDispute = async \(\) => \{/,
    ${processPayoutFunc}\n\n  const handleResolveDispute = async () => {
);

// 8. Add Payouts Tab UI
const payoutsUI = 
        {/* TAB 6: PAYOUTS */}
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Pending Runner Withdrawals</h2>
            {loadingPayouts ? (
              <div className="animate-pulse h-32 bg-white/5 rounded-2xl" />
            ) : payouts.length === 0 ? (
              <div className="text-center py-12 text-white/50">
                No pending withdrawals.
              </div>
            ) : (
              <div className="space-y-4">
                {payouts.map((tx) => (
                  <div key={tx.id} className="glass-card rounded-2xl p-6 border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                      <h3 className="font-bold text-lg text-white mb-1">{tx.profiles?.full_name}</h3>
                      <div className="text-sm text-white/60 space-y-1">
                        <p>Requested: {new Date(tx.created_at).toLocaleString()}</p>
                        <div className="bg-dark-bg p-3 rounded-lg border border-white/5 mt-3">
                          <p className="font-mono text-emerald-400 font-bold mb-1">?{tx.amount.toLocaleString()}</p>
                          <p>Bank: <span className="text-white">{tx.profiles?.bank_name || 'NOT PROVIDED'}</span></p>
                          <p>Account: <span className="text-white">{tx.profiles?.account_number || 'NOT PROVIDED'}</span></p>
                          <p>Name: <span className="text-white">{tx.profiles?.account_name || 'NOT PROVIDED'}</span></p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleProcessPayout(tx.id)}
                      disabled={processingPayoutId === tx.id || !tx.profiles?.bank_name}
                      className="btn-primary whitespace-nowrap"
                    >
                      {processingPayoutId === tx.id ? 'Processing...' : 'Process via Paystack API'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
;
content = content.replace(
    /\{activeTab === 'stats' && stats && \(/,
    ${payoutsUI}\n\n        {activeTab === 'stats' && stats && (
);

fs.writeFileSync('src/app/dashboard/admin/page.tsx', content);
