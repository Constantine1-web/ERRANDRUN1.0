import { adminSupabase } from '@/lib/serverAuth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { createHash } from 'crypto';
import { MapPin, Clock, User, Package } from 'lucide-react';

export default async function GuestTrackingPage({ params }: { params: { token: string } }) {
  const rawToken = params.token;
  
  if (!rawToken || rawToken.length < 16) {
    return <ErrorState message="Invalid or malformed tracking link." />;
  }

  // 1. Hash the provided token securely
  const hash = createHash('sha256').update(rawToken).digest('hex');

  // 2. Lookup the guest record and join minimal errand data
  const { data: guest, error } = await adminSupabase
    .from('guest_recipients')
    .select(`
      name,
      expires_at,
      is_revoked,
      errands (
        id,
        status,
        title,
        pickup_location,
        delivery_location,
        created_at,
        runner_id
      )
    `)
    .eq('tracking_token_hash', hash)
    .single();

  if (error || !guest) {
    // Generic error to prevent token enumeration
    return <ErrorState message="Tracking link is invalid, expired, or has been revoked." />;
  }

  // 3. Security/Lifecycle Enforcement
  if (guest.is_revoked || new Date(guest.expires_at) < new Date()) {
    return <ErrorState message="This tracking link has expired or the errand is completed." />;
  }

  const errand = guest.errands as any;
  if (!errand) return <ErrorState message="Errand details unavailable." />;

  // 4. Fetch Runner Display Name safely (No sensitive data)
  let runnerName = 'Waiting for Runner';
  if (errand.runner_id) {
    const { data: runner } = await adminSupabase
      .from('profiles')
      .select('full_name')
      .eq('id', errand.runner_id)
      .single();
    if (runner?.full_name) {
      runnerName = runner.full_name;
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#121824] border-white/10 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <Badge className="mx-auto mb-4 bg-primary/20 text-primary border-primary/50">
            ERRANDRUN TRACKING
          </Badge>
          <CardTitle className="text-xl text-white">Delivery for {guest.name}</CardTitle>
          <p className="text-sm text-gray-400 mt-2">
            Status: <span className="text-white font-medium capitalize">{errand.status.replace('_', ' ')}</span>
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-gray-300">
              <Package className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Item</p>
                <p className="font-medium">{errand.title}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-gray-300">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Runner</p>
                <p className="font-medium">{runnerName}</p>
              </div>
            </div>

            <div className="flex gap-3 text-gray-300">
              <MapPin className="w-5 h-5 text-gray-400 mt-1 shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Route</p>
                <p className="font-medium line-clamp-1">{errand.pickup_location}</p>
                <p className="text-xs text-gray-500 my-1">↓</p>
                <p className="font-medium line-clamp-1">{errand.delivery_location}</p>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-white/5 text-center text-xs text-gray-500">
            Powered by ERRANDRUN Campus Deliveries
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <Card className="w-full max-w-sm bg-[#121824] border-white/10 text-center py-8">
        <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-white mb-2">Tracking Unavailable</h2>
        <p className="text-sm text-gray-400">{message}</p>
      </Card>
    </div>
  );
}
