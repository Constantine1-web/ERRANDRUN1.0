'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import { formatCurrency } from '@/utils/pricing';

interface ErrandSummary {
  id: string;
  title: string;
  status: string;
  total_fee: number;
  priority: string;
  created_at: string;
}

export default function ErrandsPage() {
  const router = useRouter();
  const { user } = useAppStore();
  const [errands, setErrands] = useState<ErrandSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchErrands = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('errands')
        .select('id, title, status, total_fee, priority, created_at')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch errands:', error);
      } else {
        setErrands(data || []);
      }

      setLoading(false);
    };

    fetchErrands();
  }, [user]);

  const filteredErrands = errands.filter(errand => 
    errand.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── STRIPPED: Awaiting redesign ──
  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>My Errands</h1>
      <button onClick={() => router.push('/dashboard/errands/new')} style={{ padding: '8px 16px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', marginBottom: '16px' }}>
        + New Errand
      </button>
      <input placeholder="Search errands..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', marginBottom: '16px' }} />
      {loading ? <p>Loading...</p> : filteredErrands.length === 0 ? <p>No errands yet.</p> : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {filteredErrands.map(e => (
            <li key={e.id} onClick={() => router.push(`/dashboard/user/errand/${e.id}`)} style={{ padding: '12px', border: '1px solid #eee', borderRadius: '6px', marginBottom: '8px', cursor: 'pointer' }}>
              <strong>{e.title}</strong> — {e.status} — {formatCurrency(e.total_fee)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
