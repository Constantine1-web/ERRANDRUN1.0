'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircle, MapPin } from 'lucide-react';

interface ErrandDetail {
  id: string;
  title: string;
  pickup_location: string;
  delivery_location: string;
  total_fee: number;
  status: string;
}

export default function AcceptedErrandPage() {
  const params = useParams();
  const errandId = params?.id as string | undefined;
  const router = useRouter();
  const [errand, setErrand] = useState<ErrandDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!errandId) return;

    const fetchErrand = async () => {
      const { data, error: fetchError } = await supabase
        .from('errands')
        .select('id, title, pickup_location, delivery_location, total_fee, status')
        .eq('id', errandId)
        .single();

      if (fetchError) {
        console.error(fetchError);
        setError('Unable to load accepted task details.');
      } else {
        setErrand(data);
      }
      setLoading(false);
    };

    fetchErrand();
  }, [errandId]);

  useEffect(() => {
    if (!errandId) return;
    const timer = window.setTimeout(() => {
      router.push(`/dashboard/runner/track/${errandId}`);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [errandId, router]);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="glass-card rounded-3xl border border-white/10 p-8 text-center">
        <CheckCircle className="mx-auto mb-4 h-16 w-16 text-primary-400" />
        <h1 className="text-3xl font-bold text-white mb-2">Task Accepted</h1>
        <p className="text-white/60 mb-6">Your runner task has been accepted. Redirecting to tracking in a moment.</p>

        {loading ? (
          <p className="text-white/60">Loading task details…</p>
        ) : error ? (
          <p className="text-red-300 mb-6">{error}</p>
        ) : errand ? (
          <div className="space-y-4 text-left rounded-3xl bg-white/5 p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/50">Errand</p>
              <p className="text-lg font-semibold text-white">{errand.title}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-sm text-white/50">Pickup</p>
                <p className="text-white">{errand.pickup_location}</p>
              </div>
              <div>
                <p className="text-sm text-white/50">Destination</p>
                <p className="text-white">{errand.delivery_location}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900/50 p-4">
              <p className="text-sm text-white/50">Price</p>
              <p className="text-lg font-semibold text-white">₦{Number(errand.total_fee).toLocaleString()}</p>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href={`/dashboard/runner/track/${errandId}`} className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2">
            <MapPin className="w-4 h-4" /> Go to tracking now
          </Link>
          <Link href="/dashboard/runner" className="btn-secondary w-full sm:w-auto inline-flex items-center justify-center gap-2">
            Back to runner dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
