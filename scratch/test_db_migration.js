const { createClient } = require('@supabase/supabase-js');
const url = 'https://tdcluqahwkteyijcutee.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkY2x1cWFod2t0ZXlpamN1dGVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzkzOTc1OSwiZXhwIjoyMTAzNTE1NzU5fQ.YIfIxqO67nhgdo3MqlWWEczCkL8GqZAR1uOGVlCVoR4';
const supabase = createClient(url, key);

async function checkMigration() {
  console.log('Testing notification_outbox table...');
  const { data: outbox, error: outboxErr } = await supabase.from('notification_outbox').select('event_id').limit(1);
  if (outboxErr) {
    console.error('❌ notification_outbox table error:', outboxErr.message);
  } else {
    console.log('✅ notification_outbox exists');
  }

  console.log('Testing guest_recipients table...');
  const { data: guests, error: guestsErr } = await supabase.from('guest_recipients').select('id').limit(1);
  if (guestsErr) {
    console.error('❌ guest_recipients table error:', guestsErr.message);
  } else {
    console.log('✅ guest_recipients exists');
  }

  console.log('Testing notifications table...');
  const { data: notifs, error: notifsErr } = await supabase.from('notifications').select('id').limit(1);
  if (notifsErr) {
    console.error('❌ notifications table error:', notifsErr.message);
  } else {
    console.log('✅ notifications exists');
  }

  console.log('Testing claim_outbox_events RPC...');
  const { data: rpcData, error: rpcErr } = await supabase.rpc('claim_outbox_events', {
    batch_size: 1,
    worker_id: 'test-worker',
    lease_interval: '1 minute'
  });
  if (rpcErr) {
    console.error('❌ RPC claim_outbox_events error:', rpcErr.message);
  } else {
    console.log('✅ RPC claim_outbox_events works, returned rows:', rpcData?.length);
  }
}

checkMigration();
