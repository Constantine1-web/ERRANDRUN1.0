'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Plus, Clock, ArrowRight, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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

  const getStatusVariant = (status: string) => {
    switch(status.toLowerCase()) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'assigned': return 'info';
      case 'pending': 
      case 'unassigned': return 'warning';
      case 'cancelled': 
      case 'disputed': return 'danger';
      default: return 'default';
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Errands</h1>
          <p className="text-slate-500 text-sm mt-1">Track the status of your requests and live updates.</p>
        </div>
        <Button onClick={() => router.push('/dashboard/errands/new')} className="w-full sm:w-auto gap-2">
          <Plus className="w-4 h-4" />
          Request New Errand
        </Button>
      </div>

      {/* Search Input */}
      <div className="max-w-md">
        <Input 
          placeholder="Search errands by title..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search className="w-4 h-4 text-slate-400" />}
        />
      </div>

      {loading ? (
        <Card className="p-12 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading your errands…</p>
        </Card>
      ) : errands.length === 0 ? (
        <Card className="p-12 text-center">
          <Zap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-1">No errands posted yet</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
            Create your first errand and get matched with a verified student runner.
          </p>
          <Button onClick={() => router.push('/dashboard/errands/new')} className="gap-2">
            <Plus className="w-4 h-4" />
            Request Your First Errand
          </Button>
        </Card>
      ) : filteredErrands.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-slate-500 text-sm">No matching errands found for "{searchQuery}".</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredErrands.map((errand) => (
            <Card 
              key={errand.id} 
              className="hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
              onClick={() => router.push(`/dashboard/user/errand/${errand.id}`)}
            >
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Badge variant={getStatusVariant(errand.status) as any}>
                      {errand.status}
                    </Badge>
                    {errand.priority === 'urgent' && (
                      <Badge variant="warning">Urgent</Badge>
                    )}
                    <span className="text-xs text-slate-400">
                      {new Date(errand.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base leading-snug truncate">{errand.title}</h3>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                  <span className="text-lg font-bold font-mono text-slate-900">
                    {formatCurrency(errand.total_fee)}
                  </span>
                  <Button size="sm" variant="outline" className="text-xs">
                    Track <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
