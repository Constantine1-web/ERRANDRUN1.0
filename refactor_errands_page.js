const fs = require('fs');
const path = require('path');

const code = `'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Plus, Clock, CheckCircle, ArrowRight, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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
      case 'pending': return 'warning';
      case 'cancelled': return 'danger';
      default: return 'info';
    }
  };

  return (
    <div className="min-h-screen bg-[#121824] text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Errands</h1>
            <p className="text-white/60 mt-2">Track the status of your requests and open details for live runner updates.</p>
          </div>
          <Button onClick={() => router.push('/dashboard/errands/new')} className="w-full sm:w-auto gap-2">
            <Plus className="w-5 h-5" />
            Post Errand
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 z-10" />
            <Input 
              placeholder="Search errands..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 relative z-0"
            />
          </div>
        </div>

        {loading ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-12 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-12 h-12 rounded-full mx-auto bg-white/5 animate-pulse" />
              <div className="w-32 h-4 mx-auto bg-white/5 animate-pulse rounded" />
              <p className="text-white/60">Loading your errands…</p>
            </Card>
          </motion.div>
        ) : errands.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-12 text-center">
              <Zap className="w-16 h-16 text-white/20 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-white mb-3">No errands yet</h2>
              <p className="text-white/60 mb-8 max-w-sm mx-auto">
                Create your first errand and get matched with a verified runner.
              </p>
              <Button onClick={() => router.push('/dashboard/errands/new')} className="w-full sm:w-auto gap-2">
                <Plus className="w-5 h-5" />
                Post Your First Errand
              </Button>
            </Card>
          </motion.div>
        ) : filteredErrands.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-12 text-center">
              <Search className="w-16 h-16 text-white/20 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-white mb-3">No matching errands</h2>
              <p className="text-white/60">
                Try adjusting your search query.
              </p>
            </Card>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {filteredErrands.map((errand) => (
              <motion.div
                key={errand.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4">
                    <div className="min-w-0">
                      <CardTitle className="text-xl sm:text-2xl truncate">{errand.title}</CardTitle>
                      <p className="text-white/50 mt-1 text-sm">{new Date(errand.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-row flex-wrap items-center gap-2 mt-3 sm:mt-0">
                      <Badge variant="outline">{errand.priority}</Badge>
                      <Badge variant={getStatusVariant(errand.status)}>
                        {errand.status}
                      </Badge>
                      <Badge variant="outline" className="font-mono">
                        ₦{Number(errand.total_fee).toLocaleString()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="text-sm text-white/60 line-clamp-2 sm:line-clamp-1">
                      View live tracking, payment status, and runner updates.
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button 
                      variant="ghost" 
                      className="w-full sm:w-auto gap-2 pl-0 hover:pl-2 transition-all text-primary-400 hover:text-primary-300"
                      onClick={() => router.push(\`/dashboard/user/errand/\${errand.id}\`)}
                    >
                      View details <ArrowRight className="w-4 h-4" />
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        <div className="grid gap-6 mt-10 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CheckCircle className="w-8 h-8 text-primary-400 mb-2" />
              <CardTitle className="text-xl mb-1">Live updates</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/60 text-sm">Every errand refreshes automatically through our Supabase realtime channel.</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Clock className="w-8 h-8 text-primary-400 mb-2" />
              <CardTitle className="text-xl mb-1">Payment control</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/60 text-sm">Errands stay pending until Paystack payment is completed.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="w-8 h-8 text-primary-400 mb-2" />
              <CardTitle className="text-xl mb-1">Smart routing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/60 text-sm">Verified campus runners can claim errands as soon as they are available.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
\`;

fs.writeFileSync(path.join(__dirname, 'src/app/dashboard/errands/page.tsx'), code);
console.log('Successfully refactored src/app/dashboard/errands/page.tsx');
