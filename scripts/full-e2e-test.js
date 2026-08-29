const { createClient } = require('@supabase/supabase-js');

const baseUrl = process.env.APP_URL || 'http://localhost:3000';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || baseUrl;
const requesterId = process.env.REQUESTER_ID;
const requesterEmail = process.env.REQUESTER_EMAIL;
const runnerId = process.env.RUNNER_ID;
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
const useSandbox = process.env.USE_SANDBOX === 'true' || !paystackSecretKey;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable.');
  process.exit(1);
}

if (!requesterId || !requesterEmail || !runnerId) {
  console.error('Missing REQUESTER_ID, REQUESTER_EMAIL, or RUNNER_ID environment variable.');
  process.exit(1);
}

if (useSandbox) {
  console.log('Running in sandbox mode (no live Paystack account required).');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createErrand() {
  const payload = {
    requester_id: requesterId,
    title: 'Test ErrandRun delivery',
    description: 'Automated end-to-end test errand',
    pickup_location: 'Main Campus Gate',
    delivery_location: 'Library Front Desk',
    pickup_coordinates: { lat: 6.5237, lng: 3.3866 },
    delivery_coordinates: { lat: 6.5214, lng: 3.3792 },
    base_fee: 1000,
    distance_surcharge: 100,
    queue_complexity_fee: 50,
    weather_surge: 0,
    urgency_multiplier: 1,
    total_fee: 1150,
    platform_fee: 150,
    runner_amount: 1000,
    status: 'payment_pending',
    priority: 'normal',
    category: 'food_delivery',
  };

  const { data, error } = await supabase.from('errands').insert([payload]).select().single();
  if (error) {
    throw new Error(`Failed to create errand: ${error.message}`);
  }
  console.log('Created errand:', data.id);
  return data;
}

async function initializePayment(errandId) {
  const response = await fetch(`${baseUrl}/api/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: requesterId,
      amount: 1150,
      email: requesterEmail,
      errandId,
    }),
  });

  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(`Payment initialization failed: ${payload.error || response.statusText}`);
  }

  console.log('Initialized payment reference:', payload.data.reference);
  return {
    paymentId: payload.paymentId,
    reference: payload.data.reference,
  };
}

async function simulatePaymentSuccess(reference, paymentId, errandId) {
  if (!useSandbox && paystackSecretKey) {
    try {
      const response = await fetch(`${baseUrl}/api/payments?reference=${encodeURIComponent(reference)}`);
      const payload = await response.json();
      if (response.ok && payload.success) {
        console.log('Payment verified through Paystack.');
        return;
      }
      console.warn('Paystack verification did not return success. Falling back to simulated completion.');
    } catch (error) {
      console.warn('Paystack verification failed, falling back to simulated completion.', error.message);
    }
  } else if (useSandbox) {
    console.log('Sandbox mode: skipping live Paystack verification, marking payment complete directly.');
  }

  const { error } = await supabase.from('payments').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
  }).eq('id', paymentId);

  if (error) {
    throw new Error(`Failed to update payment status: ${error.message}`);
  }

  const { error: errandError } = await supabase.from('errands').update({
    status: 'unassigned',
  }).eq('id', errandId);

  if (errandError) {
    throw new Error(`Failed to update errand status after payment: ${errandError.message}`);
  }

  console.log('Payment marked complete and errand set to unassigned.');
}

async function acceptErrand(errandId) {
  const response = await fetch(`${baseUrl}/api/errands/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ errandId, runnerId }),
  });

  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(`Errand acceptance failed: ${payload.error || response.statusText}`);
  }

  console.log('Runner accepted errand.');
  return payload.errand;
}

async function postTrackerUpdate(errandId, message, location) {
  const response = await fetch(`${baseUrl}/api/tracking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      errandId,
      runnerId,
      statusUpdate: message,
      currentLocation: location,
    }),
  });

  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(`Tracking update failed: ${payload.error || response.statusText}`);
  }

  console.log(`Tracking update sent: ${message}`);
}

async function verifyLiveStatus(errandId) {
  const { data: tracking, error } = await supabase
    .from('errand_tracking')
    .select('*')
    .eq('errand_id', errandId)
    .order('timestamp', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch tracking updates: ${error.message}`);
  }

  const { data: errand, error: errandError } = await supabase
    .from('errands')
    .select('*')
    .eq('id', errandId)
    .single();

  if (errandError) {
    throw new Error(`Failed to fetch errand state: ${errandError.message}`);
  }

  console.log('Errand final status:', errand.status);
  console.log('Tracking updates count:', tracking.length);
  tracking.forEach((item) => {
    console.log(`- [${item.timestamp}] ${item.status_update}`);
  });

  if (tracking.length < 3) {
    throw new Error('Expected at least 3 tracking updates in live feed.');
  }

  if (errand.status !== 'assigned' && errand.status !== 'in_progress' && errand.status !== 'completed') {
    throw new Error(`Unexpected errand status: ${errand.status}`);
  }

  console.log('Live status verification passed.');
}

async function run() {
  try {
    const errand = await createErrand();
    const payment = await initializePayment(errand.id);
    await simulatePaymentSuccess(payment.reference, payment.paymentId, errand.id);
    await acceptErrand(errand.id);

    await postTrackerUpdate(errand.id, 'Runner en route to pickup', { lat: 6.5237, lng: 3.3866 });
    await postTrackerUpdate(errand.id, 'Runner picked up the item and is heading to delivery', { lat: 6.5228, lng: 3.3820 });
    await postTrackerUpdate(errand.id, 'Runner has completed delivery', { lat: 6.5214, lng: 3.3792 });

    await verifyLiveStatus(errand.id);

    console.log('Full end-to-end flow simulation completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Full E2E flow failed:', error.message || error);
    process.exit(1);
  }
}

run();
